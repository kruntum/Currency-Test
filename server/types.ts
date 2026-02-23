// Shared Hono environment type for typed context variables
export type AppEnv = {
    Variables: {
        user: {
            id: string;
            name: string;
            email: string;
            role?: string;
        };
        session: {
            id: string;
            userId: string;
        };
    };
};
