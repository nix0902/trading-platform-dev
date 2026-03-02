/**
 * Price Label Drawing Tool
 * Places a price label at a specific point on the chart with customizable appearance
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

export interface PriceLabelOptions {
  text?: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  showLine: boolean;
}

const defaultOptions: PriceLabelOptions = {
  text: undefined,
  backgroundColor: '#2962FF',
  textColor: '#FFFFFF',
  borderColor: '#2962FF',
  fontSize: 12,
  showLine: false,
};

class PriceLabelPaneRenderer implements IPrimitivePaneRenderer {
  _point: ViewPoint;
  _price: number;
  _customText: string | undefined;
  _options: PriceLabelOptions;

  constructor(
    point: ViewPoint,
    price: number,
    customText: string | undefined,
    options: PriceLabelOptions
  ) {
    this._point = point;
    this._price = price;
    this._customText = customText;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._point.x === null || this._point.y === null) return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const x = this._point.x * hRatio;
      const y = this._point.y * vRatio;

      // Determine label text
      const displayText = this._customText ?? this._price.toFixed(2);

      // Set font for measurements
      const fontSize = this._options.fontSize * hRatio;
      ctx.font = `bold ${fontSize}px Arial`;

      // Measure text
      const textMetrics = ctx.measureText(displayText);
      const textWidth = textMetrics.width;

      // Calculate label dimensions
      const padding = 8 * hRatio;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = fontSize + padding;
      const borderRadius = 4 * hRatio;

      // Position label to the right of the point with some offset
      const labelOffset = 10 * hRatio;
      let labelX = x + labelOffset;
      const labelY = y - labelHeight / 2;

      // Ensure label stays within chart bounds (simple check)
      // If label would go off right edge, position it to the left
      const chartWidth = target.bitmapSize.width;
      if (labelX + labelWidth > chartWidth) {
        labelX = x - labelWidth - labelOffset;
      }

      // Draw connecting line if enabled
      if (this._options.showLine) {
        ctx.strokeStyle = this._options.borderColor;
        ctx.lineWidth = 1.5 * hRatio;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(labelX, y);
        ctx.stroke();
      }

      // Draw label background
      ctx.fillStyle = this._options.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, borderRadius);
      ctx.fill();

      // Draw label border
      ctx.strokeStyle = this._options.borderColor;
      ctx.lineWidth = 1.5 * hRatio;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, borderRadius);
      ctx.stroke();

      // Draw text
      ctx.fillStyle = this._options.textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, labelX + padding, labelY + labelHeight / 2);

      // Reset text baseline
      ctx.textBaseline = 'alphabetic';

      // Draw a small marker at the point
      const markerRadius = 4 * hRatio;
      ctx.fillStyle = this._options.borderColor;
      ctx.beginPath();
      ctx.arc(x, y, markerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner dot
      ctx.fillStyle = this._options.backgroundColor;
      ctx.beginPath();
      ctx.arc(x, y, markerRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

class PriceLabelPaneView implements IPrimitivePaneView {
  _source: PriceLabelDrawing;
  _point: ViewPoint = { x: null, y: null };

  constructor(source: PriceLabelDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    const series = this._source.series;

    this._point = {
      x: timeScale.timeToCoordinate(this._source._point.time),
      y: series.priceToCoordinate(this._source._point.price),
    };
  }

  renderer() {
    return new PriceLabelPaneRenderer(
      this._point,
      this._source._point.price,
      this._source._options.text,
      this._source._options
    );
  }
}

export class PriceLabelDrawing extends PluginBase {
  _point: Point;
  _paneViews: PriceLabelPaneView[];
  _options: PriceLabelOptions;

  constructor(point: Point, options?: Partial<PriceLabelOptions>) {
    super();
    this._point = point;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new PriceLabelPaneView(this)];
  }

  autoscaleInfo(_startTime: Logical, _endTime: Logical): AutoscaleInfo | null {
    return null; // Price labels don't affect autoscale
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }

  /**
   * Get the price value
   */
  getPrice(): number {
    return this._point.price;
  }

  /**
   * Get the time value
   */
  getTime(): Time {
    return this._point.time;
  }

  /**
   * Get the display text
   */
  getDisplayText(): string {
    return this._options.text ?? this._point.price.toFixed(2);
  }

  /**
   * Update the point position
   */
  updatePoint(point: Point): void {
    this._point = point;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<PriceLabelOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Set custom text
   */
  setText(text: string | undefined): void {
    this._options.text = text;
    this.updateAllViews();
    this.requestUpdate();
  }
}
