# Geometric Shapes Implementation

## Overview
Basic geometric drawing tools for marking up charts.

---

## 1. Rectangle

### Definition
A rectangle defined by two diagonal corner points.

### Construction
```
Points: P1 (corner 1), P2 (opposite corner)

P1 ●──────────────
   │              │
   │   Rectangle  │
   │              │
   └──────────────● P2
```

### Algorithm
```typescript
function calculateRectangle(p1: Point, p2: Point): RectangleData {
  return {
    topLeft: {
      time: Math.min(p1.time, p2.time),
      price: Math.max(p1.price, p2.price)
    },
    bottomRight: {
      time: Math.max(p1.time, p2.time),
      price: Math.min(p1.price, p2.price)
    },
    width: Math.abs(p2.time - p1.time),
    height: Math.abs(p2.price - p1.price)
  };
}
```

### Rendering
```typescript
ctx.beginPath();
ctx.rect(x, y, width, height);
ctx.fillStyle = fillColor;
ctx.fill();
ctx.strokeStyle = lineColor;
ctx.lineWidth = lineWidth;
ctx.stroke();
```

---

## 2. Circle

### Definition
A circle with center at midpoint and radius defined by two points.

### Construction
```
Points: P1 (center or edge), P2 (edge point)

         ╭───────╮
       ╭─┼───────┼─╮
      │  │       │  │
      │  │   ●   │  │ P1 (center)
      │  │       │  │
       ╰─┼───────┼─╯
         ╰───────╯
              ● P2 (defines radius)
```

### Algorithm
```typescript
function calculateCircle(p1: Point, p2: Point): CircleData {
  // P1 is center, P2 defines radius
  const center = p1;
  const radius = Math.sqrt(
    Math.pow(p2.time - p1.time, 2) +
    Math.pow(p2.price - p1.price, 2)
  );

  // In pixel coordinates, we need separate x and y radii
  // because time and price scales differ
  const radiusX = Math.abs(p2.time - p1.time);
  const radiusY = Math.abs(p2.price - p1.price);

  return { center, radius, radiusX, radiusY };
}
```

### Rendering
```typescript
// Use ellipse for proper scaling
ctx.beginPath();
ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
ctx.fillStyle = fillColor;
ctx.fill();
ctx.strokeStyle = lineColor;
ctx.stroke();
```

---

## 3. Ellipse

### Definition
An ellipse within a bounding box defined by two diagonal points.

### Construction
```
Points: P1, P2 (diagonal corners of bounding box)

P1 ●──────────────
   │   ╭─────╮   │
   │  ╱       ╲  │
   │ │  Ellipse │ │
   │  ╲       ╱  │
   │   ╰─────╯   │
   └──────────────● P2
```

### Algorithm
```typescript
function calculateEllipse(p1: Point, p2: Point): EllipseData {
  // Center is midpoint
  const center = {
    time: (p1.time + p2.time) / 2,
    price: (p1.price + p2.price) / 2
  };

  // Radii are half of width and height
  const radiusX = Math.abs(p2.time - p1.time) / 2;
  const radiusY = Math.abs(p2.price - p1.price) / 2;

  return { center, radiusX, radiusY };
}
```

### Difference from Circle
- Circle: P1 is center, P2 defines radius
- Ellipse: P1 and P2 are bounding box corners

---

## 4. Triangle

### Definition
A triangle connecting three points.

### Construction
```
Points: P1, P2, P3 (three vertices)

        P1 ●
          ╱ ╲
         ╱   ╲
        ╱     ╲
       ╱       ╲
   P2 ●─────────● P3
```

### Algorithm
```typescript
function calculateTriangle(p1: Point, p2: Point, p3: Point): TriangleData {
  return {
    vertices: [p1, p2, p3],
    // Points in drawing order
    path: [p1, p2, p3, p1] // Close back to P1
  };
}
```

### Rendering
```typescript
ctx.beginPath();
ctx.moveTo(p1.x, p1.y);
ctx.lineTo(p2.x, p2.y);
ctx.lineTo(p3.x, p3.y);
ctx.closePath(); // Connects back to P1

ctx.fillStyle = fillColor;
ctx.fill();
ctx.strokeStyle = lineColor;
ctx.stroke();
```

---

## 5. Polyline

### Definition
A series of connected line segments through multiple points.

### Construction
```
Points: Variable (minimum 2)

P1 ●──────● P2
          │
          │
          ● P3
          │
          │
          ● P4

Can have any number of points
```

### Algorithm
```typescript
interface PolylineData {
  points: Point[];
  closed: boolean; // Whether to connect last point back to first
}

function addPolylinePoint(polyline: PolylineData, point: Point): void {
  polyline.points.push(point);
}

function removePolylinePoint(polyline: PolylineData, index: number): void {
  if (polyline.points.length > 2) {
    polyline.points.splice(index, 1);
  }
}
```

### Rendering
```typescript
if (points.length < 2) return;

ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);

for (let i = 1; i < points.length; i++) {
  ctx.lineTo(points[i].x, points[i].y);
}

if (closed) {
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

ctx.strokeStyle = lineColor;
ctx.stroke();
```

### Smooth Polyline (Bezier Curves)
```typescript
function drawSmoothPolyline(points: Point[]): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  // Last segment
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.stroke();
}
```

---

## Common Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#2962FF' | Border color |
| lineWidth | number | 2 | Border thickness |
| lineStyle | string | 'solid' | Border pattern |
| fillColor | string | 'rgba(41,98,255,0.1)' | Fill color |

### Fill Colors with Transparency
```typescript
// Semi-transparent fills work best
const fillColors = {
  light: 'rgba(41, 98, 255, 0.1)',  // 10% opacity
  medium: 'rgba(41, 98, 255, 0.2)', // 20% opacity
  dark: 'rgba(41, 98, 255, 0.3)',   // 30% opacity
};
```

---

## Coordinate Transformation

All geometric shapes need coordinate transformation:

```typescript
// Convert time/price to screen coordinates
function toScreenCoordinates(point: Point, chart: IChartApi, series: ISeriesApi): ScreenPoint {
  const timeScale = chart.timeScale();
  const priceScale = series.priceScale();

  const x = timeScale.timeToCoordinate(point.time);
  const y = series.priceToCoordinate(point.price);

  return { x, y };
}

// For bitmap rendering (crisp lines)
function toBitmapCoordinates(screenPoint: ScreenPoint, mediaSize: Size, bitmapSize: Size): BitmapPoint {
  const horizontalPixelRatio = bitmapSize.width / mediaSize.width;
  const verticalPixelRatio = bitmapSize.height / mediaSize.height;

  return {
    x: Math.round(screenPoint.x * horizontalPixelRatio),
    y: Math.round(screenPoint.y * verticalPixelRatio)
  };
}
```
