import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import Decimal from 'decimal.js';

const treasuryRoutes = new Hono<AppEnv>();

treasuryRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']));

// GET /api/treasury/fcd -> List all FCD balances for the company
treasuryRoutes.get('/fcd', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const fcdPools = await prisma.fCDHoldingPool.findMany({
        where: { companyId },
        orderBy: { balanceFcy: 'desc' }
    });

    return c.json({ data: fcdPools });
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
        }
    });

    return c.json({ data: logs });
});

const exchangeSchema = z.object({
    currencyCode: z.string().min(1),
    amountFcy: z.number().positive(),
    actualBankRate: z.number().positive(),
    exchangedDate: z.string(),
});

// POST /api/treasury/exchange -> Sell FCY to THB
treasuryRoutes.post('/exchange', async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = exchangeSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { currencyCode, amountFcy, actualBankRate, exchangedDate } = parsed.data;

    // Perform transaction
    const result = await prisma.$transaction(async (tx) => {
        const pool = await tx.fCDHoldingPool.findUnique({
            where: { companyId_currencyCode: { companyId, currencyCode } }
        });

        if (!pool) {
            throw new Error('FCD Pool not found for this currency');
        }

        const currentBalance = new Decimal(pool.balanceFcy.toString());
        const amountToSell = new Decimal(amountFcy);

        if (amountToSell.greaterThan(currentBalance)) {
            throw new Error(`Insufficient funds: ${currentBalance.toNumber()} ${currencyCode} available`);
        }

        const costRate = new Decimal(pool.avgCostRate.toString());
        const sellRate = new Decimal(actualBankRate);
        const thbReceived = amountToSell.mul(sellRate);
        const fxLayer2GainLoss = sellRate.minus(costRate).mul(amountToSell);

        // 1. Create Log
        const log = await tx.exchangeLog.create({
            data: {
                companyId,
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

        // 2. Reduce Pool
        const newBalance = currentBalance.minus(amountToSell);
        await tx.fCDHoldingPool.update({
            where: { id: pool.id },
            data: {
                balanceFcy: newBalance.toNumber()
                // avgCostRate remains the same when selling
            }
        });

        return log;
    });

    return c.json({ data: result }, 201);
});

export default treasuryRoutes;
