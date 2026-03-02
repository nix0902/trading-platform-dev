/**
 * Binance Data Streams Library
 * 
 * Предоставляет два метода подключения к Binance:
 * 
 * 1. WebSocket Streams - рекомендуется для реального времени
 *    - Мгновенные обновления
 *    - Минимальная нагрузка
 *    - Автоматическое переподключение
 * 
 * 2. REST API - альтернативный метод
 *    - Исторические данные
 *    - Резервный метод
 *    - Проще в реализации
 * 
 * @see /docs/BINANCE_STREAMS.md
 */

// WebSocket Client
export {
  BinanceWebSocketClient,
  createBinanceKlineStream,
  type Kline,
  type KlineMessage,
  type KlineInterval,
  type BinanceWebSocketOptions,
  type BinanceWebSocketClientEvents,
} from './websocket-client';

// REST Client
export {
  BinanceRestClient,
  getBinanceRestClient,
  type KlineData,
  type BinanceRestOptions,
} from './rest-client';

// Combined Provider
export {
  BinanceCombinedProvider,
  createBinanceProvider,
  type CombinedProviderOptions,
  type Candle,
  type ConnectionMethod,
} from './combined-provider';
