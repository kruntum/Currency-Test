import Decimal from 'decimal.js';

// Configure decimal.js for accounting precision
Decimal.set({
    precision: 28,
    rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Calculate THB amount from foreign amount and exchange rate
 * Uses decimal.js for exact precision — no floating point errors
 */
export function calculateThbAmount(foreignAmount: string, exchangeRate: string): string {
    const amount = new Decimal(foreignAmount);
    const rate = new Decimal(exchangeRate);
    return amount.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString();
}

/**
 * Parse and validate a decimal string for monetary values
 */
export function parseDecimal(value: string, decimalPlaces: number): string {
    try {
        const decimal = new Decimal(value);
        return decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toString();
    } catch {
        throw new Error(`Invalid decimal value: ${value}`);
    }
}
