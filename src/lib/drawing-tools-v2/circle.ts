/**
 * Circle Drawing Tool
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

export interface CircleOptions {
  borderColor: string;
  borderWidth: number;
  fillColor: string;
  showLabel: boolean;
}

const defaultOptions: CircleOptions = {
  borderColor: '#2962ff',
  borderWidth: 2,
  fillColor: 'rgba(41, 98, 255, 0.1)',
  showLabel: false,
};

class CirclePaneRenderer implements IPrimitivePaneRenderer {
  _center: ViewPoint;
  _radius: { x: number; y: number } | null;
  _options: CircleOptions;

  constructor(center: ViewPoint, radius: { x: number; y: number } | null, options: CircleOptions) {
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

      // Fill
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = this._options.borderColor;
      ctx.lineWidth = this._options.borderWidth * hRatio;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

class CirclePaneView implements IPrimitivePaneView {
  _source: CircleDrawing;
  _center: ViewPoint = { x: null, y: null };
  _radius: { x: number; y: number } | null = null;

  constructor(source: CircleDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    const series = this._source.series;

    this._center = {
      x: timeScale.timeToCoordinate(this._source._center.time),
      y: series.priceToCoordinate(this._source._center.price),
    };

    const edgePoint = {
      x: timeScale.timeToCoordinate(this._source._edge.time),
      y: series.priceToCoordinate(this._source._edge.price),
    };

    if (this._center.x !== null && this._center.y !== null && edgePoint.x !== null && edgePoint.y !== null) {
      this._radius = {
        x: Math.abs(edgePoint.x - this._center.x),
        y: Math.abs(edgePoint.y - this._center.y),
      };
    }
  }

  renderer() {
    return new CirclePaneRenderer(this._center, this._radius, this._source._options);
  }
}

export class CircleDrawing extends PluginBase {
  _center: Point;
  _edge: Point;
  _paneViews: CirclePaneView[];
  _options: CircleOptions;

  constructor(center: Point, edge: Point, options?: Partial<CircleOptions>) {
    super();
    this._center = center;
    this._edge = edge;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new CirclePaneView(this)];
  }

  autoscaleInfo(_startTime: Logical, _endTime: Logical): AutoscaleInfo | null {
    return null; // Circles don't autoscale
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }
}
