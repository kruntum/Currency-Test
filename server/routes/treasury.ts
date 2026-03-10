import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import Decimal from 'decimal.js';

const treasuryRoutes = new Hono<AppEnv>();

treasuryRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']));

// GET /api/treasury/fcd -> List all FCD balances from Receipts
treasuryRoutes.get('/fcd', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    // Fetch all receipts for this company, then filter in JS
    // (Prisma does not support field-to-field comparison in where clauses)
    const allReceipts = await prisma.receipt.findMany({
        where: { companyId },
        include: {
            customer: { select: { name: true } }
        },
        orderBy: { receivedDate: 'asc' }
    });

    // Filter: only receipts that still have unexchanged FCY
    const fcdWallets = allReceipts.filter(r => {
        const received = new Decimal(r.receivedFcy.toString());
        const exchanged = new Decimal(r.exchangedFcy.toString());
        return received.greaterThan(exchanged);
    });

    // Map to the expected frontend format but include receiptId
    const formattedWallets = fcdWallets.map(receipt => {
        const remainingFcy = new Decimal(receipt.receivedFcy.toString()).minus(new Decimal(receipt.exchangedFcy.toString())).toNumber();
        return {
            id: receipt.id, // receiptId
            companyId: receipt.companyId,
            currencyCode: receipt.currencyCode,
            balanceFcy: remainingFcy,
            avgCostRate: receipt.receivedBotRate, // Cost is exact BOT rate
            customerName: receipt.customer.name,
            receivedDate: receipt.receivedDate,
            originalFcy: receipt.receivedFcy
        };
    });

    return c.json({ data: formattedWallets });
});

// GET /api/treasury/exchange-logs -> List exchange history
treasuryRoutes.get('/exchange-logs', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const logs = await prisma.exchangeLog.findMany({
        where: { companyId },
        orderBy: { exchangedDate: 'desc' },
        include: {
            currency: { select: { symbol: true } },
            receipt: { include: { customer: { select: { name: true } } } }
        }
    });

    return c.json({ data: logs });
});

const exchangeSchema = z.object({
    receiptId: z.number().int().positive(),
    currencyCode: z.string().min(1),
    amountFcy: z.number().positive(),
    actualBankRate: z.number().positive(),
    exchangedDate: z.string(),
});

// POST /api/treasury/exchange -> Sell FCY to THB from a specific Wallet
treasuryRoutes.post('/exchange', async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = exchangeSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { receiptId, currencyCode, amountFcy, actualBankRate, exchangedDate } = parsed.data;

    // Perform transaction
    const result = await prisma.$transaction(async (tx) => {
        const receipt = await tx.receipt.findUnique({
            where: { id: receiptId, companyId }
        });

        if (!receipt) {
            throw new Error('Receipt (FCD Wallet) not found');
        }

        if (receipt.currencyCode !== currencyCode) {
            throw new Error('Currency mismatch');
        }

        const receivedFcy = new Decimal(receipt.receivedFcy.toString());
        const exchangedFcy = new Decimal(receipt.exchangedFcy.toString());
        const currentBalance = receivedFcy.minus(exchangedFcy);
        const amountToSell = new Decimal(amountFcy);

        if (amountToSell.greaterThan(currentBalance)) {
            throw new Error(`Insufficient funds: ${currentBalance.toNumber()} ${currencyCode} available in this wallet`);
        }

        const costRate = new Decimal(receipt.receivedBotRate.toString());
        const sellRate = new Decimal(actualBankRate);
        const thbReceived = amountToSell.mul(sellRate);
        const fxLayer2GainLoss = sellRate.minus(costRate).mul(amountToSell);

        // 1. Create Log
        const log = await tx.exchangeLog.create({
            data: {
                companyId,
                receiptId,
                currencyCode,
                amountFcy: amountToSell.toNumber(),
                actualBankRate: sellRate.toNumber(),
                thbReceived: thbReceived.toNumber(),
                costRate: costRate.toNumber(),
                fxLayer2GainLoss: fxLayer2GainLoss.toNumber(),
                createdByUserId: user.id,
                exchangedDate: new Date(exchangedDate)
            }
        });

        // 2. Increase exchangedFcy in Receipt
        const newExchangedFcy = exchangedFcy.plus(amountToSell);
        await tx.receipt.update({
            where: { id: receipt.id },
            data: {
                exchangedFcy: newExchangedFcy.toNumber()
            }
        });

        return log;
    });

    return c.json({ data: result }, 201);
});

export default treasuryRoutes;
