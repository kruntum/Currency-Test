import { Hono } from 'hono';
import { prisma } from '../db';
import { auth } from '../auth';

const userRoutes = new Hono();

// GET /api/admin/users — List all users (admin only)
userRoutes.get('/', async (c) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return c.json({ data: users });
});

// POST /api/admin/users — Create a new user (admin only)
userRoutes.post('/', async (c) => {
    const { name, email, role, password } = await c.req.json();

    if (!name || !email || !password) {
        return c.json({ error: 'ชื่อ อีเมล และรหัสผ่านเป็นข้อมูลบังคับ' }, 400);
    }

    if (!['admin', 'user'].includes(role || 'user')) {
        return c.json({ error: 'ข้อมูลบทบาทไม่ถูกต้อง' }, 400);
    }

    try {
        const origin = c.req.header('origin') || 'http://localhost:5173';

        // We use the Better-Auth Node API directly on the server instead of HTTP fetch.
        // We DO NOT pass "role" here because Better-Auth's admin plugin strictly blocks it during signup.
        const ctx = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password
            },
            asResponse: false
        });

        if (!ctx || !ctx.user) {
            return c.json({ error: 'ไม่สามารถสร้างผู้ใช้ได้' }, 400);
        }

        // Auto verify email and set the requested role via Prisma since we are an admin
        const updatedUser = await prisma.user.update({
            where: { id: ctx.user.id },
            data: {
                emailVerified: true,
                role: role || 'user'
            },
            select: { id: true, name: true, email: true, role: true }
        });

        return c.json({ success: true, data: updatedUser });
    } catch (err: any) {
        console.error('Error creating user:', err);
        if (err.statusCode === 400 && err.message?.includes('already exists')) {
            return c.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' }, 400);
        }
        return c.json({ error: err.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' }, 500);
    }
});

// PUT /api/admin/users/:id — Update a user (admin only)
userRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const { name, email, role } = await c.req.json();

    try {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) {
            if (!['admin', 'user'].includes(role)) {
                return c.json({ error: 'Invalid role. Use "admin" or "user"' }, 400);
            }
            updateData.role = role;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true },
        });

        return c.json({ data: user });
    } catch (err: any) {
        console.error('Error updating user:', err);
        if (err.code === 'P2002') {
            return c.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 400);
        }
        return c.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้' }, 500);
    }
});

// DELETE /api/admin/users/:id — Delete a user (admin only)
userRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');

    try {
        const transactionCount = await prisma.transaction.count({
            where: { createdBy: id }
        });

        if (transactionCount > 0) {
            return c.json({ error: 'ไม่สามารถลบผู้ใช้ที่มีรายการบันทึกไว้ได้' }, 400); // Cannot delete user with items
        }

        await prisma.user.delete({
            where: { id }
        });

        return c.json({ success: true });
    } catch (err: any) {
        console.error('Error deleting user:', err);
        return c.json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' }, 500);
    }
});

export default userRoutes;
