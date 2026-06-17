// Shared types used across multiple components

export type CompanyUserRole = 'OWNER' | 'ADMIN' | 'FINANCE' | 'DATA_ENTRY';

export interface Currency {
    code: string;
    nameTh: string;
    nameEn: string;
    symbol: string;
}

export interface Customer {
    id: number;
    name: string;
    companyId: number;
}
