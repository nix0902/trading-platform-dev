/**
 * Binance WebSocket Client
 * 
 * Правильная реализация подключения к Binance WebSocket Streams
 * с автоматическим переподключением, ping/pong и обработкой ошибок.
 * 
 * @see https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
 */

export type KlineInterval = 
  | '1s' | '1m' | '3m' | '5m' | '15m' | '30m' 
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' 
  | '1d' | '3d' | '1w' | '1M';

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  isClosed: boolean;
}

export interface KlineMessage {
  e: 'kline';           // Event type
  E: number;            // Event time
  s: string;            // Symbol
  k: {
    t: number;          // Kline start time
    T: number;          // Kline close time
    s: string;          // Symbol
    i: KlineInterval;   // Interval
    o: string;          // Open price
    c: string;          // Close price
    h: string;          // High price
    l: string;          // Low price
    v: string;          // Base asset volume
    n: number;          // Number of trades
    x: boolean;         // Is this kline closed?
    q: string;          // Quote asset volume
    V: string;          // Taker buy base asset volume
    Q: string;          // Taker buy quote asset volume
  };
}

export interface BinanceWebSocketOptions {
  symbol: string;
  interval: KlineInterval;
  onMessage: (kline: Kline) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface BinanceWebSocketClientEvents {
  onMessage?: (kline: Kline) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Binance WebSocket Client
 * 
 * Основные особенности:
 * - Автоматическое переподключение с экспоненциальной задержкой
 * - Ping/Pong обработка (Binance отправляет ping каждые 20 сек)
 * - Обработка ошибок и таймаутов
 * - Graceful shutdown
 */
export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private options: Required<BinanceWebSocketOptions>;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;
  private pingTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Binance WebSocket URLs
  private static readonly SPOT_WS_URL = 'wss://stream.binance.com:9443/ws';
  private static readonly SPOT_STREAM_URL = 'wss://stream.binance.com:9443/stream';
  private static readonly FUTURES_WS_URL = 'wss://fstream.binance.com/ws';

  constructor(options: BinanceWebSocketOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      onError: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      ...options,
    };
  }

  /**
   * Подключение к WebSocket
   */
  connect(): void {
    if (this.isConnecting || this.isDestroyed) return;

    this.isConnecting = true;
    const streamName = `${this.options.symbol.toLowerCase()}@kline_${this.options.interval}`;
    const url = `${BinanceWebSocketClient.SPOT_WS_URL}/${streamName}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log(`📡 [Binance WS] Connected to ${streamName}`);
        this.options.onConnect();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('📡 [Binance WS] Error:', error);
        this.options.onError(new Error('WebSocket error'));
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        console.log(`📡 [Binance WS] Disconnected: ${event.code} - ${event.reason}`);
        this.options.onDisconnect();
        this.scheduleReconnect();
      };
    } catch (error) {
      this.isConnecting = false;
      this.options.onError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Обработка входящих сообщений
   */
  private handleMessage(data: string): void {
    try {
      const message: KlineMessage = JSON.parse(data);

      if (message.e === 'kline') {
        const kline: Kline = {
          time: message.k.t / 1000,
          open: parseFloat(message.k.o),
          high: parseFloat(message.k.h),
          low: parseFloat(message.k.l),
          close: parseFloat(message.k.c),
          volume: parseFloat(message.k.v),
          quoteVolume: parseFloat(message.k.q),
          trades: message.k.n,
          isClosed: message.k.x,
        };

        this.options.onMessage(kline);
      }
    } catch (error) {
      console.error('📡 [Binance WS] Parse error:', error);
    }
  }

  /**
   * Планирование переподключения с экспоненциальной задержкой
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('📡 [Binance WS] Max reconnect attempts reached');
      this.options.onError(new Error('Max reconnect attempts reached'));
      return;
    }

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectAttempts++;
    console.log(`📡 [Binance WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Изменение символа или интервала
   */
  updateStream(symbol: string, interval: KlineInterval): void {
    if (this.options.symbol === symbol && this.options.interval === interval) {
      return;
    }

    this.options.symbol = symbol;
    this.options.interval = interval;
    this.reconnectAttempts = 0;

    // Переподключение с новым стримом
    this.disconnect();
    this.connect();
  }

  /**
   * Отключение
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }
  }

  /**
   * Полное уничтожение клиента
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
  }

  /**
   * Получение текущего статуса соединения
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Простой хук для React
 */
export function createBinanceKlineStream(
  symbol: string,
  interval: KlineInterval,
  onKline: (kline: Kline) => void
): {
  connect: () => void;
  disconnect: () => void;
  updateStream: (symbol: string, interval: KlineInterval) => void;
} {
  let client: BinanceWebSocketClient | null = null;

  return {
    connect: () => {
      if (client) return;
      
      client = new BinanceWebSocketClient({
        symbol,
        interval,
        onMessage: onKline,
        onError: (error) => console.error('Binance WS Error:', error),
        onConnect: () => console.log('Binance WS Connected'),
        onDisconnect: () => console.log('Binance WS Disconnected'),
      });

      client.connect();
    },

    disconnect: () => {
      if (client) {
        client.destroy();
        client = null;
      }
    },

    updateStream: (newSymbol: string, newInterval: KlineInterval) => {
      if (client) {
        client.updateStream(newSymbol, newInterval);
      }
    },
  };
}
