import { create } from 'zustand';

export interface Company {
    id: number;
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string; email: string };
    companyUsers?: CompanyUser[];
}

export interface CompanyUser {
    id: number;
    userId: string;
    companyId: number;
    role: string;
    createdAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
}

interface CompanyState {
    companies: Company[];
    loading: boolean;
    error: string | null;

    fetchCompanies: () => Promise<void>;
    createCompany: (data: { name: string; taxId?: string; address?: string; phone?: string }) => Promise<Company>;
    updateCompany: (id: number, data: { name: string; taxId?: string; address?: string; phone?: string }) => Promise<Company>;
    deleteCompany: (id: number) => Promise<void>;

    companyMembers: Record<number, CompanyUser[]>; // mapped by companyId
    fetchCompanyUsers: (companyId: number) => Promise<void>;
    addCompanyUser: (companyId: number, email: string, role: string) => Promise<void>;
    updateCompanyUser: (companyId: number, userId: string, role: string) => Promise<void>;
    removeCompanyUser: (companyId: number, userId: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
    companies: [],
    loading: false,
    error: null,

    fetchCompanies: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch('/api/companies', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch companies');
            const json = await res.json();
            set({ companies: json.data });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    createCompany: async (data) => {
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create company');
        }
        const json = await res.json();
        await get().fetchCompanies();
        return json.data;
    },

    updateCompany: async (id, data) => {
        const res = await fetch(`/api/companies/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update company');
        }
        const json = await res.json();
        await get().fetchCompanies();
        return json.data;
    },

    deleteCompany: async (id) => {
        const res = await fetch(`/api/companies/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to cancel company');
        }
        await get().fetchCompanies();
    },

    companyMembers: {},

    fetchCompanyUsers: async (companyId) => {
        try {
            const res = await fetch(`/api/companies/${companyId}/users`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch members');
            const json = await res.json();
            set((state) => ({
                companyMembers: {
                    ...state.companyMembers,
                    [companyId]: json.data
                }
            }));
        } catch (err) {
            console.error(err);
        }
    },

    addCompanyUser: async (companyId, email, role) => {
        const res = await fetch(`/api/companies/${companyId}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, role }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add member');
        }
        await get().fetchCompanyUsers(companyId);
    },

    updateCompanyUser: async (companyId, userId, role) => {
        const res = await fetch(`/api/companies/${companyId}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update member');
        }
        await get().fetchCompanyUsers(companyId);
    },

    removeCompanyUser: async (companyId, userId) => {
        const res = await fetch(`/api/companies/${companyId}/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to remove member');
        }
        await get().fetchCompanyUsers(companyId);
    },
}));
