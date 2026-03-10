import { Hono } from 'hono';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import { differenceInDays, startOfMonth, format } from 'date-fns';

const dashboardRoutes = new Hono<AppEnv>();

// GET /api/dashboard/:companyId/stats
dashboardRoutes.get('/:companyId/stats', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    if (isNaN(companyId)) {
        return c.json({ error: 'Invalid company ID' }, 400);
    }

    const yearQuery = c.req.query('year');
    const monthQuery = c.req.query('month');

    // Default to current year if no year provided
    const targetYear = yearQuery ? parseInt(yearQuery) : new Date().getFullYear();
    const targetMonth = monthQuery ? parseInt(monthQuery) : null;

    // Build Date Range bounds
    let startDate: Date;
    let endDate: Date;

    if (targetMonth !== null && !isNaN(targetMonth)) {
        // Specific month
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    } else {
        // Entire year
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    }

    try {
        // 1. Fetch Allocations (Layer 1 P/L)
        const allocations = await prisma.paymentAllocation.findMany({
            where: {
                transaction: { companyId },
                allocatedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                transaction: {
                    select: { customer: { select: { id: true, name: true } }, currencyCode: true }
                }
            }
        });

        // 2. Fetch Exchange Logs (Layer 2 P/L)
        const exchangeLogs = await prisma.exchangeLog.findMany({
            where: {
                companyId,
                exchangedDate: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // 3. Fetch Pending Invoices (for Overdue tracking)
        // A pending invoice is a transaction whose status is NOT PAID
        const pendingTransactions = await prisma.transaction.findMany({
            where: {
                companyId,
                paymentStatus: { not: 'PAID' }
            },
            include: {
                customer: { select: { name: true } }
            },
            orderBy: { invoiceDate: 'asc' } // Oldest first
        });

        // 4. Fetch FCD Pools (for current exposure)
        const fcdPools = await prisma.fCDHoldingPool.findMany({
            where: { companyId },
            include: { currency: true }
        });

        // --- Data Aggregation ---

        // A: Overall Net FX
        let netLayer1 = 0;
        let netLayer2 = 0;

        // B: Breakdown Maps
        const layer1ByMonth: Record<string, number> = {};
        const layer1ByCurrency: Record<string, number> = {};
        const customerGains: Record<number, { name: string, gain: number }> = {};

        allocations.forEach(a => {
            const gainLoss = Number(a.fxLayer1GainLoss);
            netLayer1 += gainLoss;

            // Monthly
            const monthKey = format(new Date(a.allocatedAt), 'yyyy-MM');
            layer1ByMonth[monthKey] = (layer1ByMonth[monthKey] || 0) + gainLoss;

            // Currency
            const cur = a.transaction.currencyCode;
            layer1ByCurrency[cur] = (layer1ByCurrency[cur] || 0) + gainLoss;

            // Top Customers
            if (a.transaction.customer) {
                const cId = a.transaction.customer.id;
                if (!customerGains[cId]) {
                    customerGains[cId] = { name: a.transaction.customer.name, gain: 0 };
                }
                customerGains[cId].gain += gainLoss;
            }
        });

        const layer2ByMonth: Record<string, number> = {};
        const layer2ByCurrency: Record<string, number> = {};

        exchangeLogs.forEach(l => {
            const gainLoss = Number(l.fxLayer2GainLoss);
            netLayer2 += gainLoss;

            const monthKey = format(new Date(l.exchangedDate), 'yyyy-MM');
            layer2ByMonth[monthKey] = (layer2ByMonth[monthKey] || 0) + gainLoss;

            const cur = l.currencyCode;
            layer2ByCurrency[cur] = (layer2ByCurrency[cur] || 0) + gainLoss;
        });

        // Sort Top 5 Customers by Gain (highest first)
        const topCustomers = Object.values(customerGains)
            .sort((a, b) => b.gain - a.gain)
            .slice(0, 5);

        // Current Exposure calculation
        let totalFcdValueThb = 0;
        const currentExposure = fcdPools.map(pool => {
            const fcy = Number(pool.balanceFcy);
            const rate = Number(pool.avgCostRate);
            const thbValue = fcy * rate;
            totalFcdValueThb += thbValue;
            return {
                currencyCode: pool.currencyCode,
                balanceFcy: fcy,
                avgCostRate: rate,
                estimatedThbValue: thbValue
            };
        });

        // Unpaid Invoices Mapping (include Aging)
        const now = new Date();
        const unpaidInvoices = pendingTransactions.map(t => {
            // Need to reverse-calculate pending FCY since DB only stores paidThb directly across allocations (simplification).
            // Actually, `foreignAmount` is FCY total. We don't have built-in paidFcy directly on transaction yet.
            // Estimate based on ratio of paidThb / thbAmount.
            const totalThb = Number(t.thbAmount);
            const paidThb = Number(t.paidThb);
            const ratioUnpaid = totalThb > 0 ? (totalThb - paidThb) / totalThb : 1;

            const pendingFcy = Number(t.foreignAmount) * ratioUnpaid;
            const thbValue = pendingFcy * Number(t.exchangeRate); // estimated remaining THB value

            const agingDays = differenceInDays(now, new Date(t.invoiceDate));
            return {
                id: t.id,
                invoiceNumber: t.invoiceNumber,
                customerName: t.customer?.name || 'Unknown',
                currencyCode: t.currencyCode,
                invoiceDate: t.invoiceDate,
                agingDays,
                pendingFcy,
                estimatedThbValue: thbValue
            }
        });

        return c.json({
            netFxGainLoss: netLayer1 + netLayer2,
            netLayer1,
            netLayer2,
            layer1ByMonth,
            layer1ByCurrency,
            layer2ByMonth,
            layer2ByCurrency,
            topCustomers,
            currentExposure,
            totalFcdValueThb,
            unpaidInvoices
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
    }
});

export default dashboardRoutes;
