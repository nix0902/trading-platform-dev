import {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  IPrimitiveHitTestSource,
  SeriesAttachedParameter,
  Time,
  MouseEventParams,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';

interface DatePriceRangeOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string;
  showLabels: boolean;
}

interface Point {
  time: Time;
  price: number;
  x: number;
  y: number;
}

interface DatePriceRangeData {
  priceDiff: number;
  priceDiffPercent: number;
  barsCount: number;
  timeDiff: {
    days: number;
    hours: number;
    minutes: number;
    totalBars: number;
  };
}

class DatePriceRangePaneRenderer implements IPrimitivePaneRenderer {
  private _p1: Point | null = null;
  private _p2: Point | null = null;
  private _options: DatePriceRangeOptions;
  private _data: DatePriceRangeData | null = null;

  constructor(options: DatePriceRangeOptions) {
    this._options = options;
  }

  setData(p1: Point | null, p2: Point | null, data: DatePriceRangeData | null): void {
    this._p1 = p1;
    this._p2 = p2;
    this._data = data;
  }

  draw(target: CanvasRenderingContext2D): void {
    if (!this._p1 || !this._p2 || !this._data) return;

    const ctx = target;
    const p1 = this._p1;
    const p2 = this._p2;

    // Calculate rectangle bounds
    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);

    const width = right - left;
    const height = bottom - top;

    // Draw fill
    ctx.fillStyle = this._options.fillColor;
    ctx.fillRect(left, top, width, height);

    // Draw border
    ctx.strokeStyle = this._options.lineColor;
    ctx.lineWidth = this._options.lineWidth;

    // Set line style
    ctx.setLineDash(this._getLineDash());
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw corner points
    this._drawPoint(ctx, p1.x, p1.y);
    this._drawPoint(ctx, p2.x, p2.y);

