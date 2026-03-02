/**
 * Complete Drawing Tools Manager
 * 
 * Supports all TradingView-style drawing tools:
 * - Trend Lines (trend line, ray, arrow, parallel channel)
 * - Fibonacci tools (retracement, extension, fan, circles)
 * - Geometric shapes (rectangle, circle, ellipse, triangle)
 * - Horizontal/Vertical lines
 * - Measurements (price label, price range)
 * - Gann tools (fan, box)
 * - Pitchfork variations (schiff, inside, modified schiff)
 * - Patterns (ABCD)
 * - Annotations (text, brush)
 * - Time Cycles
 */

import type { IChartApi, ISeriesApi, MouseEventParams, Time, SeriesType } from 'lightweight-charts';
import { TrendLineDrawing, type TrendLineOptions } from './trend-line';
import { HorizontalLineDrawing, type HorizontalLineOptions } from './horizontal-line';
import { RectangleDrawing, type RectangleOptions } from './rectangle';
import { RayDrawing, type RayOptions } from './ray';
import { CircleDrawing, type CircleOptions } from './circle';
import { FibonacciRetracementDrawing, type FibonacciRetracementOptions } from './fibonacci-retracement';
import { ParallelChannelDrawing, type ParallelChannelOptions } from './parallel-channel';

// New drawing tool imports
import { TrendLineArrowDrawing, type TrendLineArrowOptions } from './trend-line-arrow';
import { VerticalLineDrawing, type VerticalLineOptions } from './vertical-line';
import { InfoLineDrawing, type InfoLineOptions } from './info-line';
import { TriangleDrawing, type TriangleOptions } from './triangle';
import { EllipseDrawing, type EllipseOptions } from './ellipse';
import { PriceLabelDrawing, type PriceLabelOptions } from './price-label';
import { FibonacciExtensionDrawing, type FibonacciExtensionOptions } from './fibonacci-extension';
import { SchiffPitchforkDrawing, type SchiffPitchforkOptions } from './schiff-pitchfork';
import { InsidePitchforkDrawing, type InsidePitchforkOptions } from './inside-pitchfork';
import { TextDrawing, type TextOptions } from './text';
import { GannFanDrawing, type GannFanOptions } from './gann-fan';
import { PriceRangeDrawing, type PriceRangeOptions } from './price-range';
import { RegressionTrendDrawing, type RegressionTrendOptions } from './regression-trend';
import { DivergingChannelDrawing, type DivergingChannelOptions } from './diverging-channel';
import { ModifiedSchiffPitchforkDrawing, type ModifiedSchiffPitchforkOptions } from './modified-schiff-pitchfork';
import { ABCDPatternDrawing, type ABCDPatternOptions } from './abcd-pattern';
import { FibCirclesDrawing, type FibCirclesOptions } from './fib-circles';
import { BrushDrawing, type BrushDrawingOptions } from './brush';
import { TimeCyclesDrawing, type TimeCyclesOptions } from './time-cycles';
import { FibSpeedResistanceFanDrawing, type FibSpeedResistanceFanOptions } from './fib-speed-resistance-fan';
import { GannBoxDrawing, type GannBoxOptions } from './gann-box';
import { PitchforkDrawing, type PitchforkOptions } from './pitchfork';
import { FibTimeZonesDrawing, type FibTimeZonesOptions } from './fib-time-zones';
import { PolylineDrawing, type PolylineOptions } from './polyline';
import { HeadShouldersDrawing, type HeadShouldersOptions } from './head-shoulders';
import { ThreeDrivesDrawing, type ThreeDrivesOptions } from './three-drives';
import { GannSquareDrawing, type GannSquareOptions } from './gann-square';
import { DatePriceRangeDrawing, type DatePriceRangeDrawingOptions } from './date-price-range';

import type { DrawingToolType } from './tools-config';

// Point for drawing
interface Point {
  time: Time;
  price: number;
}

// Default colors
const DRAWING_COLORS = [
  '#2962ff', // Blue
  '#26a69a', // Green
  '#ef5350', // Red
  '#ff9800', // Orange
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#f44336', // Light Red
];

