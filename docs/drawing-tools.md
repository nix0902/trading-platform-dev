# Drawing Tools Documentation

## Overview

This document describes the custom drawing tools implementation for the trading chart using lightweight-charts v5.

## Implementation Approach

Since lightweight-charts is a free, open-source library without built-in drawing tools (unlike TradingView's paid Advanced Charts library), we implemented custom drawing tools using:

1. **SVG Overlay** - Drawings are rendered as SVG elements on top of the chart
2. **Mouse Events** - Custom mouse event handlers for drawing interactions
3. **Coordinate Conversion** - Converting between screen coordinates and chart time/price coordinates

## Supported Drawing Tools

| Tool | ID | Description |
|------|-----|-------------|
| Cursor | `cursor` | Default mode for chart interaction |
| Crosshair | `crosshair` | Enhanced crosshair mode |
| Trend Line | `trend_line` | Line between two points on the chart |
| Horizontal Line | `horizontal_line` | Horizontal line at a price level |
| Vertical Line | `vertical_line` | Vertical line at a time |
| Rectangle | `rectangle` | Rectangle between two points |
| Fibonacci | `fibonacci` | Fibonacci retracement levels |

## Architecture

### Drawing Types

```typescript
interface Drawing {
  id: string;
  type: DrawingType;
  points: Point[];  // { time: number, price: number }
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  selected?: boolean;
}

type DrawingTool = DrawingType | "cursor" | "crosshair";
```

### Core Classes

#### DrawingRenderer
- Manages SVG overlay element
- Renders drawings as SVG elements
- Updates drawings on pan/zoom

#### DrawingManager
- Manages drawing state
- Handles mouse events
- Provides API for adding/removing drawings

### Coordinate Conversion

```typescript
// Convert chart coordinates to screen coordinates
function pointToScreen(chart: IChartApi, point: Point): ScreenPoint | null {
  const timeScale = chart.timeScale();
  const priceScale = chart.priceScale("right");
  
  const x = timeScale.timeToCoordinate(point.time);
  const y = priceScale.priceToCoordinate(point.price);
  
  return { x, y };
}

// Convert screen coordinates to chart coordinates
function screenToPoint(chart: IChartApi, screenPoint: ScreenPoint): Point | null {
  const timeScale = chart.timeScale();
  const priceScale = chart.priceScale("right");
  
  const time = timeScale.coordinateToTime(screenPoint.x);
  const price = priceScale.coordinateToPrice(screenPoint.y);
  
  return { time, price };
}
```

## Usage

### In ChartContainer

```tsx
import { DrawingManager, type DrawingTool, type Drawing } from "@/lib/drawing-tools";

// Initialize drawing manager
const drawingManagerRef = useRef<DrawingManager | null>(null);

useEffect(() => {
  if (containerRef.current && chart) {
    drawingManagerRef.current = new DrawingManager(chart, containerRef.current, {
      onDrawingsChange: (drawings) => {
        // Handle drawings update
      },
    });
    drawingManagerRef.current.subscribeToTimeScale();
  }
}, []);

// Set active tool
drawingManagerRef.current?.setActiveTool("trend_line");

// Clear all drawings
drawingManagerRef.current?.clearAllDrawings();

// Get all drawings
const drawings = drawingManagerRef.current?.getDrawings();
```

### In Parent Component

```tsx
const [drawingTool, setDrawingTool] = useState<DrawingTool>("cursor");
const [drawings, setDrawings] = useState<Drawing[]>([]);
const chartRef = useRef<ChartContainerRef>(null);

// Toolbar buttons
<button onClick={() => setDrawingTool("trend_line")}>
  Trend Line
</button>

// Clear button
<button onClick={() => chartRef.current?.clearDrawings()}>
  Clear All
</button>

// Chart with drawing props
<ChartContainer
  ref={chartRef}
  drawingTool={drawingTool}
  onDrawingsChange={setDrawings}
/>
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` | Remove selected drawing |
| `Backspace` | Remove selected drawing |
| `Escape` | Cancel current drawing / Deselect |

## Drawing Colors

```typescript
const DRAWING_COLORS = [
  "#2962ff", // Blue (default)
  "#26a69a", // Green
  "#ef5350", // Red
  "#ff9800", // Orange
  "#9c27b0", // Purple
  "#00bcd4", // Cyan
  "#ffeb3b", // Yellow
  "#ffffff", // White
];
```

## Limitations

1. **No Persistence** - Drawings are not saved to localStorage/database
2. **No Edit Mode** - Cannot modify existing drawings  
3. **No Style Editor** - Cannot change color/line style after creation
4. **No Snap** - No snap to candle high/low
5. **No Multi-Select** - Cannot select multiple drawings
6. **Container Requirement** - DrawingManager must be initialized after chart is fully created

## Troubleshooting

### Panels Disappear When Selecting Tool

If UI panels disappear when selecting a drawing tool, this is usually caused by:

1. **Event listener conflict** - The drawing tool event listeners may interfere with React events
2. **CSS z-index issue** - The SVG overlay might cover UI elements
3. **React re-render** - State changes causing unexpected re-renders

Solution: The DrawingRenderer creates a wrapper div with `pointer-events: none` to prevent interference with React events.

## Future Enhancements

1. **Persistence** - Save drawings to localStorage or database
2. **Style Editor** - UI to change drawing properties
3. **Snap Mode** - Snap to OHLC values
4. **More Tools** - Text, arrow, pitchfork, etc.
5. **Touch Support** - Mobile-friendly drawing
6. **Undo/Redo** - History management

## Resources

- [lightweight-charts API](https://tradingview.github.io/lightweight-charts/docs/api)
- [SVG Documentation](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [TradingView Advanced Charts](https://www.tradingview.com/charting-library/) (paid alternative with built-in drawing tools)

## Comparison with TradingView Advanced Charts

| Feature | Custom Implementation | TradingView Advanced Charts |
|---------|----------------------|----------------------------|
| Cost | Free | Paid license required |
| Drawing Tools | 7 basic tools | 100+ tools |
| Persistence | Manual implementation | Built-in |
| Mobile Support | Limited | Full support |
| Customization | Full control | Limited |
| Maintenance | Self-maintained | TradingView maintained |
