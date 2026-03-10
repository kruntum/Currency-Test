import { create } from 'zustand';

export interface PaymentAllocation {
    id: number;
    transactionId: number;
    receiptId: number | null;
    appliedThb: number;
    invoiceThb: number;
    fxLayer1GainLoss: number;
    transaction?: {
        declarationNumber: string;
    };
}

export interface Receipt {
    id: number;
    companyId: number;
    customerId: number;
    receivedDate: string;
    currencyCode: string;
    receivedFcy: number;
    receivedBotRate: number;
    receivedThb: number;
    status: string;
    allocatedThb: number;
    bankReference: string | null;
    customer?: { id: number; name: string };
    currency?: { symbol: string; code: string; name: string; };
    allocations: PaymentAllocation[];
}

interface ReceiptState {
    receipts: Receipt[];
    loading: boolean;
    error: string | null;

    fetchReceipts: (companyId: number) => Promise<void>;
    fetchUnallocatedReceipts: (companyId: number, customerId?: number) => Promise<Receipt[]>;
    createReceipt: (data: Record<string, any>) => Promise<Receipt>;
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
    }
}));
