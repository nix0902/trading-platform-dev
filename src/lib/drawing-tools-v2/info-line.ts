/**
 * Info Line Drawing Tool
 * A trend line that shows price information labels including:
 * - Price at P1
 * - Price at P2
 * - Price difference (P2 - P1)
 * - Percentage change: ((P2 - P1) / P1) * 100
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

export interface InfoLineOptions {
  lineColor: string;
  width: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
  positiveColor: string;
  negativeColor: string;
}

const defaultOptions: InfoLineOptions = {
  lineColor: '#2962ff',
  width: 2,
  showLabels: true,
  labelBackgroundColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
  positiveColor: '#26a69a',
  negativeColor: '#ef5350',
};

class InfoLinePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _price1: number;
  _price2: number;
  _options: InfoLineOptions;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    price1: number,
    price2: number,
    options: InfoLineOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._price1 = price1;
    this._price2 = price2;
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
      const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);

      // Draw the main line
      ctx.lineWidth = this._options.width * scope.horizontalPixelRatio;
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Draw endpoint handles
      const handleRadius = 4 * scope.horizontalPixelRatio;
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2Scaled, y2Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      if (this._options.showLabels) {
        // Calculate price info
        const priceDiff = this._price2 - this._price1;
        const percentChange = (priceDiff / this._price1) * 100;
        const isPositive = priceDiff >= 0;

        // Draw P1 price label (left side)
        this._drawPriceLabel(scope, this._price1.toFixed(2), x1Scaled, y1Scaled, true);

        // Draw P2 price label (right side)
        this._drawPriceLabel(scope, this._price2.toFixed(2), x2Scaled, y2Scaled, false);

        // Draw info labels (difference and percentage) at midpoint
        this._drawInfoLabels(scope, priceDiff, percentChange, isPositive, x1Scaled, y1Scaled, x2Scaled, y2Scaled);
      }
    });
  }

  _drawPriceLabel(
    scope: BitmapCoordinatesRenderingScope,
    text: string,
    x: number,
    y: number,
    left: boolean
  ) {
    const fontSize = 12 * scope.horizontalPixelRatio;
    scope.context.font = `bold ${fontSize}px Arial`;
    scope.context.beginPath();
    const offset = 5 * scope.horizontalPixelRatio;
    const textWidth = scope.context.measureText(text);
    const leftAdjustment = left ? textWidth.width + offset * 4 : 0;
    scope.context.fillStyle = this._options.labelBackgroundColor;
    scope.context.roundRect(
      x + offset - leftAdjustment,
      y - fontSize,
      textWidth.width + offset * 2,
      fontSize + offset,
      5
    );
    scope.context.fill();
    scope.context.beginPath();
    scope.context.fillStyle = this._options.labelTextColor;
    scope.context.fillText(text, x + offset * 2 - leftAdjustment, y);
  }

  _drawInfoLabels(
    scope: BitmapCoordinatesRenderingScope,
    priceDiff: number,
    percentChange: number,
    isPositive: boolean,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const ctx = scope.context;
    const fontSize = 11 * scope.horizontalPixelRatio;
    ctx.font = `${fontSize}px Arial`;

    // Calculate midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Determine label position - offset perpendicular to the line
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = length > 0 ? -dy / length : 0;
    const perpY = length > 0 ? dx / length : 0;
    const offsetDistance = 25 * scope.horizontalPixelRatio;

    // Position labels on one side of the line
    const labelX = midX + perpX * offsetDistance;
    const labelY = midY + perpY * offsetDistance;

    // Format text
    const diffText = `${isPositive ? '+' : ''}${priceDiff.toFixed(2)}`;
    const percentText = `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`;
    const color = isPositive ? this._options.positiveColor : this._options.negativeColor;

    // Draw background for info labels
    const padding = 6 * scope.horizontalPixelRatio;
    const lineHeight = fontSize + padding;
    ctx.font = `bold ${fontSize}px Arial`;
    const diffWidth = ctx.measureText(diffText).width;
    const percentWidth = ctx.measureText(percentText).width;
    const maxWidth = Math.max(diffWidth, percentWidth) + padding * 2;

    // Draw container background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(labelX - maxWidth / 2, labelY - lineHeight / 2, maxWidth, lineHeight * 2 + padding / 2, 4);
    ctx.fill();

    // Draw border with trend color
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * scope.horizontalPixelRatio;
    ctx.beginPath();
    ctx.roundRect(labelX - maxWidth / 2, labelY - lineHeight / 2, maxWidth, lineHeight * 2 + padding / 2, 4);
    ctx.stroke();

    // Draw price difference
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(diffText, labelX, labelY + fontSize / 2);

    // Draw percentage change
    ctx.fillText(percentText, labelX, labelY + lineHeight + fontSize / 2);

    // Reset text align
    ctx.textAlign = 'left';
  }
}

class InfoLinePaneView implements IPrimitivePaneView {
  _source: InfoLineDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: InfoLineDrawing) {
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
    return new InfoLinePaneRenderer(
      this._p1,
      this._p2,
      this._source._p1.price,
      this._source._p2.price,
      this._source._options
    );
  }
}

export class InfoLineDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: InfoLinePaneView[];
  _options: InfoLineOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<InfoLineOptions>
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
    this._paneViews = [new InfoLinePaneView(this)];
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

  /**
   * Get the price difference (P2 - P1)
   */
  getPriceDifference(): number {
    return this._p2.price - this._p1.price;
  }

  /**
   * Get the percentage change ((P2 - P1) / P1) * 100
   */
  getPercentageChange(): number {
    return ((this._p2.price - this._p1.price) / this._p1.price) * 100;
  }

  /**
   * Update the line points
   */
  updatePoints(p1: Point, p2: Point): void {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(this._p1.price, this._p2.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price);
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<InfoLineOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.updateAllViews();
    this.requestUpdate();
  }
}
