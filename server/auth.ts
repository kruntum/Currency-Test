import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { prisma } from './db';

const baseOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4501',
];
const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
const trustedOrigins = Array.from(new Set([...baseOrigins, ...envOrigins]));

console.log('Better Auth Trusted Origins:', trustedOrigins);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    advanced: {
        crossSubDomainCookies: {
            enabled: true
        }
    },
    trustedOrigins: trustedOrigins,
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        admin(),
    ],
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: false,
                defaultValue: 'user',
                input: true,
            },
        },
    },
});
