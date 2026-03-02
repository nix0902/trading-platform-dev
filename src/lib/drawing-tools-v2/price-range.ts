import {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  LineStyle,
  CanvasRenderingTarget2D,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';
import { DrawingPoint, HoveredObject } from './drawing-types';
import { getAnchorPointsFromDrawingPoints } from './drawing-utils';

interface PriceRangeOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: LineStyle;
  labelBackgroundColor: string;
  labelTextColor: string;
  showPercentage: boolean;
}

interface PriceRangePoint {
  time: Time;
  price: number;
}

interface PriceRangeData {
  p1: PriceRangePoint;
  p2: PriceRangePoint;
}

const defaultOptions: PriceRangeOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: LineStyle.Solid,
  labelBackgroundColor: '#2962FF',
  labelTextColor: '#FFFFFF',
  showPercentage: true,
};

function setLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle): void {
  switch (style) {
    case LineStyle.Dashed:
      ctx.setLineDash([6, 6]);
      break;
    case LineStyle.Dotted:
      ctx.setLineDash([2, 4]);
      break;
    case LineStyle.LargeDashed:
      ctx.setLineDash([12, 6]);
      break;
    case LineStyle.SparseDotted:
      ctx.setLineDash([2, 8]);
      break;
    case LineStyle.Solid:
    default:
      ctx.setLineDash([]);
      break;
  }
}

class PriceRangePaneRenderer implements IPrimitivePaneRenderer {
  private _data: PriceRangeData | null = null;
  private _options: PriceRangeOptions;
  private _priceToY: (price: number) => number;
  private _timeToX: (time: Time) => number;
  private _width: number;
  private _height: number;
  private _left: number;

  constructor(
    data: PriceRangeData | null,
    options: PriceRangeOptions,
    priceToY: (price: number) => number,
    timeToX: (time: Time) => number,
    width: number,
    height: number,
    left: number
  ) {
    this._data = data;
    this._options = options;
    this._priceToY = priceToY;
    this._timeToX = timeToX;
    this._width = width;
    this._height = height;
    this._left = left;
  }

  draw(target: CanvasRenderingTarget2D): void {
    if (!this._data) return;

    const { p1, p2 } = this._data;
    const y1 = this._priceToY(p1.price);
    const y2 = this._priceToY(p2.price);

    if (!isFinite(y1) || !isFinite(y2)) return;

    // Ensure y1 is the upper price (lower Y value)
    const upperY = Math.min(y1, y2);
    const lowerY = Math.max(y1, y2);
    const upperPrice = Math.max(p1.price, p2.price);
    const lowerPrice = Math.min(p1.price, p2.price);

    const priceDiff = upperPrice - lowerPrice;
    const percentageDiff = lowerPrice !== 0 ? ((priceDiff / lowerPrice) * 100) : 0;

    // Get time positions for the vertical connector
    const x1 = this._timeToX(p1.time);
    const x2 = this._timeToX(p2.time);
    const connectorX = Math.min(x1, x2) + Math.abs(x2 - x1) / 2;

    // Use the bitmap scope to get context
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const horizontalScale = scope.horizontalPixelRatio;
      const verticalScale = scope.verticalPixelRatio;

      ctx.save();
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * verticalScale;
      ctx.lineCap = 'butt';
      setLineStyle(ctx, this._options.lineStyle);

      // Draw horizontal lines across the chart width
      ctx.beginPath();
      ctx.moveTo(this._left * horizontalScale, upperY * verticalScale);
      ctx.lineTo(this._width * horizontalScale, upperY * verticalScale);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this._left * horizontalScale, lowerY * verticalScale);
      ctx.lineTo(this._width * horizontalScale, lowerY * verticalScale);
      ctx.stroke();

      // Draw vertical connector at midpoint between the two points' times
      if (isFinite(connectorX)) {
        ctx.beginPath();
        ctx.moveTo(connectorX * horizontalScale, upperY * verticalScale);
        ctx.lineTo(connectorX * horizontalScale, lowerY * verticalScale);
        ctx.stroke();
      }

