import { Hono } from 'hono';
import { prisma } from '../db';
import { calculateThbAmount, parseDecimal } from '../services/currency';
import { z } from 'zod';
import type { AppEnv } from '../types';

const transactionRoutes = new Hono<AppEnv>();

const transactionSchema = z.object({
    declarationNumber: z.string().min(1, 'Declaration number is required'),
    declarationDate: z.string().min(1, 'Declaration date is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    currencyCode: z.string().min(1, 'Currency code is required'),
    foreignAmount: z.string().min(1, 'Foreign amount is required'),
    exchangeRate: z.string().min(1, 'Exchange rate is required'),
    rateDate: z.string().min(1, 'Rate date is required'),
    rateSource: z.enum(['BOT', 'MANUAL']).default('BOT'),
    notes: z.string().optional(),
});

// GET /api/transactions — List with search, filter, pagination
transactionRoutes.get('/', async (c) => {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const currency = c.req.query('currency') || '';
    const dateFrom = c.req.query('dateFrom') || '';
    const dateTo = c.req.query('dateTo') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Role-based access: user sees only own, admin sees all
    if (user.role !== 'admin') {
        where.createdBy = user.id;
    }

    if (search) {
        where.OR = [
            { declarationNumber: { contains: search, mode: 'insensitive' } },
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (currency) {
        where.currencyCode = currency;
    }

    if (dateFrom || dateTo) {
        where.declarationDate = {};
        if (dateFrom) (where.declarationDate as Record<string, unknown>).gte = new Date(dateFrom);
        if (dateTo) (where.declarationDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where: where as never,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true } },
                currency: true,
            },
        }),
        prisma.transaction.count({ where: where as never }),
    ]);

    return c.json({
        data: transactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
});

// GET /api/transactions/:id
transactionRoutes.get('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));

    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true } },
            currency: true,
        },
    });

    if (!transaction) {
        return c.json({ error: 'Transaction not found' }, 404);
    }

    // Role check
    if (user.role !== 'admin' && transaction.createdBy !== user.id) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json({ data: transaction });
});

// POST /api/transactions
transactionRoutes.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;

    // Calculate THB amount using decimal.js
    const foreignAmount = parseDecimal(data.foreignAmount, 4);
    const exchangeRate = parseDecimal(data.exchangeRate, 6);
    const thbAmount = calculateThbAmount(foreignAmount, exchangeRate);

    const transaction = await prisma.transaction.create({
        data: {
            declarationNumber: data.declarationNumber,
            declarationDate: new Date(data.declarationDate),
            invoiceNumber: data.invoiceNumber,
            invoiceDate: new Date(data.invoiceDate),
            currencyCode: data.currencyCode,
            foreignAmount,
            exchangeRate,
            thbAmount,
            rateDate: new Date(data.rateDate),
            rateSource: data.rateSource,
            createdBy: user.id,
            notes: data.notes || null,
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            currency: true,
        },
    });

    return c.json({ data: transaction }, 201);
});

// PUT /api/transactions/:id
transactionRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
        return c.json({ error: 'Transaction not found' }, 404);
    }

    if (user.role !== 'admin' && existing.createdBy !== user.id) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const foreignAmount = parseDecimal(data.foreignAmount, 4);
    const exchangeRate = parseDecimal(data.exchangeRate, 6);
    const thbAmount = calculateThbAmount(foreignAmount, exchangeRate);

    const transaction = await prisma.transaction.update({
        where: { id },
        data: {
            declarationNumber: data.declarationNumber,
            declarationDate: new Date(data.declarationDate),
            invoiceNumber: data.invoiceNumber,
            invoiceDate: new Date(data.invoiceDate),
            currencyCode: data.currencyCode,
            foreignAmount,
            exchangeRate,
            thbAmount,
            rateDate: new Date(data.rateDate),
            rateSource: data.rateSource,
            notes: data.notes || null,
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            currency: true,
        },
    });

    return c.json({ data: transaction });
});

// DELETE /api/transactions/:id
transactionRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));

    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
        return c.json({ error: 'Transaction not found' }, 404);
    }

    if (user.role !== 'admin' && existing.createdBy !== user.id) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    await prisma.transaction.delete({ where: { id } });

    return c.json({ message: 'Transaction deleted' });
});

export default transactionRoutes;
