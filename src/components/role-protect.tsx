import React from 'react';
import { useRole } from '@/hooks/use-role';

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
    // Return null or a subtle loading state to prevent flash of content
    return null; 
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
