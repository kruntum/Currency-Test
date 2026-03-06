import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { auth } from './auth';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import transactionRoutes from './routes/transactions';
import companyRoutes from './routes/companies';
import currencyRoutes from './routes/currencies';
import exchangeRateRoutes from './routes/exchange-rates';
import productRoutes from './routes/products';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import receiptRoutes from './routes/receipts';
import treasuryRoutes from './routes/treasury';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

// CORS for development
app.use('/api/*', cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://e18f-118-172-187-67.ngrok-free.app'],
    credentials: true,
}));

// Better Auth — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
    return auth.handler(c.req.raw);
});

// Currencies (public GET + admin CRUD via /admin sub-routes)
app.use('/api/currencies/*', authMiddleware);
app.route('/api/currencies', currencyRoutes);

// Protected routes
app.use('/api/transactions/*', authMiddleware);
app.route('/api/transactions', transactionRoutes);

app.use('/api/companies/*', authMiddleware);
app.route('/api/companies', companyRoutes);

app.use('/api/products/*', authMiddleware);
app.route('/api/products', productRoutes);

app.use('/api/rates/*', authMiddleware);
app.route('/api/rates', exchangeRateRoutes);

app.use('/api/customers/*', authMiddleware);
app.route('/api/customers', customerRoutes);

app.use('/api/receipts/*', authMiddleware);
app.route('/api/receipts', receiptRoutes);

app.use('/api/treasury/*', authMiddleware);
app.route('/api/treasury', treasuryRoutes);

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
