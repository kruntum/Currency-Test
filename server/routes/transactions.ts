import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';

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
    companyId: z.number(),
    customerId: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    invoices: z.array(invoiceSchema).min(1, 'At least 1 invoice required'),
});

// All transaction routes expect a company context
transactionRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']));

// GET /api/transactions - list with invoice counts
transactionRoutes.get('/', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '30');
    // Using companyUser from middleware
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const search = c.req.query('search');

    const paymentStatus = c.req.query('paymentStatus');

    const where: Record<string, unknown> = { companyId };
    if (search) {
        where.OR = [
            { declarationNumber: { contains: search, mode: 'insensitive' } },
            { invoices: { some: { invoiceNumber: { contains: search, mode: 'insensitive' } } } },
            { invoices: { some: { items: { some: { goodsName: { contains: search, mode: 'insensitive' } } } } } },
        ];
    }
    if (paymentStatus) {
        where.paymentStatus = paymentStatus;
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
transactionRoutes.post('/', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = transactionSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
    }

    const data = result.data;
    const rate = parseFloat(data.exchangeRate);

    // Calculate totals
    let totalForeign = 0;
    let totalThb = 0;

    const invoicesData = data.invoices.map((inv) => {
        let invForeign = 0;
        let invThb = 0;

        const items = inv.items.map((item, idx) => {
            const price = parseFloat(item.price);
            const totalPrice = parseFloat(item.totalPrice);
            const priceTHB = Math.round(price * rate * 100) / 100;
            const totalPriceTHB = Math.round(totalPrice * rate * 100) / 100;

            invForeign += totalPrice;
            invThb += totalPriceTHB;

            return {
                itemNo: idx + 1,
                goodsName: item.goodsName,
                netWeight: item.netWeight ? parseFloat(item.netWeight) : null,
                price,
                priceTHB,
                totalPrice,
                totalPriceTHB,
            };
        });

        totalForeign += invForeign;
        totalThb += invThb;

        return {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: new Date(inv.invoiceDate),
            currencyCode: data.currencyCode,
            totalForeign: invForeign,
            totalThb: invThb,
            companyId: data.companyId,
            createdBy: user.id,
            items,
        };
    });

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
            companyId: data.companyId,
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
                        create: inv.items,
                    },
                })),
            },
        },
        include: {
            invoices: { include: { items: true } },
            currency: true,
        },
    });

    return c.json({ data: tx }, 201);
});

// PUT /api/transactions/:id - update (replace invoices + items)
transactionRoutes.put('/:id', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
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

    const data = result.data;
    const rate = parseFloat(data.exchangeRate);

    let totalForeign = 0;
    let totalThb = 0;

    const invoicesData = data.invoices.map((inv) => {
        let invForeign = 0;
        let invThb = 0;

        const items = inv.items.map((item, idx) => {
            const price = parseFloat(item.price);
            const totalPrice = parseFloat(item.totalPrice);
            const priceTHB = Math.round(price * rate * 100) / 100;
            const totalPriceTHB = Math.round(totalPrice * rate * 100) / 100;

            invForeign += totalPrice;
            invThb += totalPriceTHB;

            return {
                itemNo: idx + 1,
                goodsName: item.goodsName,
                netWeight: item.netWeight ? parseFloat(item.netWeight) : null,
                price,
                priceTHB,
                totalPrice,
                totalPriceTHB,
            };
        });

        totalForeign += invForeign;
        totalThb += invThb;

        return {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: new Date(inv.invoiceDate),
            currencyCode: data.currencyCode,
            totalForeign: invForeign,
            totalThb: invThb,
            companyId: data.companyId,
            createdBy: user.id,
            items,
        };
    });

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
                        items: { create: inv.items },
                    })),
                },
            },
            include: {
                invoices: { include: { items: true } },
                currency: true,
            },
        });
    });

    return c.json({ data: tx });
});

// DELETE /api/transactions/:id - cascade delete
transactionRoutes.delete('/:id', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
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
