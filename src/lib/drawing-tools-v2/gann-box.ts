/**
 * Gann Box Drawing Tool
 * A technical analysis tool that draws a rectangle with Gann angle lines from the center
 * of the top and bottom edges.
 * 
 * The Gann Box is based on W.D. Gann's concept that prices move at specific angles.
 * The angles are expressed as ratios (1x1, 1x2, 2x1, etc.) where the first number
 * represents the price movement and the second represents time.
 * 
 * Usage:
 * - P1: Top-left corner of the box
 * - P2: Bottom-right corner of the box
 * - Gann angle lines emanate from the center of top and bottom edges
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  Coordinate,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  Time,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';
import { positionsBox } from './helpers';

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

interface GannAngleConfig {
  ratio: string;
  slopeRatio: number; // The slope ratio (e.g., 1 for 1x1, 0.5 for 1x2, 2 for 2x1)
}

// Standard Gann angles with their slope ratios
// The slope ratio determines the angle: slopeRatio = price_change / time_change
const GANN_ANGLES: GannAngleConfig[] = [
  { ratio: '1x8', slopeRatio: 0.125 },
  { ratio: '1x4', slopeRatio: 0.25 },
  { ratio: '1x3', slopeRatio: 0.333 },
  { ratio: '1x2', slopeRatio: 0.5 },
  { ratio: '1x1', slopeRatio: 1 },
  { ratio: '2x1', slopeRatio: 2 },
  { ratio: '3x1', slopeRatio: 3 },
  { ratio: '4x1', slopeRatio: 4 },
  { ratio: '8x1', slopeRatio: 8 },
];

export interface GannBoxOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  fillColor: string;
  labelFontSize: number;
  labelBackgroundColor: string;
}

const defaultOptions: GannBoxOptions = {
  lineColor: '#2962ff',
  lineWidth: 1,
  lineStyle: 'dashed',
  showLabels: true,
  fillColor: 'rgba(41, 98, 255, 0.1)',
  labelFontSize: 10,
  labelBackgroundColor: '#2962ff',
};

/**
 * Gann Box Pane Renderer
 * Renders the Gann Box with angle lines on the chart canvas
 */
class GannBoxPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _options: GannBoxOptions;
  _chartWidth: number;
  _chartHeight: number;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    options: GannBoxOptions,
    chartWidth: number,
    chartHeight: number
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
    this._chartWidth = chartWidth;
    this._chartHeight = chartHeight;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) return;

      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;

      // Calculate box coordinates (p1 is top-left, p2 is bottom-right)
      const x1Scaled = Math.round(this._p1.x * horizontalRatio);
      const y1Scaled = Math.round(this._p1.y * verticalRatio);
      const x2Scaled = Math.round(this._p2.x * horizontalRatio);
      const y2Scaled = Math.round(this._p2.y * verticalRatio);

      // Ensure correct order (left, right, top, bottom)
      const left = Math.min(x1Scaled, x2Scaled);
      const right = Math.max(x1Scaled, x2Scaled);
      const top = Math.min(y1Scaled, y2Scaled);
      const bottom = Math.max(y1Scaled, y2Scaled);

      const boxWidth = right - left;
      const boxHeight = bottom - top;

      // Center points on top and bottom edges
      const centerX = left + boxWidth / 2;
      const topCenterY = top;
      const bottomCenterY = bottom;

      const chartWidthScaled = this._chartWidth * horizontalRatio;
      const chartHeightScaled = this._chartHeight * verticalRatio;

      // Set line style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw rectangle fill
      ctx.fillStyle = this._options.fillColor;
      ctx.fillRect(left, top, boxWidth, boxHeight);

      // Draw rectangle border
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.setLineDash([]);
      ctx.strokeRect(left, top, boxWidth, boxHeight);

      // Set line style for Gann angle lines
      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * horizontalRatio, 4 * horizontalRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * horizontalRatio, 4 * horizontalRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.strokeStyle = this._options.lineColor;

      // Calculate the base unit (pixels per unit of time/price ratio)
      // We use the box dimensions to determine the scale
      // For a 1x1 line at 45 degrees, the slope should be 1 (price units per time unit)
      const pixelsPerTimeUnit = boxWidth / 2; // Half box width as time unit
      const pixelsPerPriceUnit = boxHeight; // Box height as price unit

      // Store line endpoints for labels
      const bottomLabels: { x: number; y: number; ratio: string }[] = [];
      const topLabels: { x: number; y: number; ratio: string }[] = [];

      // Draw Gann angle lines from bottom center (going upward and outward)
      for (const gannAngle of GANN_ANGLES) {
        // For lines going up from bottom center
        // Positive slopeRatio means steeper angle (more price change per time unit)
        // In canvas, Y increases downward, so we need to negate for upward movement
        
        // Calculate the angle based on the ratio
        // 1x1 means equal price and time units (45 degrees in a square)
        // The angle is arctan(price/time) in the conceptual space
        // We need to convert to pixel space accounting for the aspect ratio
        
        const pricePerPixel = boxHeight / pixelsPerPriceUnit;
        const timePerPixel = boxWidth / pixelsPerTimeUnit;
        
        // Calculate the direction for upward lines from bottom center
        // For each angle, we draw two lines: one going left-up and one going right-up
        
        const slopeRatio = gannAngle.slopeRatio;
        
        // Calculate the angle in pixel space
        // For 1x1, we want a 45-degree line in the scaled space
        // The actual angle depends on the box aspect ratio
        const pixelSlope = (slopeRatio * boxHeight) / (boxWidth / 2);
        
        // For upward lines from bottom center:
        // Going right and up: positive dx, negative dy (since Y is inverted)
        // Going left and up: negative dx, negative dy

        // Right-up line (to the right edge of box or chart)
        const rightUpAngle = Math.atan2(-pixelSlope, 1);
        const maxDistRight = chartWidthScaled - centerX;
        let endXRight = centerX + maxDistRight;
        let endYRight = bottomCenterY + Math.tan(rightUpAngle) * maxDistRight;

        // Clip to boundaries
        if (endYRight < 0) {
          const t = -bottomCenterY / Math.tan(rightUpAngle);
          endXRight = centerX + t;
          endYRight = 0;
        }

        if (endXRight > left && endXRight < chartWidthScaled && endYRight >= 0) {
          ctx.beginPath();
          ctx.moveTo(centerX, bottomCenterY);
          ctx.lineTo(endXRight, endYRight);
          ctx.stroke();
          
          if (gannAngle.ratio !== '1x1') {
            bottomLabels.push({ x: endXRight, y: endYRight, ratio: gannAngle.ratio });
          }
        }

        // Left-up line (to the left edge of box or chart)
        const leftUpAngle = Math.atan2(-pixelSlope, -1);
        const maxDistLeft = centerX;
        let endXLeft = centerX - maxDistLeft;
        let endYLeft = bottomCenterY + Math.tan(leftUpAngle) * maxDistLeft;

        // Clip to boundaries
        if (endYLeft < 0) {
          const t = -bottomCenterY / Math.tan(leftUpAngle);
          endXLeft = centerX + t;
          endYLeft = 0;
        }

        if (endXLeft > 0 && endXLeft < right && endYLeft >= 0) {
          ctx.beginPath();
          ctx.moveTo(centerX, bottomCenterY);
          ctx.lineTo(endXLeft, endYLeft);
          ctx.stroke();
          
          if (gannAngle.ratio !== '1x1') {
            bottomLabels.push({ x: endXLeft, y: endYLeft, ratio: gannAngle.ratio });
          }
        }
      }

      // Draw Gann angle lines from top center (going downward and outward)
      for (const gannAngle of GANN_ANGLES) {
        const slopeRatio = gannAngle.slopeRatio;
        const pixelSlope = (slopeRatio * boxHeight) / (boxWidth / 2);

        // Right-down line
        const rightDownAngle = Math.atan2(pixelSlope, 1);
        const maxDistRight = chartWidthScaled - centerX;
        let endXRight = centerX + maxDistRight;
        let endYRight = topCenterY + Math.tan(rightDownAngle) * maxDistRight;

        // Clip to bottom boundary
        if (endYRight > chartHeightScaled) {
          const t = (chartHeightScaled - topCenterY) / Math.tan(rightDownAngle);
          endXRight = centerX + t;
          endYRight = chartHeightScaled;
        }

        if (endXRight > left && endXRight < chartWidthScaled && endYRight <= chartHeightScaled) {
          ctx.beginPath();
          ctx.moveTo(centerX, topCenterY);
          ctx.lineTo(endXRight, endYRight);
          ctx.stroke();
          
          if (gannAngle.ratio !== '1x1') {
            topLabels.push({ x: endXRight, y: endYRight, ratio: gannAngle.ratio });
          }
        }

        // Left-down line
        const leftDownAngle = Math.atan2(pixelSlope, -1);
        const maxDistLeft = centerX;
        let endXLeft = centerX - maxDistLeft;
        let endYLeft = topCenterY + Math.tan(leftDownAngle) * maxDistLeft;

        // Clip to bottom boundary
        if (endYLeft > chartHeightScaled) {
          const t = (chartHeightScaled - topCenterY) / Math.tan(leftDownAngle);
          endXLeft = centerX + t;
          endYLeft = chartHeightScaled;
        }

        if (endXLeft > 0 && endXLeft < right && endYLeft <= chartHeightScaled) {
          ctx.beginPath();
          ctx.moveTo(centerX, topCenterY);
          ctx.lineTo(endXLeft, endYLeft);
          ctx.stroke();
          
          if (gannAngle.ratio !== '1x1') {
            topLabels.push({ x: endXLeft, y: endYLeft, ratio: gannAngle.ratio });
          }
        }
      }

      // Draw 1x1 lines with solid style (main diagonal lines)
      ctx.setLineDash([]);
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio * 1.5;

      // 1x1 from bottom center (upward to corners)
      ctx.beginPath();
      ctx.moveTo(left, bottomCenterY);
      ctx.lineTo(centerX, topCenterY);
      ctx.lineTo(right, bottomCenterY);
      ctx.stroke();

      // 1x1 from top center (downward to corners)
      ctx.beginPath();
      ctx.moveTo(left, topCenterY);
      ctx.lineTo(centerX, bottomCenterY);
      ctx.lineTo(right, topCenterY);
      ctx.stroke();

      // Draw labels
      if (this._options.showLabels) {
        ctx.setLineDash([]);
        ctx.font = `${this._options.labelFontSize * horizontalRatio}px Arial`;

        // Draw bottom labels
        for (const label of bottomLabels) {
          this._drawLabel(ctx, label.ratio, label.x, label.y, horizontalRatio, verticalRatio);
        }

        // Draw top labels
        for (const label of topLabels) {
          this._drawLabel(ctx, label.ratio, label.x, label.y, horizontalRatio, verticalRatio);
        }
      }

      // Draw center point handles
      const handleRadius = 5 * horizontalRatio;

      // Bottom center handle
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(centerX, bottomCenterY, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, bottomCenterY, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Top center handle
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(centerX, topCenterY, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, topCenterY, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw corner handles
      const cornerRadius = 4 * horizontalRatio;
      ctx.fillStyle = this._options.lineColor;

      // Top-left corner
      ctx.beginPath();
      ctx.arc(left, top, cornerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Top-right corner
      ctx.beginPath();
      ctx.arc(right, top, cornerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Bottom-left corner
      ctx.beginPath();
      ctx.arc(left, bottom, cornerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Bottom-right corner
      ctx.beginPath();
      ctx.arc(right, bottom, cornerRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private _drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    horizontalRatio: number,
    verticalRatio: number
  ) {
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width + 8 * horizontalRatio;
    const textHeight = this._options.labelFontSize * verticalRatio + 4 * verticalRatio;

    // Position label near the endpoint
    const labelX = x - textWidth / 2;
    const labelY = y - textHeight / 2;

    // Draw label background
    ctx.fillStyle = this._options.labelBackgroundColor;
    ctx.fillRect(labelX, labelY, textWidth, textHeight);

    // Draw label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, labelX + 4 * horizontalRatio, labelY + textHeight - 3 * verticalRatio);
  }
}

/**
 * Gann Box Pane View
 * Calculates coordinates and provides the renderer
 */
class GannBoxPaneView implements IPrimitivePaneView {
  _source: GannBoxDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;
  _chartHeight: number = 0;

  constructor(source: GannBoxDrawing) {
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

    // Get chart dimensions
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rightX = timeScale.logicalToCoordinate(visibleRange.to);
      if (rightX !== null) {
        this._chartWidth = rightX + 100; // Extra padding for labels
      }
    }

    // Estimate chart height
    const priceRange = chart.priceScale('right').getVisiblePriceRange();
    if (priceRange) {
      this._chartHeight = 800; // Default height, will be adjusted by canvas
    }
  }

  renderer() {
    return new GannBoxPaneRenderer(
      this._p1,
      this._p2,
      this._source._options,
      this._chartWidth,
      this._chartHeight
    );
  }
}

/**
 * Gann Box Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class GannBoxDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: GannBoxPaneView[];
  _options: GannBoxOptions;

  constructor(p1: Point, p2: Point, options?: Partial<GannBoxOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new GannBoxPaneView(this)];
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
  setOptions(options: Partial<GannBoxOptions>) {
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
    this.requestUpdate();
  }

  /**
   * Get the top-left point (P1)
   */
  getTopLeftPoint(): Point {
    return this._p1;
  }

  /**
   * Get the bottom-right point (P2)
   */
  getBottomRightPoint(): Point {
    return this._p2;
  }
}
