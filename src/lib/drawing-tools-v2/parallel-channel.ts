/**
 * Parallel Channel Drawing Tool
 * Two parallel trend lines forming a channel
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

export interface ParallelChannelOptions {
  lineColor: string;
  width: number;
  fillBackground: boolean;
  backgroundColor: string;
  showLabels: boolean;
}

const defaultOptions: ParallelChannelOptions = {
  lineColor: '#2962ff',
  width: 2,
  fillBackground: true,
  backgroundColor: 'rgba(41, 98, 255, 0.1)',
  showLabels: true,
};

class ParallelChannelRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _p4: ViewPoint;
  _options: ParallelChannelOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, p3: ViewPoint, p4: ViewPoint, options: ParallelChannelOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._p4 = p4;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (
        this._p1.x === null || this._p1.y === null ||
        this._p2.x === null || this._p2.y === null ||
        this._p3.x === null || this._p3.y === null ||
        this._p4.x === null || this._p4.y === null
      ) return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const p1x = this._p1.x * hRatio;
      const p1y = this._p1.y * vRatio;
      const p2x = this._p2.x * hRatio;
      const p2y = this._p2.y * vRatio;
      const p3x = this._p3.x * hRatio;
      const p3y = this._p3.y * vRatio;
      const p4x = this._p4.x * hRatio;
      const p4y = this._p4.y * vRatio;

      // Fill background
      if (this._options.fillBackground) {
        ctx.fillStyle = this._options.backgroundColor;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p4x, p4y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.fill();
      }

      // Draw channel lines
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.width * hRatio;

      // Upper line
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      // Lower line
      ctx.beginPath();
      ctx.moveTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.stroke();

      // Endpoint handles
      const handleRadius = 4 * hRatio;
      ctx.fillStyle = this._options.lineColor;
      [[p1x, p1y], [p2x, p2y], [p3x, p3y], [p4x, p4y]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }
}

class ParallelChannelPaneView implements IPrimitivePaneView {
  _source: ParallelChannelDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _p4: ViewPoint = { x: null, y: null };

  constructor(source: ParallelChannelDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    this._p1 = {
      x: timeScale.timeToCoordinate(this._source._p1.time),
      y: series.priceToCoordinate(this._source._p1.price),
    };
    this._p2 = {
      x: timeScale.timeToCoordinate(this._source._p2.time),
      y: series.priceToCoordinate(this._source._p2.price),
    };

    // Calculate parallel channel points
    const channelHeight = this._source._channelHeight;
    const p3Price = this._source._p1.price - channelHeight;
    const p4Price = this._source._p2.price - channelHeight;

    this._p3 = {
      x: this._p1.x,
      y: series.priceToCoordinate(p3Price),
    };
    this._p4 = {
      x: this._p2.x,
      y: series.priceToCoordinate(p4Price),
    };
  }

  renderer() {
    return new ParallelChannelRenderer(this._p1, this._p2, this._p3, this._p4, this._source._options);
  }
}

export class ParallelChannelDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _channelHeight: number;
  _paneViews: ParallelChannelPaneView[];
  _options: ParallelChannelOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(p1: Point, p2: Point, channelHeight: number, options?: Partial<ParallelChannelOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._channelHeight = channelHeight;
    this._minPrice = Math.min(p1.price, p2.price) - channelHeight;
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new ParallelChannelPaneView(this)];
  }

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

    return {
      priceRange: {
        minValue: this._minPrice,
        maxValue: this._maxPrice,
      },
    };
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }
}
