# Fibonacci Tools Implementation

## Overview
Fibonacci tools use the Fibonacci sequence ratios to identify potential support/resistance levels and price targets.

---

## Fibonacci Ratios

### Standard Ratios
```typescript
const FIBONACCI_LEVELS = [
  { level: 0, ratio: 0 },
  { level: 0.236, ratio: 0.236 },
  { level: 0.382, ratio: 0.382 },
  { level: 0.5, ratio: 0.5 },
  { level: 0.618, ratio: 0.618 },
  { level: 0.786, ratio: 0.786 },
  { level: 1, ratio: 1 },
];

// Extension levels
const EXTENSION_LEVELS = [
  { level: 1.272, ratio: 1.272 },
  { level: 1.618, ratio: 1.618 },
  { level: 2.0, ratio: 2.0 },
  { level: 2.618, ratio: 2.618 },
];
```

### Derived From
```
Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...

Key ratios:
- 0.618 = 89/144 (golden ratio approximation)
- 0.382 = 1 - 0.618
- 0.236 = 0.618 × 0.382
- 0.786 = √0.618
- 1.618 = 144/89 (golden ratio)
```

---

## 1. Fibonacci Retracement

### Definition
Horizontal lines at Fibonacci levels of a price range.

### Construction
```
Points: P1 (low/high), P2 (high/low)

P2 ●───────────────────────── 0%
   │
   │  23.6% ─ ─ ─ ─ ─ ─ ─ ─
   │
   │  38.2% ─ ─ ─ ─ ─ ─ ─ ─
   │
   │  50% ─ ─ ─ ─ ─ ─ ─ ─ ─
   │
   │  61.8% ─ ─ ─ ─ ─ ─ ─ ─
   │
P1 ●───────────────────────── 100%
```

### Algorithm
```typescript
function calculateFibRetracement(p1: Point, p2: Point): FibLevel[] {
  const priceRange = p2.price - p1.price;
  const levels = [];

  for (const fib of FIBONACCI_LEVELS) {
    // For uptrend (P1 is low)
    const price = p1.price + priceRange * fib.ratio;
    levels.push({ level: fib.level, price });
  }

  return levels;
}

// For downtrend (P1 is high)
function calculateFibRetracementDowntrend(p1: Point, p2: Point): FibLevel[] {
  const priceRange = p1.price - p2.price;
  const levels = [];

  for (const fib of FIBONACCI_LEVELS) {
    const price = p1.price - priceRange * fib.ratio;
    levels.push({ level: fib.level, price });
  }

  return levels;
}
```

---

## 2. Fibonacci Extension

### Definition
Projects Fibonacci levels beyond the trend.

### Construction
```
Points: P1 (swing low), P2 (swing high), P3 (retracement low)

P3 ●─────────────────────────
   │
   │  61.8% ext ─ ─ ─ ─ ─ ─
   │
   │  100% ext ─ ─ ─ ─ ─ ─
   │
   │  127.2% ext ─ ─ ─ ─ ─
   │
   │  161.8% ext ─ ─ ─ ─ ─
   │
P2 ●───────────────────────── 0%
   │
   │
P1 ●─────────────────────────
```

### Algorithm
```typescript
function calculateFibExtension(p1: Point, p2: Point, p3: Point): FibLevel[] {
  // P1 → P2 is the trend
  // P3 is the retracement point
  // Extensions project from P2

  const trendHeight = p2.price - p1.price; // For uptrend

  const levels = [
    { level: 0, price: p2.price },
    { level: 0.618, price: p2.price + trendHeight * 0.618 },
    { level: 1.0, price: p2.price + trendHeight },
    { level: 1.272, price: p2.price + trendHeight * 1.272 },
    { level: 1.618, price: p2.price + trendHeight * 1.618 },
    { level: 2.0, price: p2.price + trendHeight * 2.0 },
    { level: 2.618, price: p2.price + trendHeight * 2.618 },
  ];

  return levels;
}
```

---

## 3. Fibonacci Circles

### Definition
Concentric circles at Fibonacci ratios from a center point.

### Construction
```
Points: P1 (center), P2 (defines base radius)

         ╭───────────╮
       ╭─┼───────────┼─╮ 161.8%
     ╭──┼─────────────┼──╮
    │  ╭┼─────────────┼╮  │ 127.2%
    │  ││     ●       ││  │
    │  ││    P1       ││  │ 100%
    │  │╰─────────────╯│  │
    │  ╰───────────────╯  │ 61.8%
     ╰─────────────────╯
       ╰─────────────╯      38.2%
         ╰─────────╯
            P2 ●            Base radius
```

### Algorithm
```typescript
function calculateFibCircles(p1: Point, p2: Point): CircleLevel[] {
  // Base radius in price units
  const baseRadius = Math.abs(p2.price - p1.price);

  // Time radius (for ellipse if time scales differ)
  const timeRadius = Math.abs(p2.time - p1.time);

  const levels = [
    { level: 0, radius: 0 },
    { level: 0.236, radius: baseRadius * 0.236 },
    { level: 0.382, radius: baseRadius * 0.382 },
    { level: 0.5, radius: baseRadius * 0.5 },
    { level: 0.618, radius: baseRadius * 0.618 },
    { level: 0.786, radius: baseRadius * 0.786 },
    { level: 1.0, radius: baseRadius },
    { level: 1.272, radius: baseRadius * 1.272 },
    { level: 1.618, radius: baseRadius * 1.618 },
  ];

  return levels.map(l => ({
    level: l.level,
    priceRadius: l.radius,
    timeRadius: timeRadius * l.level
  }));
}
```

