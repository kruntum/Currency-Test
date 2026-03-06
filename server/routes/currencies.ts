import { Hono } from 'hono';
import { prisma } from '../db.js';
import { z } from 'zod';
import type { AppEnv } from '../types.js';
import { adminMiddleware } from '../middleware/auth.js';

const currencyRoutes = new Hono<AppEnv>();

// GET /api/currencies - list all currencies (public, for dropdown)
currencyRoutes.get('/', async (c) => {
    const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
    });
    return c.json({ data: currencies });
});

// === Admin Routes ===

const adminCurrencySchema = z.object({
    code: z.string().min(1).max(10),
    nameTh: z.string().min(1),
    nameEn: z.string().min(1),
    symbol: z.string().default(''),
});

const updateCurrencySchema = z.object({
    nameTh: z.string().min(1),
    nameEn: z.string().min(1),
    symbol: z.string().default(''),
});

// GET /api/admin/currencies - list all currencies with transaction count
currencyRoutes.get('/admin', adminMiddleware, async (c) => {
    const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
        include: {
            _count: { select: { transactions: true } },
        },
    });
    return c.json({ data: currencies });
});

// POST /api/admin/currencies - create currency
currencyRoutes.post('/admin', adminMiddleware, async (c) => {
    const body = await c.req.json();
    const result = adminCurrencySchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
    }

    const data = result.data;

    // Check duplicate
    const existing = await prisma.currency.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) {
        return c.json({ error: `สกุลเงิน ${data.code} มีอยู่ในระบบแล้ว` }, 409);
    }

    const currency = await prisma.currency.create({
        data: {
            code: data.code.toUpperCase(),
            nameTh: data.nameTh,
            nameEn: data.nameEn,
            symbol: data.symbol,
        },
    });

    return c.json({ data: currency }, 201);
});

// PUT /api/admin/currencies/:code - update currency
currencyRoutes.put('/admin/:code', adminMiddleware, async (c) => {
    const code = c.req.param('code');
    const body = await c.req.json();
    const result = updateCurrencySchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
    }

    const existing = await prisma.currency.findUnique({ where: { code } });
    if (!existing) {
        return c.json({ error: 'Currency not found' }, 404);
    }

    const currency = await prisma.currency.update({
        where: { code },
        data: result.data,
    });

    return c.json({ data: currency });
});

// DELETE /api/admin/currencies/:code - delete currency
currencyRoutes.delete('/admin/:code', adminMiddleware, async (c) => {
    const code = c.req.param('code');

    const existing = await prisma.currency.findUnique({
        where: { code },
        include: { _count: { select: { transactions: true } } },
    });

    if (!existing) {
        return c.json({ error: 'Currency not found' }, 404);
    }

    if (existing._count.transactions > 0) {
        return c.json({
            error: `ไม่สามารถลบสกุลเงิน ${code} ได้ เนื่องจากมี ${existing._count.transactions} รายการใช้อยู่`,
        }, 409);
    }

    await prisma.currency.delete({ where: { code } });
    return c.json({ success: true });
});

export default currencyRoutes;
