/**
 * Head and Shoulders Pattern Drawing Tool
 * A classic reversal pattern that signals a potential trend change
 * 
 * The Head and Shoulders pattern consists of 5 points:
 * - LS (Left Shoulder): First peak
 * - LV (Left Valley): Neckline start, trough between left shoulder and head
 * - H (Head): The highest peak, center of the pattern
 * - RV (Right Valley): Neckline end, trough between head and right shoulder
 * - RS (Right Shoulder): Final peak, typically lower than the head
 * 
 * The neckline connects the two valleys, and the target is measured
 * as the distance from the head to the neckline, projected downward.
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

export interface HeadShouldersOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  showTarget: boolean;
  labelFontSize: number;
  necklineColor: string;
  targetColor: string;
  fillColor: string;
}

const defaultOptions: HeadShouldersOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
  showTarget: true,
  labelFontSize: 11,
  necklineColor: '#FF6B6B',
  targetColor: '#4CAF50',
  fillColor: 'rgba(41, 98, 255, 0.05)',
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: HeadShouldersOptions['lineStyle'], pixelRatio: number = 1): number[] {
  switch (style) {
    case 'dashed':
      return [8 * pixelRatio, 4 * pixelRatio];
    case 'dotted':
      return [2 * pixelRatio, 4 * pixelRatio];
    case 'solid':
    default:
      return [];
  }
}

/**
 * Calculate the neckline price (average of the two valleys)
 */
function calculateNecklinePrice(leftValleyPrice: number, rightValleyPrice: number): number {
  return (leftValleyPrice + rightValleyPrice) / 2;
}

/**
 * Calculate the target price (head to neckline distance, projected from neckline)
 * For a bearish head and shoulders, target is below the neckline
 */
function calculateTargetPrice(headPrice: number, necklinePrice: number): number {
  const headToNeckline = Math.abs(headPrice - necklinePrice);
  // For bearish pattern (head above neckline), target is below neckline
  if (headPrice > necklinePrice) {
    return necklinePrice - headToNeckline;
  }
  // For inverted head and shoulders (head below neckline), target is above neckline
  return necklinePrice + headToNeckline;
}

/**
 * Determine if this is an inverted head and shoulders (bullish)
 */
function isInvertedPattern(headPrice: number, leftShoulderPrice: number, rightShoulderPrice: number): boolean {
  // In inverted pattern, head is below shoulders
  return headPrice < leftShoulderPrice && headPrice < rightShoulderPrice;
}

/**
 * Draw a dashed horizontal line
 */
function drawDashedHorizontalLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  startX: number,
  endX: number,
  color: string,
  lineWidth: number,
  pixelRatio: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth * pixelRatio;
  ctx.setLineDash([6 * pixelRatio, 4 * pixelRatio]);
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw a point handle with label
 */
function drawPointHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  labelFontSize: number,
  showLabel: boolean,
  pixelRatio: number
): void {
  const handleRadius = 5 * pixelRatio;

  // Draw handle outer circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw handle inner circle (white)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, handleRadius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Draw label
  if (showLabel) {
    ctx.font = `bold ${labelFontSize * pixelRatio}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const labelOffset = 12 * pixelRatio;
    ctx.fillText(label, x, y - labelOffset);
  }
}

interface PatternData {
  necklinePrice: number;
  targetPrice: number;
  isInverted: boolean;
  patternName: string;
}

class HeadShouldersPaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: HeadShouldersOptions;
  _patternData: PatternData;
  _prices: number[];

  constructor(
    points: ViewPoint[],
    options: HeadShouldersOptions,
    patternData: PatternData,
    prices: number[]
  ) {
    this._points = points;
    this._options = options;
    this._patternData = patternData;
    this._prices = prices;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      // Check if all points are valid
      const validPoints = this._points.every(p => p.x !== null && p.y !== null);
      if (!validPoints) return;

      // Scale coordinates to bitmap space
      const scaledPoints = this._points.map(p => ({
        x: Math.round(p.x! * hRatio),
        y: Math.round(p.y! * vRatio),
      }));

      const series = this._options;
      
      // Find bounds for the pattern
      const minX = Math.min(...scaledPoints.map(p => p.x));
      const maxX = Math.max(...scaledPoints.map(p => p.x));
      const minY = Math.min(...scaledPoints.map(p => p.y));
      const maxY = Math.max(...scaledPoints.map(p => p.y));

      // Extend the drawing area for neckline and target
      const extendX = 30 * hRatio;
      const extendedMinX = minX - extendX;
      const extendedMaxX = maxX + extendX;

      // Draw the pattern fill (connect all points forming the pattern shape)
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y); // LS
      ctx.lineTo(scaledPoints[1].x, scaledPoints[1].y); // LV
      ctx.lineTo(scaledPoints[2].x, scaledPoints[2].y); // H
      ctx.lineTo(scaledPoints[3].x, scaledPoints[3].y); // RV
      ctx.lineTo(scaledPoints[4].x, scaledPoints[4].y); // RS
      ctx.closePath();
      ctx.fill();

      // Draw the pattern outline
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle, hRatio));

      // Draw LS -> LV
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
      ctx.lineTo(scaledPoints[1].x, scaledPoints[1].y);
      ctx.stroke();

      // Draw LV -> H
      ctx.beginPath();
      ctx.moveTo(scaledPoints[1].x, scaledPoints[1].y);
      ctx.lineTo(scaledPoints[2].x, scaledPoints[2].y);
      ctx.stroke();

      // Draw H -> RV
      ctx.beginPath();
      ctx.moveTo(scaledPoints[2].x, scaledPoints[2].y);
      ctx.lineTo(scaledPoints[3].x, scaledPoints[3].y);
      ctx.stroke();

      // Draw RV -> RS
      ctx.beginPath();
      ctx.moveTo(scaledPoints[3].x, scaledPoints[3].y);
      ctx.lineTo(scaledPoints[4].x, scaledPoints[4].y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Calculate neckline Y coordinate
      const seriesApi = this._prices;
      const necklineY = scaledPoints[1].y !== null && scaledPoints[3].y !== null
        ? Math.round((scaledPoints[1].y + scaledPoints[3].y) / 2)
        : null;

      // Draw neckline (dashed horizontal line through valleys)
      if (necklineY !== null) {
        drawDashedHorizontalLine(
          ctx,
          necklineY,
          extendedMinX,
          extendedMaxX,
          this._options.necklineColor,
          this._options.lineWidth,
          hRatio
        );

        // Draw neckline label
        ctx.font = `${(this._options.labelFontSize - 1) * hRatio}px Arial`;
        ctx.fillStyle = this._options.necklineColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('Neckline', extendedMaxX - 5 * hRatio, necklineY - 10 * vRatio);
      }

      // Draw target level if enabled
      if (this._options.showTarget && necklineY !== null) {
        // Calculate target Y coordinate
        const headY = scaledPoints[2].y;
        if (headY !== null) {
          // For bearish pattern, target is below neckline (higher Y in screen coordinates)
          // For bullish inverted pattern, target is above neckline (lower Y in screen coordinates)
          const headToNecklineDistance = Math.abs(headY - necklineY);
          let targetY: number;
          
          if (this._patternData.isInverted) {
            // Bullish pattern - target above neckline (lower Y)
            targetY = necklineY - headToNecklineDistance;
          } else {
            // Bearish pattern - target below neckline (higher Y)
            targetY = necklineY + headToNecklineDistance;
          }

          // Draw target line
          drawDashedHorizontalLine(
            ctx,
            targetY,
            extendedMinX,
            extendedMaxX,
            this._options.targetColor,
            this._options.lineWidth,
            hRatio
          );

          // Draw target label
          ctx.font = `${(this._options.labelFontSize - 1) * hRatio}px Arial`;
          ctx.fillStyle = this._options.targetColor;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('Target', extendedMaxX - 5 * hRatio, targetY - 10 * vRatio);

          // Draw vertical distance arrow from neckline to target
          ctx.strokeStyle = this._options.targetColor + '60';
          ctx.lineWidth = 1 * hRatio;
          ctx.setLineDash([2 * hRatio, 2 * hRatio]);
          
          const arrowX = extendedMaxX - 20 * hRatio;
          ctx.beginPath();
          ctx.moveTo(arrowX, necklineY);
          ctx.lineTo(arrowX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw arrowhead
          const arrowDir = this._patternData.isInverted ? -1 : 1;
          const arrowSize = 5 * hRatio;
          ctx.fillStyle = this._options.targetColor;
          ctx.beginPath();
          ctx.moveTo(arrowX, targetY);
          ctx.lineTo(arrowX - arrowSize, targetY - arrowDir * arrowSize);
          ctx.lineTo(arrowX + arrowSize, targetY - arrowDir * arrowSize);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw point handles with labels
      const pointLabels = ['LS', 'LV', 'H', 'RV', 'RS'];
      
      scaledPoints.forEach((point, index) => {
        // Use different colors for special points
        let pointColor = this._options.lineColor;
        if (index === 2) { // Head
          pointColor = this._options.lineColor;
        } else if (index === 1 || index === 3) { // Valleys (neckline points)
          pointColor = this._options.necklineColor;
        }

        drawPointHandle(
          ctx,
          point.x,
          point.y,
          pointLabels[index],
          pointColor,
          this._options.labelFontSize,
          this._options.showLabels,
          hRatio
        );
      });

      // Draw price values near each point
      ctx.font = `${(this._options.labelFontSize - 2) * hRatio}px Arial`;
      ctx.fillStyle = this._options.lineColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const handleRadius = 5 * hRatio;
      this._prices.forEach((price, index) => {
        const point = scaledPoints[index];
        const priceText = price.toFixed(2);
        ctx.fillText(priceText, point.x + handleRadius + 4 * hRatio, point.y);
      });

      // Draw pattern name and target info
      ctx.font = `bold ${this._options.labelFontSize * hRatio}px Arial`;
      ctx.fillStyle = this._patternData.isInverted 
        ? this._options.targetColor  // Green for bullish
        : this._options.necklineColor; // Red for bearish
      
      const infoX = extendedMinX + 10 * hRatio;
      const infoY = minY + 20 * vRatio;
      
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this._patternData.patternName, infoX, infoY);

      // Draw target price value
      if (this._options.showTarget) {
        ctx.font = `${(this._options.labelFontSize - 1) * hRatio}px Arial`;
        ctx.fillStyle = this._options.targetColor;
        ctx.fillText(
          `Target: ${this._patternData.targetPrice.toFixed(2)}`,
          infoX,
          infoY + this._options.labelFontSize * hRatio + 4 * vRatio
        );

        // Draw neckline price
        ctx.fillStyle = this._options.necklineColor;
        ctx.fillText(
          `Neckline: ${this._patternData.necklinePrice.toFixed(2)}`,
          infoX,
          infoY + (this._options.labelFontSize * 2 + 4) * hRatio + 4 * vRatio
        );
      }
    });
  }
}

class HeadShouldersPaneView implements IPrimitivePaneView {
  _source: HeadShouldersDrawing;
  _points: ViewPoint[] = [
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
  ];
  _patternData: PatternData = {
    necklinePrice: 0,
    targetPrice: 0,
    isInverted: false,
    patternName: 'Head & Shoulders',
  };

  constructor(source: HeadShouldersDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    // Update all point coordinates
    this._points = this._source._points.map(p => ({
      x: timeScale.timeToCoordinate(p.time),
      y: series.priceToCoordinate(p.price),
    }));

    // Calculate pattern data
    const prices = this._source._points.map(p => p.price);
    const leftShoulderPrice = prices[0];
    const leftValleyPrice = prices[1];
    const headPrice = prices[2];
    const rightValleyPrice = prices[3];
    const rightShoulderPrice = prices[4];

    // Calculate neckline and target
    const necklinePrice = calculateNecklinePrice(leftValleyPrice, rightValleyPrice);
    const targetPrice = calculateTargetPrice(headPrice, necklinePrice);
    const isInverted = isInvertedPattern(headPrice, leftShoulderPrice, rightShoulderPrice);

    this._patternData = {
      necklinePrice,
      targetPrice,
      isInverted,
      patternName: isInverted ? 'Inverse Head & Shoulders' : 'Head & Shoulders',
    };
  }

  renderer(): IPrimitivePaneRenderer {
    return new HeadShouldersPaneRenderer(
      this._points,
      this._source._options,
      this._patternData,
      this._source._points.map(p => p.price)
    );
  }
}

// Price axis view for showing neckline and target prices
class HeadShouldersPriceAxisView implements ISeriesPrimitiveAxisView {
  _source: HeadShouldersDrawing;
  _y: Coordinate | null = null;
  _price: number = 0;
  _type: 'neckline' | 'target' = 'neckline';

  constructor(source: HeadShouldersDrawing, type: 'neckline' | 'target') {
    this._source = source;
    this._type = type;
  }

  update() {
    const series = this._source.series;
    const paneView = this._source._paneViews[0];
    
    if (this._type === 'neckline') {
      this._y = series.priceToCoordinate(paneView._patternData.necklinePrice);
      this._price = paneView._patternData.necklinePrice;
    } else {
      this._y = series.priceToCoordinate(paneView._patternData.targetPrice);
      this._price = paneView._patternData.targetPrice;
    }
  }

  coordinate(): Coordinate {
    return this._y as Coordinate;
  }

  visible(): boolean {
    return this._source._options.showTarget && this._y !== null;
  }

  tickVisible(): boolean {
    return true;
  }

  text(): string {
    const prefix = this._type === 'neckline' ? 'NL: ' : 'T: ';
    return `${prefix}${this._price.toFixed(2)}`;
  }

  textColor(): string {
    return this._type === 'neckline' 
      ? this._source._options.necklineColor
      : this._source._options.targetColor;
  }

  backColor(): string {
    return this._type === 'neckline'
      ? this._source._options.necklineColor
      : this._source._options.targetColor;
  }
}

export class HeadShouldersDrawing extends PluginBase {
  _points: Point[];
  _paneViews: HeadShouldersPaneView[];
  _priceAxisViews: HeadShouldersPriceAxisView[];
  _options: HeadShouldersOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    points: [Point, Point, Point, Point, Point],
    options?: Partial<HeadShouldersOptions>
  ) {
    super();
    this._points = points;
    this._options = { ...defaultOptions, ...options };

    // Calculate min and max prices for autoscaling
    const prices = points.map(p => p.price);
    this._minPrice = Math.min(...prices);
    this._maxPrice = Math.max(...prices);

    // Add some padding for the pattern and target
    const padding = (this._maxPrice - this._minPrice) * 0.15;
    this._minPrice -= padding;
    this._maxPrice += padding;

    this._paneViews = [new HeadShouldersPaneView(this)];
    this._priceAxisViews = [
      new HeadShouldersPriceAxisView(this, 'neckline'),
      new HeadShouldersPriceAxisView(this, 'target'),
    ];
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const xCoords = this._points.map(p => timeScale.timeToCoordinate(p.time));
    
    // Check if any coordinate is null
    if (xCoords.some(x => x === null)) return null;

    const startX = Math.min(...xCoords as number[]);
    const endX = Math.max(...xCoords as number[]);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p5Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p5Index === null) return null;
    if (endTime < p1Index || startTime > p5Index) return null;

    // Include target in autoscale calculation
    let minPrice = this._minPrice;
    let maxPrice = this._maxPrice;
    
    if (this._options.showTarget) {
      const targetPrice = this._paneViews[0]._patternData.targetPrice;
      minPrice = Math.min(minPrice, targetPrice);
      maxPrice = Math.max(maxPrice, targetPrice);
    }

    return {
      priceRange: {
        minValue: minPrice,
        maxValue: maxPrice,
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

  /**
   * Get the current pattern data
   */
  getPatternData(): PatternData {
    const view = this._paneViews[0];
    return view._patternData;
  }

  /**
   * Update a specific point
   */
  updatePoint(index: number, point: Point): void {
    if (index >= 0 && index < this._points.length) {
      this._points[index] = point;
      
      // Recalculate min/max prices
      const prices = this._points.map(p => p.price);
      this._minPrice = Math.min(...prices);
      this._maxPrice = Math.max(...prices);
      
      const padding = (this._maxPrice - this._minPrice) * 0.15;
      this._minPrice -= padding;
      this._maxPrice += padding;
      
      this.requestUpdate();
    }
  }

  /**
   * Get all points
   */
  getPoints(): Point[] {
    return [...this._points];
  }

  /**
   * Set all points
   */
  setPoints(points: [Point, Point, Point, Point, Point]): void {
    this._points = points;
    
    // Recalculate min/max prices
    const prices = points.map(p => p.price);
    this._minPrice = Math.min(...prices);
    this._maxPrice = Math.max(...prices);
    
    const padding = (this._maxPrice - this._minPrice) * 0.15;
    this._minPrice -= padding;
    this._maxPrice += padding;
    
    this.requestUpdate();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<HeadShouldersOptions>): void {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }
}

// Export constants for external use
export const HEAD_SHOULDERS_REQUIRED_POINTS = 5;

export type { Point as HeadShouldersPoint };
