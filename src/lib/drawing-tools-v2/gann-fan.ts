/**
 * Gann Fan Drawing Tool
 * A technical analysis tool that draws a series of trend lines from a pivot point at specific angles.
 * 
 * The Gann Fan is based on W.D. Gann's concept that prices move at specific angles from important
 * pivot points. The angles are expressed as ratios (1x1, 1x2, 2x1, etc.) where the first number
 * represents the price movement and the second represents time.
 * 
 * Usage:
 * - P1: The pivot point (origin of all fan lines)
 * - P2: Defines the base angle (the 1x1 line)
 * - Lines extend from P1 to the right edge of the chart
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

interface GannAngle {
  ratio: string;
  angle: number; // Angle offset from base angle in degrees
  color?: string;
}

// Standard Gann angles (offset from 1x1 line)
const GANN_ANGLES: GannAngle[] = [
  { ratio: '1x8', angle: -37.5 },
  { ratio: '1x4', angle: -30 },
  { ratio: '1x3', angle: -26.25 },
  { ratio: '1x2', angle: -18.75 },
  { ratio: '1x1', angle: 0 }, // Base angle (defined by P1-P2)
  { ratio: '2x1', angle: 18.75 },
  { ratio: '3x1', angle: 26.25 },
  { ratio: '4x1', angle: 30 },
  { ratio: '8x1', angle: 37.5 },
];

export interface GannFanOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  labelFontSize: number;
  labelBackgroundColor: string;
  extendLines: boolean;
  fillFan: boolean;
  fanOpacity: number;
}

const defaultOptions: GannFanOptions = {
  lineColor: '#2962ff',
  lineWidth: 1,
  lineStyle: 'dashed',
  showLabels: true,
  labelFontSize: 10,
  labelBackgroundColor: '#2962ff',
  extendLines: true,
  fillFan: false,
  fanOpacity: 0.1,
};

/**
 * Gann Fan Pane Renderer
 * Renders the Gann Fan lines on the chart canvas
 */
class GannFanPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _chartWidth: number;
  _chartHeight: number;
  _options: GannFanOptions;
  _baseAngle: number; // Base angle in radians (angle from P1 to P2)
  _priceRange: number;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    chartWidth: number,
    chartHeight: number,
    options: GannFanOptions,
    baseAngle: number,
    priceRange: number
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._chartWidth = chartWidth;
    this._chartHeight = chartHeight;
    this._options = options;
    this._baseAngle = baseAngle;
    this._priceRange = priceRange;
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

      // Calculate the pixel-based angle from P1 to P2
      const dx = x2Scaled - x1Scaled;
      const dy = y2Scaled - y1Scaled;
      
      // Calculate the base angle in the pixel coordinate system
      // Note: Y-axis is inverted in canvas (down is positive)
      const pixelBaseAngle = Math.atan2(dy, dx);

      // Set line style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * horizontalRatio, 4 * horizontalRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * horizontalRatio, 4 * horizontalRatio]);
      } else {
        ctx.setLineDash([]);
      }

      // Calculate line endpoints for each Gann angle
      const lineEndpoints: { x: number; y: number; ratio: string }[] = [];

      for (const gannAngle of GANN_ANGLES) {
        // Convert Gann angle (in degrees) to radians and add to base angle
        const angleOffsetRad = (gannAngle.angle * Math.PI) / 180;
        const lineAngle = pixelBaseAngle + angleOffsetRad;

        // Calculate line length to extend to the right edge of chart
        // We need to find where the line intersects the right edge or top/bottom
        const maxLineLength = chartWidthScaled * 2; // Long enough to reach edge
        
        // Calculate endpoint
        const endX = x1Scaled + Math.cos(lineAngle) * maxLineLength;
        let endY = y1Scaled + Math.sin(lineAngle) * maxLineLength;

        // Clip to chart boundaries
        if (endY < 0) {
          // Line exits through top
          const t = -y1Scaled / Math.sin(lineAngle);
          const clippedEndX = x1Scaled + Math.cos(lineAngle) * t;
          if (clippedEndX > x1Scaled && clippedEndX <= chartWidthScaled) {
            lineEndpoints.push({ x: clippedEndX, y: 0, ratio: gannAngle.ratio });
            continue;
          }
        } else if (endY > chartHeightScaled) {
          // Line exits through bottom
          const t = (chartHeightScaled - y1Scaled) / Math.sin(lineAngle);
          const clippedEndX = x1Scaled + Math.cos(lineAngle) * t;
          if (clippedEndX > x1Scaled && clippedEndX <= chartWidthScaled) {
            lineEndpoints.push({ x: clippedEndX, y: chartHeightScaled, ratio: gannAngle.ratio });
            continue;
          }
        }

        // Line exits through right edge
        if (endX > x1Scaled) {
          lineEndpoints.push({ x: Math.min(endX, chartWidthScaled), y: endY, ratio: gannAngle.ratio });
        }
      }

      // Draw fan fill if enabled
      if (this._options.fillFan && lineEndpoints.length > 1) {
        ctx.fillStyle = this._options.lineColor + Math.round(this._options.fanOpacity * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(x1Scaled, y1Scaled);
        
        // Sort endpoints by angle for proper fill
        const sortedEndpoints = [...lineEndpoints].sort((a, b) => a.y - b.y);
        
        for (const endpoint of sortedEndpoints) {
          ctx.lineTo(endpoint.x, endpoint.y);
        }
        
        ctx.closePath();
        ctx.fill();
      }

      // Draw main trend line (P1 to P2) with solid style
      ctx.setLineDash([]);
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Reset line style for fan lines
      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * horizontalRatio, 4 * horizontalRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * horizontalRatio, 4 * horizontalRatio]);
      }

      // Draw fan lines
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.strokeStyle = this._options.lineColor;

      for (const endpoint of lineEndpoints) {
        // Don't draw the 1x1 line again (it's already drawn as solid)
        if (endpoint.ratio === '1x1') continue;

        ctx.beginPath();
        ctx.moveTo(x1Scaled, y1Scaled);
        ctx.lineTo(endpoint.x, endpoint.y);
        ctx.stroke();
      }

      // Draw labels
      if (this._options.showLabels) {
        ctx.setLineDash([]);
        ctx.font = `${this._options.labelFontSize * horizontalRatio}px Arial`;
        
        for (const endpoint of lineEndpoints) {
          const label = endpoint.ratio;
          const textMetrics = ctx.measureText(label);
          const textWidth = textMetrics.width + 8 * horizontalRatio;
          const textHeight = this._options.labelFontSize * verticalRatio + 4 * verticalRatio;

          // Position label near the right edge, at the line's Y position
          const labelX = Math.min(endpoint.x - textWidth - 5 * horizontalRatio, chartWidthScaled - textWidth - 5 * horizontalRatio);
          const labelY = endpoint.y - textHeight / 2;

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
 * Gann Fan Pane View
 * Calculates coordinates and provides the renderer
 */
class GannFanPaneView implements IPrimitivePaneView {
  _source: GannFanDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;
  _chartHeight: number = 0;
  _baseAngle: number = 0;
  _priceRange: number = 0;

  constructor(source: GannFanDrawing) {
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

    // Calculate base angle (from P1 to P2) in radians
    if (this._p1.x !== null && this._p1.y !== null && this._p2.x !== null && this._p2.y !== null) {
      const dx = this._p2.x - this._p1.x;
      const dy = this._p2.y - this._p1.y;
      this._baseAngle = Math.atan2(dy, dx);
    }

    // Calculate price range for scaling
    this._priceRange = Math.abs(this._source._p2.price - this._source._p1.price);

    // Get chart dimensions
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rightX = timeScale.logicalToCoordinate(visibleRange.to);
      if (rightX !== null) {
        this._chartWidth = rightX + 100; // Extra padding for labels
      }
    }

    // Estimate chart height from price scale
    const priceRange = chart.priceScale('right').getVisiblePriceRange();
    if (priceRange) {
      // Approximate chart height in pixels (we'll use a reasonable default)
      this._chartHeight = 800; // This will be adjusted based on actual canvas size
    }
  }

  renderer() {
    return new GannFanPaneRenderer(
      this._p1,
      this._p2,
      this._chartWidth,
      this._chartHeight,
      this._source._options,
      this._baseAngle,
      this._priceRange
    );
  }
}

/**
 * Gann Fan Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class GannFanDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: GannFanPaneView[];
  _options: GannFanOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(p1: Point, p2: Point, options?: Partial<GannFanOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new GannFanPaneView(this)];
  }

  /**
   * Provides autoscale information for the chart
   * Ensures the Gann Fan is visible when autoscaling
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

    // Expand price range to account for fan lines
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
  setOptions(options: Partial<GannFanOptions>) {
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
   * Get the angle-defining point (P2)
   */
  getAnglePoint(): Point {
    return this._p2;
  }
}
