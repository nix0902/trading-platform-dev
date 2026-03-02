/**
 * Fibonacci Channel Drawing Tool
 * Draws parallel channels with Fibonacci retracement levels.
 *
 * Usage:
 * - P1, P2: Defines the base trend line
 * - P3: Defines the channel width (parallel line passes through P3)
 * - Fibonacci retracement lines are drawn between the two parallel lines
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  AutoscaleInfo,
  Coordinate,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  Logical,
  Time,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

export interface FibChannelOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  fillWidth: boolean;
  levels: number[];
  labelFontSize: number;
}

const defaultOptions: FibChannelOptions = {
  lineColor: '#2962ff',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
  fillWidth: false,
  levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
  labelFontSize: 11,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: FibChannelOptions['lineStyle'], pixelRatio: number): number[] {
  switch (style) {
    case 'dashed':
      return [8 * pixelRatio, 4 * pixelRatio];
    case 'dotted':
      return [2 * pixelRatio, 4 * pixelRatio];
    case 'solid':
    default:
      return [];
  }
}

/**
 * Calculate perpendicular distance from point P3 to line P1-P2
 */
function perpendicularDistance(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  if (lineLength === 0) return 0;
  
  // Distance formula: |Ax + By + C| / sqrt(A^2 + B^2)
  // Where line is: Ax + By + C = 0
  const A = dy;
  const B = -dx;
  const C = dx * y1 - dy * x1;
  
  return Math.abs(A * x3 + B * y3 + C) / lineLength;
}

/**
 * Get the side of point P3 relative to line P1-P2
 * Returns positive if P3 is on one side, negative on the other
 */
function getPointSide(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): number {
  // Cross product to determine side
  return (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
}

/**
 * Fibonacci Channel Pane Renderer
 * Renders the channel lines and Fibonacci levels on the chart canvas
 */
class FibChannelPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _chartWidth: number;
  _options: FibChannelOptions;
  _fibLines: { level: number; startX: number; startY: number; endX: number; endY: number }[];

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    chartWidth: number,
    options: FibChannelOptions,
    fibLines: { level: number; startX: number; startY: number; endX: number; endY: number }[]
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._chartWidth = chartWidth;
    this._options = options;
    this._fibLines = fibLines;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null ||
        this._p3.x === null ||
        this._p3.y === null
      )
        return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      // Scale coordinates to bitmap space
      const x1 = this._p1.x * hRatio;
      const y1 = this._p1.y * vRatio;
      const x2 = this._p2.x * hRatio;
      const y2 = this._p2.y * vRatio;
      const x3 = this._p3.x * hRatio;
      const y3 = this._p3.y * vRatio;

      const chartWidthScaled = this._chartWidth * hRatio;

      // Calculate direction vector for the base line
      const dx = x2 - x1;
      const dy = y2 - y1;

      if (dx === 0 && dy === 0) return;

      // Calculate extension to chart edges
      // Extend base line both ways
      let baseStartX: number, baseStartY: number, baseEndX: number, baseEndY: number;
      let parallelStartX: number, parallelStartY: number, parallelEndX: number, parallelEndY: number;

      if (dx !== 0) {
        // Extend to left edge (x = 0) and right edge (x = chartWidth)
        const tLeft = -x1 / dx;
        const tRight = (chartWidthScaled - x1) / dx;

        baseStartX = x1 + dx * tLeft;
        baseStartY = y1 + dy * tLeft;
        baseEndX = x1 + dx * tRight;
        baseEndY = y1 + dy * tRight;
      } else {
        // Vertical line
        baseStartX = x1;
        baseStartY = 0;
        baseEndX = x1;
        baseEndY = scope.bitmapSize.height;
      }

      // Calculate parallel line offset
      const lineLength = Math.sqrt(dx * dx + dy * dy);
      const unitDx = dx / lineLength;
      const unitDy = dy / lineLength;

      // Perpendicular direction (for offset)
      const perpDx = -unitDy;
      const perpDy = unitDx;

      // Determine which side P3 is on and calculate offset
      const side = getPointSide(x1, y1, x2, y2, x3, y3);
      const dist = perpendicularDistance(x1, y1, x2, y2, x3, y3);
      const signedDist = side >= 0 ? dist : -dist;

      // Parallel line points
      parallelStartX = baseStartX + perpDx * signedDist;
      parallelStartY = baseStartY + perpDy * signedDist;
      parallelEndX = baseEndX + perpDx * signedDist;
      parallelEndY = baseEndY + perpDy * signedDist;

      // Draw Fibonacci level lines
      for (const fibLine of this._fibLines) {
        const level = fibLine.level;

        // Calculate position between base and parallel lines
        // 0% is the base line, 100% is the parallel line through P3
        const startX = baseStartX + (parallelStartX - baseStartX) * level;
        const startY = baseStartY + (parallelStartY - baseStartY) * level;
        const endX = baseEndX + (parallelEndX - baseEndX) * level;
        const endY = baseEndY + (parallelEndY - baseEndY) * level;

        // Determine line style - solid for 0% and 100%, dashed for intermediate
        const isMainLine = level === 0 || level === 1;
        ctx.strokeStyle = this._options.lineColor + (isMainLine ? '' : '80'); // Full opacity for main lines
        ctx.lineWidth = (isMainLine ? this._options.lineWidth : 1) * hRatio;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isMainLine) {
          ctx.setLineDash(getLineDash(this._options.lineStyle, hRatio));
        } else {
          ctx.setLineDash([4 * hRatio, 4 * hRatio]);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label
        if (this._options.showLabels) {
          const labelPercent = `${(level * 100).toFixed(1)}%`;
          ctx.font = `${Math.round(this._options.labelFontSize * hRatio)}px Arial`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';

          const textWidth = ctx.measureText(labelPercent).width + 12 * hRatio;
          const labelHeight = 16 * vRatio;

          // Position label at the right edge
          const labelX = chartWidthScaled - textWidth - 5 * hRatio;
          const labelY = endY;

          // Draw label background
          ctx.fillStyle = this._options.lineColor;
          ctx.fillRect(labelX, labelY - labelHeight / 2, textWidth, labelHeight);

          // Draw label text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelPercent, labelX + textWidth - 5 * hRatio, labelY);
        }
      }

      // Draw handles at the three defining points
      const handleRadius = 6 * hRatio;
      const innerHandleRadius = 3 * hRatio;

      // Outer circles
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x3, y3, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white circles
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x1, y1, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x3, y3, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Fibonacci Channel Pane View
 * Calculates coordinates and provides the renderer
 */
