# Patterns Implementation

## Overview
Harmonic patterns identify potential reversal zones using Fibonacci ratios.

---

## 1. ABCD Pattern

### Definition
A simple harmonic pattern with four points forming two legs.

### Construction
```
Points: A, B, C, D

          B ●
            ╲
             ╲ AB leg
              ╲
               ╲
                ● C
               ╱
              ╱ BC leg (retracement)
             ╱
            ╱
        D ●
       CD leg (extension)

Ratios:
- BC = 61.8% or 78.6% of AB
- CD = 127.2% or 161.8% of BC
```

### Algorithm
```typescript
function calculateABCDPattern(points: [Point, Point, Point, Point]): PatternData {
  const [A, B, C, D] = points;

  // Calculate legs
  const AB = Math.abs(B.price - A.price);
  const BC = Math.abs(C.price - B.price);
  const CD = Math.abs(D.price - C.price);

  // Calculate ratios
  const bcRetracement = BC / AB;       // Should be ~0.618 or 0.786
  const cdExtension = CD / BC;         // Should be ~1.272 or 1.618

  // Validate ratios
  const isValidBC = isWithinTolerance(bcRetracement, [0.618, 0.786], 0.1);
  const isValidCD = isWithinTolerance(cdExtension, [1.272, 1.618], 0.1);

  return {
    points: { A, B, C, D },
    legs: { AB, BC, CD },
    ratios: { bcRetracement, cdExtension },
    isValid: isValidBC && isValidCD
  };
}

function isWithinTolerance(value: number, targets: number[], tolerance: number): boolean {
  return targets.some(target => Math.abs(value - target) <= tolerance);
}
```

### Target Ratios
```typescript
const ABCD_TARGETS = {
  bcRetracement: [0.618, 0.786],
  cdExtension: [1.272, 1.618]
};
```

---

## 2. Head and Shoulders

### Definition
A reversal pattern with three peaks, the middle being highest.

### Construction
```
Points: 5 points
- Left Shoulder peak
- Left Valley (neckline start)
- Head peak
- Right Valley (neckline end)
- Right Shoulder peak

          Head
            ●
           ╱ ╲
          ╱   ╲
    LS ●─╱─────╲─╱─● RS
       ╱         ╲
      ╱           ╲
LV ●─╱─────────────╲─● RV
   ╱   Neckline    ╲
  ╱                 ╲
 ●───────────────────● Target
```

### Algorithm
```typescript
function calculateHeadShoulders(points: [Point, Point, Point, Point, Point]): PatternData {
  const [leftShoulder, leftValley, head, rightValley, rightShoulder] = points;

  // Neckline connects valleys
  const necklineSlope = (rightValley.price - leftValley.price) /
                        (rightValley.time - leftValley.time);
  const necklineIntercept = leftValley.price - necklineSlope * leftValley.time;

  // Target = neckline - (head - neckline)
  const headToNeckline = head.price - getNecklinePrice(head.time, necklineSlope, necklineIntercept);
  const targetPrice = leftValley.price - headToNeckline; // For top pattern

  // Pattern type
  const isInverse = leftShoulder.price < leftValley.price;

  return {
    type: isInverse ? 'inverse' : 'standard',
    neckline: { slope: necklineSlope, intercept: necklineIntercept },
    targetPrice,
    isValid: validateHeadShoulders(points)
  };
}

function getNecklinePrice(time: number, slope: number, intercept: number): number {
  return slope * time + intercept;
}

function validateHeadShoulders(points: Point[]): boolean {
  const [ls, lv, h, rv, rs] = points;

  // Head must be highest (standard) or lowest (inverse)
  const isStandard = h.price > ls.price && h.price > rs.price;
  const isInverse = h.price < ls.price && h.price < rs.price;

  // Shoulders should be roughly equal
  const shoulderDiff = Math.abs(ls.price - rs.price) / ls.price;

  return (isStandard || isInverse) && shoulderDiff < 0.15; // 15% tolerance
}
```

---

## 3. Three Drives

### Definition
A pattern with three consecutive drives in the same direction.

### Construction
```
Points: 6 points (alternating peaks and valleys)

For bullish Three Drives (downward):

          ● 1
         ╱ ╲
        ╱   ╲
       ╱     ● 2
      ╱      ╲
     ╱        ╲
    ●          ● 3
   ╱            ╲
  ╱              ╲
 ●                ● 4
╱                  ╲
                   ╲
                    ● 5
                     ╲
                      ╲
                       ● 6

Each drive extends 127.2% or 161.8% of previous
```

### Algorithm
```typescript
function calculateThreeDrives(points: [Point, Point, Point, Point, Point, Point]): PatternData {
  const [p1, p2, p3, p4, p5, p6] = points;

  // Calculate drives (price moves)
  const drive1 = Math.abs(p2.price - p1.price);
  const drive2 = Math.abs(p4.price - p3.price);
  const drive3 = Math.abs(p6.price - p5.price);

  // Calculate retracements
  const retracement1 = Math.abs(p3.price - p2.price);
  const retracement2 = Math.abs(p5.price - p4.price);

  // Extension ratios
  const extension1 = drive2 / drive1;  // Should be ~1.272 or 1.618
  const extension2 = drive3 / drive2;  // Should be ~1.272 or 1.618

  // Retracement ratios
  const retracementRatio1 = retracement1 / drive1;
  const retracementRatio2 = retracement2 / drive2;

  // Validate
  const validExtensions = isWithinTolerance(extension1, [1.272, 1.618], 0.15) &&
                         isWithinTolerance(extension2, [1.272, 1.618], 0.15);

  return {
    drives: [drive1, drive2, drive3],
    extensions: [extension1, extension2],
    retracements: [retracementRatio1, retracementRatio2],
    isValid: validExtensions
  };
}
```

---

## Pattern Validation

### Tolerance Settings
```typescript
const PATTERN_TOLERANCE = {
  fibonacci: 0.10,    // 10% tolerance for Fib ratios
  symmetry: 0.15,     // 15% tolerance for symmetry
  timeAlignment: 0.20 // 20% tolerance for time proportions
};
```

### Color Coding
```typescript
const PATTERN_COLORS = {
  valid: '#22C55E',     // Green - valid pattern
  invalid: '#EF4444',   // Red - invalid pattern
  pending: '#F59E0B',   // Orange - incomplete
  neutral: '#2962FF'    // Blue - neutral
};
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 2 | Line thickness |
| lineStyle | string | 'solid' | Line pattern |
| showLabels | boolean | true | Show point labels |
| showRatios | boolean | true | Show Fibonacci ratios |
| tolerance | number | 0.10 | Validation tolerance |

---

## Display Information

For each pattern, display:
1. **Pattern name** (e.g., "Bullish ABCD")
2. **Key ratios** with validation indicators
3. **Target/entry zones**
4. **Stop loss level** (if applicable)

```
Example display:
┌────────────────────────┐
│ ABCD Pattern           │
│ BC: 0.652 ✓ (0.618)    │
│ CD: 1.341 ✓ (1.272)    │
│ Status: Valid          │
└────────────────────────┘
```
