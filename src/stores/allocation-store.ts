import { create } from 'zustand';

export interface AllocationPayload {
    transactionId: number;
    appliedThb: number;
    invoiceThb: number;
}

interface AllocationState {
    loading: boolean;
    error: string | null;
    createAllocation: (companyId: number, receiptId: number, allocations: AllocationPayload[]) => Promise<any>;
}

export const useAllocationStore = create<AllocationState>((set) => ({
    loading: false,
    error: null,

    createAllocation: async (companyId, receiptId, allocations) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/allocations?companyId=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ receiptId, allocations }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to create allocation');
            }
            return json.data;
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        } finally {
            set({ loading: false });
        }
    }
}));
