import { useCompanyStore } from '@/stores/company-store';
import { useSession, type AuthUser } from '@/lib/auth-client';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Checks if the currently authenticated user has the required roles
 * within the currently active company context.
 * 
 * @param allowedRoles - Array of roles allowed to access this resource (e.g., ['OWNER', 'FINANCE'])
 * @returns { hasRole: boolean, isLoading: boolean }
 */
export function useRole(allowedRoles?: string[]) {
    // 1. Get current global user session
    const { data: session, isPending: sessionLoading } = useSession();
    const user = session?.user as AuthUser | undefined;
    const userId = user?.id;
    const globalRole = user?.role;

    // 2. Get active company context
    const { companyId } = useParams();
    const currentCompanyId = parseInt(companyId || '0');

    // 3. Get company members from store
    const companyMembers = useCompanyStore((state) => state.companyMembers[currentCompanyId]);

    const hasRole = useMemo(() => {
        // Unauthenticated or missing critical data
        if (!userId) return false;

        // Global admin bypass
        if (globalRole === 'admin') return true;

        // Missing company context or no specific roles required = deny securely
        // Note: If allowedRoles is strictly undefined, we might want to default to true for public areas, 
        // but for RBAC we expect explicit declaration.
        if (!currentCompanyId || !allowedRoles || allowedRoles.length === 0) return false;

        // User belongs to company check
        if (!companyMembers) return false; // Loading or not fetched yet

        const myCompanyUser = companyMembers.find(member => member.userId === userId);
        if (!myCompanyUser) return false; // User not in this company

        // Specific role match
        return allowedRoles.includes(myCompanyUser.role);

    }, [userId, globalRole, currentCompanyId, companyMembers, allowedRoles]);

    return {
        hasRole,
        isLoading: sessionLoading || (currentCompanyId > 0 && companyMembers === undefined)
    };
}
