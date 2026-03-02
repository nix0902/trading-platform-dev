/**
 * Binance Combined Data Provider
 * 
 * Комбинирует WebSocket и REST API:
 * 1. Первичная загрузка через REST API
 * 2. Обновления в реальном времени через WebSocket
 * 3. Автоматическое переключение при ошибках
 */

import { BinanceWebSocketClient, type Kline, type KlineInterval } from './websocket-client';
import { BinanceRestClient, type KlineData } from './rest-client';

export interface CombinedProviderOptions {
  symbol: string;
  interval: KlineInterval;
  onData: (candles: Candle[], newCandle: Candle | null) => void;
  onError?: (error: Error) => void;
  historicalLimit?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ConnectionMethod = 'websocket' | 'polling' | 'hybrid';

/**
 * Комбинированный провайдер данных
 */
export class BinanceCombinedProvider {
  private wsClient: BinanceWebSocketClient | null = null;
  private restClient: BinanceRestClient;
  private options: Required<CombinedProviderOptions>;
  private candles: Candle[] = [];
  private currentMethod: ConnectionMethod = 'hybrid';
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(options: CombinedProviderOptions) {
    this.options = {
      historicalLimit: 500,
      onError: () => {},
      ...options,
    };

    this.restClient = new BinanceRestClient();
  }

  /**
   * Запуск провайдера
   */
  async start(): Promise<void> {
    // 1. Загружаем исторические данные
    await this.loadHistoricalData();

    // 2. Подключаем WebSocket
    this.connectWebSocket();
  }

  /**
   * Загрузка исторических данных через REST API
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      const data = await this.restClient.getKlines(
        this.options.symbol,
        this.options.interval,
        this.options.historicalLimit
      );

      this.candles = data.map((k) => ({
        time: k.openTime / 1000,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      }));

      // Отправляем исторические данные
      this.options.onData(this.candles, null);
      console.log(`📊 Loaded ${this.candles.length} historical candles`);
    } catch (error) {
      console.error('Failed to load historical data:', error);
      this.options.onError(error as Error);
    }
  }

  /**
   * Подключение WebSocket
   */
  private connectWebSocket(): void {
    this.wsClient = new BinanceWebSocketClient({
      symbol: this.options.symbol,
      interval: this.options.interval,
      onMessage: (kline: Kline) => {
        this.handleWebSocketMessage(kline);
      },
      onError: (error: Error) => {
        console.error('WebSocket error:', error);
        this.options.onError(error);
        
        // Fallback на polling
        if (this.currentMethod === 'hybrid') {
          this.startPolling();
        }
      },
      onConnect: () => {
        console.log('📊 WebSocket connected');
        this.stopPolling();
      },
      onDisconnect: () => {
        console.log('📊 WebSocket disconnected');
      },
    });

    this.wsClient.connect();
  }

  /**
   * Обработка WebSocket сообщений
   */
  private handleWebSocketMessage(kline: Kline): void {
    // Обновляем или добавляем свечу
    const lastCandle = this.candles[this.candles.length - 1];
    
    if (lastCandle && lastCandle.time === kline.time) {
      // Обновляем существующую свечу
      this.candles[this.candles.length - 1] = {
        time: kline.time,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      };
    } else if (kline.time > (lastCandle?.time || 0)) {
      // Добавляем новую свечу
      this.candles.push({
        time: kline.time,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      });

      // Ограничиваем количество свечей
      if (this.candles.length > this.options.historicalLimit + 50) {
        this.candles = this.candles.slice(-this.options.historicalLimit);
      }
    }

    // Отправляем обновление
    const newCandle: Candle = {
      time: kline.time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    };

    this.options.onData(this.candles, newCandle);
  }

  /**
   * Запуск polling (fallback)
   */
  private startPolling(): void {
    if (this.pollInterval) return;

    console.log('📊 Starting polling fallback');
    
    // Poll каждые 2 секунды
    this.pollInterval = setInterval(async () => {
      try {
        const data = await this.restClient.getKlines(
          this.options.symbol,
          this.options.interval,
          1
        );

        if (data.length > 0) {
          const k = data[0];
          this.handleWebSocketMessage({
            time: k.openTime / 1000,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            quoteVolume: k.quoteAssetVolume,
            trades: k.numberOfTrades,
            isClosed: false,
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  }

  /**
   * Остановка polling
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Изменение символа или интервала
   */
  async updateStream(symbol: string, interval: KlineInterval): Promise<void> {
    if (this.options.symbol === symbol && this.options.interval === interval) {
      return;
    }

    this.options.symbol = symbol;
    this.options.interval = interval;
    this.candles = [];

    // Перезапуск
    this.stopPolling();
    if (this.wsClient) {
      this.wsClient.destroy();
      this.wsClient = null;
    }

    await this.start();
  }

  /**
   * Получение текущего метода подключения
   */
  getMethod(): ConnectionMethod {
    if (this.wsClient?.isConnected) {
      return 'websocket';
    } else if (this.pollInterval) {
      return 'polling';
    }
    return 'hybrid';
  }

  /**
   * Остановка провайдера
   */
  stop(): void {
    this.stopPolling();
    if (this.wsClient) {
      this.wsClient.destroy();
      this.wsClient = null;
    }
  }

  /**
   * Уничтожение провайдера
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }
}

/**
 * Создание провайдера
 */
export function createBinanceProvider(options: CombinedProviderOptions): BinanceCombinedProvider {
  return new BinanceCombinedProvider(options);
}