      ctx.restore();

      // Draw labels on the right side
      const rightMargin = 10 * horizontalScale;
      const labelPadding = 8 * horizontalScale;
      const labelHeight = 22 * verticalScale;
      const labelGap = 4 * verticalScale;

      // Prepare label texts
      const upperPriceText = upperPrice.toFixed(2);
      const lowerPriceText = lowerPrice.toFixed(2);
      const diffText = priceDiff.toFixed(2);
      const percentText = `${percentageDiff.toFixed(2)}%`;

      // Calculate label positions (stacked vertically near right edge)
      const labelX = this._width * horizontalScale - rightMargin;
      const centerY = (upperY + lowerY) / 2 * verticalScale;

      ctx.font = `bold ${12 * verticalScale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

      // Measure text widths
      const measureText = (text: string) => ctx.measureText(text).width;
      const maxTextWidth = Math.max(
        measureText(diffText),
        this._options.showPercentage ? measureText(percentText) : 0
      );

      // Info panel background
      const infoWidth = maxTextWidth + labelPadding * 2 + 60 * horizontalScale;
      const infoHeight = (this._options.showPercentage ? 2 : 1) * labelHeight + labelPadding;

      ctx.fillStyle = this._options.labelBackgroundColor;
      ctx.globalAlpha = 0.9;
      const infoX = labelX - infoWidth;
      const infoY = centerY - infoHeight / 2;
      this._drawRoundedRect(ctx, infoX, infoY, infoWidth, infoHeight, 4 * horizontalScale);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw price difference info
      ctx.fillStyle = this._options.labelTextColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let currentY = centerY - (this._options.showPercentage ? labelHeight / 2 + labelGap / 2 : 0);
      
      ctx.fillText(`Diff: ${diffText}`, infoX + labelPadding, currentY);

      if (this._options.showPercentage) {
        currentY += labelHeight + labelGap;
        ctx.fillText(`%: ${percentText}`, infoX + labelPadding, currentY);
      }

      // Draw price level labels on the right edge
      const priceLabelWidth = 70 * horizontalScale;
      
      // Upper price label
      ctx.fillStyle = this._options.labelBackgroundColor;
      ctx.globalAlpha = 0.9;
      this._drawRoundedRect(
        ctx,
        labelX - priceLabelWidth,
        upperY * verticalScale - labelHeight / 2,
        priceLabelWidth,
        labelHeight,
        4 * horizontalScale
      );
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = this._options.labelTextColor;
      ctx.textAlign = 'right';
      ctx.fillText(upperPriceText, labelX - 4 * horizontalScale, upperY * verticalScale);

      // Lower price label
      ctx.fillStyle = this._options.labelBackgroundColor;
      ctx.globalAlpha = 0.9;
      this._drawRoundedRect(
        ctx,
        labelX - priceLabelWidth,
        lowerY * verticalScale - labelHeight / 2,
        priceLabelWidth,
        labelHeight,
        4 * horizontalScale
      );
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = this._options.labelTextColor;
      ctx.fillText(lowerPriceText, labelX - 4 * horizontalScale, lowerY * verticalScale);

      // Draw bar count if times are different
      if (p1.time !== p2.time && isFinite(x1) && isFinite(x2)) {
        const barCount = Math.abs(Math.round((x2 - x1) / 10)); // Approximate bar count
        if (barCount > 0) {
          ctx.fillStyle = this._options.labelTextColor;
          ctx.textAlign = 'center';
          ctx.fillText(`Bars: ${barCount}`, connectorX * horizontalScale, centerY + infoHeight / 2 + 15 * verticalScale);
        }
      }
    });
  }

  private _drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

class PriceRangePaneView implements IPrimitivePaneView {
  private _data: PriceRangeData | null = null;
  private _options: PriceRangeOptions;
  private _series: SeriesAttachedParameter | null = null;

  constructor(data: PriceRangeData | null, options: PriceRangeOptions) {
    this._data = data;
    this._options = options;
  }

  update(data: PriceRangeData | null, series: SeriesAttachedParameter | null): void {
    this._data = data;
    this._series = series;
  }

  renderer(): IPrimitivePaneRenderer | null {
    if (!this._data || !this._series) return null;

    const { chart, series } = this._series;
    const timeScale = chart.timeScale();
    const width = chart.chartSize().width;
    const height = chart.chartSize().height;
    const left = timeScale.coordinateToLogical(0) ?? 0;

    return new PriceRangePaneRenderer(
      this._data,
      this._options,
      (price: number) => series.priceToCoordinate(price) ?? 0,
      (time: Time) => timeScale.timeToCoordinate(time) ?? 0,
      width,
      height,
      Math.max(0, left)
    );
  }
}

export class PriceRangeDrawing extends PluginBase implements ISeriesPrimitive {
  private _options: PriceRangeOptions;
  private _paneView: PriceRangePaneView;
  private _points: DrawingPoint[] = [];

  constructor(options: Partial<PriceRangeOptions> = {}) {
    super();
    this._options = { ...defaultOptions, ...options };
    this._paneView = new PriceRangePaneView(null, this._options);
  }

  public get requiredPoints(): number {
    return 2;
  }

  public get points(): DrawingPoint[] {
    return this._points;
  }

  public set points(value: DrawingPoint[]) {
    this._points = value;
    this._updateData();
  }

  public get options(): PriceRangeOptions {
    return this._options;
  }

  public setOptions(options: Partial<PriceRangeOptions>): void {
    this._options = { ...this._options, ...options };
    this._paneView.update(this._getPriceRangeData(), this._attached);
    this._requestUpdate();
  }

  public updateAllViews(): void {
    this._paneView.update(this._getPriceRangeData(), this._attached);
  }

  public paneViews(): IPrimitivePaneView[] {
    return [this._paneView];
  }

  public priceAxisViews() {
    return [];
  }

  public timeAxisViews() {
    return [];
  }

  public hitTest(x: number, y: number): HoveredObject | null {
    if (!this._attached || this._points.length < 2) return null;

    const { chart, series } = this._attached;
    const timeScale = chart.timeScale();

    const p1 = this._points[0];
    const p2 = this._points[1];

    const y1 = series.priceToCoordinate(p1.price) ?? NaN;
    const y2 = series.priceToCoordinate(p2.price) ?? NaN;

    const upperY = Math.min(y1, y2);
    const lowerY = Math.max(y1, y2);

    // Check if near the price range lines
    const tolerance = 10;

    // Check near horizontal lines
    if (Math.abs(y - upperY) < tolerance || Math.abs(y - lowerY) < tolerance) {
      return {
        externalId: this._externalId,
        cursorStyle: 'pointer',
        zOrder: 'top',
      };
    }

    // Check if inside the price range area
    if (y >= upperY - tolerance && y <= lowerY + tolerance) {
      return {
        externalId: this._externalId,
        cursorStyle: 'move',
        zOrder: 'top',
      };
    }

    return null;
  }

  protected _updateData(): void {
    this._paneView.update(this._getPriceRangeData(), this._attached);
    this._requestUpdate();
  }

  private _getPriceRangeData(): PriceRangeData | null {
    if (this._points.length < 2) return null;

    const anchorPoints = getAnchorPointsFromDrawingPoints(this._points);
    if (!anchorPoints || anchorPoints.length < 2) return null;

    return {
      p1: {
        time: anchorPoints[0].time,
        price: anchorPoints[0].price,
      },
      p2: {
        time: anchorPoints[1].time,
        price: anchorPoints[1].price,
      },
    };
  }
}

export type { PriceRangeOptions, PriceRangeData, PriceRangePoint };