function generateId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Union type for all drawings
type DrawingPrimitive = 
  | TrendLineDrawing 
  | HorizontalLineDrawing 
  | RectangleDrawing 
  | RayDrawing
  | CircleDrawing
  | FibonacciRetracementDrawing
  | ParallelChannelDrawing
  | TrendLineArrowDrawing
  | VerticalLineDrawing
  | InfoLineDrawing
  | TriangleDrawing
  | EllipseDrawing
  | PriceLabelDrawing
  | FibonacciExtensionDrawing
  | SchiffPitchforkDrawing
  | InsidePitchforkDrawing
  | TextDrawing
  | GannFanDrawing
  | PriceRangeDrawing
  | RegressionTrendDrawing
  | DivergingChannelDrawing
  | ModifiedSchiffPitchforkDrawing
  | ABCDPatternDrawing
  | FibCirclesDrawing
  | BrushDrawing
  | TimeCyclesDrawing
  | FibSpeedResistanceFanDrawing
  | GannBoxDrawing
  | PitchforkDrawing
  | FibTimeZonesDrawing
  | PolylineDrawing
  | HeadShouldersDrawing
  | ThreeDrivesDrawing
  | GannSquareDrawing
  | DatePriceRangeDrawing;

export interface StoredDrawing {
  id: string;
  type: DrawingToolType;
  data: unknown;
}

export class DrawingManager {
  private _chart: IChartApi;
  private _series: ISeriesApi<SeriesType>;
  private _drawings: Map<string, DrawingPrimitive> = new Map();
  private _activeTool: DrawingToolType = 'cursor';
  private _isDrawing: boolean = false;
  private _points: Point[] = [];
  private _previewDrawing: DrawingPrimitive | null = null;
  private _colorIndex: number = 0;

