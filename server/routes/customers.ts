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
        where: { companyId, isDeleted: false },
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

// PUT /api/companies/:companyId/customers/:customerId - Update customer
customerRoutes.put('/:customerId', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const customerId = parseInt(c.req.param('customerId'));
    const body = await c.req.json();

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { name, address, taxId } = parsed.data;

    // Verify it exists in this company
    const existing = await prisma.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false }
    });

    if (!existing) {
        return c.json({ error: 'Customer not found' }, 404);
    }

    const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
            name,
            address: address || null,
            taxId: taxId || null,
        }
    });

    return c.json({ data: updated });
});

// DELETE /api/companies/:companyId/customers/:customerId - Soft Delete customer
customerRoutes.delete('/:customerId', requireCompanyRole(['OWNER', 'ADMIN']), async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const customerId = parseInt(c.req.param('customerId'));

    // Verify it exists in this company
    const existing = await prisma.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false }
    });

    if (!existing) {
        return c.json({ error: 'Customer not found' }, 404);
    }

    const deleted = await prisma.customer.update({
        where: { id: customerId },
        data: {
            isDeleted: true
        }
    });

    return c.json({ data: { message: 'Customer deleted successfully' } });
});

export default customerRoutes;
