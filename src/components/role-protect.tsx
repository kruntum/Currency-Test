import React from 'react';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleProtectProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that conditionally renders its children based on the 
 * current user's CompanyUser role in the active company.
 * 
 * @example
 * <RoleProtect allowedRoles={['OWNER', 'FINANCE']} fallback={<span>No Access</span>}>
 *   <Button>Delete Transaction</Button>
 * </RoleProtect>
 */
export function RoleProtect({ allowedRoles, children, fallback = null }: RoleProtectProps) {
  const { hasRole, isLoading } = useRole(allowedRoles);

  if (isLoading) {
    // Show a subtle skeleton to prevent layout shift during role check
    return <Skeleton className="h-6 w-16 rounded" />;
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
