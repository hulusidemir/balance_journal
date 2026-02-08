import CryptoJS from 'crypto-js';

const BYBIT_API_URL = 'https://api.bybit.com';

interface BybitExecution {
    symbol: string;
    execId: string;
    orderId: string;
    side: 'Buy' | 'Sell';
    orderQty: string;
    execPrice: string;
    execValue: string;
    execFee: string;
    execTime: string;
    execType: string;
}

export interface BybitOrder {
    orderId: string;
    orderLinkId: string;
    symbol: string;
    side: 'Buy' | 'Sell';
    orderType: 'Limit' | 'Market';
    price: string;
    qty: string;
    cumExecQty: string;
    cumExecValue: string;
    createdTime: string;
    updatedTime: string;
    orderStatus: string;
    triggerPrice?: string;
    takeProfit?: string;
    stopLoss?: string;
}

interface BybitResponse<T> {
    retCode: number;
    retMsg: string;
    result: {
        list: T[];
        nextPageCursor: string;
    };
}

export const bybitService = {
    getApiKey() {
        return localStorage.getItem('BYBIT_API_KEY') || '';
    },

    getApiSecret() {
        return localStorage.getItem('BYBIT_API_SECRET') || '';
    },

    async getExecutions(
        category: 'linear' | 'inverse' = 'linear',
        limit: number = 50,
        startTime?: number,
        endTime?: number,
        cursor?: string
    ): Promise<{ list: BybitExecution[], nextPageCursor: string }> {
        const apiKey = this.getApiKey();
        const apiSecret = this.getApiSecret();

        if (!apiKey || !apiSecret) {
            throw new Error('API Keys not configured. Please go to Settings.');
        }

        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        const endpoint = '/v5/execution/list';

        const params: any = {
            category,
            limit: limit.toString(),
        };

        if (startTime) params.startTime = startTime.toString();
        if (endTime) params.endTime = endTime.toString();
        if (cursor) params.cursor = cursor;

        const queryString = new URLSearchParams(params).toString();
        const signatureOrigin = timestamp + apiKey + recvWindow + queryString;

        const signature = CryptoJS.HmacSHA256(signatureOrigin, apiSecret).toString(CryptoJS.enc.Hex);

        try {
            const response = await fetch(`${BYBIT_API_URL}${endpoint}?${queryString}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Bybit API Error: ${response.statusText}`);
            }

            const data: BybitResponse<BybitExecution> = await response.json();

            if (data.retCode !== 0) {
                throw new Error(`Bybit API Error: ${data.retMsg} (Code: ${data.retCode})`);
            }

            return {
                list: data.result.list,
                nextPageCursor: data.result.nextPageCursor
            };
        } catch (error) {
            console.error('Error fetching Bybit executions:', error);
            throw error;
        }
    },

    async getOpenOrders(category: 'linear' | 'inverse' = 'linear', limit: number = 50): Promise<BybitOrder[]> {
        const apiKey = this.getApiKey();
        const apiSecret = this.getApiSecret();

        if (!apiKey || !apiSecret) {
            return [];
        }

        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        const endpoint = '/v5/order/realtime';

        const params = {
            category,
            limit: limit.toString(),
            settleCoin: category === 'linear' ? 'USDT' : undefined, // Optional filter by settle coin if needed, but category usually enough
        };

        // Filter undefined params
        const cleanParams: any = {};
        Object.keys(params).forEach(key => {
            if ((params as any)[key] !== undefined) {
                cleanParams[key] = (params as any)[key];
            }
        });

        const queryString = new URLSearchParams(cleanParams).toString();
        const signatureOrigin = timestamp + apiKey + recvWindow + queryString;

        const signature = CryptoJS.HmacSHA256(signatureOrigin, apiSecret).toString(CryptoJS.enc.Hex);

        try {
            const response = await fetch(`${BYBIT_API_URL}${endpoint}?${queryString}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Bybit API Error: ${response.statusText}`);
            }

            const data: BybitResponse<BybitOrder> = await response.json();

            if (data.retCode !== 0) {
                console.error(`Bybit API Error (Orders): ${data.retMsg} (Code: ${data.retCode})`);
                // Don't throw for orders if it's just empty or minor error, return empty list
                return [];
            }

            return data.result.list;
        } catch (error) {
            console.error('Error fetching Bybit open orders:', error);
            return [];
        }
    }
};
