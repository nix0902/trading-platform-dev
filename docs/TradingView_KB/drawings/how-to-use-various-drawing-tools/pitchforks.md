# Pitchforks Implementation

## Overview
Pitchforks are technical analysis tools that use three anchor points to create parallel channels for identifying support/resistance levels.

---

## Common Concepts

### Three Anchor Points
- **P1**: Pivot/handle point (origin)
- **P2**: Upper anchor point
- **P3**: Lower anchor point

### Midpoint Calculation
```typescript
// Midpoint M between P2 and P3
const M = {
  time: (p2.time + p3.time) / 2,
  price: (p2.price + p3.price) / 2
};
```

---

## 1. Standard Andrews Pitchfork

### Construction
```
         P2 ●
            ╲
             ╲  Upper Prong
              ╲
       M ──────●────── Median Line
              ╱
             ╱  Lower Prong
            ╱
         P3 ●

All three prongs are PARALLEL
Handle starts from P1
```

### Algorithm
```typescript
// 1. Calculate midpoint M
const M = { time: (p2.time + p3.time) / 2, price: (p2.price + p3.price) / 2 };

// 2. Median line direction (P1 → M)
const medianSlope = (M.price - p1.price) / (M.time - p1.time);

// 3. Upper prong: parallel to median, passing through P2
// 4. Lower prong: parallel to median, passing through P3

// 5. All prongs extend from P1 to the right edge
```

### Key Property
All three lines are **parallel** to each other:
- Upper prong ∥ Median line ∥ Lower prong

---

## 2. Schiff Pitchfork

### Construction
```
         P2 ●
            ╲
             ╲
              ╲
       M ──────●────── Median Line
              ╱
             ╱
            ╱
         P3 ●

Handle starts from MIDPOINT of P1 and M
```

### Algorithm
```typescript
// 1. Calculate midpoint M between P2 and P3
const M = { time: (p2.time + p3.time) / 2, price: (p2.price + p3.price) / 2 };

// 2. Handle start = midpoint of P1 and M
const handleStart = {
  time: (p1.time + M.time) / 2,
  price: (p1.price + M.price) / 2
};

// 3. Three prongs from handleStart:
//    - Upper: parallel to (handleStart → P2), through P2
//    - Median: parallel to (handleStart → M), through M
//    - Lower: parallel to (handleStart → P3), through P3
```

### Key Difference from Standard
Handle is shifted to midpoint of P1 and M, making the pitchfork more balanced.

---

## 3. Modified Schiff Pitchfork

### Construction
```
         P2 ●
            ╲
             ╲
              ╲
       M ──────●────── Median Line
              ╱
             ╱
            ╱
         P3 ●

Handle is at 2/3 distance from P1 toward M
```

### Formula
```typescript
// Critical formula for Modified Schiff
// handleStart = P1 + (2/3) * (M - P1)

const handleStart = {
  time: p1.time + (2/3) * (M.time - p1.time),
  price: p1.price + (2/3) * (M.price - p1.price)
};
```

### Algorithm
```typescript
// 1. Calculate midpoint M
const M = {
  time: (p2.time + p3.time) / 2,
  price: (p2.price + p3.price) / 2
};

// 2. Calculate handle position (2/3 offset)
const handleStart = {
  time: p1.time + (2/3) * (M.time - p1.time),
  price: p1.price + (2/3) * (M.price - p1.price)
};

// 3. Draw dashed line from P1 to handleStart (shows the offset)
// 4. Three prongs extend from handleStart, parallel to P2/M/P3
```

### Key Property
Handle is positioned at **2/3 of the distance** from P1 toward the midpoint M.

---

## 4. Inside Pitchfork

### Construction
```
         P2 ●
            ╱
           ╱  Upper line (P1 → P2)
          ╱
   P1 ●───●────── Median line (P1 → M)
          ╲
           ╲  Lower line (P1 → P3)
            ╲
         P3 ●

All lines START from P1 and CONVERGE (not parallel!)
```

### Algorithm
```typescript
// 1. Calculate midpoint M
const M = {
  time: (p2.time + p3.time) / 2,
  price: (p2.price + p3.price) / 2
};

// 2. Upper line: P1 → P2 (direct line)
// 3. Median line: P1 → M (direct line)
// 4. Lower line: P1 → P3 (direct line)

// 5. All lines extend FROM P1 outward
```

### Key Difference
Unlike other pitchforks, the three lines are **NOT parallel**:
- They all **radiate from P1**
- They **converge at P1** (meet at a single point)
- They diverge as they extend to the right

### Comparison
```
Standard/Schiff/Modified Schiff:
  - Lines are PARALLEL
  - Never meet

Inside Pitchfork:
  - Lines RADIATE from P1
  - All meet at P1
```

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    STANDARD PITCHFORK                       │
│  P1 ────────┬─────────────────────────────────────          │
│             │                                                │
│        P2 ──┼────────────────────────────── Upper           │
│             │                                                │
│        M ───┼────────────────────────────── Median          │
│             │                                                │
│        P3 ──┼────────────────────────────── Lower           │
│             │                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   MODIFIED SCHIFF                           │
│  P1 ── ─ ─ ─┬─────────────────────────────────────          │
│             │  ← 2/3 offset                                 │
│        Handle ─┬───────────────────────────────             │
│             │                                                │
│        P2 ──┼────────────────────────────── Upper           │
│        M ───┼────────────────────────────── Median          │
│        P3 ──┼────────────────────────────── Lower           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    INSIDE PITCHFORK                         │
│                    P1 (convergence point)                   │
│                    ╱ │ ╲                                     │
│                   ╱  │  ╲                                    │
│                  ╱   │   ╲                                   │
│                 ╱    │    ╲                                  │
│                ╱     │     ╲                                 │
│               ╱      │      ╲                                │
│             P2       M       P3                              │
│            Upper   Median   Lower                            │
│            (all converge at P1)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Options

All pitchforks support:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 2 | Line thickness |
| lineStyle | string | 'solid' | Line pattern |
| showLabels | boolean | true | Show P1/P2/P3 labels |
| extendLines | boolean | true | Extend to right edge |
