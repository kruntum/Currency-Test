import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';
import { auth } from '../auth';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('user', session.user as AppEnv['Variables']['user']);
    c.set('session', session.session as AppEnv['Variables']['session']);
    await next();
}

export async function adminMiddleware(c: Context<AppEnv>, next: Next) {
    const user = c.get('user');

    if (!user || user.role !== 'admin') {
        return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    await next();
}
