# Lightweight Charts v5 Panes API - Implementation Guide

## Overview

This document describes the implementation of chart panes using lightweight-charts v5 native Panes API.

## Version

- **lightweight-charts**: v5.0.4

## v5 Key Changes from v4

### 1. Series Creation API

In v5, series are created using `chart.addSeries(SeriesDefinition, options, paneIndex?)`:

```typescript
// v4 (old)
const series = chart.addLineSeries({ color: '#2962ff' });

// v5 (new)
import { LineSeries } from 'lightweight-charts';
const series = chart.addSeries(LineSeries, { color: '#2962ff' });
```

### 2. Native Pane Support

Panes are created automatically when you add a series with a `paneIndex` that doesn't exist:

```typescript
// Main chart (pane 0 - default)
const candleSeries = chart.addSeries(CandlestickSeries, options);

// RSI pane (pane 1 - auto-created)
const rsiSeries = chart.addSeries(LineSeries, options, 1);

// MACD pane (pane 2 - auto-created)
const macdSeries = chart.addSeries(LineSeries, options, 2);
```

### 3. Time Scale Auto-Sync

Time scales are automatically synchronized across all panes - no manual synchronization needed!

## API Reference

### Series Definitions

Import series definitions from the package:

```typescript
import { 
  LineSeries,          // SeriesDefinition<"Line">
  CandlestickSeries,   // SeriesDefinition<"Candlestick">
  HistogramSeries,     // SeriesDefinition<"Histogram">
  AreaSeries,          // SeriesDefinition<"Area">
  BarSeries,           // SeriesDefinition<"Bar">
  BaselineSeries,      // SeriesDefinition<"Baseline">
} from 'lightweight-charts';
```

### Chart Methods

```typescript
// Create chart
const chart = createChart(container, options);

// Add series to specific pane
const series = chart.addSeries(SeriesDefinition, options, paneIndex?);

// Get all panes
const panes = chart.panes(); // IPaneApi[]

// Remove a pane
chart.removePane(paneIndex);

// Swap panes
chart.swapPanes(firstIndex, secondIndex);
```

### Pane Methods

```typescript
const pane = chart.panes()[0];

// Get/set height
pane.setHeight(100);
const height = pane.height();

// Get pane index
const index = pane.paneIndex();

// Move pane
pane.moveTo(newIndex);

// Get series in pane
const series = pane.series();

// Get HTML element
const element = pane.element();
```

### Series Pane Control

```typescript
// Move series to another pane
series.moveToPane(paneIndex);

// Get current pane
const pane = series.getPane();
```

## Implementation Example

```typescript
"use client";

import { createChart, ColorType, LineSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

export default function ChartComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      // ... other options
    });

    chartRef.current = chart;

    // Add candlestick series (pane 0)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      // ... other options
    });

    // Add RSI indicator (pane 1)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
    }, 1);

    // Set RSI pane height
    const rsiPane = chart.panes()[1];
    if (rsiPane) {
      rsiPane.setHeight(100);
    }

    // Add MACD indicator (pane 2)
    const histogramSeries = chart.addSeries(HistogramSeries, {}, 2);
    const macdLine = chart.addSeries(LineSeries, { color: '#2962ff' }, 2);
    const signalLine = chart.addSeries(LineSeries, { color: '#ff9800' }, 2);

    // Set MACD pane height
    const macdPane = chart.panes()[2];
    if (macdPane) {
      macdPane.setHeight(120);
    }

    return () => chart.remove();
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

## Key Benefits of v5

1. **Native Pane Support** - No need to manually create and sync multiple chart instances
2. **Automatic Time Scale Sync** - All panes share the same time scale
3. **Simpler Code** - Single chart instance instead of multiple
4. **Better Performance** - Optimized internal rendering
5. **Cleaner API** - Consistent `addSeries()` pattern

## Migration from v4

### Before (v4 - Manual Sync)

```typescript
// Multiple chart instances
const mainChart = createChart(mainContainer, options);
const rsiChart = createChart(rsiContainer, options);
const macdChart = createChart(macdContainer, options);

// Manual time scale sync
mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (range) {
    rsiChart.timeScale().setVisibleLogicalRange(range);
    macdChart.timeScale().setVisibleLogicalRange(range);
  }
});
```

### After (v5 - Native Panes)

```typescript
// Single chart instance
const chart = createChart(container, options);

// Panes auto-created, time scale auto-synced
chart.addSeries(LineSeries, rsiOptions, 1);
chart.addSeries(LineSeries, macdOptions, 2);
```

## Resources

- [Official Panes Documentation](https://tradingview.github.io/lightweight-charts/docs/panes)
- [TradingView Blog - v5 Announcement](https://www.tradingview.com/blog/en/tradingview-lightweight-charts-version-5-50837/)
- [GitHub Repository](https://github.com/tradingview/lightweight-charts)
- [API Reference](https://tradingview.github.io/lightweight-charts/docs/api)

## Troubleshooting

### Series Not Displaying

Make sure you're using the correct SeriesDefinition:
```typescript
// Correct
import { LineSeries } from 'lightweight-charts';
chart.addSeries(LineSeries, options, paneIndex);

// Wrong (v4 style)
chart.addLineSeries(options);
```

### Pane Not Created

Panes are created automatically when adding a series with a new paneIndex. Ensure paneIndex is sequential:
- Pane 0: Main chart (default)
- Pane 1: First indicator
- Pane 2: Second indicator

### Removing Panes

Always remove from highest to lowest index to avoid index shifting:
```typescript
// Correct order
chart.removePane(2); // Remove MACD first
chart.removePane(1); // Then remove RSI

// Wrong (causes issues)
chart.removePane(1); // RSI becomes pane 2 after this!
chart.removePane(2); // Removes wrong pane
```

## File Structure

```
src/
├── components/
│   └── trading/
│       └── ChartContainer.tsx    # Main chart with v5 Panes
├── lib/
│   └── binance/
│       ├── index.ts
│       ├── combined-provider.ts
│       ├── rest-client.ts
│       └── websocket-client.ts
└── docs/
    └── chart-panes-v5.md         # This documentation
```
