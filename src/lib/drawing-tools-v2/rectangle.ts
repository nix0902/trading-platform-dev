/**
 * Rectangle Drawing Tool
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  Coordinate,
  ISeriesPrimitiveAxisView,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  PrimitivePaneViewZOrder,
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

export interface RectangleOptions {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  showLabels: boolean;
  labelColor: string;
  labelTextColor: string;
}

const defaultOptions: RectangleOptions = {
  fillColor: 'rgba(41, 98, 255, 0.2)',
  borderColor: '#2962ff',
  borderWidth: 2,
  showLabels: true,
  labelColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
};

class RectanglePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _options: RectangleOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, options: RectangleOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      )
        return;

      const ctx = scope.context;
      const horizontalPositions = positionsBox(
        this._p1.x,
        this._p2.x,
        scope.horizontalPixelRatio
      );
      const verticalPositions = positionsBox(
        this._p1.y,
        this._p2.y,
        scope.verticalPixelRatio
      );

      // Fill
      ctx.fillStyle = this._options.fillColor;
      ctx.fillRect(
        horizontalPositions.position,
        verticalPositions.position,
        horizontalPositions.length,
        verticalPositions.length
      );

      // Border
      ctx.strokeStyle = this._options.borderColor;
      ctx.lineWidth = this._options.borderWidth * scope.horizontalPixelRatio;
      ctx.strokeRect(
        horizontalPositions.position,
        verticalPositions.position,
        horizontalPositions.length,
        verticalPositions.length
      );
    });
  }
}

class RectanglePaneView implements IPrimitivePaneView {
  _source: RectangleDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: RectangleDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new RectanglePaneRenderer(this._p1, this._p2, this._source._options);
  }
}

class RectangleAxisPaneRenderer implements IPrimitivePaneRenderer {
  _p1: number | null;
  _p2: number | null;
  _fillColor: string;
  _vertical: boolean = false;

  constructor(
    p1: number | null,
    p2: number | null,
    fillColor: string,
    vertical: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._vertical = vertical;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._p1 === null || this._p2 === null) return;
      const ctx = scope.context;
      ctx.globalAlpha = 0.5;
      const positions = positionsBox(
        this._p1,
        this._p2,
        this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
      );
      ctx.fillStyle = this._fillColor;
      if (this._vertical) {
        ctx.fillRect(0, positions.position, 15, positions.length);
      } else {
        ctx.fillRect(positions.position, 0, positions.length, 15);
      }
    });
  }
}

abstract class RectangleAxisPaneView implements IPrimitivePaneView {
  _source: RectangleDrawing;
  _p1: number | null = null;
  _p2: number | null = null;
  _vertical: boolean = false;

  constructor(source: RectangleDrawing, vertical: boolean) {
    this._source = source;
    this._vertical = vertical;
  }

  abstract getPoints(): [Coordinate | null, Coordinate | null];

  update() {
    [this._p1, this._p2] = this.getPoints();
  }

  renderer() {
    return new RectangleAxisPaneRenderer(
      this._p1,
      this._p2,
      this._source._options.labelColor,
      this._vertical
    );
  }

  zOrder(): PrimitivePaneViewZOrder {
    return 'bottom';
  }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    return [y1, y2];
  }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    return [x1, x2];
  }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
  _source: RectangleDrawing;
  _p: Point;
  _pos: Coordinate | null = null;

  constructor(source: RectangleDrawing, p: Point) {
    this._source = source;
    this._p = p;
  }

  abstract update(): void;
  abstract text(): string;

  coordinate() {
    return this._pos ?? -1;
  }

  visible(): boolean {
    return this._source._options.showLabels;
  }

  tickVisible(): boolean {
    return this._source._options.showLabels;
  }

  textColor(): string {
    return this._source._options.labelTextColor;
  }

  backColor(): string {
    return this._source._options.labelColor;
  }

  movePoint(p: Point) {
    this._p = p;
    this.update();
  }
}

class RectangleTimeAxisView extends RectangleAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }

  text() {
    return this._source._options.labelColor;
  }
}

class RectanglePriceAxisView extends RectangleAxisView {
  update() {
    this._pos = this._source.series.priceToCoordinate(this._p.price);
  }

  text() {
    return this._p.price.toFixed(2);
  }
}

export class RectangleDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _options: RectangleOptions;
  _paneViews: RectanglePaneView[];
  _timeAxisViews: RectangleTimeAxisView[];
  _priceAxisViews: RectanglePriceAxisView[];
  _priceAxisPaneViews: RectanglePriceAxisPaneView[];
  _timeAxisPaneViews: RectangleTimeAxisPaneView[];

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<RectangleOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new RectanglePaneView(this)];
    this._timeAxisViews = [
      new RectangleTimeAxisView(this, p1),
      new RectangleTimeAxisView(this, p2),
    ];
    this._priceAxisViews = [
      new RectanglePriceAxisView(this, p1),
      new RectanglePriceAxisView(this, p2),
    ];
    this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
    this._timeAxisViews.forEach(pw => pw.update());
    this._priceAxisViews.forEach(pw => pw.update());
    this._priceAxisPaneViews.forEach(pw => pw.update());
    this._timeAxisPaneViews.forEach(pw => pw.update());
  }

  priceAxisViews() {
    return this._priceAxisViews;
  }

  timeAxisViews() {
    return this._timeAxisViews;
  }

  paneViews() {
    return this._paneViews;
  }

  priceAxisPaneViews() {
    return this._priceAxisPaneViews;
  }

  timeAxisPaneViews() {
    return this._timeAxisPaneViews;
  }
}
