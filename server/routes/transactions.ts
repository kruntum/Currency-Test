import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import { logAuditData } from '../services/audit-service.js';
import { calculateTransactionTotals } from '../utils/calculations.js';

const transactionRoutes = new Hono<AppEnv>();

// Zod schemas
const invoiceItemSchema = z.object({
    goodsName: z.string().min(1),
    netWeight: z.string().optional().nullable(),
    price: z.string().min(1),
    totalPrice: z.string().min(1),
});

const invoiceSchema = z.object({
    invoiceNumber: z.string().min(1),
    invoiceDate: z.string().min(1),
    items: z.array(invoiceItemSchema).min(1, 'At least 1 item required'),
});

const transactionSchema = z.object({
    declarationNumber: z.string().min(1),
    declarationDate: z.string().min(1),
    currencyCode: z.string().min(1),
    exchangeRate: z.string().min(1),
    rateDate: z.string().min(1),
    rateSource: z.enum(['BOT', 'MANUAL', 'THB']).default('BOT'),
    // companyId is intentionally excluded — always sourced from middleware
    customerId: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    invoices: z.array(invoiceSchema).min(1, 'At least 1 invoice required'),
});

// All transaction routes expect a company context
transactionRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']));

// GET /api/transactions - list with invoice counts
transactionRoutes.get('/', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(500, Math.max(1, parseInt(c.req.query('limit') || '30')));
    // Using companyUser from middleware
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const search = c.req.query('search');

    const paymentStatus = c.req.query('paymentStatus');
    const currencyCode = c.req.query('currencyCode');
    const customerId = c.req.query('customerId');
    const year = c.req.query('year');
    const month = c.req.query('month');

    const where: Record<string, unknown> = { companyId };
    if (search) {
        where.OR = [
            { declarationNumber: { contains: search, mode: 'insensitive' } },
            { invoices: { some: { invoiceNumber: { contains: search, mode: 'insensitive' } } } },
            { invoices: { some: { items: { some: { goodsName: { contains: search, mode: 'insensitive' } } } } } },
        ];
    }
    if (paymentStatus) {
        if (paymentStatus.includes(',')) {
            where.paymentStatus = { in: paymentStatus.split(',') };
        } else {
            where.paymentStatus = paymentStatus;
        }
    }
    if (currencyCode) {
        where.currencyCode = currencyCode;
    }
    if (customerId) {
        where.customerId = parseInt(customerId);
    }
    if (year || month) {
        const y = year ? parseInt(year) : new Date().getFullYear();
        if (month) {
            const m = parseInt(month);
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(y, m, 1));
            where.declarationDate = { gte: start, lt: end };
        } else {
            const start = new Date(Date.UTC(y, 0, 1));
            const end = new Date(Date.UTC(y + 1, 0, 1));
            where.declarationDate = { gte: start, lt: end };
        }
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            include: {
                currency: true,
                customer: true,
                user: { select: { id: true, name: true, email: true } },
                invoices: {
                    include: { items: { orderBy: { itemNo: 'asc' } } },
                    orderBy: { id: 'asc' },
                },
                _count: { select: { invoices: true, allocations: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.transaction.count({ where }),
    ]);

    return c.json({
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

// GET /api/transactions/:id - full detail with invoices + items
transactionRoutes.get('/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const tx = await prisma.transaction.findUnique({
        where: { id },
        include: {
            currency: true,
            customer: true,
            user: { select: { id: true, name: true, email: true } },
            invoices: {
                include: { items: { orderBy: { itemNo: 'asc' } } },
                orderBy: { id: 'asc' },
            },
            allocations: {
                include: { receipt: true, walletTx: true }
            }
        },
    });

    if (!tx || tx.companyId !== companyId) return c.json({ error: 'Not found' }, 404);

    return c.json({ data: tx });
});

// POST /api/transactions - create with nested invoices + items
// POST — OWNER, ADMIN, DATA_ENTRY only (FINANCE excluded from writes)
transactionRoutes.post('/', async (c) => {
    const companyUser = c.get('companyUser');
    if (!companyUser || !['OWNER', 'ADMIN', 'DATA_ENTRY'].includes(companyUser.role)) {
        return c.json({ error: 'Forbidden: Insufficient role for this operation' }, 403);
    }
    const user = c.get('user');
    const body = await c.req.json();
    const result = transactionSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
    }

    const data = result.data;
    // SECURITY: Always use companyId from authenticated middleware, never from body
    const companyId = companyUser!.companyId;
    const rate = parseFloat(data.exchangeRate);

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { roundingMethod: true },
    });
    const roundingMethod = company?.roundingMethod || 'ITEM_ROUNDING';

    const rawInvoices = data.invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: new Date(inv.invoiceDate),
        items: inv.items.map((item) => ({
            goodsName: item.goodsName,
            netWeight: item.netWeight ? parseFloat(item.netWeight) : null,
            price: parseFloat(item.price),
            totalPrice: parseFloat(item.totalPrice),
        })),
    }));

    const calculated = calculateTransactionTotals({
        invoices: rawInvoices,
        exchangeRate: rate,
        currencyCode: data.currencyCode,
        companyId,
        userId: user.id,
        roundingMethod,
    });

    const totalForeign = calculated.grandTotalForeign;
    const totalThb = calculated.grandTotalThb;
    const invoicesData = calculated.invoices;

    const tx = await prisma.transaction.create({
        data: {
            declarationNumber: data.declarationNumber,
            declarationDate: new Date(data.declarationDate),
            invoiceNumber: invoicesData.map(i => i.invoiceNumber).join(', '),
            invoiceDate: invoicesData[0].invoiceDate,
            currencyCode: data.currencyCode,
            foreignAmount: totalForeign,
            exchangeRate: rate,
            thbAmount: totalThb,
            rateDate: new Date(data.rateDate),
            rateSource: data.rateSource,
            companyId,
            customerId: data.customerId || null,
            createdBy: user.id,
            notes: data.notes || null,
            paymentStatus: 'PENDING',
            paidThb: 0,
            invoices: {
                create: invoicesData.map((inv) => ({
                    invoiceNumber: inv.invoiceNumber,
                    invoiceDate: inv.invoiceDate,
                    currencyCode: inv.currencyCode,
                    totalForeign: inv.totalForeign,
                    totalThb: inv.totalThb,
                    companyId: inv.companyId,
                    createdBy: inv.createdBy,
                    items: {
                        create: inv.items.map((it, idx) => ({
                            itemNo: idx + 1,
                            goodsName: it.goodsName,
                            netWeight: it.netWeight,
                            price: it.price,
                            priceTHB: it.priceTHB,
                            totalPrice: it.totalPrice,
                            totalPriceTHB: it.totalPriceTHB,
                        })),
                    },
                })),
            },
        },
        include: {
            invoices: { include: { items: true } },
            currency: true,
        },
    });

    // Log the creation
    await logAuditData({
        companyId,
        userId: user.id,
        action: 'CREATE_TRANSACTION',
        entity: 'TRANSACTION',
        entityId: tx.id,
        newValues: {
            declarationNumber: tx.declarationNumber,
            foreignAmount: tx.foreignAmount,
            exchangeRate: tx.exchangeRate,
            thbAmount: tx.thbAmount
        }
    });

    return c.json({ data: tx }, 201);
});

