/**
 * Fibonacci Speed Resistance Fan Drawing Tool
 * A technical analysis tool that draws a fan of lines from a pivot point at Fibonacci ratios
 * of the vertical distance between two points.
 * 
 * The Fibonacci Speed Resistance Fan is used to identify potential support and resistance
 * levels based on Fibonacci ratios. Each line represents a specific percentage of the
 * price movement from the pivot point.
 * 
 * Usage:
 * - P1: The pivot point (origin of all fan lines)
 * - P2: The defining point (determines the 100% level and base direction)
 * - Lines extend from P1 to the right edge of the chart at Fibonacci price levels
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

interface FibLevel {
  ratio: number;
  label: string;
}

// Fibonacci ratios for Speed Resistance Fan
const FIBONACCI_LEVELS: FibLevel[] = [
  { ratio: 0, label: '0%' },
  { ratio: 0.236, label: '23.6%' },
  { ratio: 0.382, label: '38.2%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.618, label: '61.8%' },
  { ratio: 0.786, label: '78.6%' },
  { ratio: 1, label: '100%' },
  { ratio: 1.272, label: '127.2%' },
  { ratio: 1.618, label: '161.8%' },
];

export interface FibSpeedResistanceFanOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  labelFontSize: number;
  labelBackgroundColor: string;
  fillColor: boolean;
  fillOpacity: number;
}

const defaultOptions: FibSpeedResistanceFanOptions = {
  lineColor: '#2962ff',
  lineWidth: 1,
  lineStyle: 'dashed',
  showLabels: true,
  labelFontSize: 10,
  labelBackgroundColor: '#2962ff',
  fillColor: true,
  fillOpacity: 0.08,
};

/**
 * Fibonacci Speed Resistance Fan Pane Renderer
 * Renders the fan lines on the chart canvas
 */
class FibSpeedResistanceFanPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _chartWidth: number;
  _chartHeight: number;
  _options: FibSpeedResistanceFanOptions;
  _fibLevels: { level: FibLevel; y: number }[];

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    chartWidth: number,
    chartHeight: number,
    options: FibSpeedResistanceFanOptions,
    fibLevels: { level: FibLevel; y: number }[]
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._chartWidth = chartWidth;
    this._chartHeight = chartHeight;
    this._options = options;
    this._fibLevels = fibLevels;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) return;

      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;

      const x1Scaled = Math.round(this._p1.x * horizontalRatio);
      const y1Scaled = Math.round(this._p1.y * verticalRatio);
      const x2Scaled = Math.round(this._p2.x * horizontalRatio);
      const y2Scaled = Math.round(this._p2.y * verticalRatio);
      const chartWidthScaled = this._chartWidth * horizontalRatio;
      const chartHeightScaled = this._chartHeight * verticalRatio;

      // Calculate the vertical distance (price range)
      const verticalDistance = y2Scaled - y1Scaled;

      // Set line style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw fill between fan lines if enabled
      if (this._options.fillColor && this._fibLevels.length > 1) {
        // Sort levels by Y position for proper fill
        const sortedLevels = [...this._fibLevels].sort((a, b) => a.y - b.y);
        
        // Fill each section between consecutive levels
        for (let i = 0; i < sortedLevels.length - 1; i++) {
          const level1 = sortedLevels[i];
          const level2 = sortedLevels[i + 1];
          
          const y1 = Math.round(level1.y * verticalRatio);
          const y2 = Math.round(level2.y * verticalRatio);
          
          // Alternate fill colors for better visibility
          const fillOpacity = this._options.fillOpacity * (i % 2 === 0 ? 1.2 : 0.8);
          const opacity = Math.min(Math.round(fillOpacity * 255), 255).toString(16).padStart(2, '0');
          ctx.fillStyle = this._options.lineColor + opacity;
          
          ctx.beginPath();
          ctx.moveTo(x1Scaled, y1Scaled);
          ctx.lineTo(chartWidthScaled, y1);
          ctx.lineTo(chartWidthScaled, y2);
          ctx.lineTo(x1Scaled, y2Scaled);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw main trend line (P1 to P2) with solid style
      ctx.setLineDash([]);
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Set line style for fan lines
      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * horizontalRatio, 4 * horizontalRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * horizontalRatio, 4 * horizontalRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.strokeStyle = this._options.lineColor;

      // Draw fan lines
      for (const fibData of this._fibLevels) {
        const yScaled = Math.round(fibData.y * verticalRatio);

        // Draw line from pivot to right edge at Fibonacci level
        ctx.beginPath();
        ctx.moveTo(x1Scaled, y1Scaled);
        ctx.lineTo(chartWidthScaled, yScaled);
        ctx.stroke();
      }

      // Draw labels
      if (this._options.showLabels) {
        ctx.setLineDash([]);
        ctx.font = `${this._options.labelFontSize * horizontalRatio}px Arial`;

        for (const fibData of this._fibLevels) {
          const yScaled = Math.round(fibData.y * verticalRatio);
          
          // Skip labels that would be outside chart bounds
          if (yScaled < 0 || yScaled > chartHeightScaled) continue;

          const label = fibData.level.label;
          const textMetrics = ctx.measureText(label);
          const textWidth = textMetrics.width + 8 * horizontalRatio;
          const textHeight = this._options.labelFontSize * verticalRatio + 4 * verticalRatio;

          // Position label near the right edge, at the line's Y position
          const labelX = chartWidthScaled - textWidth - 5 * horizontalRatio;
          const labelY = yScaled - textHeight / 2;

          // Draw label background
          ctx.fillStyle = this._options.labelBackgroundColor;
          ctx.fillRect(labelX, labelY, textWidth, textHeight);

          // Draw label text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, labelX + 4 * horizontalRatio, labelY + textHeight - 3 * verticalRatio);
        }
      }

      // Draw pivot point handle
      const handleRadius = 6 * horizontalRatio;
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw white inner circle for pivot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw P2 handle (smaller)
      const p2HandleRadius = 4 * horizontalRatio;
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x2Scaled, y2Scaled, p2HandleRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Fibonacci Speed Resistance Fan Pane View
 * Calculates coordinates and provides the renderer
 */
class FibSpeedResistanceFanPaneView implements IPrimitivePaneView {
  _source: FibSpeedResistanceFanDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;
  _chartHeight: number = 0;
  _fibLevels: { level: FibLevel; y: number }[] = [];

  constructor(source: FibSpeedResistanceFanDrawing) {
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

    // Calculate Fibonacci levels
    if (this._p1.y !== null && this._p2.y !== null) {
      const y1 = this._p1.y;
      const y2 = this._p2.y;
      const verticalDistance = y2 - y1;

      this._fibLevels = FIBONACCI_LEVELS.map((level) => {
        // Calculate Y coordinate at this Fibonacci level
        const y = y1 + verticalDistance * level.ratio;
        return { level, y };
      });
    }

    // Get chart dimensions
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rightX = timeScale.logicalToCoordinate(visibleRange.to);
      if (rightX !== null) {
        this._chartWidth = rightX + 100; // Extra padding for labels
      }
    }

    // Get chart height from price scale
    const priceScale = chart.priceScale('right');
    const priceRange = priceScale.getVisiblePriceRange();
    if (priceRange) {
      // Calculate chart height based on price coordinates
      const topY = series.priceToCoordinate(priceRange.to);
      const bottomY = series.priceToCoordinate(priceRange.from);
      if (topY !== null && bottomY !== null) {
        this._chartHeight = Math.abs(bottomY - topY);
      }
    }
  }

  renderer() {
    return new FibSpeedResistanceFanPaneRenderer(
      this._p1,
      this._p2,
      this._chartWidth,
      this._chartHeight,
      this._source._options,
      this._fibLevels
    );
  }
}

/**
 * Fibonacci Speed Resistance Fan Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class FibSpeedResistanceFanDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: FibSpeedResistanceFanPaneView[];
  _options: FibSpeedResistanceFanOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(p1: Point, p2: Point, options?: Partial<FibSpeedResistanceFanOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new FibSpeedResistanceFanPaneView(this)];
  }

  /**
   * Provides autoscale information for the chart
   * Ensures the Fibonacci Speed Resistance Fan is visible when autoscaling
   */
  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);

    if (x1 === null || x2 === null) return null;

    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p2Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p2Index === null) return null;
    if (endTime < p1Index || startTime > p2Index) return null;

    // Expand price range to account for extended Fibonacci levels
    const priceRange = this._maxPrice - this._minPrice;
    const maxExtension = 1.618; // Maximum Fibonacci extension
    const expandedMin = this._minPrice - priceRange * maxExtension;
    const expandedMax = this._maxPrice + priceRange * maxExtension;

    return {
      priceRange: {
        minValue: Math.min(expandedMin, this._minPrice),
        maxValue: Math.max(expandedMax, this._maxPrice),
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
  setOptions(options: Partial<FibSpeedResistanceFanOptions>) {
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
    }
    this._minPrice = Math.min(this._p1.price, this._p2.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price);
    this.requestUpdate();
  }

  /**
   * Get the pivot point (P1)
   */
  getPivotPoint(): Point {
    return this._p1;
  }

  /**
   * Get the defining point (P2)
   */
  getDefiningPoint(): Point {
    return this._p2;
  }

  /**
   * Get all Fibonacci level prices
   */
  getFibonacciLevels(): { ratio: number; price: number }[] {
    const priceRange = this._p2.price - this._p1.price;
    return FIBONACCI_LEVELS.map((level) => ({
      ratio: level.ratio,
      price: this._p1.price + priceRange * level.ratio,
    }));
  }
}
