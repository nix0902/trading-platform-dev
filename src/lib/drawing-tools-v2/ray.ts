/**
 * Ray Drawing Tool
 * A line that extends infinitely to the right
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
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

export interface RayOptions {
  lineColor: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabel: boolean;
}

const defaultOptions: RayOptions = {
  lineColor: '#2962ff',
  width: 2,
  lineStyle: 'solid',
  showLabel: true,
};

class RayPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _chartWidth: number;
  _options: RayOptions;

  constructor(p1: ViewPoint, chartWidth: number, options: RayOptions) {
    this._p1 = p1;
    this._chartWidth = chartWidth;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._p1.x === null || this._p1.y === null) return;

      const ctx = scope.context;
      const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
      const chartWidthScaled = this._chartWidth * scope.horizontalPixelRatio;

      ctx.lineWidth = this._options.width * scope.horizontalPixelRatio;
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineCap = 'round';

      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * scope.horizontalPixelRatio, 4 * scope.horizontalPixelRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * scope.horizontalPixelRatio, 4 * scope.horizontalPixelRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(chartWidthScaled, y1Scaled);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

class RayPaneView implements IPrimitivePaneView {
  _source: RayDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;

  constructor(source: RayDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    this._p1 = {
      x: this._source.chart.timeScale().timeToCoordinate(this._source._p1.time),
      y: series.priceToCoordinate(this._source._p1.price),
    };
    const visibleRange = this._source.chart.timeScale().getVisibleLogicalRange();
    if (visibleRange) {
      const x2 = this._source.chart.timeScale().logicalToCoordinate(visibleRange.to);
      if (x2 !== null) {
        this._chartWidth = x2 + 100;
      }
    }
  }

  renderer() {
    return new RayPaneRenderer(this._p1, this._chartWidth, this._source._options);
  }
}

export class RayDrawing extends PluginBase {
  _p1: Point;
  _paneViews: RayPaneView[];
  _options: RayOptions;

  constructor(p1: Point, options?: Partial<RayOptions>) {
    super();
    this._p1 = p1;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new RayPaneView(this)];
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }
}
