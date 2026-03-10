import { create } from 'zustand';

export interface Customer {
    id: number;
    companyId: number;
    name: string;
    address: string | null;
    taxId: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

interface CustomerState {
    customers: Record<number, Customer[]>; // Grouped by companyId
    loading: boolean;
    error: string | null;

    fetchCustomers: (companyId: number) => Promise<void>;
    addCustomer: (companyId: number, data: { name: string; address?: string; taxId?: string }) => Promise<Customer>;
    updateCustomer: (companyId: number, customerId: number, data: { name: string; address?: string; taxId?: string }) => Promise<Customer>;
    deleteCustomer: (companyId: number, customerId: number) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
    customers: {},
    loading: false,
    error: null,

    fetchCustomers: async (companyId) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/customers?companyId=${companyId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch customers');
            const json = await res.json();
            set(state => ({
                customers: { ...state.customers, [companyId]: json.data }
            }));
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    addCustomer: async (companyId, data) => {
        const res = await fetch(`/api/customers?companyId=${companyId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add customer');
        }
        const json = await res.json();

        // Update state
        set(state => {
            const prev = state.customers[companyId] || [];
            return {
                customers: {
                    ...state.customers,
                    [companyId]: [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name))
                }
            };
        });

        return json.data;
    },

    updateCustomer: async (companyId, customerId, data) => {
        const res = await fetch(`/api/customers/${customerId}?companyId=${companyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update customer');
        }
        const json = await res.json();

        // Update state
        set(state => {
            const prev = state.customers[companyId] || [];
            return {
                customers: {
                    ...state.customers,
                    [companyId]: prev.map(c => c.id === customerId ? json.data : c).sort((a, b) => a.name.localeCompare(b.name))
                }
            };
        });

        return json.data;
    },

    deleteCustomer: async (companyId, customerId) => {
        const res = await fetch(`/api/customers/${customerId}?companyId=${companyId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete customer');
        }

        // Update state
        set(state => {
            const prev = state.customers[companyId] || [];
            return {
                customers: {
                    ...state.customers,
                    [companyId]: prev.filter(c => c.id !== customerId)
                }
            };
        });
    }
}));
