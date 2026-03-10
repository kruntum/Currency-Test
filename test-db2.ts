import { prisma } from "./server/db.ts";

async function main() {
    const receipts = await prisma.receipt.findMany({ select: { id: true, customerId: true, status: true, allocatedThb: true } });
    console.log("RECEIPTS:", JSON.stringify(receipts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
