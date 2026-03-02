# Binance Data Streams - Методы подключения

## 📚 Обзор

Документация по методам подключения к Binance для получения данных в реальном времени.

**Реализовано:**
- ✅ WebSocket Streams Client
- ✅ REST API Client
- ✅ Combined Provider (гибридный метод)

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chart Component                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BinanceCombinedProvider                                             │
│  ├── REST API: Загрузка исторических данных (500 свечей)            │
│  ├── WebSocket: Обновления в реальном времени                        │
│  └── Auto Fallback: Polling при недоступности WebSocket              │
│                                                                      │
│  Статусы:                                                            │
│  • WEBSOCKET - активно WebSocket соединение                         │
│  • POLLING - fallback режим                                         │
│  • HYBRID - гибридный режим (WebSocket + REST)                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📡 Метод 1: WebSocket Streams (Рекомендуется)

### Реализация
Файл: `/src/lib/binance/websocket-client.ts`

### Базовые URL

| Тип | URL |
|-----|-----|
| Spot | `wss://stream.binance.com:9443/ws` |
| Spot Combined | `wss://stream.binance.com:9443/stream` |
| Futures USDT-M | `wss://fstream.binance.com/ws` |
| Futures COIN-M | `wss://dstream.binance.com/ws` |

### Пример использования

```typescript
import { BinanceWebSocketClient } from '@/lib/binance';

const client = new BinanceWebSocketClient({
  symbol: 'BTCUSDT',
  interval: '1h',
  onMessage: (kline) => {
    console.log('Price:', kline.close);
  },
  onError: (error) => console.error(error),
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
});

client.connect();

// Change stream
client.updateStream('ETHUSDT', '15m');

// Cleanup
client.destroy();
```

### Формат данных Kline

```typescript
interface Kline {
  time: number;       // Unix timestamp (seconds)
  open: number;       // Open price
  high: number;       // High price
  low: number;        // Low price
  close: number;      // Close price
  volume: number;     // Base volume
  quoteVolume: number; // Quote volume
  trades: number;     // Number of trades
  isClosed: boolean;  // Is candle closed
}
```

### Особенности

- **Автоматическое переподключение** с экспоненциальной задержкой
- **Максимум 1024 стрима** на одно соединение
- **Время жизни**: 24 часа, после нужно переподключаться
- **Ping/Pong**: Binance отправляет ping каждые 20 секунд

---

## 📊 Метод 2: REST API (Альтернативный)

### Реализация
Файл: `/src/lib/binance/rest-client.ts`

### Endpoint

```
GET https://api.binance.com/api/v3/klines
```

### Параметры

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| symbol | Да | Торговая пара (BTCUSDT) |
| interval | Да | Интервал (1m, 5m, 1h, 1d) |
| limit | Нет | Количество свечей (max 1500) |
| startTime | Нет | Начало периода (ms) |
| endTime | Нет | Конец периода (ms) |

### Пример использования

```typescript
import { BinanceRestClient } from '@/lib/binance';

const client = new BinanceRestClient();

// Get klines
const candles = await client.getKlines('BTCUSDT', '1h', 500);

// Get current price
const price = await client.getPrice('BTCUSDT');

// Get 24hr stats
const stats = await client.get24hrStats('BTCUSDT');

// Get order book
const book = await client.getOrderBook('BTCUSDT', 100);
```

### Ответ Klines

```typescript
interface KlineData {
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
```

---

## 🔄 Метод 3: Combined Provider (Гибридный)

### Реализация
Файл: `/src/lib/binance/combined-provider.ts`

### Описание
Комбинирует WebSocket и REST API:
1. Первичная загрузка через REST API
2. Обновления через WebSocket
3. Автоматический fallback на polling

### Пример использования

```typescript
import { BinanceCombinedProvider } from '@/lib/binance';

const provider = new BinanceCombinedProvider({
  symbol: 'BTCUSDT',
  interval: '1h',
  historicalLimit: 500,
  onData: (candles, newCandle) => {
    // candles - все свечи
    // newCandle - последняя обновлённая (или null при начальной загрузке)
    chart.update(candles);
  },
  onError: (error) => console.error(error),
});

await provider.start();

// Check connection method
console.log(provider.getMethod()); // 'websocket' | 'polling' | 'hybrid'

// Change symbol/interval
await provider.updateStream('ETHUSDT', '15m');

// Stop
provider.destroy();
```

---

## 📈 Сравнение методов

| Критерий | WebSocket | REST Polling | Combined |
|----------|-----------|--------------|----------|
| Задержка | ~50ms | ~1000ms | ~50ms |
| Надёжность | Средняя | Высокая | Высокая |
| Fallback | Нет | Не нужен | Авто |
| Сложность | Средняя | Низкая | Средняя |
| Использование | Прод | Резерв | **Рекомендуется** |

---

## 🎯 Доступные интервалы

```typescript
type KlineInterval = 
  | '1s' | '1m' | '3m' | '5m' | '15m' | '30m' 
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' 
  | '1d' | '3d' | '1w' | '1M';
```

---

## ⚠️ Лимиты Binance

| Параметр | Значение |
|----------|----------|
| Max streams per connection | 1024 |
| Connection lifetime | 24 hours |
| Ping interval | 20 seconds |
| Rate limit (REST) | 1200 requests/minute |
| Weight per klines request | 1-2 |

---

## 🔧 Устранение проблем

### 1. WebSocket не подключается

```typescript
// Проверьте URL
const url = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1h';

// Проверьте формат символа (lowercase!)
const stream = `${symbol.toLowerCase()}@kline_${interval}`;
```

### 2. Нет данных

```typescript
// Включите логирование
const client = new BinanceWebSocketClient({
  // ...
  onConnect: () => console.log('✅ Connected'),
  onDisconnect: () => console.log('❌ Disconnected'),
  onError: (e) => console.error('Error:', e),
});
```

### 3. Частые отключения

```typescript
// Увеличьте количество попыток
const client = new BinanceWebSocketClient({
  // ...
  maxReconnectAttempts: 20,
  reconnectDelay: 2000,
});
```

---

## 📁 Структура файлов

```
src/lib/binance/
├── index.ts              # Экспорты
├── websocket-client.ts   # WebSocket клиент
├── rest-client.ts        # REST API клиент
└── combined-provider.ts  # Гибридный провайдер

docs/
└── BINANCE_STREAMS.md    # Эта документация
```

---

## 🔗 Ссылки

- [Binance WebSocket Streams Docs](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)
- [Binance REST API Docs](https://developers.binance.com/docs/binance-spot-api-docs/rest-api)
- [Binance WebSocket API](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-api)
- [Binance.us API](https://github.com/binance-us) (для США)

---

*Последнее обновление: Февраль 2025*
