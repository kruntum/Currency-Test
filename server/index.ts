import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { auth } from './auth';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import transactionRoutes from './routes/transactions';
import exchangeRateRoutes from './routes/exchange-rates';
import userRoutes from './routes/users';
import { prisma } from './db';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

// CORS for development
app.use('/api/*', cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));

// Better Auth — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
    return auth.handler(c.req.raw);
});

// Currency list (public for auth'd users)
app.get('/api/currencies', authMiddleware, async (c) => {
    const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
    });
    return c.json({ data: currencies });
});

// Protected routes
app.use('/api/transactions/*', authMiddleware);
app.route('/api/transactions', transactionRoutes);

app.use('/api/rates/*', authMiddleware);
app.route('/api/rates', exchangeRateRoutes);

// Admin-only routes
app.use('/api/admin/*', authMiddleware, adminMiddleware);
app.route('/api/admin/users', userRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use('/*', serveStatic({ root: './dist' }));
    app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port,
});
