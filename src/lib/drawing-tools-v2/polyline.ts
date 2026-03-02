/**
 * Polyline Drawing Tool
 * Draws connected line segments through multiple points with optional fill
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  Coordinate,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
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

export interface PolylineOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  closed: boolean;
}

const defaultOptions: PolylineOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  fillColor: undefined,
  closed: false,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: PolylineOptions['lineStyle']): number[] {
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
 * Renderer for the polyline on the pane
 */
class PolylinePaneRenderer implements IPrimitivePaneRenderer {
  private _points: ViewPoint[];
  private _options: PolylineOptions;

  constructor(points: ViewPoint[], options: PolylineOptions) {
    this._points = points;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D): void {
    // Need at least 2 valid points to draw
    const validPoints = this._points.filter(p => p.x !== null && p.y !== null);
    if (validPoints.length < 2) {
      return;
    }

    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      // Convert all points to bitmap coordinates
      const bitmapPoints = validPoints.map(p => ({
        x: (p.x as number) * hRatio,
        y: (p.y as number) * vRatio,
      }));

      ctx.beginPath();
      ctx.moveTo(bitmapPoints[0].x, bitmapPoints[0].y);

      // Draw line segments through all points
      for (let i = 1; i < bitmapPoints.length; i++) {
        ctx.lineTo(bitmapPoints[i].x, bitmapPoints[i].y);
      }

      // Close the path if requested
      if (this._options.closed && bitmapPoints.length >= 3) {
        ctx.closePath();
      }

      // Fill the path if fillColor is provided and path is closed or has enough points
      if (this._options.fillColor && (this._options.closed || bitmapPoints.length >= 3)) {
        ctx.fillStyle = this._options.fillColor;
        ctx.fill();
      }

      // Draw the line
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(getLineDash(this._options.lineStyle).map(d => d * hRatio));
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);

      // Draw endpoint handles
      const handleRadius = 4 * hRatio;
      ctx.fillStyle = this._options.lineColor;
      
      // Draw handle at first point
      ctx.beginPath();
      ctx.arc(bitmapPoints[0].x, bitmapPoints[0].y, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw handle at last point
      ctx.beginPath();
      ctx.arc(bitmapPoints[bitmapPoints.length - 1].x, bitmapPoints[bitmapPoints.length - 1].y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Pane view for the polyline drawing
 */
class PolylinePaneView implements IPrimitivePaneView {
  private _source: PolylineDrawing;
  private _points: ViewPoint[] = [];

  constructor(source: PolylineDrawing) {
    this._source = source;
  }

  update(): void {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();
    const sourcePoints = this._source.points();

    this._points = sourcePoints.map(p => {
      const x = timeScale.timeToCoordinate(p.time);
      const y = series.priceToCoordinate(p.price);
      return { x, y };
    });
  }

  renderer(): IPrimitivePaneRenderer | null {
    const validPoints = this._points.filter(p => p.x !== null && p.y !== null);
    if (validPoints.length < 2) {
      return null;
    }
    return new PolylinePaneRenderer(this._points, this._source.options());
  }

  zOrder(): 'bottom' | 'top' | 'normal' {
    return 'top';
  }
}

/**
 * Polyline Drawing Tool
 * 
 * Draws connected line segments through multiple points.
 * Supports optional fill when closed is true and fillColor is provided.
 */
export class PolylineDrawing extends PluginBase {
  private _points: Point[];
  private _options: PolylineOptions;
  private _paneViews: PolylinePaneView[];

  constructor(
    points: Point[],
    options?: Partial<PolylineOptions>
  ) {
    super();
    
    // Validate minimum points requirement
    if (points.length < 2) {
      throw new Error('PolylineDrawing requires at least 2 points');
    }
    
    this._points = [...points];
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new PolylinePaneView(this)];
  }

  /**
   * Get all points
   */
  points(): Point[] {
    return this._points;
  }

  /**
   * Get the current options
   */
  options(): PolylineOptions {
    return this._options;
  }

  /**
   * Set new options
   */
  setOptions(options: Partial<PolylineOptions>): void {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  /**
   * Add a point to the polyline
   */
  addPoint(point: Point): void {
    this._points.push(point);
    this.requestUpdate();
  }

  /**
   * Set all points at once
   */
  setPoints(points: Point[]): void {
    if (points.length < 2) {
      throw new Error('PolylineDrawing requires at least 2 points');
    }
    this._points = [...points];
    this.requestUpdate();
  }

  /**
   * Update a specific point
   */
  updatePoint(index: number, point: Point): void {
    if (index >= 0 && index < this._points.length) {
      this._points[index] = point;
      this.requestUpdate();
    }
  }

  /**
   * Remove a point at the specified index
   */
  removePoint(index: number): void {
    if (this._points.length <= 2) {
      throw new Error('Cannot remove point - polyline must have at least 2 points');
    }
    if (index >= 0 && index < this._points.length) {
      this._points.splice(index, 1);
      this.requestUpdate();
    }
  }

  /**
   * Get the number of points
   */
  pointCount(): number {
    return this._points.length;
  }

  /**
   * Get the first point
   */
  firstPoint(): Point {
    return this._points[0];
  }

  /**
   * Get the last point
   */
  lastPoint(): Point {
    return this._points[this._points.length - 1];
  }

  /**
   * Update all views
   */
  updateAllViews(): void {
    this._paneViews.forEach(pw => pw.update());
  }

  /**
   * Get pane views
   */
  paneViews(): IPrimitivePaneView[] {
    return this._paneViews;
  }
}

/**
 * Factory function to create a polyline drawing
 */
export function createPolylineDrawing(
  points: Point[],
  options?: Partial<PolylineOptions>
): PolylineDrawing {
  return new PolylineDrawing(points, options);
}
