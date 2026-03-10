import { prisma } from "./server/db.ts";

async function main() {
    const companyId = 1;
    console.log("Fetching allocations...");
    await prisma.paymentAllocation.findMany({ where: { transaction: { companyId } } });

    console.log("Fetching exchange logs...");
    await prisma.exchangeLog.findMany({ where: { companyId } });

    console.log("Fetching FCD Pools...");
    await prisma.fCDHoldingPool.findMany({ where: { companyId } });

    console.log("Fetching pending transactions...");
    await prisma.transaction.findMany({ where: { companyId, paymentStatus: { not: 'PAID' } } });

    console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
