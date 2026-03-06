import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';

const customerRoutes = new Hono<AppEnv>();

const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    taxId: z.string().optional(),
});

// All routes expect a company context
customerRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']));

// GET /api/companies/:companyId/customers - List customers
customerRoutes.get('/', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    const customers = await prisma.customer.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
    });

    return c.json({ data: customers });
});

// POST /api/companies/:companyId/customers - Add customer
customerRoutes.post('/', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { name, address, taxId } = parsed.data;

    const customer = await prisma.customer.create({
        data: {
            companyId,
            name,
            address: address || null,
            taxId: taxId || null,
            createdBy: user.id
        }
    });

    return c.json({ data: customer }, 201);
});

// PUT & DELETE omitted for brevity unless needed. We'll just provide CRUD.
export default customerRoutes;
