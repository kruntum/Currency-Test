import { create } from 'zustand';

export interface AuditLogItem {
    id: number;
    companyId: number | null;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    oldValues: any | null;
    newValues: any | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface AuditStore {
    logs: AuditLogItem[];
    pagination: Pagination | null;
    loading: boolean;
    error: string | null;
    fetchLogs: (companyId: number, params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
}

export const useAuditStore = create<AuditStore>((set) => ({
    logs: [],
    pagination: null,
    loading: false,
    error: null,

    fetchLogs: async (companyId, params = {}) => {
        set({ loading: true, error: null });
        try {
            const query = new URLSearchParams();
            if (params.page) query.append('page', params.page.toString());
            if (params.limit) query.append('limit', params.limit.toString());
            if (params.search) query.append('search', params.search);

            const res = await fetch(`/api/audit-logs?companyId=${companyId}&${query.toString()}`, { credentials: 'include' });
            if (!res.ok) {
                // If 403 Forbidden, we throw specific error
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP error! status: ${res.status}`);
            }
            const json = await res.json();

            // Handle json parsing of values (they are stringified in DB)
            const parsedLogs = json.data.map((log: any) => ({
                ...log,
                oldValues: log.oldValues ? (typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues) : null,
                newValues: log.newValues ? (typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues) : null,
            }));

            set({ logs: parsedLogs, pagination: json.pagination });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },
}));
