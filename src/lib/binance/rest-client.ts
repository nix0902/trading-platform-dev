/**
 * Binance REST API Client
 * 
 * Альтернативный метод получения данных через REST API с polling.
 * Используется для:
 * - Загрузки исторических данных
 * - Резервного метода при недоступности WebSocket
 * 
 * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api
 */

import type { KlineInterval } from './websocket-client';

export interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

export interface BinanceRestOptions {
  baseUrl?: string;
  timeout?: number;
}

/**
 * Binance REST API Client
 */
export class BinanceRestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: BinanceRestOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.binance.com';
    this.timeout = options.timeout || 10000;
  }

  /**
   * Получение свечей (Klines)
   * 
   * @param symbol - Торговая пара (BTCUSDT)
   * @param interval - Интервал свечей
   * @param limit - Количество свечей (max 1500)
   */
  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit: number = 500
  ): Promise<KlineData[]> {
    const url = new URL(`${this.baseUrl}/api/v3/klines`);
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', limit.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data: unknown[][] = await response.json();

      return data.map((k) => ({
        openTime: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
        closeTime: k[6] as number,
        quoteAssetVolume: parseFloat(k[7] as string),
        numberOfTrades: k[8] as number,
        takerBuyBaseAssetVolume: parseFloat(k[9] as string),
        takerBuyQuoteAssetVolume: parseFloat(k[10] as string),
      }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Получение текущей цены
   */
  async getPrice(symbol: string): Promise<number> {
    const url = new URL(`${this.baseUrl}/api/v3/ticker/price`);
    url.searchParams.set('symbol', symbol.toUpperCase());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return parseFloat(data.price);
  }

  /**
   * Получение 24hr статистики
   */
  async get24hrStats(symbol: string): Promise<{
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    weightedAvgPrice: string;
    prevClosePrice: string;
    lastPrice: string;
    lastQty: string;
    bidPrice: string;
    askPrice: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
  }> {
    const url = new URL(`${this.baseUrl}/api/v3/ticker/24hr`);
    url.searchParams.set('symbol', symbol.toUpperCase());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Получение книги ордеров
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<{
    lastUpdateId: number;
    bids: [string, string][];
    asks: [string, string][];
  }> {
    const url = new URL(`${this.baseUrl}/api/v3/depth`);
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
let client: BinanceRestClient | null = null;

export function getBinanceRestClient(): BinanceRestClient {
  if (!client) {
    client = new BinanceRestClient();
  }
  return client;
}
