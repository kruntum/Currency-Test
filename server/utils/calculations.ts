export interface RawInvoiceItem {
    goodsName: string;
    netWeight: number | null;
    price: number;
    totalPrice: number;
    itemNo?: number | null;
}

export interface RawInvoice {
    invoiceNumber: string;
    invoiceDate: Date;
    items: RawInvoiceItem[];
}

export interface CalculatedItem {
    goodsName: string;
    netWeight: number | null;
    price: number;
    priceTHB: number;
    totalPrice: number;
    totalPriceTHB: number;
    itemNo?: number | null;
}

export interface CalculatedInvoice {
    invoiceNumber: string;
    invoiceDate: Date;
    currencyCode: string;
    totalForeign: number;
    totalThb: number;
    companyId: number;
    createdBy: string;
    items: CalculatedItem[];
}

export interface CalculatedTotals {
    grandTotalForeign: number;
    grandTotalThb: number;
    invoices: CalculatedInvoice[];
}

/**
 * Calculates totals for a transaction with multiple invoices and items
 * based on the specified rounding method.
 */
export function calculateTransactionTotals(params: {
    invoices: RawInvoice[];
    exchangeRate: number;
    currencyCode: string;
    companyId: number;
    userId: string;
    roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string;
}): CalculatedTotals {
    const { invoices, exchangeRate, currencyCode, companyId, userId, roundingMethod } = params;

    let grandTotalForeign = 0;
    let grandTotalThb = 0;

    const calculatedInvoices = invoices.map((inv) => {
        let invForeign = 0;
        let invThb = 0;

        const calculatedItems = inv.items.map((item) => {
            const price = item.price;
            const totalPrice = item.totalPrice;
            const priceTHB = Math.round(price * exchangeRate * 100) / 100;
            const totalPriceTHB = Math.round(totalPrice * exchangeRate * 100) / 100;

            invForeign += totalPrice;
            if (roundingMethod === 'ITEM_ROUNDING') {
                invThb += totalPriceTHB;
            }

            return {
                goodsName: item.goodsName,
                netWeight: item.netWeight,
                price,
                priceTHB,
                totalPrice,
                totalPriceTHB,
                itemNo: item.itemNo,
            };
        });

        if (roundingMethod === 'TOTAL_ROUNDING') {
            invThb = Math.round(invForeign * exchangeRate * 100) / 100;
        }

        grandTotalForeign += invForeign;
        if (roundingMethod === 'ITEM_ROUNDING') {
            grandTotalThb += invThb;
        }

        return {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            currencyCode,
            totalForeign: invForeign,
            totalThb: invThb,
            companyId,
            createdBy: userId,
            items: calculatedItems,
        };
    });

    if (roundingMethod === 'TOTAL_ROUNDING') {
        grandTotalThb = Math.round(grandTotalForeign * exchangeRate * 100) / 100;
    }

    return {
        grandTotalForeign,
        grandTotalThb,
        invoices: calculatedInvoices,
    };
}
