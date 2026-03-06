import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';
import { prisma } from '../db';

/**
 * Middleware to check if the user has a specific role in a company
 * Assumes authMiddleware has already run and `c.get('user')` is available.
 * It expects `companyId` in the route param `c.req.param('companyId')` or query `c.req.query('companyId')` or header `x-company-id`.
 */
export function requireCompanyRole(allowedRoles: string[]) {
    return async (c: Context<AppEnv>, next: Next) => {
        const user = c.get('user');

        let companyIdParam = c.req.param('companyId') || c.req.query('companyId') || c.req.header('x-company-id');

        if (!companyIdParam) {
            return c.json({ error: 'Company ID is required' }, 400);
        }

        const companyId = parseInt(companyIdParam);
        if (isNaN(companyId)) {
            return c.json({ error: 'Invalid Company ID' }, 400);
        }

        let companyUser = await prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId: companyId,
                },
            },
        });

        // Backward compatibility for companies created before RBAC
        if (!companyUser) {
            const company = await prisma.company.findUnique({ where: { id: companyId } });
            if (company && company.createdBy === user.id) {
                // Auto-grant OWNER role to company creator
                companyUser = await prisma.companyUser.create({
                    data: {
                        userId: user.id,
                        companyId: companyId,
                        role: 'OWNER',
                    }
                });
            }
        }

        // Global admin can bypass (optional, but requested robust RBAC so we will check strictly)
        if (!companyUser && user.role !== 'admin') {
            return c.json({ error: 'Forbidden: You do not have access to this company' }, 403);
        }

        if (user.role !== 'admin' && companyUser && !allowedRoles.includes(companyUser.role)) {
            return c.json({ error: 'Forbidden: You do not have the required role for this company' }, 403);
        }

        c.set('companyUser', companyUser || undefined);
        await next();
    };
}
