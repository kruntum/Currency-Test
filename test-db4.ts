import { prisma } from "./server/db.ts";

async function main() {
    const allocations = await prisma.paymentAllocation.findMany({
        where: { transactionId: { in: [4, 5] } }
    });
    console.log("ALLOCATIONS:", JSON.stringify(allocations, null, 2));

    const allTx = await prisma.transaction.findMany();
    // Maybe we need to check if they are paid from receipt 1?
}

main().catch(console.error).finally(() => prisma.$disconnect());
