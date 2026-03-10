import { prisma } from '../db';

/**
 * Creates an audit log entry in the database.
 * Used to track data modifications per user and company.
 */
export async function logAuditData(data: {
    companyId?: number;
    userId: string;
    action: string;
    entity: string;
    entityId: string | number;
    oldValues?: any;
    newValues?: any;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                companyId: data.companyId,
                action: data.action,
                entity: data.entity,
                entityId: String(data.entityId),
                oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
                newValues: data.newValues ? JSON.stringify(data.newValues) : null,
            }
        });
    } catch (error) {
        // We log the error but don't throw it. Audit logging failure should rarely 
        // crash the main business transaction.
        console.error('Failed to write audit log:', error);
    }
}