class FibChannelPaneView implements IPrimitivePaneView {
  _source: FibChannelDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _chartWidth: number = 800;
  _fibLines: { level: number; startX: number; startY: number; endX: number; endY: number }[] = [];

  constructor(source: FibChannelDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const chart = this._source.chart;
    const timeScale = chart.timeScale();

    // Convert points to view coordinates
    this._p1 = {
      x: timeScale.timeToCoordinate(this._source._p1.time),
      y: series.priceToCoordinate(this._source._p1.price),
    };
    this._p2 = {
      x: timeScale.timeToCoordinate(this._source._p2.time),
      y: series.priceToCoordinate(this._source._p2.price),
    };
    this._p3 = {
      x: timeScale.timeToCoordinate(this._source._p3.time),
      y: series.priceToCoordinate(this._source._p3.price),
    };

    // Get chart width from visible range
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rightX = timeScale.logicalToCoordinate(visibleRange.to);
      if (rightX !== null) {
        this._chartWidth = rightX + 100; // Extra padding for labels
      }
    }

    // Pre-calculate Fibonacci lines (these are used by renderer for extension)
    this._fibLines = this._source._options.levels.map(level => ({
      level,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    }));
  }

  renderer() {
    return new FibChannelPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._chartWidth,
      this._source._options,
      this._fibLines
    );
  }
}

/**
 * Fibonacci Channel Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class FibChannelDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _paneViews: FibChannelPaneView[];
  _options: FibChannelOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<FibChannelOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._minPrice = Math.min(p1.price, p2.price, p3.price);
    this._maxPrice = Math.max(p1.price, p2.price, p3.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new FibChannelPaneView(this)];
  }

  /**
   * Provides autoscale information for the chart
   * Ensures the Fibonacci channel is visible when autoscaling
   */
  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    const x3 = timeScale.timeToCoordinate(this._p3.time);

    if (x1 === null || x2 === null || x3 === null) return null;

    const startX = Math.min(x1, x2, x3);
    const endX = Math.max(x1, x2, x3);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p2Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p2Index === null) return null;
    if (endTime < p1Index || startTime > p2Index) return null;

    // Expand price range to account for Fibonacci levels and extended lines
    const priceRange = this._maxPrice - this._minPrice;
    const expandedMin = this._minPrice - priceRange * 0.5;
    const expandedMax = this._maxPrice + priceRange * 0.5;

    return {
      priceRange: {
        minValue: expandedMin,
        maxValue: expandedMax,
      },
    };
  }

  /**
   * Updates all view objects
   */
  updateAllViews() {
    this._paneViews.forEach((v) => v.update());
  }

  /**
   * Returns the pane views for rendering
   */
  paneViews() {
    return this._paneViews;
  }

  /**
   * Set new options
   */
  setOptions(options: Partial<FibChannelOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  /**
   * Move a point to a new position
   */
  movePoint(pointIndex: number, newPoint: Point) {
    if (pointIndex === 0) {
      this._p1 = newPoint;
    } else if (pointIndex === 1) {
      this._p2 = newPoint;
    } else if (pointIndex === 2) {
      this._p3 = newPoint;
    }
    this._minPrice = Math.min(this._p1.price, this._p2.price, this._p3.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price, this._p3.price);
    this.requestUpdate();
  }

  /**
   * Get the first base line point (P1)
   */
  getP1(): Point {
    return this._p1;
  }

  /**
   * Get the second base line point (P2)
   */
  getP2(): Point {
    return this._p2;
  }

  /**
   * Get the channel width defining point (P3)
   */
  getP3(): Point {
    return this._p3;
  }

  /**
   * Get all three points
   */
  getPoints(): [Point, Point, Point] {
    return [this._p1, this._p2, this._p3];
  }

  /**
   * Get the Fibonacci levels
   */
  getLevels(): number[] {
    return this._options.levels;
  }
}
