/**
 * Vertical Line Drawing Tool
 * A vertical line that spans the entire chart height at a specific time point.
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

export interface VerticalLineOptions {
  lineColor: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabel: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
}

const defaultOptions: VerticalLineOptions = {
  lineColor: '#2962FF',
  width: 1,
  lineStyle: 'dashed',
  showLabel: true,
  labelBackgroundColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
};

/**
 * Renderer for the vertical line in the main pane
 */
class VerticalLinePaneRenderer implements IPrimitivePaneRenderer {
  _x: Coordinate | null;
  _height: number;
  _options: VerticalLineOptions;

  constructor(x: Coordinate | null, height: number, options: VerticalLineOptions) {
    this._x = x;
    this._height = height;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._x === null) return;

      const ctx = scope.context;
      const xScaled = Math.round(this._x * scope.horizontalPixelRatio);
      const heightScaled = this._height * scope.verticalPixelRatio;

      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.width * scope.horizontalPixelRatio;

      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * scope.verticalPixelRatio, 4 * scope.verticalPixelRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * scope.verticalPixelRatio, 4 * scope.verticalPixelRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(xScaled, 0);
      ctx.lineTo(xScaled, heightScaled);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

/**
 * Pane view for the vertical line
 */
class VerticalLinePaneView implements IPrimitivePaneView {
  _source: VerticalLineDrawing;
  _x: Coordinate | null = null;
  _height: number = 0;

  constructor(source: VerticalLineDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    this._x = timeScale.timeToCoordinate(this._source._time);

    // Get the chart height from the series
    const priceScale = this._source.series.priceScale();
    if (priceScale) {
      // Get the visible price range to determine height
      const visibleRange = priceScale.getVisibleBarsRange();
      if (visibleRange) {
        // Use the full height - we'll draw from 0 to height
        this._height = this._source.chart.priceScale('right').height();
      }
    }

    // Fallback: calculate height from chart
    if (this._height === 0) {
      // Get the pane height from the chart
      const panes = this._source.chart.panes();
      if (panes.length > 0) {
        this._height = panes[0].height();
      }
    }
  }

  renderer() {
    return new VerticalLinePaneRenderer(this._x, this._height, this._source._options);
  }
}

/**
 * Time axis view for the vertical line label
 */
class VerticalLineTimeAxisView implements ISeriesPrimitiveAxisView {
  _source: VerticalLineDrawing;
  _x: Coordinate | null = null;

  constructor(source: VerticalLineDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    this._x = timeScale.timeToCoordinate(this._source._time);
  }

  coordinate() {
    return this._x ?? -1;
  }

  visible(): boolean {
    return this._source._options.showLabel && this._x !== null;
  }

  tickVisible(): boolean {
    return true;
  }

  text(): string {
    // Format the time as a readable string
    const time = this._source._time;
    if (typeof time === 'number') {
      // Unix timestamp
      const date = new Date(time * 1000);
      return formatTime(date);
    } else if (typeof time === 'string') {
      return time;
    }
    return '';
  }

  textColor(): string {
    return this._source._options.labelTextColor;
  }

  backColor(): string {
    return this._source._options.labelBackgroundColor;
  }
}

/**
 * Helper function to format time
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Vertical Line Drawing
 * A drawing tool that creates a vertical line at a specific time point,
 * spanning the entire chart height.
 */
export class VerticalLineDrawing extends PluginBase {
  _time: Time;
  _paneViews: VerticalLinePaneView[];
  _timeAxisViews: VerticalLineTimeAxisView[];
  _options: VerticalLineOptions;

  constructor(
    time: Time,
    options?: Partial<VerticalLineOptions>
  ) {
    super();
    this._time = time;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new VerticalLinePaneView(this)];
    this._timeAxisViews = [new VerticalLineTimeAxisView(this)];
  }

  /**
   * Update the time position of the vertical line
   */
  setTime(time: Time): void {
    this._time = time;
    this.requestUpdate();
  }

  /**
   * Get the current time position
   */
  getTime(): Time {
    return this._time;
  }

  /**
   * Update the options of the vertical line
   */
  setOptions(options: Partial<VerticalLineOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.requestUpdate();
  }

  /**
   * Vertical lines don't affect autoscale since they don't have a price range
   */
  autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
    return null;
  }

  /**
   * Update all views when the chart data changes
   */
  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
    this._timeAxisViews.forEach(pw => pw.update());
  }

  /**
   * Return the pane views for rendering
   */
  paneViews() {
    return this._paneViews;
  }

  /**
   * Return the time axis views for labels
   */
  timeAxisViews() {
    return this._timeAxisViews;
  }
}
