import { create } from 'zustand';

export interface PaymentAllocation {
    id: number;
    transactionId: number;
    receiptId: number | null;
    // Prisma Decimal fields serialize as strings over JSON — use string | number for safety
    appliedThb: string | number;
    invoiceThb: string | number;
    fxLayer1GainLoss: string | number;
    allocatedAt: string;
    transaction?: {
        declarationNumber: string;
        currencyCode: string;
    };
    receipt?: {
        id: number;
        receivedDate: string;
        bankReference: string | null;
    };
}

export interface Receipt {
    id: number;
    companyId: number;
    customerId: number;
    receivedDate: string;
    currencyCode: string;
    // Prisma Decimal fields serialize as strings over JSON — always coerce with Number() before math
    receivedFcy: string | number;
    receivedBotRate: string | number;
    receivedThb: string | number;
    status: string;
    allocatedThb: string | number;
    bankReference: string | null;
    customer?: { id: number; name: string };
    currency?: { symbol: string; code: string; name: string };
    allocations: PaymentAllocation[];
}

interface ReceiptState {
    receipts: Receipt[];
    loading: boolean;
    error: string | null;

    fetchReceipts: (companyId: number) => Promise<void>;
    fetchUnallocatedReceipts: (companyId: number, customerId?: number) => Promise<Receipt[]>;
    createReceipt: (data: Record<string, unknown>) => Promise<Receipt>;
    deleteAllocation: (allocationId: number, companyId: number) => Promise<void>;
}

export const useReceiptStore = create<ReceiptState>((set) => ({
    receipts: [],
    loading: false,
    error: null,

    fetchReceipts: async (companyId) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/receipts?companyId=${companyId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch receipts');
            const json = await res.json();
            set({ receipts: json.data });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    fetchUnallocatedReceipts: async (companyId, customerId) => {
        set({ loading: true, error: null });
        try {
            let url = `/api/receipts/unallocated?companyId=${companyId}`;
            if (customerId) url += `&customerId=${customerId}`;

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch unallocated receipts');
            const json = await res.json();
            return json.data;
        } catch (err) {
            set({ error: (err as Error).message });
            return [];
        } finally {
            set({ loading: false });
        }
    },

    createReceipt: async (data) => {
        const companyId = data.companyId || '';
        const res = await fetch(`/api/receipts?companyId=${companyId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create receipt');
        }
        const json = await res.json();
        set(state => ({ receipts: [json.data, ...state.receipts] }));
        return json.data;
    },

    deleteAllocation: async (allocationId, companyId) => {
        const res = await fetch(`/api/allocations/${allocationId}?companyId=${companyId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to reverse allocation');
        }
    },
}));
