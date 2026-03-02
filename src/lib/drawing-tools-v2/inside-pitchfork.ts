/**
 * Inside Pitchfork Drawing Tool
 * Also called "Inside Pitchfork" - all three lines start from P1 and converge inward
 * 
 * Three anchor points: P1, P2, P3
 * - Upper line: from P1 through P2
 * - Median line: from P1 through the midpoint of P2-P3
 * - Lower line: from P1 through P3
 * 
 * Lines converge at P1 and extend forward
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
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

export interface InsidePitchforkOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  labelFontSize: number;
  extendLines: boolean;
}

const defaultOptions: InsidePitchforkOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
  labelFontSize: 11,
  extendLines: true,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: InsidePitchforkOptions['lineStyle']): number[] {
  switch (style) {
    case 'dashed':
      return [8, 4];
    case 'dotted':
      return [2, 4];
    case 'solid':
    default:
      return [];
  }
}

/**
 * Calculates a point extended from p1 through p2 to a given x coordinate
 */
function extendLineToX(
  p1: ViewPoint,
  p2: ViewPoint,
  targetX: number
): { x: number; y: number } | null {
  if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
    return null;
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Avoid division by zero
  if (dx === 0) {
    return { x: p1.x, y: targetX };
  }

  const slope = dy / dx;
  const y = p1.y + slope * (targetX - p1.x);

  return { x: targetX, y };
}

class InsidePitchforkPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _medianStart: ViewPoint;
  _chartWidth: number;
  _options: InsidePitchforkOptions;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    medianStart: ViewPoint,
    chartWidth: number,
    options: InsidePitchforkOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._medianStart = medianStart;
    this._chartWidth = chartWidth;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null ||
        this._p3.x === null ||
        this._p3.y === null ||
        this._medianStart.x === null ||
        this._medianStart.y === null
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
      const medianX = this._medianStart.x * hRatio;
      const medianY = this._medianStart.y * vRatio;
      const chartWidthScaled = this._chartWidth * hRatio;

      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle));

      // Calculate extension points
      const extendX = chartWidthScaled;

      // Upper line: P1 through P2
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (this._options.extendLines && x2 > x1) {
        // Extend forward to the right
        const slope = (y2 - y1) / (x2 - x1);
        const extendedY = y1 + slope * (extendX - x1);
        ctx.lineTo(extendX, extendedY);
      } else {
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // Median line: P1 through midpoint of P2-P3
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (this._options.extendLines && medianX > x1) {
        const slope = (medianY - y1) / (medianX - x1);
        const extendedY = y1 + slope * (extendX - x1);
        ctx.lineTo(extendX, extendedY);
      } else {
        ctx.lineTo(medianX, medianY);
      }
      ctx.stroke();

      // Lower line: P1 through P3
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (this._options.extendLines && x3 > x1) {
        const slope = (y3 - y1) / (x3 - x1);
        const extendedY = y1 + slope * (extendX - x1);
        ctx.lineTo(extendX, extendedY);
      } else {
        ctx.lineTo(x3, y3);
      }
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);

      // Draw anchor points
      const handleRadius = 5 * hRatio;
      ctx.fillStyle = this._options.lineColor;

      // P1 - the convergence point (slightly larger)
      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // P2 - upper anchor
      ctx.beginPath();
      ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // P3 - lower anchor
      ctx.beginPath();
      ctx.arc(x3, y3, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw labels if enabled
      if (this._options.showLabels) {
        const fontSize = this._options.labelFontSize * hRatio;
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Label background padding
        const padding = 4 * hRatio;
        const labelOffset = 15 * hRatio;

        // P1 label
        const p1Label = 'P1';
        const p1LabelWidth = ctx.measureText(p1Label).width + padding * 2;
        ctx.fillStyle = this._options.lineColor;
        ctx.fillRect(
          x1 - p1LabelWidth / 2,
          y1 - labelOffset - fontSize - padding,
          p1LabelWidth,
          fontSize + padding * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p1Label, x1, y1 - labelOffset);

        // P2 label
        const p2Label = 'P2';
        const p2LabelWidth = ctx.measureText(p2Label).width + padding * 2;
        ctx.fillStyle = this._options.lineColor;
        ctx.fillRect(
          x2 - p2LabelWidth / 2,
          y2 - labelOffset - fontSize - padding,
          p2LabelWidth,
          fontSize + padding * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p2Label, x2, y2 - labelOffset);

        // P3 label
        const p3Label = 'P3';
        const p3LabelWidth = ctx.measureText(p3Label).width + padding * 2;
        ctx.fillStyle = this._options.lineColor;
        ctx.fillRect(
          x3 - p3LabelWidth / 2,
          y3 + labelOffset - padding,
          p3LabelWidth,
          fontSize + padding * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p3Label, x3, y3 + labelOffset + fontSize / 2);
      }
    });
  }
}