// PUT /api/transactions/:id - update (replace invoices + items)
// PUT — OWNER, ADMIN, DATA_ENTRY only
transactionRoutes.put('/:id', async (c) => {
    const companyUserCtx = c.get('companyUser');
    if (!companyUserCtx || !['OWNER', 'ADMIN', 'DATA_ENTRY'].includes(companyUserCtx.role)) {
        return c.json({ error: 'Forbidden: Insufficient role for this operation' }, 403);
    }
    const id = parseInt(c.req.param('id'));
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const user = c.get('user');

    const body = await c.req.json();
    const result = transactionSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) return c.json({ error: 'Not found' }, 404);

    if (existing.paymentStatus !== 'PENDING' || existing.paidThb.toNumber() > 0) {
        return c.json({ error: 'Cannot edit transaction because it is already allocated/paid. Please reverse the allocations first.' }, 400);
    }

    const data = result.data;
    const rate = parseFloat(data.exchangeRate);

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { roundingMethod: true },
    });
    const roundingMethod = company?.roundingMethod || 'ITEM_ROUNDING';

    const rawInvoices = data.invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: new Date(inv.invoiceDate),
        items: inv.items.map((item) => ({
            goodsName: item.goodsName,
            netWeight: item.netWeight ? parseFloat(item.netWeight) : null,
            price: parseFloat(item.price),
            totalPrice: parseFloat(item.totalPrice),
        })),
    }));

    const calculated = calculateTransactionTotals({
        invoices: rawInvoices,
        exchangeRate: rate,
        currencyCode: data.currencyCode,
        companyId,
        userId: user.id,
        roundingMethod,
    });

    const totalForeign = calculated.grandTotalForeign;
    const totalThb = calculated.grandTotalThb;
    const invoicesData = calculated.invoices;

    // Handle payment status protection (cannot reduce transaction total below what's already paid)
    if (totalThb < existing.paidThb.toNumber()) {
        return c.json({ error: 'Total THB cannot be less than already paid amount' }, 400);
    }

    let newStatus = existing.paymentStatus;
    if (existing.paidThb.toNumber() > 0) {
        if (existing.paidThb.toNumber() >= totalThb) {
            newStatus = 'PAID';
        } else {
            newStatus = 'PARTIAL';
        }
    }

    // Delete old invoices (cascade deletes items), then create new
    const tx = await prisma.$transaction(async (tx) => {
        await tx.invoice.deleteMany({ where: { transactionId: id } });

        return tx.transaction.update({
            where: { id },
            data: {
                declarationNumber: data.declarationNumber,
                declarationDate: new Date(data.declarationDate),
                invoiceNumber: invoicesData.map(i => i.invoiceNumber).join(', '),
                invoiceDate: invoicesData[0].invoiceDate,
                currencyCode: data.currencyCode,
                foreignAmount: totalForeign,
                exchangeRate: rate,
                thbAmount: totalThb,
                rateDate: new Date(data.rateDate),
                rateSource: data.rateSource,
                notes: data.notes || null,
                customerId: data.customerId || null,
                paymentStatus: newStatus,
                invoices: {
                    create: invoicesData.map((inv) => ({
                        invoiceNumber: inv.invoiceNumber,
                        invoiceDate: inv.invoiceDate,
                        currencyCode: inv.currencyCode,
                        totalForeign: inv.totalForeign,
                        totalThb: inv.totalThb,
                        companyId: inv.companyId,
                        createdBy: inv.createdBy,
                        items: {
                            create: inv.items.map((it, idx) => ({
                                itemNo: idx + 1,
                                goodsName: it.goodsName,
                                netWeight: it.netWeight,
                                price: it.price,
                                priceTHB: it.priceTHB,
                                totalPrice: it.totalPrice,
                                totalPriceTHB: it.totalPriceTHB,
                            })),
                        },
                    })),
                },
            },
            include: {
                invoices: { include: { items: true } },
                currency: true,
            },
        });
    });

    // Log the update
    await logAuditData({
        companyId,
        userId: user.id,
        action: 'UPDATE_TRANSACTION',
        entity: 'TRANSACTION',
        entityId: id,
        oldValues: {
            declarationNumber: existing.declarationNumber,
            foreignAmount: existing.foreignAmount,
            exchangeRate: existing.exchangeRate,
            thbAmount: existing.thbAmount
        },
        newValues: {
            declarationNumber: tx.declarationNumber,
            foreignAmount: tx.foreignAmount,
            exchangeRate: tx.exchangeRate,
            thbAmount: tx.thbAmount
        }
    });

    return c.json({ data: tx });
});

// DELETE — OWNER, ADMIN, DATA_ENTRY only
transactionRoutes.delete('/:id', async (c) => {
    const companyUserCtx = c.get('companyUser');
    if (!companyUserCtx || !['OWNER', 'ADMIN', 'DATA_ENTRY'].includes(companyUserCtx.role)) {
        return c.json({ error: 'Forbidden: Insufficient role for this operation' }, 403);
    }
    const id = parseInt(c.req.param('id'));
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) return c.json({ error: 'Not found' }, 404);

    if (existing.paidThb.toNumber() > 0) {
        return c.json({ error: 'Cannot delete transaction with payment records' }, 400);
    }

    // Cascade delete: items -> invoices -> transaction
    await prisma.$transaction(async (tx) => {
        const invoiceIds = (await tx.invoice.findMany({
            where: { transactionId: id },
            select: { id: true },
        })).map(i => i.id);

        if (invoiceIds.length > 0) {
            await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
            await tx.invoice.deleteMany({ where: { transactionId: id } });
        }
        await tx.transaction.delete({ where: { id } });
    });

    return c.json({ success: true });
});

export default transactionRoutes;
