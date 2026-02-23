import { Hono } from 'hono';
import { prisma } from '../db.js';

const currencyRoutes = new Hono();

// GET /api/currencies - list all currencies
currencyRoutes.get('/', async (c) => {
    const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
    });
    return c.json({ data: currencies });
});

export default currencyRoutes;
