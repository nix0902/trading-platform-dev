/**
 * Ellipse Drawing Tool
 * Draws an ellipse within a bounding box defined by 2 diagonal points
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

export interface EllipseOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string;
}

const defaultOptions: EllipseOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  fillColor: 'rgba(41, 98, 255, 0.1)',
};

/**
 * Sets the line dash pattern based on lineStyle
 */
function setLineDash(ctx: CanvasRenderingContext2D, style: 'solid' | 'dashed' | 'dotted', pixelRatio: number): void {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([6 * pixelRatio, 4 * pixelRatio]);
      break;
    case 'dotted':
      ctx.setLineDash([2 * pixelRatio, 3 * pixelRatio]);
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
      break;
  }
}

class EllipsePaneRenderer implements IPrimitivePaneRenderer {
  _center: ViewPoint;
  _radius: { x: number; y: number } | null;
  _options: EllipseOptions;

  constructor(center: ViewPoint, radius: { x: number; y: number } | null, options: EllipseOptions) {
    this._center = center;
    this._radius = radius;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._center.x === null || this._center.y === null || !this._radius) return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const cx = this._center.x * hRatio;
      const cy = this._center.y * vRatio;
      const rx = this._radius.x * hRatio;
      const ry = this._radius.y * vRatio;

      // Ensure positive radius
      if (rx <= 0 || ry <= 0) return;

      // Fill
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      setLineDash(ctx, this._options.lineStyle, hRatio);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);
    });
  }
}

class EllipsePaneView implements IPrimitivePaneView {
  _source: EllipseDrawing;
  _center: ViewPoint = { x: null, y: null };
  _radius: { x: number; y: number } | null = null;

  constructor(source: EllipseDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    const series = this._source.series;

    // Get the two diagonal points
    const point1 = {
      x: timeScale.timeToCoordinate(this._source._point1.time),
      y: series.priceToCoordinate(this._source._point1.price),
    };

    const point2 = {
      x: timeScale.timeToCoordinate(this._source._point2.time),
      y: series.priceToCoordinate(this._source._point2.price),
    };

    if (point1.x !== null && point1.y !== null && point2.x !== null && point2.y !== null) {
      // Calculate center as midpoint between the two diagonal points
      this._center = {
        x: (point1.x + point2.x) / 2 as Coordinate,
        y: (point1.y + point2.y) / 2 as Coordinate,
      };

      // Calculate radii as half of the bounding box dimensions
      this._radius = {
        x: Math.abs(point2.x - point1.x) / 2,
        y: Math.abs(point2.y - point1.y) / 2,
      };
    } else {
      this._center = { x: null, y: null };
      this._radius = null;
    }
  }

  renderer() {
    return new EllipsePaneRenderer(this._center, this._radius, this._source._options);
  }
}

export class EllipseDrawing extends PluginBase {
  _point1: Point;
  _point2: Point;
  _paneViews: EllipsePaneView[];
  _options: EllipseOptions;

  /**
   * Creates an ellipse drawing
   * @param point1 - First diagonal corner of the bounding box
   * @param point2 - Second diagonal corner of the bounding box
   * @param options - Ellipse styling options
   */
  constructor(point1: Point, point2: Point, options?: Partial<EllipseOptions>) {
    super();
    this._point1 = point1;
    this._point2 = point2;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new EllipsePaneView(this)];
  }

  autoscaleInfo(_startTime: Logical, _endTime: Logical): AutoscaleInfo | null {
    return null; // Ellipses don't autoscale
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }

  /**
   * Updates the ellipse options
   */
  setOptions(options: Partial<EllipseOptions>): void {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  /**
   * Updates the ellipse points
   */
  setPoints(point1: Point, point2: Point): void {
    this._point1 = point1;
    this._point2 = point2;
    this.requestUpdate();
  }
}
