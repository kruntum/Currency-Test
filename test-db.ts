import { prisma } from "./server/db.ts";

async function main() {
    const txs = await prisma.transaction.findMany({ select: { id: true, customerId: true, paymentStatus: true } });
    console.log(JSON.stringify(txs, null, 2));

    const pending = await prisma.transaction.findMany({ where: { paymentStatus: 'PENDING' } });
    console.log('PENDING count', pending.length);

    const partial = await prisma.transaction.findMany({ where: { paymentStatus: 'PARTIAL' } });
    console.log('PARTIAL count', partial.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