---

## 4. Fibonacci Speed Resistance Fan

### Definition
Fan of lines from a pivot point at Fibonacci angles.

### Construction
```
Points: P1 (pivot), P2 (defines base angle)

              P2 ●────────── 100%
               ╱
    78.6% ────╱
             ╱
  61.8% ────╱
           ╱
50% ──────╱
         ╱
38.2% ──╱
       ╱
23.6% ╱
     ╱
P1 ●
```

### Algorithm
```typescript
function calculateFibFan(p1: Point, p2: Point): FanLine[] {
  const priceDiff = p2.price - p1.price;
  const timeDiff = p2.time - p1.time;

  // Base slope (the 100% line)
  const baseSlope = priceDiff / timeDiff;

  const levels = [
    { level: 0, slope: 0 },                    // Horizontal
    { level: 0.236, slope: baseSlope * 0.236 },
    { level: 0.382, slope: baseSlope * 0.382 },
    { level: 0.5, slope: baseSlope * 0.5 },
    { level: 0.618, slope: baseSlope * 0.618 },
    { level: 0.786, slope: baseSlope * 0.786 },
    { level: 1.0, slope: baseSlope },          // Base line
    { level: 1.272, slope: baseSlope * 1.272 },
    { level: 1.618, slope: baseSlope * 1.618 },
  ];

  // Each line starts at P1 and extends with calculated slope
  return levels.map(l => ({
    level: l.level,
    startPrice: p1.price,
    slope: l.slope
  }));
}
```

---

## 5. Fibonacci Time Zones

### Definition
Vertical lines at Fibonacci sequence intervals.

### Construction
```
Points: P1 (start time), P2 (defines base unit)

│     │   │ │  │   │    │     │
│     │   │ │  │   │    │     │
│  1  │ 1 │ 2│ 3│  5│   8│   13│    21...
│     │   │ │  │   │    │     │
P1    │   │ │  │   │    │     │
      P2  │ │  │   │    │     │
```

### Algorithm
```typescript
// Fibonacci sequence
function generateFibSequence(maxTerms: number): number[] {
  const fib = [1, 1];
  for (let i = 2; i < maxTerms; i++) {
    fib.push(fib[i-1] + fib[i-2]);
  }
  return fib;
}

function calculateFibTimeZones(p1: Point, p2: Point): TimeLine[] {
  const baseUnit = p2.time - p1.time; // Time between P1 and P2
  const fibSequence = generateFibSequence(12); // First 12 Fibonacci numbers

  return fibSequence.map(fib => ({
    fibNumber: fib,
    time: p1.time + fib * baseUnit
  }));
}

// Result: Lines at times P1 + 1*unit, P1 + 1*unit, P1 + 2*unit, P1 + 3*unit,
//         P1 + 5*unit, P1 + 8*unit, P1 + 13*unit, etc.
```

---

## 6. Fibonacci Channel

### Definition
Parallel channel with Fibonacci retracement levels.

### Construction
```
Points: P1, P2 (base trend line), P3 (defines channel width)

P2 ●───────────────────────── Upper line (0%)
   │╲
   │ ╲ 23.6%
   │  ╲
   │   ╲ 38.2%
   │    ╲
   │     ╲ 50%
   │      ╲
   │       ╲ 61.8%
   │        ╲
   │         ╲ 78.6%
   │          ╲
P3 ●───────────╲ Lower line (100%)
                ╲
```

### Algorithm
```typescript
function calculateFibChannel(p1: Point, p2: Point, p3: Point): ChannelLevel[] {
  // Base trend line: P1 → P2
  const slope = (p2.price - p1.price) / (p2.time - p1.time);
  const baseIntercept = p1.price - slope * p1.time;

  // Perpendicular distance from P3 to base line
  const channelHeight = Math.abs(
    (slope * p3.time - p3.price + baseIntercept) / Math.sqrt(slope * slope + 1)
  );

  // Direction
  const direction = p3.price < p1.price ? -1 : 1;

  // Fibonacci levels within channel
  const levels = FIBONACCI_LEVELS.map(fib => ({
    level: fib.level,
    offset: channelHeight * fib.level * direction
  }));

  // Each level: baseIntercept + offset
  return levels.map(l => ({
    level: l.level,
    intercept: baseIntercept + l.offset
  }));
}
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 1 | Line thickness |
| lineStyle | string | 'dashed' | Line pattern |
| showLabels | boolean | true | Show level percentages |
| fillWidth | boolean | false | Fill between levels |
| levels | number[] | [0,0.236,...] | Custom Fibonacci levels |

---

## Color Coding

Common color scheme for Fibonacci levels:
```typescript
const FIB_COLORS = {
  0: '#787B86',      // Gray
  0.236: '#F7931A',  // Orange
  0.382: '#2962FF',  // Blue
  0.5: '#26A69A',    // Teal
  0.618: '#2196F3',  // Light Blue (Golden ratio - most important!)
  0.786: '#9C27B0',  // Purple
  1.0: '#787B86',    // Gray
  1.272: '#E91E63',  // Pink
  1.618: '#FF5722',  // Deep Orange
};
```

The **61.8% level** (golden ratio) is considered the most significant and often styled differently.
