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

    // Optimize: Fetch only active receipt IDs from DB where receivedFcy > exchangedFcy
    const activeReceipts = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM receipts 
        WHERE company_id = ${companyId} AND received_fcy > exchanged_fcy
    `;
    const activeIds = activeReceipts.map(r => r.id);

    const fcdWallets = await prisma.receipt.findMany({
        where: {
            id: { in: activeIds }
        },
        include: {
            customer: { select: { name: true } }
        },
        orderBy: { receivedDate: 'asc' }
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

// DELETE /api/treasury/exchange/:id — Reverse an exchange log
treasuryRoutes.delete('/exchange/:id', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser!.companyId;
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) return c.json({ error: 'Invalid exchange log ID' }, 400);

    const log = await prisma.exchangeLog.findUnique({
        where: { id },
        include: { receipt: true },
    });

    if (!log) return c.json({ error: 'Exchange log not found' }, 404);
    if (log.companyId !== companyId) return c.json({ error: 'Forbidden' }, 403);

    await prisma.$transaction(async (tx) => {
        // 1. Restore exchangedFcy on the receipt
        if (log.receiptId && log.receipt) {
            const currentExchanged = new Decimal(log.receipt.exchangedFcy.toString());
            const amountFcy = new Decimal(log.amountFcy.toString());
            const newExchanged = Decimal.max(0, currentExchanged.minus(amountFcy));

            await tx.receipt.update({
                where: { id: log.receiptId },
                data: { exchangedFcy: newExchanged.toNumber() },
            });
        }

        // 2. Delete the exchange log
        await tx.exchangeLog.delete({ where: { id } });
    });

    return c.json({ success: true });
});

export default treasuryRoutes;
