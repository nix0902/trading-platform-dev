# Channels Implementation

## Overview
Channels are parallel line patterns used to identify trading ranges and potential breakouts.

---

## 1. Parallel Channel

### Definition
Two parallel lines defining a trading range.

### Construction
```
Points: P1, P2 (main trend line), P3 (defines channel width)

Main Line: P1 → P2
Parallel Line: Through P3, parallel to main line

     P1 ───────────────● P2
      │                │
      │    Channel     │
      │                │
     P3 ●──────────────
```

### Key Requirement
**Lines must extend to chart edges** so they can be visually connected by vertical lines.

### Algorithm
```typescript
// 1. Main line equation
const slope = (p2.price - p1.price) / (p2.time - p1.time);
const mainIntercept = p1.price - slope * p1.time;

// 2. Perpendicular distance from P3 to main line
const perpDistance = (slope * p3.time - p3.price + mainIntercept) /
                     Math.sqrt(slope * slope + 1);

// 3. Parallel line intercept
const parallelIntercept = mainIntercept - perpDistance * Math.sqrt(slope * slope + 1);

// 4. Extend both lines to chart edges
const leftEdgeTime = timeScale.getVisibleLogicalRange().from;
const rightEdgeTime = timeScale.getVisibleLogicalRange().to;

// Main line endpoints
const mainLeft = { time: leftEdgeTime, price: slope * leftEdgeTime + mainIntercept };
const mainRight = { time: rightEdgeTime, price: slope * rightEdgeTime + mainIntercept };

// Parallel line endpoints
const parallelLeft = { time: leftEdgeTime, price: slope * leftEdgeTime + parallelIntercept };
const parallelRight = { time: rightEdgeTime, price: slope * rightEdgeTime + parallelIntercept };
```

---

## 2. Diverging Channel

### Definition
Two lines that diverge from a common apex point.

### Construction
```
Points: P1 (apex), P2 (upper line point), P3 (lower line point)

                    Upper line
                   ╱
                  ╱
                 ╱
     P1 (apex) ●
                 ╲
                  ╲
                   ╲
                    Lower line

Lines ONLY extend FORWARD from apex!
```

### Critical Rule
**Lines extend FORWARD from apex only** - not backward!

### Algorithm
```typescript
// 1. Upper line: P1 → P2, extended forward
const upperSlope = (p2.price - p1.price) / (p2.time - p1.time);

// 2. Lower line: P1 → P3, extended forward
const lowerSlope = (p3.price - p1.price) / (p3.time - p1.time);

// 3. Extend to right edge only
const rightEdgeTime = timeScale.getVisibleLogicalRange().to;

// Upper line endpoint
const upperEnd = {
  time: rightEdgeTime,
  price: p1.price + upperSlope * (rightEdgeTime - p1.time)
};

// Lower line endpoint
const lowerEnd = {
  time: rightEdgeTime,
  price: p1.price + lowerSlope * (rightEdgeTime - p1.time)
};

// 4. Draw lines only from P1 forward
// Upper: P1 → upperEnd
// Lower: P1 → lowerEnd
```

### Visual
```
        P2 ●────────────────── Upper
           ╱
          ╱
     P1 ● (apex)
          ╲
           ╲
        P3 ●────────────────── Lower

✓ Correct: Lines extend FORWARD only

     ─────────● P2
              ╱
             ╱
     P1 ●────
             ╲
              ╲
     ─────────● P3

✗ Wrong: Lines extending backward
```

---

## 3. Regression Trend

### Definition
A linear regression line with standard deviation bands.

### Construction
```
Points: P1 (start time), P2 (end time)

     ┌─────────────────────┐ Upper band (+2σ)
     │                     │
     │   Regression Line   │ ← Best fit line
     │                     │
     └─────────────────────┘ Lower band (-2σ)

     P1                    P2
```

### Least Squares Formula
```typescript
// Linear regression: y = mx + b
// Using least squares method

// For n data points (x_i, y_i):
// slope (m) = (n * Σxy - Σx * Σy) / (n * Σx² - (Σx)²)
// intercept (b) = (Σy - m * Σx) / n

function calculateRegression(data: Point[]): { slope: number, intercept: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const point of data) {
    sumX += point.time;
    sumY += point.price;
    sumXY += point.time * point.price;
    sumX2 += point.time * point.time;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}
```

### Standard Deviation Bands
```typescript
// Standard deviation from regression line
function calculateStdDev(data: Point[], slope: number, intercept: number): number {
  let sumSquaredDiff = 0;

  for (const point of data) {
    const predictedY = slope * point.time + intercept;
    const diff = point.price - predictedY;
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff / data.length);
}

// Upper band: regression + (multiplier * stddev)
// Lower band: regression - (multiplier * stddev)
const upperBand = regressionPrice + stddevMultiplier * stddev;
const lowerBand = regressionPrice - stddevMultiplier * stddev;
```

### R-Squared (Goodness of Fit)
```typescript
function calculateRSquared(data: Point[], slope: number, intercept: number): number {
  const meanY = data.reduce((sum, p) => sum + p.price, 0) / data.length;

  let ssTot = 0, ssRes = 0;
  for (const point of data) {
    const predictedY = slope * point.time + intercept;
    ssTot += Math.pow(point.price - meanY, 2);
    ssRes += Math.pow(point.price - predictedY, 2);
  }

  return 1 - (ssRes / ssTot);
}
```

### Algorithm
```typescript
// 1. Get all data points between P1.time and P2.time
const dataPoints = chartData.filter(d => d.time >= p1.time && d.time <= p2.time);

// 2. Calculate regression
const { slope, intercept } = calculateRegression(dataPoints);

// 3. Calculate standard deviation
const stddev = calculateStdDev(dataPoints, slope, intercept);

// 4. Draw regression line from P1 to P2
// 5. Draw upper band: regression + 2*stddev
// 6. Draw lower band: regression - 2*stddev
// 7. Optionally fill area between bands
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 2 | Line thickness |
| lineStyle | string | 'solid' | Line pattern |
| fillColor | string | 'rgba(41,98,255,0.1)' | Fill color |
| stddevMultiplier | number | 2 | Standard deviation multiplier (Regression Trend) |
| showBands | boolean | true | Show std dev bands |
| showInfo | boolean | true | Show slope/R² info |

---

## Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL CHANNEL                         │
│                                                             │
│  ─────────────────────────────────────────── Upper          │
│                                                             │
│  ─────────────────────────────────────────── Lower          │
│  (parallel lines, same distance everywhere)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DIVERGING CHANNEL                         │
│                      ●                                      │
│                     ╱ ╲                                     │
│                    ╱   ╲                                    │
│                   ╱     ╲                                   │
│                  ╱       ╲                                  │
│                 ╱         ╲                                 │
│  (lines diverge from apex, forward only)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   REGRESSION TREND                          │
│  ┌─────────────────────────────────────────┐ +2σ            │
│  │                                         │                │
│  │ ─────────────────────────────────────── │ Regression     │
│  │                                         │                │
│  └─────────────────────────────────────────┘ -2σ            │
│  (best fit line with statistical bands)                     │
└─────────────────────────────────────────────────────────────┘
```
