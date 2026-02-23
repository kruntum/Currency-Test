import { create } from 'zustand';

export interface Transaction {
    id: number;
    declarationNumber: string;
    declarationDate: string;
    invoiceNumber: string;
    invoiceDate: string;
    currencyCode: string;
    foreignAmount: string;
    exchangeRate: string;
    thbAmount: string;
    rateDate: string;
    rateSource: string;
    createdBy: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string; email: string };
    currency?: { code: string; nameTh: string; nameEn: string; symbol: string };
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface TransactionState {
    transactions: Transaction[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    searchQuery: string;
    filterCurrency: string;
    filterDateFrom: string;
    filterDateTo: string;

    setSearchQuery: (query: string) => void;
    setFilterCurrency: (currency: string) => void;
    setFilterDateFrom: (date: string) => void;
    setFilterDateTo: (date: string) => void;
    setLimit: (limit: number) => void;
    fetchTransactions: (page?: number) => Promise<void>;
    createTransaction: (data: Record<string, string>) => Promise<Transaction>;
    updateTransaction: (id: number, data: Record<string, string>) => Promise<Transaction>;
    deleteTransaction: (id: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
    loading: false,
    error: null,
    searchQuery: '',
    filterCurrency: '',
    filterDateFrom: '',
    filterDateTo: '',

    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilterCurrency: (currency) => set({ filterCurrency: currency }),
    setFilterDateFrom: (date) => set({ filterDateFrom: date }),
    setFilterDateTo: (date) => set({ filterDateTo: date }),
    setLimit: (limit) => set((state) => ({ pagination: { ...state.pagination, limit, page: 1 } })),

    fetchTransactions: async (page = 1) => {
        set({ loading: true, error: null });
        try {
            const { searchQuery, filterCurrency, filterDateFrom, filterDateTo, pagination } = get();
            const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
            if (searchQuery) params.set('search', searchQuery);
            if (filterCurrency) params.set('currency', filterCurrency);
            if (filterDateFrom) params.set('dateFrom', filterDateFrom);
            if (filterDateTo) params.set('dateTo', filterDateTo);

            const res = await fetch(`/api/transactions?${params}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const json = await res.json();
            set({ transactions: json.data, pagination: json.pagination });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    createTransaction: async (data) => {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create');
        }
        const json = await res.json();
        await get().fetchTransactions(get().pagination.page);
        return json.data;
    },

    updateTransaction: async (id, data) => {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update');
        }
        const json = await res.json();
        await get().fetchTransactions(get().pagination.page);
        return json.data;
    },

    deleteTransaction: async (id) => {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete');
        }
        await get().fetchTransactions(get().pagination.page);
    },
}));
