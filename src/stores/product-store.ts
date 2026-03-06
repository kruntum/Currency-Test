import { create } from 'zustand';

export interface Product {
    id: number;
    name: string;
    isDeleted: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

interface ProductState {
    products: Product[];
    loading: boolean;
    error: string | null;
    fetchProducts: () => Promise<void>;
    createProduct: (name: string) => Promise<Product>;
    updateProduct: (id: number, name: string) => Promise<void>;
    deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
    products: [],
    loading: false,
    error: null,

    fetchProducts: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch('/api/products', { credentials: 'include' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch products');
            set({ products: json.data || [], error: null });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    createProduct: async (name: string) => {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
            credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create product');

        // Add new product to state
        const newProduct = json.data;
        const currentProducts = get().products;

        // If restored, it might already exist but hidden, simple replace/add
        const exists = currentProducts.find(p => p.id === newProduct.id);
        if (exists) {
            set({ products: currentProducts.map(p => p.id === newProduct.id ? newProduct : p) });
        } else {
            // keep sorted by name ideally, but appending is fine since fetch will sort later
            set({ products: [...currentProducts, newProduct].sort((a, b) => a.name.localeCompare(b.name)) });
        }

        return newProduct;
    },

    updateProduct: async (id: number, name: string) => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
            credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update product');

        set((state) => ({
            products: state.products.map(p => p.id === id ? { ...p, name } : p).sort((a, b) => a.name.localeCompare(b.name))
        }));
    },

    deleteProduct: async (id: number) => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to delete product');

        // Remove from state (since it's soft deleted, we don't want it in the list anymore)
        set((state) => ({
            products: state.products.filter(p => p.id !== id)
        }));
    },
}));
