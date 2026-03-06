import { create } from 'zustand';

export interface FCDHoldingPool {
    id: number;
    companyId: number;
    currencyCode: string;
    balanceFcy: string;
    avgCostRate: string;
}

export interface ExchangeLog {
    id: number;
    companyId: number;
    currencyCode: string;
    amountFcy: string;
    actualBankRate: string;
    thbReceived: string;
    costRate: string;
    fxLayer2GainLoss: string;
    exchangedDate: string;
    currency?: { symbol: string; };
}

interface TreasuryState {
    pools: FCDHoldingPool[];
    logs: ExchangeLog[];
    loading: boolean;
    error: string | null;

    fetchPools: (companyId: number) => Promise<void>;
    fetchLogs: (companyId: number) => Promise<void>;
    exchangeFcy: (data: Record<string, any>) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
    pools: [],
    logs: [],
    loading: false,
    error: null,

    fetchPools: async (companyId) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/treasury/fcd?companyId=${companyId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch FCD pools');
            const json = await res.json();
            set({ pools: json.data });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    fetchLogs: async (companyId) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/treasury/exchange-logs?companyId=${companyId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch exchange logs');
            const json = await res.json();
            set({ logs: json.data });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    exchangeFcy: async (data) => {
        const res = await fetch('/api/treasury/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to process exchange');
        }

        // Refresh data
        if (data.companyId) {
            await get().fetchPools(data.companyId);
            await get().fetchLogs(data.companyId);
        }
    }
}));
