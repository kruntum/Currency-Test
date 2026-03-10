import { Hono } from 'hono';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';

const auditLogRoutes = new Hono<AppEnv>();

// Protect all routes in this group to only OWNER and ADMIN roles
auditLogRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN']));

// GET /api/audit-logs
auditLogRoutes.get('/', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');

    // The middleware ensures companyUser exists and has the right role
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const search = c.req.query('search');

    const where: Record<string, any> = { companyId };
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { entity: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } }
        ];
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auditLog.count({ where }),
    ]);

    return c.json({
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

export default auditLogRoutes;
