import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export interface FormItem {
  goodsName: string;
  netWeight: string;
  price: string;
  totalPrice: string;
}

export interface FormInvoice {
  invoiceNumber: string;
  invoiceDate: Date | string | null;
  items: FormItem[];
  isOpen?: boolean;
}

export function calculateInvoiceTotals(
  items: { totalPrice: string; price?: string }[],
  exchangeRate: number,
  roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string = 'ITEM_ROUNDING'
) {
  let totalForeign = 0;
  let totalThb = 0;

  items.forEach((item) => {
    const itemTotalPrice = parseFloat(item.totalPrice) || 0;
    totalForeign += itemTotalPrice;

    if (roundingMethod === 'ITEM_ROUNDING') {
      totalThb += Math.round(itemTotalPrice * exchangeRate * 100) / 100;
    }
  });

  if (roundingMethod === 'TOTAL_ROUNDING') {
    totalThb = Math.round(totalForeign * exchangeRate * 100) / 100;
  }

  return { totalForeign, totalThb };
}

export function calculateTransactionTotals(
  invoices: FormInvoice[],
  exchangeRate: number,
  roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string = 'ITEM_ROUNDING'
) {
  let grandTotalForeign = 0;
  let grandTotalThb = 0;

  const invoiceTotals = invoices.map((inv) => {
    const { totalForeign, totalThb } = calculateInvoiceTotals(inv.items, exchangeRate, roundingMethod);
    grandTotalForeign += totalForeign;
    
    if (roundingMethod === 'ITEM_ROUNDING') {
      grandTotalThb += totalThb;
    }
    
    return { totalForeign, totalThb, itemCount: inv.items.length };
  });

  if (roundingMethod === 'TOTAL_ROUNDING') {
    grandTotalThb = Math.round(grandTotalForeign * exchangeRate * 100) / 100;
  }

  return {
    invoiceTotals,
    grandTotalForeign,
    grandTotalThb,
  };
}

