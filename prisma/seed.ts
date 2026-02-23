import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Create a separate Prisma client for seeding
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Seed currencies
    const currencies = [
        { code: 'CNY', nameTh: 'จีน : หยวน เรนมินบิ', nameEn: 'CHINA : YUAN RENMINBI', symbol: '¥' },
        { code: 'USD', nameTh: 'สหรัฐอเมริกา : ดอลลาร์', nameEn: 'USA : US DOLLAR', symbol: '$' },
        { code: 'THB', nameTh: 'ไทย : บาท', nameEn: 'THAILAND : BAHT', symbol: '฿' },
        { code: 'EUR', nameTh: 'ยูโรโซน : ยูโร', nameEn: 'EUROZONE : EURO', symbol: '€' },
        { code: 'JPY', nameTh: 'ญี่ปุ่น : เยน', nameEn: 'JAPAN : YEN', symbol: '¥' },
        { code: 'GBP', nameTh: 'อังกฤษ : ปอนด์', nameEn: 'GREAT BRITAIN : POUND', symbol: '£' },
        { code: 'KRW', nameTh: 'เกาหลีใต้ : วอน', nameEn: 'SOUTH KOREA : WON', symbol: '₩' },
    ];

    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            update: currency,
            create: currency,
        });
    }
    console.log('✅ Seeded currencies');

    // Seed admin user via Better Auth API
    const auth = betterAuth({
        database: prismaAdapter(prisma, { provider: 'postgresql' }),
        emailAndPassword: { enabled: true },
    });

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
        where: { email: 'admin@currency.local' },
    });

    if (!existingAdmin) {
        // Create admin user through Better Auth (handles password hashing)
        const ctx = await auth.api.signUpEmail({
            body: {
                name: 'Admin',
                email: 'admin@currency.local',
                password: 'admin1234',
            },
        });

        if (ctx?.user) {
            // Set role to admin
            await prisma.user.update({
                where: { id: ctx.user.id },
                data: { role: 'admin' },
            });
            console.log('✅ Seeded admin user: admin@currency.local / admin1234');
        }
    } else {
        console.log('ℹ️  Admin user already exists');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
