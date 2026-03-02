# Lightweight Charts Panes - Time Scale Synchronization

## Overview

This document describes the implementation of synchronized chart panes in the trading platform using lightweight-charts v4.

## The Problem

When building a trading application with multiple chart panels (main candlestick chart + oscillator indicators like RSI and MACD), all charts must share synchronized time scales. When a user scrolls or zooms on one chart, all other charts should follow.

## Version Considerations

### lightweight-charts v4 (Current Implementation)

Version 4.x does **not** have native pane support. Multiple charts must be created and synchronized manually using the time scale API.

### lightweight-charts v5 (Future Consideration)

Version 5.0+ introduces native **Panes API** that handles multiple chart areas within a single chart instance. This is the recommended approach for new projects.

**Resources:**
- [Official Panes Documentation](https://tradingview.github.io/lightweight-charts/docs/panes)
- [TradingView Blog - v5 Announcement](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Panes-And-Scales-Behavior/)

## Implementation Details (v4)

### Core Concepts

#### 1. Logical Range vs Time Range

**Use Logical Range, not Time Range:**

```typescript
// ✅ GOOD: Logical Range (bar indices)
const range = chart.timeScale().getVisibleLogicalRange();
// Returns: { from: 0, to: 100 } (bar indices)

// ❌ BAD: Time Range (timestamps)
const range = chart.timeScale().getVisibleRange();
// Can have issues with data gaps
```

Logical Range is more reliable because:
- Uses bar indices (0, 1, 2, ...) which are consistent across charts
- Not affected by time gaps or irregular data
- Integer-based, easier to compare

#### 2. Time Scale Subscription

```typescript
// Subscribe to visible range changes
chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (range) {
    // Sync to other charts
    otherChart.timeScale().setVisibleLogicalRange(range);
  }
});
```

#### 3. Preventing Sync Loops

When synchronizing multiple charts, you must prevent recursive sync loops:

```typescript
const isSyncing = useRef(false);
const syncSource = useRef<string | null>(null);

const synchronizeCharts = (source: string, range: LogicalRange) => {
  if (isSyncing.current) return;
  
  isSyncing.current = true;
  syncSource.current = source;
  
  try {
    // Apply range to other charts
    if (source !== 'main') mainChart.timeScale().setVisibleLogicalRange(range);
    if (source !== 'rsi') rsiChart.timeScale().setVisibleLogicalRange(range);
    if (source !== 'macd') macdChart.timeScale().setVisibleLogicalRange(range);
  } finally {
    requestAnimationFrame(() => {
      isSyncing.current = false;
      syncSource.current = null;
    });
  }
};
```

### Complete Implementation Pattern

```typescript
// 1. Create charts
const mainChart = createChart(container, options);
const rsiChart = createChart(rsiContainer, rsiOptions);
const macdChart = createChart(macdContainer, macdOptions);

// 2. Subscribe each chart to time scale changes
mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  synchronizeCharts('main', range);
});

rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  synchronizeCharts('rsi', range);
});

macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  synchronizeCharts('macd', range);
});

// 3. Initial sync after data load
useEffect(() => {
  mainChart.timeScale().scrollToRealTime();
  const range = mainChart.timeScale().getVisibleLogicalRange();
  if (range) {
    rsiChart.timeScale().setVisibleLogicalRange(range);
    macdChart.timeScale().setVisibleLogicalRange(range);
  }
}, [data]);
```

## Key API Methods

### Getting Range

```typescript
// Get visible logical range
const logicalRange = chart.timeScale().getVisibleLogicalRange();
// Returns: { from: number, to: number } | null

// Get visible time range
const timeRange = chart.timeScale().getVisibleRange();
// Returns: { from: Time, to: Time } | null
```

### Setting Range

```typescript
// Set visible logical range
chart.timeScale().setVisibleLogicalRange({ from: 0, to: 100 });

// Set visible time range
chart.timeScale().setVisibleRange({ from: timestamp1, to: timestamp2 });
```

### Scrolling

```typescript
// Scroll to most recent data
chart.timeScale().scrollToRealTime();

// Scroll to specific position
chart.timeScale().scrollPosition(position);
```

### Subscription

```typescript
// Subscribe to visible logical range changes
const unsubscribe = chart.timeScale().subscribeVisibleLogicalRangeChange(callback);

// Subscribe to visible time range changes
const unsubscribe = chart.timeScale().subscribeVisibleTimeRangeChange(callback);

// Unsubscribe
unsubscribe();
```

## Common Issues and Solutions

### Issue 1: Charts Not Syncing

**Cause:** Missing subscription or callback not firing.

**Solution:** Ensure `subscribeVisibleLogicalRangeChange` is called after chart creation.

### Issue 2: Infinite Loop

**Cause:** Sync callback triggers another sync.

**Solution:** Use `isSyncing` flag to prevent recursive calls.

### Issue 3: Initial Sync Fails

**Cause:** Data not loaded when sync is called.

**Solution:** Call initial sync after `setData` with a small delay:
```typescript
series.setData(data);
setTimeout(() => {
  initialSync();
}, 100);
```

### Issue 4: Different Data Ranges

**Cause:** Different indicators have different data lengths (e.g., RSI needs 14 periods for calculation).

**Solution:** All charts will still sync to the same logical range. The indicator charts will just have less historical data visible.

## Chart Configuration

### Main Chart (Candlestick)

```typescript
const mainChart = createChart(container, {
  timeScale: {
    visible: false, // Hide on main chart
  },
  // ... other options
});
```

### Bottom Chart (shows time scale)

```typescript
const bottomChart = createChart(container, {
  timeScale: {
    visible: true,  // Show time scale
    timeVisible: true,
    secondsVisible: false,
  },
  // ... other options
});
```

## Resources

### Official Documentation
- [lightweight-charts GitHub](https://github.com/tradingview/lightweight-charts)
- [Panes Documentation (v5)](https://tradingview.github.io/lightweight-charts/docs/panes)
- [Time Scale API](https://tradingview.github.io/lightweight-charts/docs/api)

### Community Resources
- [Stack Overflow: Add Pane](https://stackoverflow.com/questions/76393873/tradingview-lightweight-charts-add-pane)
- [GitHub Issue #50 - Multiple Charts Sync](https://github.com/tradingview/lightweight-charts/issues/50)
- [GitHub Discussion #1858](https://github.com/tradingview/lightweight-charts/discussions/1858)

### Example Code
- [CodeSandbox Example](https://codesandbox.io/p/github/chings-eu/lightweight-charts-python/main)

## Migration to v5 (Future)

When upgrading to lightweight-charts v5, consider using the native Panes API:

```typescript
// v5 Panes API (future implementation)
const chart = createChart(container);

// Add series to default pane
const candleSeries = chart.addCandlestickSeries();

// Create new pane for RSI
const rsiPane = chart.addPane({ height: 100 });
const rsiSeries = chart.addLineSeries({ pane: rsiPane });

// Create another pane for MACD
const macdPane = chart.addPane({ height: 120 });
const macdSeries = chart.addLineSeries({ pane: macdPane });

// Time scale is automatically synchronized
```

## File Structure

```
src/
├── components/
│   └── trading/
│       └── ChartContainer.tsx    # Main chart with synchronized panes
├── lib/
│   └── binance/
│       ├── index.ts              # Exports
│       ├── combined-provider.ts  # Data provider
│       ├── rest-client.ts        # REST API client
│       └── websocket-client.ts   # WebSocket client
└── docs/
    └── chart-panes-sync.md       # This documentation
```

## Summary

For lightweight-charts v4:
1. Create separate chart instances
2. Use `subscribeVisibleLogicalRangeChange` for sync
3. Prevent loops with `isSyncing` flag
4. Use Logical Range instead of Time Range
5. Call initial sync after data load

For lightweight-charts v5:
1. Use native Panes API
2. Single chart instance with multiple panes
3. Automatic time scale synchronization
