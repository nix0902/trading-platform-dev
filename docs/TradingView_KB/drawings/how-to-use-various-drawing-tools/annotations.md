# Annotations Implementation

## Overview
Annotation tools allow adding text and freehand drawings to charts.

---

## 1. Text Annotation

### Definition
Places text at a specific point on the chart.

### Construction
```
Points: 1 (anchor position)

    ┌────────────────────────┐
    │ This is a text note    │
    │ with multiple lines    │
    └───────────●────────────┘
                │
                ● Anchor point (time, price)
```

### Algorithm
```typescript
interface TextOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number;
  bold: boolean;
  italic: boolean;
}

function calculateTextBox(text: string, options: TextOptions): TextBox {
  const lines = text.split('\n');

  // Calculate dimensions
  const lineHeight = options.fontSize * 1.2;
  const height = lines.length * lineHeight + options.padding * 2;

  // Find widest line
  let maxWidth = 0;
  for (const line of lines) {
    const width = measureText(line, options);
    if (width > maxWidth) maxWidth = width;
  }
  const width = maxWidth + options.padding * 2;

  return {
    lines,
    width,
    height,
    lineHeight
  };
}
```

### Rendering
```typescript
function drawTextAnnotation(ctx: CanvasRenderingContext2D, point: Point, options: TextOptions): void {
  const textBox = calculateTextBox(options.text, options);

  // Position box (offset from anchor)
  const boxX = point.x + 10;
  const boxY = point.y - textBox.height / 2;

  // Draw background
  ctx.fillStyle = options.backgroundColor;
  ctx.beginPath();
  roundRect(ctx, boxX, boxY, textBox.width, textBox.height, 4);
  ctx.fill();

  // Draw border
  if (options.borderWidth > 0) {
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.borderWidth;
    ctx.stroke();
  }

  // Draw text
  ctx.fillStyle = options.textColor;
  ctx.font = `${options.italic ? 'italic ' : ''}${options.bold ? 'bold ' : ''}${options.fontSize}px ${options.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const textX = boxX + options.padding;
  let textY = boxY + options.padding;

  for (const line of textBox.lines) {
    ctx.fillText(line, textX, textY);
    textY += textBox.lineHeight;
  }

  // Draw anchor marker
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#2962FF';
  ctx.fill();
}
```

### Multiline Support
```typescript
// Use \n for line breaks
const text = "First line\nSecond line\nThird line";
// Results in 3 lines of text
```

---

## 2. Brush (Freehand Drawing)

### Definition
Freehand drawing tool for marking up charts with smooth curves.

### Construction
```
Points: Variable (collected during drawing)

Start ●────●────●────●────●────● End
       ╲   ╱  ╲ ╱  ╲ ╱  ╲ ╱
        ╲ ╱    ╳    ╲ ╱
         ●─────●─────●
              ╲   ╱
               ╲ ╱
                ●

Smooth curve through all points
```

### Algorithm
```typescript
interface BrushOptions {
  lineColor: string;
  lineWidth: number;
  smooth: boolean;  // Use bezier curves
}

class BrushDrawing {
  private points: Point[] = [];

  addPoint(point: Point): void {
    this.points.push(point);
  }

  clearPoints(): void {
    this.points = [];
  }

  getPoints(): Point[] {
    return this.points;
  }

  isComplete(): boolean {
    return this.points.length >= 2;
  }
}
```

### Straight Line Rendering
```typescript
function drawBrushStraight(ctx: CanvasRenderingContext2D, points: Point[], options: BrushOptions): void {
  if (points.length < 2) {
    // Draw a single point as a small circle
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, options.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = options.lineColor;
      ctx.fill();
    }
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.strokeStyle = options.lineColor;
  ctx.lineWidth = options.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
```

### Smooth Curve Rendering (Bezier)
```typescript
function drawBrushSmooth(ctx: CanvasRenderingContext2D, points: Point[], options: BrushOptions): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Quadratic bezier curves through points
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Last segment
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  }

  ctx.strokeStyle = options.lineColor;
  ctx.lineWidth = options.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
```

### Cubic Bezier (Smoother)
```typescript
function drawBrushCubic(ctx: CanvasRenderingContext2D, points: Point[], options: BrushOptions): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // First segment
    ctx.lineTo(points[1].x, points[1].y);

    // Middle segments with cubic bezier
    for (let i = 2; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Last segment
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.strokeStyle = options.lineColor;
  ctx.lineWidth = options.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
```

---

## Options

### Text Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| text | string | 'Text' | Text content |
| fontSize | number | 14 | Font size in pixels |
| fontFamily | string | 'Arial' | Font family |
| textColor | string | '#333333' | Text color |
| backgroundColor | string | 'rgba(255,255,255,0.9)' | Background color |
| borderColor | string | '#CCCCCC' | Border color |
| borderWidth | number | 1 | Border width |
| padding | number | 8 | Padding in pixels |
| bold | boolean | false | Bold text |
| italic | boolean | false | Italic text |

### Brush Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| lineColor | string | '#FF0000' | Line color |
| lineWidth | number | 2 | Line thickness |
| smooth | boolean | true | Use smooth curves |

---

## Usage Examples

### Text Annotation
```typescript
const text = new TextDrawing(
  { time: 1704067200, price: 45000 },
  {
    text: 'Entry point\nStop loss: $44,000\nTarget: $48,000',
    fontSize: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textColor: '#333333'
  }
);
```

### Brush Drawing
```typescript
const brush = new BrushDrawing({
  lineColor: '#FF5722',
  lineWidth: 3,
  smooth: true
});

// During mouse drag
brush.addPoint({ time: currentTime, price: currentPrice });

// When complete
series.attachPrimitive(brush);
```

---

## Interaction

### Text
- Click to place
- Drag to move
- Double-click to edit

### Brush
- Click and drag to draw
- Release to complete
- Points collected during drag
