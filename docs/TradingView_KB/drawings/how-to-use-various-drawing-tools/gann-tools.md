# Gann Tools Implementation

## Overview
Gann tools are based on W.D. Gann's theories about time and price relationships, using specific angles and geometric patterns.

---

## Gann Angles

### Standard Gann Angles
```typescript
// Gann angles relative to 1x1 (45 degrees)
const GANN_ANGLES = {
  '1x8': { ratio: 1/8, degrees: 7.5 },
  '1x4': { ratio: 1/4, degrees: 15 },
  '1x3': { ratio: 1/3, degrees: 18.75 },
  '1x2': { ratio: 1/2, degrees: 26.25 },
  '1x1': { ratio: 1, degrees: 45 },       // Most important!
  '2x1': { ratio: 2, degrees: 63.75 },
  '3x1': { ratio: 3, degrees: 71.25 },
  '4x1': { ratio: 4, degrees: 75 },
  '8x1': { ratio: 8, degrees: 82.5 },
};
```

### Angle Interpretation
```
1x1 (45°): One unit of price per one unit of time - balanced market
1x2: One unit of price per two units of time - slower trend
2x1: Two units of price per one unit of time - faster trend
```

---

## 1. Gann Fan

### Definition
A series of trend lines radiating from a pivot point at Gann angles.

### Construction
```
Points: P1 (pivot), P2 (defines base angle)

         8x1 ╱
            ╱
       4x1 ╱
          ╱
     3x1 ╱
        ╱
  2x1 ╱
     ╱
1x1 ╱────────────────────── Main angle
   ╱
  ╲ 1x2
   ╲
    ╲ 1x3
     ╲
      ╲ 1x4
       ╲
        ╲ 1x8
P1 ●
```

### Algorithm
```typescript
function calculateGannFan(p1: Point, p2: Point): GannLine[] {
  // Calculate base angle (1x1 line) from P1 to P2
  const baseSlope = (p2.price - p1.price) / (p2.time - p1.time);

  // Calculate angles relative to base
  const lines = [];

  for (const [name, config] of Object.entries(GANN_ANGLES)) {
    // Each line's slope is baseSlope * ratio
    // For lines above base: multiply by ratio > 1 (2x1, 3x1, etc.)
    // For lines below base: divide by ratio > 1 (1x2, 1x3, etc.)

    let slope;
    if (name.startsWith('1x')) {
      // Below base: 1x2, 1x3, etc.
      const divisor = parseInt(name.split('x')[1]);
      slope = baseSlope / divisor;
    } else {
      // Above base: 2x1, 3x1, etc.
      const multiplier = parseInt(name.split('x')[0]);
      slope = baseSlope * multiplier;
    }

    lines.push({
      name,
      slope,
      startPrice: p1.price,
      startTime: p1.time
    });
  }

  return lines;
}
```

### Rendering
```typescript
for (const line of gannLines) {
  const endPrice = line.startPrice + line.slope * (rightEdgeTime - line.startTime);

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(rightEdgeX, priceToY(endPrice));
  ctx.stroke();

  // Draw label at end
  drawLabel(line.name, rightEdgeX, priceToY(endPrice));
}
```

---

## 2. Gann Box

### Definition
A rectangle with Gann angle lines drawn from center points.

### Construction
```
Points: P1 (top-left), P2 (bottom-right)

    P1 ●─────────────────────●
       │╲        │        ╱│
       │  ╲      │      ╱  │
       │    ╲    │    ╱    │
       │      ╲  │  ╱      │
       │──────── ● ────────│ Center
       │      ╱  │  ╲      │
       │    ╱    │    ╲    │
       │  ╱      │      ╲  │
       │╱        │        ╲│
       ●─────────────────────● P2
```