class InsidePitchforkPaneView implements IPrimitivePaneView {
  _source: InsidePitchforkDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _medianStart: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;

  constructor(source: InsidePitchforkDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    // Convert points to screen coordinates
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

    // Calculate midpoint of P2-P3 for median line
    const midpointTime = this._source._medianTime;
    const midpointPrice = this._source._medianPrice;

    this._medianStart = {
      x: timeScale.timeToCoordinate(midpointTime),
      y: series.priceToCoordinate(midpointPrice),
    };

    // Get chart width for line extension
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const x = timeScale.logicalToCoordinate(visibleRange.to);
      if (x !== null) {
        this._chartWidth = x + 100; // Add some padding
      }
    }
  }

  renderer() {
    return new InsidePitchforkPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._medianStart,
      this._chartWidth,
      this._source._options
    );
  }
}

export class InsidePitchforkDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _options: InsidePitchforkOptions;
  _paneViews: InsidePitchforkPaneView[];

  // Calculated values
  _medianTime: Time;
  _medianPrice: number;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<InsidePitchforkOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;

    // Calculate midpoint of P2-P3
    // For time, we use a numeric representation or the later time
    this._medianPrice = (p2.price + p3.price) / 2;
    this._medianTime = p2.time; // Use P2's time as reference for the median start

    // Calculate price range for autoscaling
    const prices = [p1.price, p2.price, p3.price];
    this._minPrice = Math.min(...prices);
    this._maxPrice = Math.max(...prices);

    this._options = {
      ...defaultOptions,
      ...options,
    };

    this._paneViews = [new InsidePitchforkPaneView(this)];
  }

  /**
   * Returns the number of required anchor points
   */
  static get requiredPoints(): number {
    return 3;
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();

    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    const x3 = timeScale.timeToCoordinate(this._p3.time);

    if (x1 === null || x2 === null || x3 === null) return null;

    const points = [
      timeScale.coordinateToLogical(x1),
      timeScale.coordinateToLogical(x2),
      timeScale.coordinateToLogical(x3),
    ].filter((x): x is Logical => x !== null);

    if (points.length === 0) return null;

    const minX = Math.min(...points);
    const maxX = Math.max(...points);

    // Check if the visible range overlaps with our drawing
    if (endTime < minX || startTime > maxX) return null;

    return {
      priceRange: {
        minValue: this._minPrice,
        maxValue: this._maxPrice,
      },
    };
  }

  updateAllViews() {
    this._paneViews.forEach((view) => view.update());
  }

  paneViews() {
    return this._paneViews;
  }

  /**
   * Update the drawing points (for interactive editing)
   */
  setPoints(p1: Point, p2: Point, p3: Point): void {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;

    // Recalculate midpoint
    this._medianPrice = (p2.price + p3.price) / 2;
    this._medianTime = p2.time;

    // Recalculate price range
    const prices = [p1.price, p2.price, p3.price];
    this._minPrice = Math.min(...prices);
    this._maxPrice = Math.max(...prices);

    this.requestUpdate();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<InsidePitchforkOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.requestUpdate();
  }
}
