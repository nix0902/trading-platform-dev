/**
 * Text Annotation Drawing Tool
 * Places text at a specific point on the chart with customizable appearance
 * Supports multiline text (use \n for line breaks)
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

export interface TextOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number;
  bold: boolean;
  italic: boolean;
}

const defaultOptions: TextOptions = {
  text: 'Text',
  fontSize: 14,
  fontFamily: 'Arial',
  textColor: '#333333',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderColor: '#CCCCCC',
  borderWidth: 1,
  padding: 8,
  bold: false,
  italic: false,
};

class TextPaneRenderer implements IPrimitivePaneRenderer {
  private _point: ViewPoint;
  private _options: TextOptions;

  constructor(point: ViewPoint, options: TextOptions) {
    this._point = point;
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

      // Split text into lines
      const lines = this._options.text.split('\n');
      
      // Build font string
      const fontStyle = `${this._options.italic ? 'italic ' : ''}${this._options.bold ? 'bold ' : ''}`;
      const fontSize = this._options.fontSize * hRatio;
      ctx.font = `${fontStyle}${fontSize}px ${this._options.fontFamily}`;

      // Calculate text dimensions
      const lineHeight = fontSize * 1.2;
      const padding = this._options.padding * hRatio;
      
      // Find the widest line
      let maxWidth = 0;
      for (const line of lines) {
        const metrics = ctx.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
      }

      const textWidth = maxWidth;
      const textHeight = lines.length * lineHeight;

      // Calculate box dimensions
      const boxWidth = textWidth + padding * 2;
      const boxHeight = textHeight + padding * 2;
      const borderRadius = 4 * hRatio;

      // Position the box - anchor point is at top-left of the box
      const boxX = x;
      const boxY = y;

      // Draw background
      ctx.fillStyle = this._options.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
      ctx.fill();

      // Draw border if borderWidth > 0
      if (this._options.borderWidth > 0) {
        ctx.strokeStyle = this._options.borderColor;
        ctx.lineWidth = this._options.borderWidth * hRatio;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
        ctx.stroke();
      }

      // Draw text lines
      ctx.fillStyle = this._options.textColor;
      ctx.textBaseline = 'top';

      const textStartY = boxY + padding;
      for (let i = 0; i < lines.length; i++) {
        const lineY = textStartY + i * lineHeight;
        ctx.fillText(lines[i], boxX + padding, lineY);
      }

      // Reset text baseline
      ctx.textBaseline = 'alphabetic';

      // Draw anchor marker
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

class TextPaneView implements IPrimitivePaneView {
  private _source: TextDrawing;
  private _point: ViewPoint = { x: null, y: null };

  constructor(source: TextDrawing) {
    this._source = source;
  }

  update(): void {
    const timeScale = this._source.chart.timeScale();
    const series = this._source.series;

    this._point = {
      x: timeScale.timeToCoordinate(this._source._point.time),
      y: series.priceToCoordinate(this._source._point.price),
    };
  }

  renderer(): IPrimitivePaneRenderer {
    return new TextPaneRenderer(this._point, this._source._options);
  }
}

export class TextDrawing extends PluginBase {
  _point: Point;
  _paneViews: TextPaneView[];
  _options: TextOptions;

  constructor(point: Point, options?: Partial<TextOptions>) {
    super();
    this._point = point;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new TextPaneView(this)];
  }

  autoscaleInfo(_startTime: Logical, _endTime: Logical): AutoscaleInfo | null {
    // Text annotations don't affect autoscale
    return null;
  }

  updateAllViews(): void {
    this._paneViews.forEach(view => view.update());
  }

  paneViews(): IPrimitivePaneView[] {
    return this._paneViews;
  }

  /**
   * Get the anchor point
   */
  getPoint(): Point {
    return { ...this._point };
  }

  /**
   * Get the time value
   */
  getTime(): Time {
    return this._point.time;
  }

  /**
   * Get the price value
   */
  getPrice(): number {
    return this._point.price;
  }

  /**
   * Get the text content
   */
  getText(): string {
    return this._options.text;
  }

  /**
   * Get the current options
   */
  getOptions(): TextOptions {
    return { ...this._options };
  }

  /**
   * Update the anchor point position
   */
  updatePoint(point: Point): void {
    this._point = point;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Update the text content
   */
  setText(text: string): void {
    this._options.text = text;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Update all options
   */
  updateOptions(options: Partial<TextOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Set font properties
   */
  setFont(fontSize?: number, fontFamily?: string, bold?: boolean, italic?: boolean): void {
    if (fontSize !== undefined) this._options.fontSize = fontSize;
    if (fontFamily !== undefined) this._options.fontFamily = fontFamily;
    if (bold !== undefined) this._options.bold = bold;
    if (italic !== undefined) this._options.italic = italic;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Set colors
   */
  setColors(textColor?: string, backgroundColor?: string, borderColor?: string): void {
    if (textColor !== undefined) this._options.textColor = textColor;
    if (backgroundColor !== undefined) this._options.backgroundColor = backgroundColor;
    if (borderColor !== undefined) this._options.borderColor = borderColor;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Set padding
   */
  setPadding(padding: number): void {
    this._options.padding = padding;
    this.updateAllViews();
    this.requestUpdate();
  }

  /**
   * Set border width
   */
  setBorderWidth(width: number): void {
    this._options.borderWidth = width;
    this.updateAllViews();
    this.requestUpdate();
  }
}
