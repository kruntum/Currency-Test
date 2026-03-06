import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import Decimal from 'decimal.js';

const receiptRoutes = new Hono<AppEnv>();

receiptRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']));

const allocationSchema = z.object({
    transactionId: z.number(),
    appliedFcy: z.number(),
});

const createReceiptSchema = z.object({
    customerId: z.number(),
    receivedDate: z.string(),
    currencyCode: z.string().min(1),
    receivedFcy: z.number().positive(),
    receivedBotRate: z.number().positive(),
    bankReference: z.string().optional(),
    allocations: z.array(allocationSchema),
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

    // Validate allocations
    let totalAllocatedFcy = new Decimal(0);
    for (const alloc of data.allocations) {
        totalAllocatedFcy = totalAllocatedFcy.plus(alloc.appliedFcy);
    }

    if (totalAllocatedFcy.greaterThan(receivedFcy)) {
        return c.json({ error: 'Allocations exceed received FCY' }, 400);
    }

    const unallocatedFcy = receivedFcy.minus(totalAllocatedFcy);
    const unallocatedThb = unallocatedFcy.mul(botRate);

    // Fetch transactions to calculate FX Layer 1 Gain/Loss and update statuses
    const txIds = data.allocations.map(a => a.transactionId);
    const transactions = await prisma.transaction.findMany({
        where: { id: { in: txIds }, companyId }
    });

    if (transactions.length !== txIds.length) {
        return c.json({ error: 'Invalid transaction IDs found or unauthorized' }, 400);
    }

    const txMap = new Map(transactions.map(t => [t.id, t]));
    const allocationData: any[] = [];
    const txUpdates: any[] = [];

    for (const alloc of data.allocations) {
        const tx = txMap.get(alloc.transactionId)!;
        const appliedFcy = new Decimal(alloc.appliedFcy);
        const appliedThb = appliedFcy.mul(botRate);
        const expectedThb = appliedFcy.mul(tx.exchangeRate);
        const fxLayer1GainLoss = appliedThb.minus(expectedThb);

        allocationData.push({
            transactionId: tx.id,
            appliedFcy: appliedFcy.toNumber(),
            appliedThb: appliedThb.toNumber(),
            fxLayer1GainLoss: fxLayer1GainLoss.toNumber()
        });

        const currentPaidThb = new Decimal(tx.paidThb.toString());
        const newPaidThb = currentPaidThb.plus(appliedThb);
        const totalThbAmount = new Decimal(tx.thbAmount.toString());

        let newStatus = 'PENDING';
        if (newPaidThb.greaterThan(0)) {
            // we use >= totalThbAmount but we should also allow slight decimal differences logic, here we keep it strict or just compare >=
            if (newPaidThb.greaterThanOrEqualTo(totalThbAmount)) {
                newStatus = 'PAID';
            } else {
                newStatus = 'PARTIAL';
            }
        }

        txUpdates.push({
            id: tx.id,
            paidThb: newPaidThb.toNumber(),
            paymentStatus: newStatus
        });
    }

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
                bankReference: data.bankReference || null,
                createdByUserId: user.id,
                allocations: {
                    create: allocationData
                }
            },
            include: { allocations: true }
        });

        // 2. Update Transactions
        for (const update of txUpdates) {
            await tx.transaction.update({
                where: { id: update.id },
                data: {
                    paidThb: update.paidThb,
                    paymentStatus: update.paymentStatus
                }
            });
        }

        // 3. Handle unallocated funds -> Wallet
        if (unallocatedFcy.greaterThan(0)) {
            await tx.walletTransaction.create({
                data: {
                    companyId,
                    customerId: data.customerId,
                    type: 'DEPOSIT',
                    amountFcy: unallocatedFcy.toNumber(),
                    fxRateAtTime: botRate.toNumber(),
                    amountThb: unallocatedThb.toNumber(),
                    receiptId: receipt.id,
                }
            });

            // Update Customer total wallet balance THB (Optional but good for quick UI)
            await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    walletBalanceThb: { increment: unallocatedThb.toNumber() }
                }
            });
        }

        // 4. Update FCD Holding Pool
        const existingPool = await tx.fCDHoldingPool.findUnique({
            where: { companyId_currencyCode: { companyId, currencyCode: data.currencyCode } }
        });

        if (existingPool) {
            const currentFcy = new Decimal(existingPool.balanceFcy.toString());
            const currentAvgCost = new Decimal(existingPool.avgCostRate.toString());
            const newFcy = currentFcy.plus(receivedFcy);

            // newAvgCost = [ (oldFcy * oldRate) + (receivedFcy * receivedRate) ] / newFcy
            const newAvgCost = currentFcy.mul(currentAvgCost).plus(receivedFcy.mul(botRate)).div(newFcy);

            await tx.fCDHoldingPool.update({
                where: { id: existingPool.id },
                data: {
                    balanceFcy: newFcy.toNumber(),
                    avgCostRate: newAvgCost.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber()
                }
            });
        } else {
            await tx.fCDHoldingPool.create({
                data: {
                    companyId,
                    currencyCode: data.currencyCode,
                    balanceFcy: receivedFcy.toNumber(),
                    avgCostRate: botRate.toNumber(),
                }
            });
        }

        return receipt;
    });

    return c.json({ data: result }, 201);
});

export default receiptRoutes;
