/**
 * Triangle Drawing Tool
 * Draws a triangle connecting 3 user-defined points
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

export interface TriangleOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string;
}

const defaultOptions: TriangleOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  fillColor: 'rgba(41, 98, 255, 0.1)',
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: TriangleOptions['lineStyle']): number[] {
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

class TrianglePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _options: TriangleOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, p3: ViewPoint, options: TriangleOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
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

      // Draw filled triangle
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();

      // Draw triangle border
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);
    });
  }
}

class TrianglePaneView implements IPrimitivePaneView {
  _source: TriangleDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };

  constructor(source: TriangleDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    const y3 = series.priceToCoordinate(this._source._p3.price);

    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    const x3 = timeScale.timeToCoordinate(this._source._p3.time);

    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
    this._p3 = { x: x3, y: y3 };
  }

  renderer() {
    return new TrianglePaneRenderer(this._p1, this._p2, this._p3, this._source._options);
  }
}

export class TriangleDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _options: TriangleOptions;
  _paneViews: TrianglePaneView[];

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<TriangleOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new TrianglePaneView(this)];
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
  }

  paneViews() {
    return this._paneViews;
  }
}
