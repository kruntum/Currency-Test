import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import Decimal from 'decimal.js';

const receiptRoutes = new Hono<AppEnv>();

receiptRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']));

const createReceiptSchema = z.object({
    customerId: z.number(),
    receivedDate: z.string(),
    currencyCode: z.string().min(1),
    receivedFcy: z.number().positive(),
    receivedBotRate: z.number().positive(),
    bankReference: z.string().optional(),
});

// GET /api/receipts
receiptRoutes.get('/', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const receipts = await prisma.receipt.findMany({
        where: { companyId },
        include: {
            customer: { select: { id: true, name: true } },
            allocations: {
                include: { transaction: { select: { declarationNumber: true } } }
            }
        },
        orderBy: { receivedDate: 'desc' }
    });
    return c.json({ data: receipts });
});

// GET /api/receipts/unallocated
receiptRoutes.get('/unallocated', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const customerId = c.req.query('customerId');

    const whereClause: any = {
        companyId,
        status: { in: ['UNALLOCATED', 'PARTIAL'] }
    };
    if (customerId) whereClause.customerId = parseInt(customerId);

    const receipts = await prisma.receipt.findMany({
        where: whereClause,
        include: { customer: { select: { name: true } } },
        orderBy: { receivedDate: 'asc' }
    });
    return c.json({ data: receipts });
});

// POST /api/receipts
receiptRoutes.post('/', async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = createReceiptSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const receivedFcy = new Decimal(data.receivedFcy);
    const botRate = new Decimal(data.receivedBotRate);
    const receivedThb = receivedFcy.mul(botRate);

    // Database transaction
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create Receipt
        const receipt = await tx.receipt.create({
            data: {
                companyId,
                customerId: data.customerId,
                receivedDate: new Date(data.receivedDate),
                currencyCode: data.currencyCode,
                receivedFcy: receivedFcy.toNumber(),
                receivedBotRate: botRate.toNumber(),
                receivedThb: receivedThb.toNumber(),
                status: 'UNALLOCATED',
                allocatedThb: 0,
                bankReference: data.bankReference || null,
                createdByUserId: user.id,
            }
        });

        // 2. We no longer update FCDHoldingPool as each receipt is its own Wallet.

        return receipt;
    });

    return c.json({ data: result }, 201);
});

export default receiptRoutes;
