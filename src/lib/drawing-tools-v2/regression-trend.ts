import {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  IPluginBase,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  SeriesType,
  LineStyle,
  LineWidth,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';

/**
 * Regression Trend Drawing Tool
 * Draws a linear regression line through data points with standard deviation bands
 */

// Point interface for the drawing
export interface RegressionTrendPoint {
  time: Time;
  price: number;
}

// Options for the regression trend drawing
export interface RegressionTrendOptions {
  lineColor: string;
  lineWidth: LineWidth;
  lineStyle: LineStyle;
  stddevMultiplier: number;
  showBands: boolean;
  fillColor: string;
  fillOpacity: number;
  showInfo: boolean;
}

// Default options
const DEFAULT_OPTIONS: RegressionTrendOptions = {
  lineColor: '#2196F3',
  lineWidth: 2,
  lineStyle: LineStyle.Solid,
  stddevMultiplier: 2,
  showBands: true,
  fillColor: '#2196F3',
  fillOpacity: 0.1,
  showInfo: true,
};

// View data for rendering
interface RegressionViewData {
  points: { x: number; y: number }[];
  upperBand: { x: number; y: number }[];
  lowerBand: { x: number; y: number }[];
  options: RegressionTrendOptions;
  slope: number;
  intercept: number;
  stddev: number;
  r2: number;
}

/**
 * Pane Renderer for Regression Trend
 */
class RegressionTrendPaneRenderer implements IPrimitivePaneRenderer {
  private _data: RegressionViewData | null = null;

  setData(data: RegressionViewData | null): void {
    this._data = data;
  }

  draw(target: CanvasRenderingContext2D): void {
    if (!this._data || this._data.points.length < 2) return;

    const { points, upperBand, lowerBand, options } = this._data;

    target.save();

    // Draw fill area between bands if enabled
    if (options.showBands && upperBand.length > 1 && lowerBand.length > 1) {
      this._drawFill(target, upperBand, lowerBand, options);
    }

    // Draw the regression line
    this._drawLine(target, points, options);

    // Draw upper and lower bands if enabled
    if (options.showBands) {
      if (upperBand.length > 1) {
        this._drawBandLine(target, upperBand, options);
      }
      if (lowerBand.length > 1) {
        this._drawBandLine(target, lowerBand, options);
      }
    }

    // Draw info label if enabled
    if (options.showInfo && points.length > 1) {
      this._drawInfo(target, points, options);
    }

    target.restore();
  }

  private _drawFill(
    ctx: CanvasRenderingContext2D,
    upperBand: { x: number; y: number }[],
    lowerBand: { x: number; y: number }[],
    options: RegressionTrendOptions
  ): void {
    ctx.beginPath();
    ctx.moveTo(upperBand[0].x, upperBand[0].y);

    // Draw upper band
    for (let i = 1; i < upperBand.length; i++) {
      ctx.lineTo(upperBand[i].x, upperBand[i].y);
    }

    // Draw lower band in reverse
    for (let i = lowerBand.length - 1; i >= 0; i--) {
      ctx.lineTo(lowerBand[i].x, lowerBand[i].y);
    }

    ctx.closePath();

    // Parse fill color and apply opacity
    const fillColor = this._colorWithOpacity(options.fillColor, options.fillOpacity);
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  private _drawLine(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    options: RegressionTrendOptions
  ): void {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = options.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this._applyLineStyle(ctx, options.lineStyle);
    ctx.stroke();
  }

  private _drawBandLine(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    options: RegressionTrendOptions
  ): void {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = Math.max(1, options.lineWidth - 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([4, 4]); // Dashed style for bands
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private _drawInfo(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    options: RegressionTrendOptions
  ): void {
    if (!this._data) return;

    const { slope, intercept, stddev, r2 } = this._data;

    // Position info at the right side of the line
    const lastPoint = points[points.length - 1];
    const padding = 10;

    const infoLines = [
      `Slope: ${slope.toFixed(6)}`,
      `StdDev: ${stddev.toFixed(4)}`,
      `R²: ${r2.toFixed(4)}`,
    ];

    ctx.font = '11px sans-serif';
    ctx.fillStyle = options.lineColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Draw background for better readability
    let maxWidth = 0;
    for (const line of infoLines) {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    }

    const bgX = lastPoint.x + padding;
    const bgY = lastPoint.y - (infoLines.length * 14) / 2;
    const bgWidth = maxWidth + 8;
    const bgHeight = infoLines.length * 14 + 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

    // Draw text
    ctx.fillStyle = options.lineColor;
    for (let i = 0; i < infoLines.length; i++) {
      ctx.fillText(infoLines[i], bgX + 4, bgY + 2 + i * 14);
    }
  }

  private _applyLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle): void {
    switch (style) {
      case LineStyle.Dotted:
        ctx.setLineDash([2, 2]);
        break;
      case LineStyle.Dashed:
        ctx.setLineDash([6, 3]);
        break;
      case LineStyle.LargeDashed:
        ctx.setLineDash([12, 4]);
        break;
      case LineStyle.SparseDotted:
        ctx.setLineDash([2, 4]);
        break;
      case LineStyle.Solid:
      default:
        ctx.setLineDash([]);
        break;
    }
  }

  private _colorWithOpacity(color: string, opacity: number): string {
    // Parse hex color and return rgba
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // If it's already rgba or rgb, return as is with adjusted opacity
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
    return color;
  }
}

/**
 * Pane View for Regression Trend
 */
class RegressionTrendPaneView implements IPrimitivePaneView {
  private _renderer: RegressionTrendPaneRenderer = new RegressionTrendPaneRenderer();
  private _drawing: RegressionTrendDrawing;

  constructor(drawing: RegressionTrendDrawing) {
    this._drawing = drawing;
  }

  update(): void {
    // Called when view needs update
  }

  renderer(): IPrimitivePaneRenderer | null {
    const series = this._drawing.series;
    const points = this._drawing.points;

    if (!series || points.length < 2) {
      this._renderer.setData(null);
      return this._renderer;
    }

    // Get time scale and price scale conversions
    const timeScale = this._drawing.timeScale;
    const priceScale = this._drawing.priceScale;

    if (!timeScale || !priceScale) {
      this._renderer.setData(null);
      return this._renderer;
    }

    // Get data points for regression calculation
    const dataPoints = this._drawing.getDataPoints();
    if (dataPoints.length < 2) {
      this._renderer.setData(null);
      return this._renderer;
    }

    // Calculate regression
    const regression = this._calculateRegression(dataPoints);

    // Generate view data
    const startTime = points[0].time;
    const endTime = points[1].time;

    // Convert time to coordinate
    const startX = timeScale.timeToCoordinate(startTime);
    const endX = timeScale.timeToCoordinate(endTime);

    if (startX === null || endX === null) {
      this._renderer.setData(null);
      return this._renderer;
    }

    // Calculate regression line points
    const linePoints: { x: number; y: number }[] = [];
    const upperBand: { x: number; y: number }[] = [];
    const lowerBand: { x: number; y: number }[] = [];

    // Sample points along the line for smooth rendering
    const numSamples = Math.max(50, Math.abs(endX - startX));
    const timeRange = this._getTimeRange(startTime, endTime);

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const x = startX + (endX - startX) * t;

      // Calculate price at this point using regression
      const timeAtPoint = this._interpolateTime(startTime, endTime, t);
      const priceAtPoint = regression.slope * this._timeToNumber(timeAtPoint) + regression.intercept;

      // Convert to pixel coordinates
      const y = priceScale.priceToCoordinate(priceAtPoint);

      if (y !== null) {
        linePoints.push({ x, y });
        const upperPrice = priceAtPoint + regression.stddev * this._drawing.options.stddevMultiplier;
        const lowerPrice = priceAtPoint - regression.stddev * this._drawing.options.stddevMultiplier;
        upperBand.push({ x, y: priceScale.priceToCoordinate(upperPrice) ?? y });
        lowerBand.push({ x, y: priceScale.priceToCoordinate(lowerPrice) ?? y });
      }
    }

    const viewData: RegressionViewData = {
      points: linePoints,
      upperBand,
      lowerBand,
      options: this._drawing.options,
      slope: regression.slope,
      intercept: regression.intercept,
      stddev: regression.stddev,
      r2: regression.r2,
    };

    this._renderer.setData(viewData);
    return this._renderer;
  }

  private _calculateRegression(dataPoints: { time: number; price: number }[]): {
    slope: number;
    intercept: number;
    stddev: number;
    r2: number;
  } {
    const n = dataPoints.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, stddev: 0, r2: 0 };
    }

    // Calculate sums for regression
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (const point of dataPoints) {
      sumX += point.time;
      sumY += point.price;
      sumXY += point.time * point.price;
      sumX2 += point.time * point.time;
      sumY2 += point.price * point.price;
    }

    // Calculate slope and intercept using least squares
    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) {
      return { slope: 0, intercept: sumY / n, stddev: 0, r2: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate residuals and standard deviation
    let sumSquaredResiduals = 0;
    for (const point of dataPoints) {
      const predicted = slope * point.time + intercept;
      const residual = point.price - predicted;
      sumSquaredResiduals += residual * residual;
    }

    const stddev = Math.sqrt(sumSquaredResiduals / (n - 1));

    // Calculate R-squared
    const meanY = sumY / n;
    let totalSumSquares = 0;
    for (const point of dataPoints) {
      totalSumSquares += (point.price - meanY) ** 2;
    }

    const r2 = totalSumSquares > 0 ? 1 - sumSquaredResiduals / totalSumSquares : 0;

    return { slope, intercept, stddev, r2 };
  }

  private _timeToNumber(time: Time): number {
    if (typeof time === 'number') {
      return time;
    }
    if (typeof time === 'string') {
      // Parse ISO date string to timestamp
      return new Date(time).getTime();
    }
    // BusinessDay
    if (typeof time === 'object' && 'year' in time) {
      const { year, month, day } = time;
      return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
    }
    return 0;
  }

  private _getTimeRange(startTime: Time, endTime: Time): { start: number; end: number } {
    return {
      start: this._timeToNumber(startTime),
      end: this._timeToNumber(endTime),
    };
  }

  private _interpolateTime(startTime: Time, endTime: Time, t: number): number {
    const start = this._timeToNumber(startTime);
    const end = this._timeToNumber(endTime);
    return start + (end - start) * t;
  }
}

/**
 * Regression Trend Drawing Tool
 * Main class that extends PluginBase
 */
export class RegressionTrendDrawing extends PluginBase implements IPluginBase {
  public points: RegressionTrendPoint[] = [];
  public options: RegressionTrendOptions;

  private _paneView: RegressionTrendPaneView;
  private _series: SeriesType | null = null;

  constructor(options: Partial<RegressionTrendOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._paneView = new RegressionTrendPaneView(this);
  }

  // Expose series, timeScale, and priceScale for the view
  get series(): SeriesType | null {
    return this._series;
  }

  set series(value: SeriesType | null) {
    this._series = value;
  }

  /**
   * Add a point to the drawing
   * Returns true if drawing is complete (2 points)
   */
  addPoint(point: RegressionTrendPoint): boolean {
    if (this.points.length >= 2) {
      // Reset if already complete
      this.points = [];
    }

    this.points.push(point);
    this.requestUpdate();

    return this.points.length === 2;
  }

  /**
   * Update the last point (during drag)
   */
  updateLastPoint(point: RegressionTrendPoint): void {
    if (this.points.length > 0) {
      this.points[this.points.length - 1] = point;
      this.requestUpdate();
    }
  }

  /**
   * Clear all points
   */
  clearPoints(): void {
    this.points = [];
    this.requestUpdate();
  }

  /**
   * Check if the drawing is complete
   */
  isComplete(): boolean {
    return this.points.length === 2;
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<RegressionTrendOptions>): void {
    this.options = { ...this.options, ...options };
    this.requestUpdate();
  }

  /**
   * Get data points within the time range for regression calculation
   */
  getDataPoints(): { time: number; price: number }[] {
    if (!this._series || this.points.length < 2) {
      return [];
    }

    // This is a simplified version - in a real implementation,
    // you would access the series data within the time range
    // For now, we'll return a placeholder that can be extended
    const startTime = this._timeToNumber(this.points[0].time);
    const endTime = this._timeToNumber(this.points[1].time);
    const minTime = Math.min(startTime, endTime);
    const maxTime = Math.max(startTime, endTime);

    // Return empty array - actual data retrieval depends on the series type
    // and the data provided to the chart
    // The view will need to handle this differently based on the chart implementation
    return [];
  }

  private _timeToNumber(time: Time): number {
    if (typeof time === 'number') {
      return time;
    }
    if (typeof time === 'string') {
      return new Date(time).getTime();
    }
    if (typeof time === 'object' && 'year' in time) {
      const { year, month, day } = time;
      return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
    }
    return 0;
  }

  // IPluginBase implementation
  attached(param: SeriesAttachedParameter<unknown>): void {
    this._series = param.series as SeriesType;
    this.requestUpdate();
  }

  detached(): void {
    this._series = null;
  }

  // Primitive interface methods
  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  priceAxisViews(): readonly unknown[] {
    return [];
  }

  timeAxisViews(): readonly unknown[] {
    return [];
  }

  autoscaleInfo(startTimePoint: number, endTimePoint: number): {
    priceRange: { minValue: number; maxValue: number } | null;
    margins: { above: number; below: number } | null;
  } | null {
    if (this.points.length < 2) return null;

    // Calculate the price range for autoscaling
    const dataPoints = this.getDataPoints();
    if (dataPoints.length < 2) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const point of dataPoints) {
      const time = this._timeToNumber(this.points[0].time);
      const price = point.price;
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }

    // Include standard deviation bands in the range
    if (this.options.showBands) {
      // This would need actual stddev calculation
      // For now, use the existing range with margins
    }

    if (!isFinite(minPrice) || !isFinite(maxPrice)) return null;

    return {
      priceRange: { minValue: minPrice, maxValue: maxPrice },
      margins: { above: 10, below: 10 },
    };
  }

  requestUpdate(): void {
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }
}

/**
 * Factory function to create a regression trend drawing
 */
export function createRegressionTrend(
  options?: Partial<RegressionTrendOptions>
): RegressionTrendDrawing {
  return new RegressionTrendDrawing(options);
}

export default RegressionTrendDrawing;
