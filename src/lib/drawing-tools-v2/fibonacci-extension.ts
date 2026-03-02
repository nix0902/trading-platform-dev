/**
 * Fibonacci Extension Drawing Tool
 * Projects extension levels above a trend using 3 points:
 * - P1: Swing low (start of trend)
 * - P2: Swing high (end of trend move)
 * - P3: Retracement low (pullback point)
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
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

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

export interface FibonacciExtensionOptions {
  lineColor: string;
  width: number;
  fillBackground: boolean;
  backgroundColor: string;
  showLabels: boolean;
  labelFontSize: number;
  extensionLevels: number[];
}

const defaultOptions: FibonacciExtensionOptions = {
  lineColor: '#2962ff',
  width: 1,
  fillBackground: true,
  backgroundColor: 'rgba(41, 98, 255, 0.1)',
  showLabels: true,
  labelFontSize: 11,
  extensionLevels: [0, 0.618, 1, 1.272, 1.618, 2, 2.618],
};

class FibonacciExtensionPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _chartWidth: number;
  _options: FibonacciExtensionOptions;
  _levels: { level: number; price: number; y: number | null }[];
  _isUptrend: boolean;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    chartWidth: number,
    options: FibonacciExtensionOptions,
    levels: { level: number; price: number; y: number | null }[],
    isUptrend: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._chartWidth = chartWidth;
    this._options = options;
    this._levels = levels;
    this._isUptrend = isUptrend;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._p1.x === null || this._p1.y === null || 
          this._p2.x === null || this._p2.y === null ||
          this._p3.x === null || this._p3.y === null) return;

      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;

      const x1Scaled = Math.round(this._p1.x * horizontalRatio);
      const y1Scaled = Math.round(this._p1.y * verticalRatio);
      const x2Scaled = Math.round(this._p2.x * horizontalRatio);
      const y2Scaled = Math.round(this._p2.y * verticalRatio);
      const x3Scaled = Math.round(this._p3.x * horizontalRatio);
      const y3Scaled = Math.round(this._p3.y * verticalRatio);
      const chartWidthScaled = this._chartWidth * horizontalRatio;

      const leftX = Math.min(x1Scaled, x2Scaled, x3Scaled);

      // Draw main trend line from P1 to P2 (solid)
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.width * horizontalRatio;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();

      // Draw extension line from P2 through P3 area and extend (dashed)
      ctx.setLineDash([6 * horizontalRatio, 4 * horizontalRatio]);
      ctx.strokeStyle = this._options.lineColor + '80';
      ctx.beginPath();
      ctx.moveTo(x2Scaled, y2Scaled);
      ctx.lineTo(x3Scaled, y3Scaled);
      // Extend the line beyond P3
      const dx = x3Scaled - x2Scaled;
      const dy = y3Scaled - y2Scaled;
      ctx.lineTo(x3Scaled + dx * 0.5, y3Scaled + dy * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw horizontal extension levels
      for (const levelData of this._levels) {
        if (levelData.y === null) continue;

        const yScaled = Math.round(levelData.y * verticalRatio);

        // Level line
        ctx.strokeStyle = this._options.lineColor + '60'; // Slightly more transparent
        ctx.lineWidth = this._options.width * horizontalRatio;
        ctx.setLineDash([4 * horizontalRatio, 4 * horizontalRatio]);
        ctx.beginPath();
        ctx.moveTo(leftX, yScaled);
        ctx.lineTo(chartWidthScaled, yScaled);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        if (this._options.showLabels) {
          let labelText: string;
          if (levelData.level === 0) {
            labelText = '0% (P2)';
          } else if (levelData.level === 1) {
            labelText = '100%';
          } else {
            labelText = `${(levelData.level * 100).toFixed(1)}%`;
          }
          
          ctx.font = `${this._options.labelFontSize * horizontalRatio}px Arial`;
          const textWidth = ctx.measureText(labelText).width + 16 * horizontalRatio;
          const labelHeight = 18 * verticalRatio;

          ctx.fillStyle = this._options.lineColor;
          const labelX = chartWidthScaled - textWidth - 5 * horizontalRatio;
          ctx.fillRect(labelX, yScaled - labelHeight / 2, textWidth, labelHeight);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, labelX + 6 * horizontalRatio, yScaled + 4 * verticalRatio);
        }
      }

      // Draw point handles
      const handleRadius = 5 * horizontalRatio;
      
      // P1 handle (start of trend)
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x1Scaled, y1Scaled, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // P2 handle (end of trend move)
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x2Scaled, y2Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x2Scaled, y2Scaled, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // P3 handle (pullback point)
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x3Scaled, y3Scaled, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x3Scaled, y3Scaled, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw point labels
      ctx.font = `bold ${10 * horizontalRatio}px Arial`;
      ctx.fillStyle = this._options.lineColor;
      
      // P1 label
      ctx.fillText('P1', x1Scaled - 15 * horizontalRatio, y1Scaled - 8 * verticalRatio);
      // P2 label
      ctx.fillText('P2', x2Scaled + 8 * horizontalRatio, y2Scaled - 8 * verticalRatio);
      // P3 label
      ctx.fillText('P3', x3Scaled + 8 * horizontalRatio, y3Scaled + 15 * verticalRatio);
    });
  }
}

class FibonacciExtensionPaneView implements IPrimitivePaneView {
  _source: FibonacciExtensionDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;
  _levels: { level: number; price: number; y: number | null }[] = [];
  _isUptrend: boolean = true;

  constructor(source: FibonacciExtensionDrawing) {
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
    this._p3 = {
      x: timeScale.timeToCoordinate(this._source._p3.time),
      y: series.priceToCoordinate(this._source._p3.price),
    };

    // Determine trend direction
    this._isUptrend = this._source._p1.price < this._source._p2.price;

    // Calculate base move (P1 to P2)
    const baseMove = this._isUptrend 
      ? this._source._p2.price - this._source._p1.price
      : this._source._p1.price - this._source._p2.price;

    // Calculate extension levels
    // Extension levels project from P2 in the direction of the trend
    this._levels = this._source._options.extensionLevels.map(level => {
      const price = this._isUptrend
        ? this._source._p2.price + baseMove * level
        : this._source._p2.price - baseMove * level;
      
      return {
        level,
        price,
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
    return new FibonacciExtensionPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._chartWidth,
      this._source._options,
      this._levels,
      this._isUptrend
    );
  }
}

// Price axis view for showing extension levels
class FibonacciExtensionPriceAxisView implements ISeriesPrimitiveAxisView {
  _source: FibonacciExtensionDrawing;
  _y: Coordinate | null = null;
  _price: number = 0;

  constructor(source: FibonacciExtensionDrawing) {
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

export class FibonacciExtensionDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _paneViews: FibonacciExtensionPaneView[];
  _priceAxisViews: FibonacciExtensionPriceAxisView[];
  _options: FibonacciExtensionOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<FibonacciExtensionOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    
    // Calculate min/max prices including extension levels
    const isUptrend = p1.price < p2.price;
    const baseMove = isUptrend ? p2.price - p1.price : p1.price - p2.price;
    const maxExtension = 2.618; // Highest extension level
    const extensionMax = isUptrend 
      ? p2.price + baseMove * maxExtension 
      : p1.price + baseMove * maxExtension;
    const extensionMin = isUptrend 
      ? p1.price 
      : p2.price - baseMove * maxExtension;
    
    this._minPrice = Math.min(p1.price, p2.price, p3.price, extensionMin);
    this._maxPrice = Math.max(p1.price, p2.price, p3.price, extensionMax);
    
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new FibonacciExtensionPaneView(this)];
    this._priceAxisViews = [new FibonacciExtensionPriceAxisView(this)];
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    const x3 = timeScale.timeToCoordinate(this._p3.time);
    
    if (x1 === null || x2 === null || x3 === null) return null;

    const points = [x1, x2, x3];
    const startX = Math.min(...points);
    const endX = Math.max(...points);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p3Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p3Index === null) return null;
    if (endTime < p1Index || startTime > p3Index) return null;

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
