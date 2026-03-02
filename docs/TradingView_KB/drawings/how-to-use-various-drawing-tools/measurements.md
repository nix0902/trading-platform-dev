# Measurements Implementation

## Overview
Measurement tools help analyze price and time distances on charts.

---

## 1. Price Label

### Definition
A label displaying the price at a specific point.

### Construction
```
Points: 1 (anchor point)

    ┌─────────────┐
    │ $45,678.90  │
    └─────●───────┘
          │
          ● Anchor point
```

### Algorithm
```typescript
interface PriceLabelOptions {
  text?: string;           // Custom text (overrides price display)
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  showLine: boolean;       // Line from label to point
}

function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function calculateLabelPosition(point: Point, labelWidth: number, labelHeight: number): Position {
  // Position label to avoid chart edges
  const offset = { x: 10, y: -20 };

  return {
    x: point.x + offset.x,
    y: point.y + offset.y
  };
}
```

### Rendering
```typescript
function drawPriceLabel(ctx: CanvasRenderingContext2D, point: Point, price: number, options: PriceLabelOptions): void {
  const text = options.text || `$${formatPrice(price)}`;

  // Measure text
  ctx.font = `${options.fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const padding = 8;
  const width = metrics.width + padding * 2;
  const height = options.fontSize + padding * 2;

  // Draw background
  ctx.fillStyle = options.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(point.x, point.y - height/2, width, height, 4);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = options.borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw text
  ctx.fillStyle = options.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, point.x + padding, point.y);
}
```

---

## 2. Price Range

### Definition
Shows price difference between two horizontal levels.

### Construction
```
Points: 2 (two price levels)

Upper ────────────────────────── $50,000
       │
       │ +$5,000 (+11.1%)
       │
Lower ────────────────────────── $45,000
```

### Algorithm
```typescript
interface PriceRangeData {
  upperPrice: number;
  lowerPrice: number;
  difference: number;
  percentage: number;
  barsBetween: number;
}

function calculatePriceRange(p1: Point, p2: Point): PriceRangeData {
  const upperPrice = Math.max(p1.price, p2.price);
  const lowerPrice = Math.min(p1.price, p2.price);
  const difference = upperPrice - lowerPrice;
  const percentage = (difference / lowerPrice) * 100;

  return {
    upperPrice,
    lowerPrice,
    difference,
    percentage,
    barsBetween: Math.abs(p2.time - p1.time)
  };
}
```

### Rendering
```typescript
function drawPriceRange(ctx: CanvasRenderingContext2D, data: PriceRangeData): void {
  const { upperPrice, lowerPrice, difference, percentage } = data;

  // Draw horizontal lines
  drawHorizontalLine(ctx, upperPrice);
  drawHorizontalLine(ctx, lowerPrice);

  // Draw vertical connector
  drawVerticalConnector(ctx, upperY, lowerY);

  // Draw info panel
  const infoText = [
    `Price: +${formatPrice(difference)}`,
    `(${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%)`
  ];

  drawInfoPanel(ctx, infoText, midX, midY);
}
```

---

## 3. Date and Price Range

### Definition
Shows both price and time measurements in a rectangle.

### Construction
```
Points: 2 (diagonal corners of rectangle)

    ┌─────────────────────────────┐ Upper
    │                             │
    │  Price: +$5,000 (+11.1%)    │
    │  Time: 5d 12h               │
    │  Bars: 132                  │
    │                             │
    └─────────────────────────────┘ Lower
    Start                        End
```

### Algorithm
```typescript
interface DatePriceRangeData {
  // Price info
  upperPrice: number;
  lowerPrice: number;
  priceDifference: number;
  pricePercentage: number;

  // Time info
  startTime: number;
  endTime: number;
  timeDifference: number;  // In milliseconds
  days: number;
  hours: number;
  minutes: number;

  // Bar count
  barCount: number;
}

function calculateDatePriceRange(p1: Point, p2: Point): DatePriceRangeData {
  const upperPrice = Math.max(p1.price, p2.price);
  const lowerPrice = Math.min(p1.price, p2.price);
  const priceDifference = upperPrice - lowerPrice;
  const pricePercentage = (priceDifference / lowerPrice) * 100;

  const startTime = Math.min(p1.time, p2.time);
  const endTime = Math.max(p1.time, p2.time);
  const timeDifference = (endTime - startTime) * 1000; // Assuming time in seconds

  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

  return {
    upperPrice, lowerPrice, priceDifference, pricePercentage,
    startTime, endTime, timeDifference,
    days, hours, minutes,
    barCount: endTime - startTime // Simplified
  };
}
```

### Formatting Functions
```typescript
function formatTimeDifference(days: number, hours: number, minutes: number): string {
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
}

function formatPriceDifference(diff: number, percentage: number): string {
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${formatPrice(Math.abs(diff))} (${sign}${percentage.toFixed(2)}%)`;
}
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 2 | Line thickness |
| lineStyle | string | 'dashed' | Line pattern |
| fillColor | string | 'rgba(41,98,255,0.1)' | Fill color |
| showLabels | boolean | true | Show measurement labels |
| showPercentage | boolean | true | Show percentage change |

---

## Color Coding for Price Changes

```typescript
function getPriceChangeColor(percentage: number): string {
  if (percentage > 0) return '#26A69A';  // Green for up
  if (percentage < 0) return '#EF5350';  // Red for down
  return '#787B86';                       // Gray for no change
}
```

---

## Info Panel Design

```
┌────────────────────────────┐
│ Price: +$5,000.00          │
│ (+11.11%)                  │
│                            │
│ Time: 5d 12h 30m           │
│ Bars: 132                  │
└────────────────────────────┘

Color scheme:
- Background: rgba(30, 37, 46, 0.9)
- Text: #FFFFFF
- Border: #363A45
- Positive values: #26A69A
- Negative values: #EF5350
```
