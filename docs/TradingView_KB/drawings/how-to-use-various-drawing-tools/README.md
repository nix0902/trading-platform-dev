# How to Use Various Drawing Tools - Implementation Guide

This guide provides detailed implementation instructions for all drawing tools, including mathematical formulas, algorithms, and code examples.

## Table of Contents

### Trend Lines
- [Trend Lines](./trend-lines.md) - Trend Line, Ray, Horizontal/Vertical Lines, Parallel Channel, Info Line

### Channels
- [Channels](./channels.md) - Parallel Channel, Diverging Channel, Regression Trend

### Pitchforks
- [Pitchforks](./pitchforks.md) - Standard, Schiff, Modified Schiff, Inside Pitchfork

### Fibonacci Tools
- [Fibonacci Tools](./fibonacci-tools.md) - Retracement, Extension, Circles, Speed Resistance Fan, Time Zones, Channel

### Gann Tools
- [Gann Tools](./gann-tools.md) - Gann Fan, Gann Box, Gann Square

### Geometric Shapes
- [Geometric Shapes](./geometric-shapes.md) - Rectangle, Circle, Ellipse, Triangle, Polyline

### Patterns
- [Patterns](./patterns.md) - ABCD, Head and Shoulders, Three Drives

### Measurements
- [Measurements](./measurements.md) - Price Label, Price Range, Date Price Range

### Annotations
- [Annotations](./annotations.md) - Text, Brush

---

## Common Concepts

### Coordinate System
All drawing tools use the lightweight-charts coordinate system:
- **Time axis**: Unix timestamp or date string
- **Price axis**: Numeric price value

### Plugin Architecture
All tools extend `PluginBase` and implement:
```typescript
interface ISeriesPrimitive<Time> {
  attached(params): void;
  detached(): void;
  updateAllViews(): void;
  paneViews(): IPrimitivePaneView[];
  priceAxisViews?(): ISeriesPrimitiveAxisView[];
  timeAxisViews?(): ISeriesPrimitiveAxisView[];
  autoscaleInfo?(): AutoscaleInfo | null;
}
```

### Rendering Pipeline
1. **PaneView** - Converts data coordinates to screen coordinates
2. **PaneRenderer** - Draws on canvas using bitmap coordinate space
3. **AxisView** - Shows labels on price/time axes

---

## Quick Reference

| Tool | Points | Category | Key Formula |
|------|--------|----------|-------------|
| Trend Line | 2 | Trend Lines | y = mx + b |
| Ray | 2 | Trend Lines | Line extends infinitely |
| Horizontal Line | 1 | Trend Lines | y = constant |
| Vertical Line | 1 | Trend Lines | x = constant |
| Parallel Channel | 3 | Channels | Two parallel lines |
| Regression Trend | 2 | Channels | Least squares fit |
| Diverging Channel | 3 | Channels | Two lines from apex |
| Pitchfork | 3 | Pitchforks | Parallel prongs from P1 |
| Schiff Pitchfork | 3 | Pitchforks | Handle at midpoint |
| Modified Schiff | 3 | Pitchforks | Handle at 2/3 offset |
| Inside Pitchfork | 3 | Pitchforks | All lines from P1 |
| Fib Retracement | 2 | Fibonacci | Fib ratios of range |
| Fib Extension | 3 | Fibonacci | Projects beyond P2 |
| Gann Fan | 2 | Gann | Specific angles |
| ABCD Pattern | 4 | Patterns | Harmonic ratios |
| Brush | Variable | Annotations | Bezier curves |
