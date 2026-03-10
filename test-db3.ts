import { prisma } from "./server/db.ts";

async function main() {
    const txs = await prisma.transaction.findMany({
        select: {
            id: true,
            declarationNumber: true,
            customerId: true,
            paymentStatus: true,
            paidThb: true,
            thbAmount: true,
            customer: { select: { name: true } }
        }
    });
    console.log("All TXS:");
    console.table(txs.map(tx => ({
        id: tx.id,
        declNum: tx.declarationNumber,
        customerName: tx.customer?.name || null,
        status: tx.paymentStatus,
        thbAmount: tx.thbAmount.toString(),
        paidThb: tx.paidThb.toString()
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
