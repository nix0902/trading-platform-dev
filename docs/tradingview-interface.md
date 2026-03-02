# TradingView-Style Interface Documentation

## Overview

This document provides comprehensive documentation for the TradingView-style trading platform interface built with Next.js 16, TypeScript, and lightweight-charts v5.

## Table of Contents

1. [Architecture](#architecture)
2. [Color Scheme](#color-scheme)
3. [Component Structure](#component-structure)
4. [Layout System](#layout-system)
5. [Features](#features)
6. [Resources](#resources)

---

## Architecture

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Charts**: lightweight-charts v5.0.4
- **Icons**: @heroicons/react v2.2.0
- **State**: React useState/useCallback hooks

### File Structure

```
src/
├── app/
│   └── page.tsx                    # Main entry point
├── components/
│   ├── trading/
│   │   ├── TradingViewLayout.tsx   # Main layout component
│   │   ├── ChartContainer.tsx      # Chart with oscillators
│   │   ├── Chart.tsx               # Basic chart component
│   │   └── OscillatorPanel.tsx     # RSI/MACD panel
│   └── ui/                         # shadcn/ui components
└── lib/
    └── binance/                    # Binance data provider
```

---

## Color Scheme

### TradingView Dark Theme Colors

The interface uses TradingView's signature dark theme color palette:

```typescript
const TV_COLORS = {
  // Backgrounds
  bg_primary: "#131722",     // Main chart background
  bg_secondary: "#1e222d",   // Panel backgrounds
  bg_tertiary: "#2a2e39",    // Hover states, inputs
  bg_hover: "#363a45",       // Active hover states
  
  // Text
  text_primary: "#d1d4dc",   // Primary text
  text_secondary: "#787b86", // Secondary/label text
  text_tertiary: "#5d606b",  // Disabled/placeholder text
  
  // Borders
  border: "#363a45",         // Standard borders
  border_light: "#242832",   // Lighter borders
  
  // Accent Colors
  accent_blue: "#2962ff",    // Primary accent (buttons, selections)
  accent_green: "#26a69a",   // Bullish/positive
  accent_red: "#ef5350",     // Bearish/negative
  accent_yellow: "#ff9800",  // Warnings
  accent_purple: "#9c27b0",  // Secondary accent
};
```

### Usage in Tailwind

```jsx
// Example usage
<div className="bg-[#131722] text-[#d1d4dc] border-[#363a45]">
  <span className="text-[#787b86]">Label</span>
  <span className="text-[#26a69a]">+$123.45</span>
</div>
```

---

## Component Structure

### Main Layout (TradingViewLayout)

The main layout component orchestrates all UI elements:

```tsx
<div className="flex flex-col h-screen w-screen bg-[#131722]">
  {/* Header - 46px */}
  <Header />
  
  {/* Top Toolbar - 36px */}
  <TopToolbar />
  
  {/* Main Content - flex-1 */}
  <div className="flex-1 flex">
    {/* Left Toolbar - 46px width */}
    <LeftToolbar />
    
    {/* Chart Area - flex-1 */}
    <main className="flex-1">
      <ChartContainer />
      <BottomToolbar />
    </main>
    
    {/* Right Panel - resizable */}
    <RightPanel />
  </div>
  
  {/* Status Bar - 28px */}
  <StatusBar />
</div>
```

### Header Component

- **Height**: 46px
- **Elements**:
  - Logo (gradient blue icon)
  - Symbol selector with favorite star
  - Trading mode toggle (Paper/Real)
  - Chart type buttons (Candles, Line, Area, Bars)
  - User actions (Alerts, Profile, Settings)

### TopToolbar Component

- **Height**: 36px
- **Elements**:
  - Timeframe buttons (1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, D, W)
  - Indicator button
  - Draw button
  - Alert button
  - Oscillators toggle
  - Fullscreen button
  - Screenshot button

### LeftToolbar Component

- **Width**: 46px
- **Drawing Tools**:
  - Cursor
  - Crosshair
  - Trend Line
  - Horizontal Line
  - Vertical Line
  - Rectangle
  - Fibonacci Retracement
  - Text
  - Measure
  - Brush
- **Bottom Actions**:
  - Lock
  - Clear drawings

### RightPanel Component

- **Default Width**: 280px (resizable: 240-400px)
- **Tabs**:
  - **Watchlist**: Favorites and All symbols with price/change
  - **Order**: Market/Limit/Stop order entry
  - **Journal**: Trading statistics
  - **News**: Market news feed

### BottomToolbar Component

- **Height**: 32px
- **Tabs**:
  - Order Book
  - Positions
  - Orders
  - Account

### StatusBar Component

- **Height**: 28px
- **Elements**:
  - Connection status (animated green dot)
  - Exchange name
  - Trading mode badge
  - Latency display
  - Current symbol

---

## Layout System

### Flexbox Layout

The entire layout uses CSS Flexbox for responsive sizing:

```css
/* Main container */
height: 100vh;
display: flex;
flex-direction: column;

/* Content area */
flex: 1;
overflow: hidden;

/* Fixed heights */
header { height: 46px; }
.top-toolbar { height: 36px; }
.status-bar { height: 28px; }
```

### Resizable Panels

The right panel supports drag-to-resize:

```tsx
const [rightPanelWidth, setRightPanelWidth] = useState(280);
const [isResizing, setIsResizing] = useState(false);

const handleResize = useCallback((e: MouseEvent) => {
  if (!isResizing) return;
  const newWidth = window.innerWidth - e.clientX;
  setRightPanelWidth(Math.max(240, Math.min(400, newWidth)));
}, [isResizing]);
```

---

## Features

### 1. Real-time Chart

- Candlestick chart with lightweight-charts v5
- Native pane support for oscillators (RSI, MACD)
- Automatic time scale synchronization
- WebSocket data streaming from Binance

### 2. Symbol Search Modal

- Keyboard-accessible (auto-focus)
- Search by symbol name or pair
- Quick selection with click
- Escape key to close

### 3. Watchlist

- Toggle favorites
- Real-time price display
- Percentage change coloring
- Symbol switching

### 4. Order Entry Panel

- Market/Limit/Stop orders
- Buy/Sell toggle
- Quick amount buttons (25%, 50%, 75%, 100%)
- Balance display

### 5. Trading Journal

- Statistics cards (Trades, Win Rate, PnL, Profit Factor)
- Recent trades list (placeholder)

### 6. Drawing Tools

- 10 drawing tool options
- Active state indication
- Keyboard shortcuts shown in tooltips
- Clear all button

---

## Resources

### Official Documentation

- [TradingView lightweight-charts](https://tradingview.github.io/lightweight-charts/)
- [lightweight-charts GitHub](https://github.com/tradingview/lightweight-charts)
- [TradingView Support](https://ru.tradingview.com/support/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### API References

- [lightweight-charts v5 API](https://tradingview.github.io/lightweight-charts/docs/api)
- [Panes API](https://tradingview.github.io/lightweight-charts/docs/panes)
- [Series Types](https://tradingview.github.io/lightweight-charts/docs/series-types)

### Binance API

- [Binance REST API](https://binance-docs.github.io/apidocs/spot/en/)
- [Binance WebSocket Streams](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)

### UI Components

- [shadcn/ui](https://ui.shadcn.com/)
- [Heroicons](https://heroicons.com/)
- [Radix UI](https://www.radix-ui.com/)

---

## Design Patterns

### 1. Color Coding

- **Green (#26a69a)**: Bullish, positive, buy
- **Red (#ef5350)**: Bearish, negative, sell
- **Blue (#2962ff)**: Primary actions, selections
- **Yellow (#ffeb3b)**: Favorites, warnings

### 2. Interactive States

```tsx
// Button states
className={`
  ${active ? "bg-[#2962ff] text-white" : "text-[#787b86]"}
  hover:text-[#d1d4dc] 
  hover:bg-[#2a2e39]
  transition-colors
`}
```

### 3. Consistent Spacing

- Panel padding: 4px (p-1), 8px (p-2), 12px (p-3), 16px (p-4)
- Gap between elements: 2px (gap-0.5), 4px (gap-1), 8px (gap-2)
- Border radius: 4px (rounded), 6px (rounded-lg)

### 4. Typography

- Primary text: 14px (text-sm)
- Labels: 12px (text-xs)
- Large values: 16px (text-base), 20px (text-xl)
- Font weights: normal (font-normal), medium (font-medium), bold (font-bold)

---

## Future Enhancements

1. **Chart Indicators Dialog**: Full indicator selection modal
2. **Drawing Tools Implementation**: Actual drawing functionality
3. **Alert System**: Price alerts with notifications
4. **Theme Switcher**: Light/dark theme toggle
5. **Multi-chart Layout**: Multiple chart views
6. **Order Book Visualization**: Depth chart
7. **Trade History**: Executed trades list
8. **Keyboard Shortcuts**: Full keyboard navigation