  private _clickHandler: (param: MouseEventParams) => void;
  private _moveHandler: (param: MouseEventParams) => void;
  private _onDrawingsChange?: (drawings: StoredDrawing[]) => void;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    onDrawingsChange?: (drawings: StoredDrawing[]) => void
  ) {
    this._chart = chart;
    this._series = series;
    this._onDrawingsChange = onDrawingsChange;

    this._clickHandler = this._onClick.bind(this);
    this._moveHandler = this._onMouseMove.bind(this);

    this._chart.subscribeClick(this._clickHandler);
    this._chart.subscribeCrosshairMove(this._moveHandler);
  }

  private _getColor(): string {
    return DRAWING_COLORS[this._colorIndex % DRAWING_COLORS.length];
  }

  private _onClick(param: MouseEventParams): void {
    if (this._isCursorTool()) {
      return;
    }

    if (!param.point || !param.time) {
      return;
    }

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    const point: Point = {
      time: param.time,
      price,
    };

    this._addPoint(point);
  }

  private _onMouseMove(param: MouseEventParams): void {
    if (!this._isDrawing || this._points.length === 0) {
      return;
    }

    if (!param.point || !param.time) {
      return;
    }

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    const currentPoint: Point = {
      time: param.time,
      price,
    };

    this._updatePreview(currentPoint);
  }

  private _addPoint(point: Point): void {
    this._points.push(point);
    const requiredPoints = this._getRequiredPoints();

    // Special handling for brush (variable points, finishes on double-click or escape)
    if (this._activeTool === 'brush') {
      if (this._points.length === 1) {
        this._isDrawing = true;
        this._createBrushPreview(point);
      } else {
        // Add point to existing brush preview
        this._addBrushPoint(point);
      }
      return;
    }

    // Special handling for polyline (variable points, finishes on double-click or escape)
    if (this._activeTool === 'polyline') {
      if (this._points.length === 1) {
        this._isDrawing = true;
        this._createPolylinePreview(point);
      } else {
        // Add point to existing polyline preview
        this._addPolylinePoint(point);
      }
      return;
    }

    // Single point tools
    if (requiredPoints === 1) {
      this._completeDrawing();
      return;
    }

    if (this._points.length === 1 && requiredPoints > 1) {
      // Start preview for multi-point tools
      this._isDrawing = true;
      this._createPreview(point);
    } else if (this._points.length >= requiredPoints) {
      this._completeDrawing();
    }
  }

  private _getRequiredPoints(): number {
    switch (this._activeTool) {
      case 'horizontal_line':
      case 'vertical_line':
      case 'price_label':
      case 'text':
        return 1;
      case 'trend_line':
      case 'trend_line_arrow':
      case 'ray':
      case 'rectangle':
      case 'circle':
      case 'ellipse':
      case 'fib_retracement':
      case 'info_line':
      case 'gann_fan':
      case 'price_range':
      case 'regression_trend':
      case 'fib_circles':
      case 'time_cycles':
      case 'fib_speed_resistance_fan':
      case 'gann_box':
      case 'fib_time_zones':
      case 'gann_square':
      case 'date_price_range':
        return 2;
      case 'parallel_channel':
      case 'pitchfork':
      case 'fib_extension':
      case 'schiff_pitchfork':
      case 'inside_pitchfork':
      case 'diverging_channel':
      case 'modified_schiff_pitchfork':
      case 'triangle':
      case 'fib_channel':
        return 3;
      case 'abcd_pattern':
        return 4;
      case 'head_shoulders':
        return 5;
      case 'three_drives':
        return 6;
      case 'brush':
      case 'polyline':
        return -1; // Variable number of points
      default:
        return 2;
    }
  }

  private _createPreview(startPoint: Point): void {
    const color = this._getColor();

    switch (this._activeTool) {
      case 'trend_line':
        this._previewDrawing = new TrendLineDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'trend_line_arrow':
        this._previewDrawing = new TrendLineArrowDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'ray':
        this._previewDrawing = new RayDrawing(startPoint, {
          lineColor: color,
        });
        break;
      case 'rectangle':
        this._previewDrawing = new RectangleDrawing(startPoint, startPoint, {
          borderColor: color,
          fillColor: color + '33',
        });
        break;
      case 'circle':
        this._previewDrawing = new CircleDrawing(startPoint, startPoint, {
          borderColor: color,
          fillColor: color + '33',
        });
        break;
      case 'ellipse':
        this._previewDrawing = new EllipseDrawing(startPoint, startPoint, {
          lineColor: color,
          fillColor: color + '33',
        });
        break;
      case 'fib_retracement':
        this._previewDrawing = new FibonacciRetracementDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'info_line':
        this._previewDrawing = new InfoLineDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'gann_fan':
        this._previewDrawing = new GannFanDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'price_range':
        this._previewDrawing = new PriceRangeDrawing({
          lineColor: color,
        });
        (this._previewDrawing as PriceRangeDrawing).points = [
          { time: startPoint.time, price: startPoint.price },
          { time: startPoint.time, price: startPoint.price }
        ];
        break;
      case 'regression_trend':
        this._previewDrawing = new RegressionTrendDrawing({
          lineColor: color,
        });
        (this._previewDrawing as RegressionTrendDrawing).addPoint(startPoint);
        break;
      case 'fib_circles':
        this._previewDrawing = new FibCirclesDrawing({
          lineColor: color,
        });
        break;
      case 'time_cycles':
        this._previewDrawing = new TimeCyclesDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'fib_speed_resistance_fan':
        this._previewDrawing = new FibSpeedResistanceFanDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'gann_box':
        this._previewDrawing = new GannBoxDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'triangle':
        if (this._points.length >= 1) {
          this._previewDrawing = new TriangleDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color, fillColor: color + '33' }
          );
        }
        break;
      case 'parallel_channel':
        if (this._points.length >= 1) {
          this._previewDrawing = new ParallelChannelDrawing(
            this._points[0],
            startPoint,
            0,
            { lineColor: color }
          );
        }
        break;
      case 'fib_extension':
        if (this._points.length >= 1) {
          this._previewDrawing = new FibonacciExtensionDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'schiff_pitchfork':
        if (this._points.length >= 1) {
          this._previewDrawing = new SchiffPitchforkDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'inside_pitchfork':
        if (this._points.length >= 1) {
          this._previewDrawing = new InsidePitchforkDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'diverging_channel':
        if (this._points.length >= 1) {
          this._previewDrawing = new DivergingChannelDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'modified_schiff_pitchfork':
        if (this._points.length >= 1) {
          this._previewDrawing = new ModifiedSchiffPitchforkDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'abcd_pattern':
        if (this._points.length >= 1) {
          // For ABCD pattern, we need 4 points, so preview will be incomplete
          this._previewDrawing = new ABCDPatternDrawing(
            [this._points[0], startPoint, startPoint, startPoint],
            { lineColor: color }
          );
        }
        break;
      case 'pitchfork':
        if (this._points.length >= 1) {
          this._previewDrawing = new PitchforkDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'fib_time_zones':
        this._previewDrawing = new FibTimeZonesDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'fib_channel':
        if (this._points.length >= 1) {
          this._previewDrawing = new FibChannelDrawing(
            this._points[0],
            startPoint,
            startPoint,
            { lineColor: color }
          );
        }
        break;
      case 'head_shoulders':
        if (this._points.length >= 1) {
          this._previewDrawing = new HeadShouldersDrawing(
            [this._points[0], startPoint, startPoint, startPoint, startPoint] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'three_drives':
        if (this._points.length >= 1) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], startPoint, startPoint, startPoint, startPoint, startPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'gann_square':
        this._previewDrawing = new GannSquareDrawing(startPoint, startPoint, {
          lineColor: color,
        });
        break;
      case 'date_price_range':
        this._previewDrawing = new DatePriceRangeDrawing({
          lineColor: color,
        });
        (this._previewDrawing as DatePriceRangeDrawing).setPoint(0, { ...startPoint, x: 0, y: 0 });
        break;
    }

    if (this._previewDrawing) {
      this._series.attachPrimitive(this._previewDrawing);
    }
  }

  private _createBrushPreview(startPoint: Point): void {
    const color = this._getColor();
    this._previewDrawing = new BrushDrawing({
      lineColor: color,
    });
    (this._previewDrawing as BrushDrawing).addPoint(startPoint);
    this._series.attachPrimitive(this._previewDrawing);
  }

  private _createPolylinePreview(startPoint: Point): void {
    const color = this._getColor();
    this._previewDrawing = new PolylineDrawing([startPoint, startPoint], {
      lineColor: color,
    });
    this._series.attachPrimitive(this._previewDrawing);
  }

  private _addBrushPoint(point: Point): void {
    if (this._previewDrawing && this._activeTool === 'brush') {
      (this._previewDrawing as BrushDrawing).addPoint(point);
    }
  }

  private _addPolylinePoint(point: Point): void {
    if (this._previewDrawing && this._activeTool === 'polyline') {
      (this._previewDrawing as PolylineDrawing).addPoint(point);
    }
  }

  private _updatePreview(endPoint: Point): void {
    if (!this._previewDrawing) {
      return;
    }

    // For brush, just add the point
    if (this._activeTool === 'brush') {
      this._addBrushPoint(endPoint);
      return;
    }

    // For polyline, just add the point
    if (this._activeTool === 'polyline') {
      this._addPolylinePoint(endPoint);
      return;
    }

    // Remove and recreate with updated points
    this._series.detachPrimitive(this._previewDrawing);
    const startPoint = this._points[0];
    const color = this._getColor();

    switch (this._activeTool) {
      case 'trend_line':
        this._previewDrawing = new TrendLineDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'trend_line_arrow':
        this._previewDrawing = new TrendLineArrowDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'ray':
        this._previewDrawing = new RayDrawing(startPoint, {
          lineColor: color,
        });
        break;
      case 'rectangle':
        this._previewDrawing = new RectangleDrawing(startPoint, endPoint, {
          borderColor: color,
          fillColor: color + '33',
        });
        break;
      case 'circle':
        this._previewDrawing = new CircleDrawing(startPoint, endPoint, {
          borderColor: color,
          fillColor: color + '33',
        });
        break;
      case 'ellipse':
        this._previewDrawing = new EllipseDrawing(startPoint, endPoint, {
          lineColor: color,
          fillColor: color + '33',
        });
        break;
      case 'fib_retracement':
        this._previewDrawing = new FibonacciRetracementDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'info_line':
        this._previewDrawing = new InfoLineDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'gann_fan':
        this._previewDrawing = new GannFanDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'time_cycles':
        this._previewDrawing = new TimeCyclesDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'fib_speed_resistance_fan':
        this._previewDrawing = new FibSpeedResistanceFanDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'gann_box':
        this._previewDrawing = new GannBoxDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'triangle':
        if (this._points.length >= 2) {
          this._previewDrawing = new TriangleDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color, fillColor: color + '33' }
          );
        }
        break;
      case 'parallel_channel':
        if (this._points.length >= 2) {
          const channelHeight = Math.abs(endPoint.price - this._points[0].price);
          this._previewDrawing = new ParallelChannelDrawing(
            this._points[0],
            this._points[1],
            channelHeight,
            { lineColor: color }
          );
        }
        break;
      case 'fib_extension':
        if (this._points.length >= 2) {
          this._previewDrawing = new FibonacciExtensionDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'schiff_pitchfork':
        if (this._points.length >= 2) {
          this._previewDrawing = new SchiffPitchforkDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'inside_pitchfork':
        if (this._points.length >= 2) {
          this._previewDrawing = new InsidePitchforkDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'diverging_channel':
        if (this._points.length >= 2) {
          this._previewDrawing = new DivergingChannelDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'modified_schiff_pitchfork':
        if (this._points.length >= 2) {
          this._previewDrawing = new ModifiedSchiffPitchforkDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'abcd_pattern':
        if (this._points.length === 1) {
          this._previewDrawing = new ABCDPatternDrawing(
            [this._points[0], endPoint, endPoint, endPoint],
            { lineColor: color }
          );
        } else if (this._points.length === 2) {
          this._previewDrawing = new ABCDPatternDrawing(
            [this._points[0], this._points[1], endPoint, endPoint],
            { lineColor: color }
          );
        } else if (this._points.length >= 3) {
          this._previewDrawing = new ABCDPatternDrawing(
            [this._points[0], this._points[1], this._points[2], endPoint],
            { lineColor: color }
          );
        }
        break;
      case 'pitchfork':
        if (this._points.length >= 2) {
          this._previewDrawing = new PitchforkDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'fib_time_zones':
        this._previewDrawing = new FibTimeZonesDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'fib_channel':
        if (this._points.length >= 2) {
          this._previewDrawing = new FibChannelDrawing(
            this._points[0],
            this._points[1],
            endPoint,
            { lineColor: color }
          );
        }
        break;
      case 'head_shoulders':
        if (this._points.length === 1) {
          this._previewDrawing = new HeadShouldersDrawing(
            [this._points[0], endPoint, endPoint, endPoint, endPoint] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length === 2) {
          this._previewDrawing = new HeadShouldersDrawing(
            [this._points[0], this._points[1], endPoint, endPoint, endPoint] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length === 3) {
          this._previewDrawing = new HeadShouldersDrawing(
            [this._points[0], this._points[1], this._points[2], endPoint, endPoint] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length >= 4) {
          this._previewDrawing = new HeadShouldersDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3], endPoint] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'three_drives':
        if (this._points.length === 1) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], endPoint, endPoint, endPoint, endPoint, endPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length === 2) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], this._points[1], endPoint, endPoint, endPoint, endPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length === 3) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], this._points[1], this._points[2], endPoint, endPoint, endPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length === 4) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3], endPoint, endPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        } else if (this._points.length >= 5) {
          this._previewDrawing = new ThreeDrivesDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3], this._points[4], endPoint] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'price_range':
        const prDrawing = new PriceRangeDrawing({
          lineColor: color,
        });
        prDrawing.points = [
          { time: startPoint.time, price: startPoint.price },
          { time: endPoint.time, price: endPoint.price }
        ];
        this._previewDrawing = prDrawing;
        break;
      case 'regression_trend':
        const rtDrawing = new RegressionTrendDrawing({
          lineColor: color,
        });
        rtDrawing.addPoint(startPoint);
        rtDrawing.addPoint(endPoint);
        this._previewDrawing = rtDrawing;
        break;
      case 'gann_square':
        this._previewDrawing = new GannSquareDrawing(startPoint, endPoint, {
          lineColor: color,
        });
        break;
      case 'date_price_range':
        const dprDrawing = new DatePriceRangeDrawing({
          lineColor: color,
        });
        dprDrawing.setPoint(0, { ...startPoint, x: 0, y: 0 });
        dprDrawing.setPoint(1, { ...endPoint, x: 0, y: 0 });
        this._previewDrawing = dprDrawing;
        break;
    }

    if (this._previewDrawing) {
      this._series.attachPrimitive(this._previewDrawing);
    }
  }

  private _completeDrawing(): void {
    // Remove preview
    if (this._previewDrawing) {
      this._series.detachPrimitive(this._previewDrawing);
      this._previewDrawing = null;
    }

    const color = this._getColor();
    const id = generateId();
    let drawing: DrawingPrimitive | null = null;

    switch (this._activeTool) {
      case 'horizontal_line':
        if (this._points.length >= 1) {
          drawing = new HorizontalLineDrawing(this._points[0].price, {
            lineColor: color,
          });
        }
        break;
      case 'vertical_line':
        if (this._points.length >= 1) {
          drawing = new VerticalLineDrawing(this._points[0].time, {
            lineColor: color,
          });
        }
        break;
      case 'price_label':
        if (this._points.length >= 1) {
          drawing = new PriceLabelDrawing(this._points[0], {
            backgroundColor: color,
          });
        }
        break;
      case 'text':
        if (this._points.length >= 1) {
          drawing = new TextDrawing(this._points[0], {
            borderColor: color,
          });
        }
        break;
      case 'trend_line':
        if (this._points.length >= 2) {
          drawing = new TrendLineDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'trend_line_arrow':
        if (this._points.length >= 2) {
          drawing = new TrendLineArrowDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'ray':
        if (this._points.length >= 1) {
          drawing = new RayDrawing(this._points[0], {
            lineColor: color,
          });
        }
        break;
      case 'rectangle':
        if (this._points.length >= 2) {
          drawing = new RectangleDrawing(this._points[0], this._points[1], {
            borderColor: color,
            fillColor: color + '33',
          });
        }
        break;
      case 'circle':
        if (this._points.length >= 2) {
          drawing = new CircleDrawing(this._points[0], this._points[1], {
            borderColor: color,
            fillColor: color + '33',
          });
        }
        break;
      case 'ellipse':
        if (this._points.length >= 2) {
          drawing = new EllipseDrawing(this._points[0], this._points[1], {
            lineColor: color,
            fillColor: color + '33',
          });
        }
        break;
      case 'triangle':
        if (this._points.length >= 3) {
          drawing = new TriangleDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
            fillColor: color + '33',
          });
        }
        break;
      case 'fib_retracement':
        if (this._points.length >= 2) {
          drawing = new FibonacciRetracementDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'info_line':
        if (this._points.length >= 2) {
          drawing = new InfoLineDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'parallel_channel':
        if (this._points.length >= 3) {
          const channelHeight = Math.abs(this._points[2].price - this._points[0].price);
          drawing = new ParallelChannelDrawing(this._points[0], this._points[1], channelHeight, {
            lineColor: color,
          });
        }
        break;
      case 'fib_extension':
        if (this._points.length >= 3) {
          drawing = new FibonacciExtensionDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'schiff_pitchfork':
        if (this._points.length >= 3) {
          drawing = new SchiffPitchforkDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'inside_pitchfork':
        if (this._points.length >= 3) {
          drawing = new InsidePitchforkDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'modified_schiff_pitchfork':
        if (this._points.length >= 3) {
          drawing = new ModifiedSchiffPitchforkDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'gann_fan':
        if (this._points.length >= 2) {
          drawing = new GannFanDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'gann_box':
        if (this._points.length >= 2) {
          drawing = new GannBoxDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'price_range':
        if (this._points.length >= 2) {
          const prDrawing = new PriceRangeDrawing({
            lineColor: color,
          });
          prDrawing.points = [...this._points];
          drawing = prDrawing;
        }
        break;
      case 'regression_trend':
        if (this._points.length >= 2) {
          const rtDrawing = new RegressionTrendDrawing({
            lineColor: color,
          });
          this._points.forEach(p => rtDrawing.addPoint(p));
          drawing = rtDrawing;
        }
        break;
      case 'diverging_channel':
        if (this._points.length >= 3) {
          drawing = new DivergingChannelDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'abcd_pattern':
        if (this._points.length >= 4) {
          drawing = new ABCDPatternDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3]] as [Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'fib_circles':
        if (this._points.length >= 2) {
          const fcDrawing = new FibCirclesDrawing({
            lineColor: color,
          });
          fcDrawing.updatePoints([
            { x: 0, y: 0 } as any, // Will be converted
            { x: 0, y: 0 } as any
          ]);
          drawing = fcDrawing;
        }
        break;
      case 'brush':
        if (this._points.length >= 1) {
          const brushDrawing = new BrushDrawing({
            lineColor: color,
          });
          this._points.forEach(p => brushDrawing.addPoint(p));
          drawing = brushDrawing;
        }
        break;
      case 'time_cycles':
        if (this._points.length >= 2) {
          drawing = new TimeCyclesDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'fib_speed_resistance_fan':
        if (this._points.length >= 2) {
          drawing = new FibSpeedResistanceFanDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'pitchfork':
        if (this._points.length >= 3) {
          drawing = new PitchforkDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'fib_time_zones':
        if (this._points.length >= 2) {
          drawing = new FibTimeZonesDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'fib_channel':
        if (this._points.length >= 3) {
          drawing = new FibChannelDrawing(this._points[0], this._points[1], this._points[2], {
            lineColor: color,
          });
        }
        break;
      case 'polyline':
        if (this._points.length >= 2) {
          drawing = new PolylineDrawing([...this._points], {
            lineColor: color,
          });
        }
        break;
      case 'head_shoulders':
        if (this._points.length >= 5) {
          drawing = new HeadShouldersDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3], this._points[4]] as [Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'three_drives':
        if (this._points.length >= 6) {
          drawing = new ThreeDrivesDrawing(
            [this._points[0], this._points[1], this._points[2], this._points[3], this._points[4], this._points[5]] as [Point, Point, Point, Point, Point, Point],
            { lineColor: color }
          );
        }
        break;
      case 'gann_square':
        if (this._points.length >= 2) {
          drawing = new GannSquareDrawing(this._points[0], this._points[1], {
            lineColor: color,
          });
        }
        break;
      case 'date_price_range':
        if (this._points.length >= 2) {
          const dprDrawing = new DatePriceRangeDrawing({
            lineColor: color,
          });
          dprDrawing.setPoint(0, { ...this._points[0], x: 0, y: 0 });
          dprDrawing.setPoint(1, { ...this._points[1], x: 0, y: 0 });
          drawing = dprDrawing;
        }
        break;
    }

    if (drawing) {
      this._drawings.set(id, drawing);
      this._series.attachPrimitive(drawing);
      this._colorIndex++;
      this._notifyChange();
    }

    this._isDrawing = false;
    this._points = [];
  }

  private _isCursorTool(): boolean {
    return this._activeTool === 'cursor' || this._activeTool === 'crosshair' || this._activeTool === 'dot';
  }

  private _notifyChange(): void {
    if (this._onDrawingsChange) {
      const list: StoredDrawing[] = [];
      this._drawings.forEach((drawing, id) => {
        list.push({
          id,
          type: this._activeTool,
          data: drawing,
        });
      });
      this._onDrawingsChange(list);
    }
  }

  setActiveTool(tool: DrawingToolType): void {
    if (this._isDrawing && tool !== this._activeTool) {
      this.cancelDrawing();
    }
    this._activeTool = tool;
  }

  getActiveTool(): DrawingToolType {
    return this._activeTool;
  }

  isDrawing(): boolean {
    return this._isDrawing;
  }

  cancelDrawing(): void {
    if (this._previewDrawing) {
      this._series.detachPrimitive(this._previewDrawing);
      this._previewDrawing = null;
    }
    this._isDrawing = false;
    this._points = [];
  }

  finishBrushDrawing(): void {
    if (this._activeTool === 'brush' && this._isDrawing && this._points.length > 0) {
      this._completeDrawing();
    }
  }

  finishPolylineDrawing(): void {
    if (this._activeTool === 'polyline' && this._isDrawing && this._points.length >= 2) {
      this._completeDrawing();
    }
  }

  removeDrawing(id: string): void {
    const drawing = this._drawings.get(id);
    if (drawing) {
      this._series.detachPrimitive(drawing);
      this._drawings.delete(id);
      this._notifyChange();
    }
  }

  clearAllDrawings(): void {
    this._drawings.forEach(drawing => {
      this._series.detachPrimitive(drawing);
    });
    this._drawings.clear();
    this._notifyChange();
  }

  getDrawings(): StoredDrawing[] {
    const list: StoredDrawing[] = [];
    this._drawings.forEach((drawing, id) => {
      list.push({
        id,
        type: this._activeTool,
        data: drawing,
      });
    });
    return list;
  }

  destroy(): void {
    this._chart.unsubscribeClick(this._clickHandler);
    this._chart.unsubscribeCrosshairMove(this._moveHandler);
    this.clearAllDrawings();
  }
}
