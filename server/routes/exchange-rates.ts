import { Hono } from 'hono';
import { fetchBotExchangeRate } from '../services/bot-api';

const exchangeRateRoutes = new Hono();

// GET /api/rates/:currency/:date
exchangeRateRoutes.get('/:currency/:date', async (c) => {
    const currency = c.req.param('currency').toUpperCase();
    const date = c.req.param('date');

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    // Validate currency
    const validCurrencies = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];
    if (!validCurrencies.includes(currency)) {
        return c.json({ error: `Invalid currency. Supported: ${validCurrencies.join(', ')}` }, 400);
    }

    // THB to THB is always 1
    if (currency === 'THB') {
        return c.json({
            data: {
                currencyId: 'THB',
                period: date,
                buyingTransfer: '1.0000000',
                source: 'SYSTEM',
            },
        });
    }

    const rate = await fetchBotExchangeRate(currency, date);

    if (!rate) {
        return c.json({
            error: 'Exchange rate not available. You can enter the rate manually.',
            data: null,
        }, 404);
    }

    return c.json({ data: rate });
});

export default exchangeRateRoutes;