### Algorithm
```typescript
function calculateGannBox(p1: Point, p2: Point): GannBoxData {
  const box = {
    topLeft: p1,
    bottomRight: p2,
    width: p2.time - p1.time,
    height: p1.price - p2.price, // Negative for downward
    center: {
      time: (p1.time + p2.time) / 2,
      price: (p1.price + p2.price) / 2
    }
  };

  // Top center and bottom center for line origins
  const topCenter = { time: box.center.time, price: p1.price };
  const bottomCenter = { time: box.center.time, price: p2.price };

  // Calculate Gann angles from each center
  const topLines = calculateGannAngles(topCenter, box);
  const bottomLines = calculateGannAngles(bottomCenter, box);

  return { box, topLines, bottomLines };
}

function calculateGannAngles(origin: Point, box: Box): Line[] {
  const lines = [];
  const priceRange = Math.abs(box.height);
  const timeRange = box.width / 2;

  for (const [name, config] of Object.entries(GANN_ANGLES)) {
    // Calculate endpoint based on angle
    const angleRad = config.degrees * Math.PI / 180;
    const endPoint = {
      time: origin.time + timeRange,
      price: origin.price - Math.tan(angleRad) * timeRange
    };

    lines.push({ name, origin, endPoint });
  }

  return lines;
}
```

---

## 3. Gann Square

### Definition
A square grid with equal time and price scaling, plus diagonal lines.

### Construction
```
Points: P1 (corner 1), P2 (corner 2)

TL ●─────┬─────┬─────┬─────● TR
   │╲    │     │     │    ╱│
   ├─────┼─────┼─────┼─────┤
   │  ╲  │     │     │  ╱  │
   ├─────┼─────●─────┼─────┤ Center
   │    ╲│     │     │╱    │
   ├─────┼─────┼─────┼─────┤
   │     │╲    │    ╱│     │
BL ●─────┴─────┴─────┴─────● BR

- 8x8 grid pattern
- Diagonals from center to corners
- Lines from center to side midpoints
```

### Algorithm
```typescript
function calculateGannSquare(p1: Point, p2: Point): GannSquareData {
  // Determine corners
  const topLeft = {
    time: Math.min(p1.time, p2.time),
    price: Math.max(p1.price, p2.price)
  };
  const bottomRight = {
    time: Math.max(p1.time, p2.time),
    price: Math.min(p1.price, p2.price)
  };

  const width = bottomRight.time - topLeft.time;
  const height = topLeft.price - bottomRight.price;

  // Center point
  const center = {
    time: topLeft.time + width / 2,
    price: topLeft.price - height / 2
  };

  // Grid lines (8x8)
  const gridLines = [];
  for (let i = 1; i < 8; i++) {
    // Vertical lines
    gridLines.push({
      start: { time: topLeft.time + width * i / 8, price: topLeft.price },
      end: { time: topLeft.time + width * i / 8, price: bottomRight.price }
    });
    // Horizontal lines
    gridLines.push({
      start: { time: topLeft.time, price: topLeft.price - height * i / 8 },
      end: { time: bottomRight.time, price: topLeft.price - height * i / 8 }
    });
  }

  // Diagonal lines from center
  const diagonals = [
    { start: center, end: topLeft },
    { start: center, end: { time: bottomRight.time, price: topLeft.price } }, // Top right
    { start: center, end: bottomRight },
    { start: center, end: { time: topLeft.time, price: bottomRight.price } }, // Bottom left
  ];

  // Lines to side midpoints
  const midpoints = [
    { time: center.time, price: topLeft.price },     // Top
    { time: center.time, price: bottomRight.price }, // Bottom
    { time: topLeft.time, price: center.price },     // Left
    { time: bottomRight.time, price: center.price }, // Right
  ];

  const midpointLines = midpoints.map(mp => ({ start: center, end: mp }));

  return { topLeft, bottomRight, center, gridLines, diagonals, midpointLines };
}
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Line color |
| lineWidth | number | 1 | Line thickness |
| lineStyle | string | 'dashed' | Line pattern |
| showLabels | boolean | true | Show angle labels |
| showGrid | boolean | true | Show grid (Gann Square) |
| showDiagonals | boolean | true | Show diagonal lines |
| fillColor | string | 'rgba(41,98,255,0.1)' | Fill color |

---

## Key Concepts

### 1x1 Line (Most Important)
The 1x1 line represents:
- 45 degree angle
- One unit of price = One unit of time
- Balanced market equilibrium
- Support/resistance level

### Price-Time Square
Gann believed that significant price levels occur when:
```
Price movement = Time movement (squared)
```

### Using Gann Tools
1. Identify pivot points (highs/lows)
2. Draw Gann Fan from pivot
3. Watch for reactions at Gann angles
4. Use 1x1 as primary trend indicator
