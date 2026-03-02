/**
 * Horizontal Line Drawing Tool
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  AutoscaleInfo,
  Coordinate,
  ISeriesPrimitiveAxisView,
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

export interface HorizontalLineOptions {
  lineColor: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabel: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
}

const defaultOptions: HorizontalLineOptions = {
  lineColor: '#26a69a',
  width: 1,
  lineStyle: 'dashed',
  showLabel: true,
  labelBackgroundColor: 'rgba(38, 166, 154, 0.85)',
  labelTextColor: 'white',
};

class HorizontalLinePaneRenderer implements IPrimitivePaneRenderer {
  _y: Coordinate | null;
  _width: number;
  _options: HorizontalLineOptions;

  constructor(y: Coordinate | null, width: number, options: HorizontalLineOptions) {
    this._y = y;
    this._width = width;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._y === null) return;

      const ctx = scope.context;
      const yScaled = Math.round(this._y * scope.verticalPixelRatio);
      const widthScaled = this._width * scope.horizontalPixelRatio;

      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = widthScaled;

      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * scope.horizontalPixelRatio, 4 * scope.horizontalPixelRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * scope.horizontalPixelRatio, 4 * scope.horizontalPixelRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(0, yScaled);
      ctx.lineTo(this._width * scope.horizontalPixelRatio, yScaled);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

class HorizontalLinePaneView implements IPrimitivePaneView {
  _source: HorizontalLineDrawing;
  _y: Coordinate | null = null;
  _width: number = 0;

  constructor(source: HorizontalLineDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    this._y = series.priceToCoordinate(this._source._price);
    const timeScale = this._source.chart.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const x1 = timeScale.logicalToCoordinate(visibleRange.from);
      const x2 = timeScale.logicalToCoordinate(visibleRange.to);
      if (x1 !== null && x2 !== null) {
        this._width = Math.abs(x2 - x1);
      }
    }
  }

  renderer() {
    return new HorizontalLinePaneRenderer(this._y, this._width, this._source._options);
  }
}

class HorizontalLinePriceAxisView implements ISeriesPrimitiveAxisView {
  _source: HorizontalLineDrawing;
  _y: Coordinate | null = null;

  constructor(source: HorizontalLineDrawing) {
    this._source = source;
  }

  update() {
    this._y = this._source.series.priceToCoordinate(this._source._price);
  }

  coordinate() {
    return this._y ?? -1;
  }

  visible(): boolean {
    return this._source._options.showLabel;
  }

  tickVisible(): boolean {
    return true;
  }

  text(): string {
    return this._source._price.toFixed(2);
  }

  textColor(): string {
    return this._source._options.labelTextColor;
  }

  backColor(): string {
    return this._source._options.labelBackgroundColor;
  }
}

export class HorizontalLineDrawing extends PluginBase {
  _price: number;
  _paneViews: HorizontalLinePaneView[];
  _priceAxisViews: HorizontalLinePriceAxisView[];
  _options: HorizontalLineOptions;

  constructor(
    price: number,
    options?: Partial<HorizontalLineOptions>
  ) {
    super();
    this._price = price;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new HorizontalLinePaneView(this)];
    this._priceAxisViews = [new HorizontalLinePriceAxisView(this)];
  }

  autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
    return null; // Horizontal lines don't affect autoscale
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
    this._priceAxisViews.forEach(pw => pw.update());
  }

  paneViews() {
    return this._paneViews;
  }

  priceAxisViews() {
    return this._priceAxisViews;
  }
}
