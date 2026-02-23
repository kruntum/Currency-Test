interface BotApiResponse {
    result: {
        timestamp: string;
        api: string;
        data: {
            data_header: {
                report_name_eng: string;
                report_name_th: string;
                last_updated: string;
            };
            data_detail: Array<{
                period: string;
                currency_id: string;
                currency_name_th: string;
                currency_name_eng: string;
                buying_sight: string;
                buying_transfer: string;
                selling: string;
                mid_rate: string;
            }>;
        };
    };
}

export interface ExchangeRateResult {
    currencyId: string;
    period: string;
    buyingTransfer: string;
    source: string;
}

/**
 * Fetch exchange rate from Bank of Thailand API
 * Uses buying_transfer rate as requested
 */
export async function fetchBotExchangeRate(
    currency: string,
    date: string,
): Promise<ExchangeRateResult | null> {
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.warn('BOT_API_KEY not configured, returning null');
        return null;
    }

    const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${date}&end_period=${date}&currency=${currency}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Authorization': apiKey,
            },
        });

        if (!response.ok) {
            console.error(`BOT API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data: BotApiResponse = await response.json();
        const detail = data.result?.data?.data_detail?.[0];

        if (!detail) {
            console.warn(`No exchange rate data for ${currency} on ${date}`);
            return null;
        }

        return {
            currencyId: detail.currency_id,
            period: detail.period,
            buyingTransfer: detail.buying_transfer,
            source: 'BOT',
        };
    } catch (error) {
        console.error('BOT API fetch error:', error);
        return null;
    }
}
