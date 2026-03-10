import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    baseURL: `${window.location.origin}/api/auth`,
});

// Assuming the admin plugin or custom schema is used, we extend the type
export type AuthUser = typeof authClient.$Infer.Session.user & {
    role?: string;
};

export const { useSession, signIn, signUp, signOut } = authClient;