    // Draw info box if labels are enabled
    if (this._options.showLabels) {
      this._drawInfoBox(ctx, left, right, top, bottom);
    }
  }

  private _getLineDash(): number[] {
    switch (this._options.lineStyle) {
      case 'dashed':
        return [6, 4];
      case 'dotted':
        return [2, 3];
      case 'solid':
      default:
        return [];
    }
  }

  private _drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const radius = 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = this._options.lineColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private _drawInfoBox(
    ctx: CanvasRenderingContext2D,
    left: number,
    right: number,
    top: number,
    bottom: number
  ): void {
    if (!this._data) return;

    const padding = 10;
    const lineHeight = 18;
    const lines: string[] = [];

    // Price difference
    const priceSign = this._data.priceDiff >= 0 ? '+' : '';
    lines.push(`Price: ${priceSign}${this._data.priceDiff.toFixed(2)}`);
    lines.push(`(${priceSign}${this._data.priceDiffPercent.toFixed(2)}%)`);

    // Time difference
    const { days, hours, minutes } = this._data.timeDiff;
    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d ${hours}h`;
    } else if (hours > 0) {
      timeStr = `${hours}h ${minutes}m`;
    } else {
      timeStr = `${minutes}m`;
    }
    lines.push(`Time: ${timeStr}`);
    lines.push(`Bars: ${this._data.barsCount}`);

    // Calculate box dimensions
    ctx.font = '12px monospace';
    const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    // Position the box (prefer top-right corner of rectangle)
    let boxX = right + 10;
    let boxY = top;

    // Ensure box stays within chart bounds (rough estimate)
    const chartWidth = ctx.canvas.width;
    if (boxX + boxWidth > chartWidth - 10) {
      boxX = left - boxWidth - 10;
    }

    // Draw box background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    const cornerRadius = 4;
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = this._options.lineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      const textY = boxY + padding + index * lineHeight;
      ctx.fillText(line, boxX + padding, textY);
    });
  }
}

class DatePriceRangePaneView implements IPrimitivePaneView {
  private _renderer: DatePriceRangePaneRenderer;
  private _p1: Point | null = null;
  private _p2: Point | null = null;
  private _data: DatePriceRangeData | null = null;

  constructor(options: DatePriceRangeOptions) {
    this._renderer = new DatePriceRangePaneRenderer(options);
  }

  setData(p1: Point | null, p2: Point | null, data: DatePriceRangeData | null): void {
    this._p1 = p1;
    this._p2 = p2;
    this._data = data;
    this._renderer.setData(p1, p2, data);
  }

  renderer(): IPrimitivePaneRenderer | null {
    if (!this._p1 || !this._p2) return null;
    return this._renderer;
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'top';
  }
}

export interface DatePriceRangeDrawingOptions {
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  showLabels?: boolean;
}

export class DatePriceRangeDrawing extends PluginBase {
  private _options: DatePriceRangeOptions;
  private _paneView: DatePriceRangePaneView;
  private _points: (Point | null)[] = [null, null];
  private _requiredPoints = 2;

  constructor(options: DatePriceRangeDrawingOptions = {}) {
    super();
    this._options = {
      lineColor: options.lineColor ?? '#2962FF',
      lineWidth: options.lineWidth ?? 2,
      lineStyle: options.lineStyle ?? 'solid',
      fillColor: options.fillColor ?? 'rgba(41, 98, 255, 0.1)',
      showLabels: options.showLabels ?? true,
    };
    this._paneView = new DatePriceRangePaneView(this._options);
  }

  get requiredPoints(): number {
    return this._requiredPoints;
  }

  get isComplete(): boolean {
    return this._points.every((p) => p !== null);
  }

  setPoint(index: number, point: Point): void {
    if (index < 0 || index >= this._requiredPoints) return;
    this._points[index] = point;
    this._updateView();
  }

  updatePoint(index: number, point: Partial<Point>): void {
    if (index < 0 || index >= this._requiredPoints) return;
    if (this._points[index]) {
      this._points[index] = { ...this._points[index]!, ...point };
      this._updateView();
    }
  }

  clearPoints(): void {
    this._points = [null, null];
    this._updateView();
  }

  private _updateView(): void {
    const p1 = this._points[0];
    const p2 = this._points[1];
    const data = this._calculateData();
    this._paneView.setData(p1, p2, data);
  }

  private _calculateData(): DatePriceRangeData | null {
    const p1 = this._points[0];
    const p2 = this._points[1];

    if (!p1 || !p2) return null;

    // Calculate price difference
    const priceDiff = p2.price - p1.price;
    const priceDiffPercent = (priceDiff / p1.price) * 100;

    // Parse time values
    const time1 = this._parseTime(p1.time);
    const time2 = this._parseTime(p2.time);

    // Calculate time difference
    const diffMs = Math.abs(time2 - time1);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Estimate bars count (assuming daily bars for simplicity)
    // For intraday, this would need adjustment based on the chart's timeframe
    const barsCount = this._estimateBarsCount(Math.abs(time2 - time1));

    return {
      priceDiff,
      priceDiffPercent,
      barsCount,
      timeDiff: {
        days: diffDays,
        hours: diffHours % 24,
        minutes: diffMins % 60,
        totalBars: barsCount,
      },
    };
  }

  private _parseTime(time: Time): number {
    if (typeof time === 'number') {
      // Unix timestamp in seconds
      return time * 1000;
    }
    if (typeof time === 'object' && time !== null) {
      // Business day object { year, month, day }
      const { year, month, day } = time as { year: number; month: number; day: number };
      return new Date(year, month - 1, day).getTime();
    }
    // String format
    return new Date(time as string).getTime();
  }

  private _estimateBarsCount(diffMs: number): number {
    // Assuming daily bars by default
    const msInDay = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round(diffMs / msInDay));
  }

  updateAllViews(): void {
    this._updateView();
  }

  paneViews(): IPrimitivePaneView[] {
    return [this._paneView];
  }

  hitTest(_x: number, _y: number): IPrimitiveHitTestSource | null {
    // TODO: Implement hit testing for selection/editing
    return null;
  }

  attached(param: SeriesAttachedParameter): void {
    super.attached(param);
    this._updateView();
  }

  detached(): void {
    super.detached();
    this.clearPoints();
  }

  // Helper method to get current data
  getData(): DatePriceRangeData | null {
    return this._calculateData();
  }

  // Helper method to get points
  getPoints(): (Point | null)[] {
    return [...this._points];
  }

  // Method to update options
  updateOptions(options: Partial<DatePriceRangeDrawingOptions>): void {
    this._options = { ...this._options, ...options };
    this._paneView = new DatePriceRangePaneView(this._options);
    this._updateView();
  }
}

export type { DatePriceRangeData, DatePriceRangeOptions, Point };
