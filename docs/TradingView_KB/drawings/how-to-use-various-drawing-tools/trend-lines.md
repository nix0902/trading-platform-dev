# Trend Lines Implementation

## Overview
Trend lines are the most basic drawing tools, connecting two or more points to show market direction.

---

## 1. Trend Line

### Definition
A straight line connecting two points on a chart.

### Formula
```
y = mx + b

where:
  m = (y2 - y1) / (x2 - x1)  (slope)
  b = y1 - m * x1            (y-intercept)
```

### Implementation
```typescript
// Calculate line parameters
const slope = (p2.price - p1.price) / (p2.time - p1.time);
const intercept = p1.price - slope * p1.time;

// Get price at any time
function getPriceAtTime(time: number): number {
  return slope * time + intercept;
}
```

### Rendering
- Draw line segment from P1 to P2
- Use `context.beginPath()`, `moveTo()`, `lineTo()`, `stroke()`

---

## 2. Trend Line Arrow

### Definition
Same as Trend Line but with an arrowhead at P2.

### Arrow Calculation
```typescript
// Arrow direction angle
const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

// Arrow head points (30 degree angle, size 10px)
const arrowAngle = Math.PI / 6; // 30 degrees
const arrowSize = 10;

const arrowPoint1 = {
  x: p2.x - arrowSize * Math.cos(angle - arrowAngle),
  y: p2.y - arrowSize * Math.sin(angle - arrowAngle)
};

const arrowPoint2 = {
  x: p2.x - arrowSize * Math.cos(angle + arrowAngle),
  y: p2.y - arrowSize * Math.sin(angle + arrowAngle)
};
```

### Rendering
```typescript
// Draw line
ctx.beginPath();
ctx.moveTo(p1.x, p1.y);
ctx.lineTo(p2.x, p2.y);
ctx.stroke();

// Draw arrowhead
ctx.beginPath();
ctx.moveTo(p2.x, p2.y);
ctx.lineTo(arrowPoint1.x, arrowPoint1.y);
ctx.lineTo(arrowPoint2.x, arrowPoint2.y);
ctx.closePath();
ctx.fill();
```

---

## 3. Ray

### Definition
A line that starts at P1 and extends infinitely in the direction of P2.

### Extension Algorithm
```typescript
// Calculate direction
const dx = p2.time - p1.time;
const dy = p2.price - p1.price;

// Extend to right edge of chart
const rightEdgeTime = chart.timeScale().getVisibleLogicalRange()?.to;
const extensionPoint = {
  time: rightEdgeTime,
  price: p1.price + dy * (rightEdgeTime - p1.time) / dx
};
```

---

## 4. Horizontal Line

### Definition
A line at a fixed price level, spanning the entire chart width.

### Implementation
```typescript
// Single point needed: price level
const price = point.price;

// Draw across entire visible range
const timeRange = chart.timeScale().getVisibleTimeRange();
// Line y-coordinate is constant
```

### Rendering
```typescript
ctx.beginPath();
ctx.moveTo(0, y); // left edge
ctx.lineTo(chartWidth, y); // right edge
ctx.stroke();
```

---

## 5. Vertical Line

### Definition
A line at a fixed time position, spanning the entire chart height.

### Implementation
```typescript
// Single point needed: time position
const time = point.time;

// Draw across entire visible price range
const priceRange = series.priceRange();
// Line x-coordinate is constant
```

### Rendering
```typescript
ctx.beginPath();
ctx.moveTo(x, 0); // top edge
ctx.lineTo(x, chartHeight); // bottom edge
ctx.stroke();
```

---

## 6. Parallel Channel

### Definition
Two parallel trend lines forming a channel.

### Construction
```
Points: P1, P2 (main trend line), P3 (defines channel width)

Main Line: P1 → P2
Parallel Line: Through P3, parallel to main line

Channel Width = perpendicular distance from P3 to main line
```

### Formula
```typescript
// Main line parameters
const slope = (p2.price - p1.price) / (p2.time - p1.time);
const intercept = p1.price - slope * p1.time;

// Distance from P3 to main line
const distance = Math.abs(slope * p3.time - p3.price + intercept) /
                 Math.sqrt(slope * slope + 1);

// Direction (above or below main line)
const direction = Math.sign(slope * p3.time - p3.price + intercept);

// Parallel line intercept
const parallelIntercept = intercept + direction * distance * Math.sqrt(slope * slope + 1);
```

### Extension to Edges
Both lines should extend to chart edges for proper visual connection:
```typescript
// Extend main line to left and right edges
// Extend parallel line to left and right edges
// This allows vertical lines to connect them visually
```

---

## 7. Info Line

### Definition
A trend line with price information labels at endpoints.

### Display Information
```typescript
const price1 = p1.price;
const price2 = p2.price;
const priceDiff = price2 - price1;
const percentChange = ((price2 - price1) / price1) * 100;

// Show labels:
// - P1 price
// - P2 price
// - Price difference (+/-)
// - Percentage change (+/- %)
```

### Color Coding
```typescript
const isUpTrend = price2 > price1;
const color = isUpTrend ? '#26a69a' : '#ef5350'; // green/red
```

---

## Common Options

All trend line tools support:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 2 | Line thickness in pixels |
| lineStyle | 'solid' \| 'dashed' \| 'dotted' | 'solid' | Line pattern |

### Line Style Implementation
```typescript
switch (lineStyle) {
  case 'dashed':
    ctx.setLineDash([10, 5]);
    break;
  case 'dotted':
    ctx.setLineDash([2, 3]);
    break;
  default:
    ctx.setLineDash([]);
}
```
