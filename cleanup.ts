import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './server/db';

async function main() {
    await prisma.user.deleteMany({
        where: { email: { startsWith: 'test.plugins' } }
    });
    console.log("Cleanup done.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
