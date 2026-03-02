/**
 * Trend Line Arrow Drawing Tool
 * A trend line with an arrowhead at the end point
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  AutoscaleInfo,
  Coordinate,
  IChartApi,
  ISeriesApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  Logical,
  SeriesOptionsMap,
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

export interface TrendLineArrowOptions {
  lineColor: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  arrowSize: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
}

const defaultOptions: TrendLineArrowOptions = {
  lineColor: '#2962ff',
  width: 2,
  lineStyle: 'solid',
  arrowSize: 10,
  showLabels: true,
  labelBackgroundColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
};

class TrendLineArrowPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _text1: string;
  _text2: string;
  _options: TrendLineArrowOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, text1: string, text2: string, options: TrendLineArrowOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._text1 = text1;
    this._text2 = text2;
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
      const pixelRatio = scope.horizontalPixelRatio;
      const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);

      // Set line style
      ctx.lineWidth = this._options.width * pixelRatio;
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * pixelRatio, 4 * pixelRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * pixelRatio, 4 * pixelRatio]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw the line
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Reset line dash for arrow
      ctx.setLineDash([]);

      // Draw arrowhead at point 2
      this._drawArrowhead(scope, x1Scaled, y1Scaled, x2Scaled, y2Scaled);

      // Draw endpoint handles
      const handleRadius = 4 * pixelRatio;
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      // Note: We don't draw a handle at p2 since the arrowhead is there

      if (this._options.showLabels) {
        this._drawTextLabel(scope, this._text1, x1Scaled, y1Scaled, true);
        this._drawTextLabel(scope, this._text2, x2Scaled, y2Scaled, false);
      }
    });
  }

  _drawArrowhead(
    scope: BitmapCoordinatesRenderingScope,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const ctx = scope.context;
    const pixelRatio = scope.horizontalPixelRatio;
    const arrowSize = this._options.arrowSize * pixelRatio;

    // Calculate the angle of the line
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Arrowhead points
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Calculate arrowhead vertices
    const x3 = x2 - arrowSize * Math.cos(angle - arrowAngle);
    const y3 = y2 - arrowSize * Math.sin(angle - arrowAngle);
    const x4 = x2 - arrowSize * Math.cos(angle + arrowAngle);
    const y4 = y2 - arrowSize * Math.sin(angle + arrowAngle);

    // Draw filled arrowhead
    ctx.fillStyle = this._options.lineColor;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  _drawTextLabel(scope: BitmapCoordinatesRenderingScope, text: string, x: number, y: number, left: boolean) {
    const fontSize = 12 * scope.horizontalPixelRatio;
    scope.context.font = `${fontSize}px Arial`;
    scope.context.beginPath();
    const offset = 5 * scope.horizontalPixelRatio;
    const textWidth = scope.context.measureText(text);
    const leftAdjustment = left ? textWidth.width + offset * 4 : 0;
    scope.context.fillStyle = this._options.labelBackgroundColor;
    scope.context.roundRect(x + offset - leftAdjustment, y - fontSize, textWidth.width + offset * 2, fontSize + offset, 5);
    scope.context.fill();
    scope.context.beginPath();
    scope.context.fillStyle = this._options.labelTextColor;
    scope.context.fillText(text, x + offset * 2 - leftAdjustment, y);
  }
}

class TrendLineArrowPaneView implements IPrimitivePaneView {
  _source: TrendLineArrowDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: TrendLineArrowDrawing) {
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
    return new TrendLineArrowPaneRenderer(
      this._p1,
      this._p2,
      this._source._p1.price.toFixed(2),
      this._source._p2.price.toFixed(2),
      this._source._options
    );
  }
}

export class TrendLineArrowDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: TrendLineArrowPaneView[];
  _options: TrendLineArrowOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<TrendLineArrowOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(this._p1.price, this._p2.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new TrendLineArrowPaneView(this)];
  }

  autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
    const p1Index = this._pointIndex(this._p1);
    const p2Index = this._pointIndex(this._p2);
    if (p1Index === null || p2Index === null) return null;
    if (endTimePoint < Math.min(p1Index, p2Index) || startTimePoint > Math.max(p1Index, p2Index)) return null;
    return {
      priceRange: {
        minValue: this._minPrice,
        maxValue: this._maxPrice,
      },
    };
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
  }

  paneViews() {
    return this._paneViews;
  }

  _pointIndex(p: Point): number | null {
    const coordinate = this.chart.timeScale().timeToCoordinate(p.time);
    if (coordinate === null) return null;
    return this.chart.timeScale().coordinateToLogical(coordinate);
  }
}
