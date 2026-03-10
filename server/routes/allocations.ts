import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import Decimal from 'decimal.js';

const allocationRoutes = new Hono<AppEnv>();

allocationRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']));

const allocationInputSchema = z.object({
    transactionId: z.number(),
    appliedThb: z.number().positive(),
    invoiceThb: z.number().positive(),
});

const createAllocationSchema = z.object({
    receiptId: z.number().optional(),
    walletTxId: z.number().optional(),
    allocations: z.array(allocationInputSchema).min(1),
});

allocationRoutes.post('/', async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = createAllocationSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    if (!data.receiptId && !data.walletTxId) {
        return c.json({ error: 'Source ID (receiptId or walletTxId) is required' }, 400);
    }

    let sourceType: 'EXCHANGE' | 'WALLET' = 'EXCHANGE';
    let availableThb = new Decimal(0);
    let receipt: any = null;

    if (data.receiptId) {
        receipt = await prisma.receipt.findFirst({
            where: { id: data.receiptId, companyId }
        });
        if (!receipt) return c.json({ error: 'Receipt not found' }, 404);

        const receivedThb = new Decimal(receipt.receivedThb.toString());
        const allocatedThb = new Decimal(receipt.allocatedThb.toString());
        availableThb = receivedThb.minus(allocatedThb);
    } else {
        // Handle wallet allocation later
        return c.json({ error: 'Wallet allocation not implemented yet' }, 501);
    }

    let totalAppliedThb = new Decimal(0);
    for (const alloc of data.allocations) {
        totalAppliedThb = totalAppliedThb.plus(alloc.appliedThb);
    }

    if (totalAppliedThb.greaterThan(availableThb)) {
        return c.json({ error: `Insufficient funds. Requested: ${totalAppliedThb.toNumber()}, Available: ${availableThb.toNumber()}` }, 400);
    }

    const txIds = data.allocations.map(a => a.transactionId);
    const transactions = await prisma.transaction.findMany({
        where: { id: { in: txIds }, companyId }
    });

    if (transactions.length !== txIds.length) {
        return c.json({ error: 'Invalid transaction IDs' }, 400);
    }

    const txMap = new Map(transactions.map(t => [t.id, t]));

    const result = await prisma.$transaction(async (tx) => {
        const createdAllocations = [];

        for (const alloc of data.allocations) {
            const transaction = txMap.get(alloc.transactionId)!;
            const appliedThb = new Decimal(alloc.appliedThb);
            const invoiceThb = new Decimal(alloc.invoiceThb);
            const fxLayer1GainLoss = appliedThb.minus(invoiceThb);

            const allocation = await tx.paymentAllocation.create({
                data: {
                    transactionId: transaction.id,
                    receiptId: data.receiptId || null,
                    walletTxId: data.walletTxId || null,
                    appliedThb: appliedThb.toNumber(),
                    invoiceThb: invoiceThb.toNumber(),
                    fxLayer1GainLoss: fxLayer1GainLoss.toNumber(),
                }
            });
            createdAllocations.push(allocation);

            const currentPaidThb = new Decimal(transaction.paidThb.toString());
            const newPaidThb = currentPaidThb.plus(invoiceThb); // update the transaction's paid balance
            const totalThbAmount = new Decimal(transaction.thbAmount.toString());

            let newStatus = 'PENDING';
            if (newPaidThb.greaterThan(0)) {
                // Adjust if needed for small floating points
                if (newPaidThb.greaterThanOrEqualTo(totalThbAmount.minus(0.01))) {
                    newStatus = 'PAID';
                } else {
                    newStatus = 'PARTIAL';
                }
            }

            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    paidThb: newPaidThb.toNumber(),
                    paymentStatus: newStatus
                }
            });
        }

        if (receipt) {
            const currentAllocatedThb = new Decimal(receipt.allocatedThb.toString());
            const newAllocatedThb = currentAllocatedThb.plus(totalAppliedThb);
            const receivedThb = new Decimal(receipt.receivedThb.toString());

            let receiptStatus = 'UNALLOCATED';
            if (newAllocatedThb.greaterThan(0)) {
                if (newAllocatedThb.greaterThanOrEqualTo(receivedThb.minus(0.01))) {
                    receiptStatus = 'FULLY_ALLOCATED';
                } else {
                    receiptStatus = 'PARTIAL';
                }
            }

            await tx.receipt.update({
                where: { id: receipt.id },
                data: {
                    allocatedThb: newAllocatedThb.toNumber(),
                    status: receiptStatus,
                }
            });
        }

        return createdAllocations;
    });

    return c.json({ data: result }, 201);
});

export default allocationRoutes;
