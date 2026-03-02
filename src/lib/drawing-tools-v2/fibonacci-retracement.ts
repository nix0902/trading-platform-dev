/**
 * Fibonacci Retracement Drawing Tool
 * Shows key Fibonacci retracement levels between two points
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  AutoscaleInfo,
  Coordinate,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitiveAxisView,
  Logical,
  Time,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';
import { positionsBox } from './helpers';

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

export interface FibonacciRetracementOptions {
  lineColor: string;
  width: number;
  fillBackground: boolean;
  backgroundColor: string;
  showLabels: boolean;
  labelFontSize: number;
  levels: number[];
}

const defaultOptions: FibonacciRetracementOptions = {
  lineColor: '#2962ff',
  width: 1,
  fillBackground: true,
  backgroundColor: 'rgba(41, 98, 255, 0.1)',
  showLabels: true,
  labelFontSize: 11,
  levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
};

class FibonacciRetracementRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _chartWidth: number;
  _options: FibonacciRetracementOptions;
  _levels: { price: number; y: number | null }[];

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    chartWidth: number,
    options: FibonacciRetracementOptions,
    levels: { price: number; y: number | null }[]
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._chartWidth = chartWidth;
    this._options = options;
    this._levels = levels;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) return;

      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;

      const x1Scaled = Math.round(this._p1.x * horizontalRatio);
      const y1Scaled = Math.round(this._p1.y * verticalRatio);
      const x2Scaled = Math.round(this._p2.x * horizontalRatio);
      const y2Scaled = Math.round(this._p2.y * verticalRatio);
      const chartWidthScaled = this._chartWidth * horizontalRatio;

      const leftX = Math.min(x1Scaled, x2Scaled);
      const lineX = Math.max(x1Scaled, x2Scaled);

      // Draw main trend line
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.width * horizontalRatio;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Draw horizontal levels
      for (const level of this._levels) {
        if (level.y === null) continue;

        const yScaled = Math.round(level.y * verticalRatio);

        // Background fill
        if (this._options.fillBackground) {
          ctx.fillStyle = this._options.backgroundColor;
        }

        // Level line
        ctx.strokeStyle = this._options.lineColor + '80'; // 50% opacity
        ctx.lineWidth = this._options.width * horizontalRatio;
        ctx.setLineDash([4 * horizontalRatio, 4 * horizontalRatio]);
        ctx.beginPath();
        ctx.moveTo(leftX, yScaled);
        ctx.lineTo(chartWidthScaled, yScaled);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        if (this._options.showLabels) {
          const label = `${(level.price * 100).toFixed(1)}%`;
          ctx.font = `${this._options.labelFontSize}px Arial`;
          const textWidth = ctx.measureText(label).width + 12 * horizontalRatio;
          const labelHeight = 16 * verticalRatio;

          ctx.fillStyle = this._options.lineColor;
          const labelX = chartWidthScaled - textWidth - 5 * horizontalRatio;
          ctx.fillRect(labelX, yScaled - labelHeight / 2, textWidth, labelHeight);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, labelX + 5 * horizontalRatio, yScaled + 4 * verticalRatio);
        }
      }

      // Draw end point handles
      const handleRadius = 4 * horizontalRatio;
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2Scaled, y2Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

class FibonacciRetracementView implements IPrimitivePaneView {
  _source: FibonacciRetracementDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;
  _levels: { price: number; y: number | null }[] = [];

  constructor(source: FibonacciRetracementDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    this._p1 = {
      x: timeScale.timeToCoordinate(this._source._p1.time),
      y: series.priceToCoordinate(this._source._p1.price),
    };
    this._p2 = {
      x: timeScale.timeToCoordinate(this._source._p2.time),
      y: series.priceToCoordinate(this._source._p2.price),
    };

    // Calculate level prices and Y coordinates
    const highPrice = Math.max(this._source._p1.price, this._source._p2.price);
    const lowPrice = Math.min(this._source._p1.price, this._source._p2.price);
    const range = highPrice - lowPrice;

    this._levels = this._source._options.levels.map(level => {
      // For uptrend (p1 is lower), levels go up; for downtrend, levels go down
      const isUptrend = this._source._p1.price < this._source._p2.price;
      const price = isUptrend 
        ? lowPrice + range * level 
        : highPrice - range * level;
      
      return {
        price: level,
        y: series.priceToCoordinate(price),
      };
    });

    // Get chart width
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const x = timeScale.logicalToCoordinate(visibleRange.to);
      if (x !== null) {
        this._chartWidth = x + 100;
      }
    }
  }

  renderer() {
    return new FibonacciRetracementRenderer(
      this._p1,
      this._p2,
      this._chartWidth,
      this._source._options,
      this._levels
    );
  }
}

// Price axis view for showing Fibonacci levels
class FibonacciPriceAxisView implements ISeriesPrimitiveAxisView {
  _source: FibonacciRetracementDrawing;
  _y: Coordinate | null = null;
  _price: number = 0;

  constructor(source: FibonacciRetracementDrawing) {
    this._source = source;
  }

  update() {
    // Will show price for selected level
  }

  coordinate(): Coordinate {
    return this._y as Coordinate;
  }

  visible(): boolean {
    return false;
  }

  tickVisible(): boolean {
    return false;
  }

  text(): string {
    return '';
  }

  textColor(): string {
    return this._source._options.lineColor;
  }

  backColor(): string {
    return this._source._options.lineColor;
  }
}

export class FibonacciRetracementDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: FibonacciRetracementView[];
  _priceAxisViews: FibonacciPriceAxisView[];
  _options: FibonacciRetracementOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(p1: Point, p2: Point, options?: Partial<FibonacciRetracementOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new FibonacciRetracementView(this)];
    this._priceAxisViews = [new FibonacciPriceAxisView(this)];
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    
    if (x1 === null || x2 === null) return null;

    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p2Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p2Index === null) return null;
    if (endTime < p1Index || startTime > p2Index) return null;

    return {
      priceRange: {
        minValue: this._minPrice,
        maxValue: this._maxPrice,
      },
    };
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
    this._priceAxisViews.forEach(v => v.update());
  }

  paneViews() {
    return this._paneViews;
  }

  priceAxisViews() {
    return this._priceAxisViews;
  }
}
