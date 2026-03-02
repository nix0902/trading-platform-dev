/**
 * ABCD Pattern Drawing Tool
 * A harmonic pattern that shows potential reversal zones
 * 
 * The ABCD pattern consists of 4 points:
 * - Point A: Start of the pattern
 * - Point B: First reversal point
 * - Point C: Retracement point (typically 61.8% or 78.6% of AB)
 * - Point D: Completion point (typically 127.2% or 161.8% extension of BC)
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

export interface ABCDPatternOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  showRatios: boolean;
  labelFontSize: number;
  validColor: string;
  invalidColor: string;
  tolerance: number; // Tolerance for ratio validation (default 0.05 = 5%)
}

const defaultOptions: ABCDPatternOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
  showRatios: true,
  labelFontSize: 11,
  validColor: '#22C55E', // Green for valid ratios
  invalidColor: '#EF4444', // Red for invalid ratios
  tolerance: 0.10, // 10% tolerance for ratio validation
};

// Standard Fibonacci ratios for ABCD pattern
const BC_RETRACEMENT_RATIOS = [0.618, 0.786];
const CD_EXTENSION_RATIOS = [1.272, 1.618];

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: ABCDPatternOptions['lineStyle'], pixelRatio: number = 1): number[] {
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
 * Calculate the retracement ratio of BC relative to AB
 */
function calculateBCRetracement(a: number, b: number, c: number): number {
  const abLength = Math.abs(b - a);
  const bcLength = Math.abs(c - b);
  if (abLength === 0) return 0;
  return bcLength / abLength;
}

/**
 * Calculate the extension ratio of CD relative to BC
 */
function calculateCDExtension(b: number, c: number, d: number): number {
  const bcLength = Math.abs(c - b);
  const cdLength = Math.abs(d - c);
  if (bcLength === 0) return 0;
  return cdLength / bcLength;
}

/**
 * Check if a ratio is close to any of the target ratios within tolerance
 */
function isValidRatio(actual: number, targets: number[], tolerance: number): boolean {
  return targets.some(target => Math.abs(actual - target) <= target * tolerance);
}

/**
 * Get the closest target ratio
 */
function getClosestTarget(actual: number, targets: number[]): number {
  return targets.reduce((closest, target) => 
    Math.abs(actual - target) < Math.abs(actual - closest) ? target : closest
  );
}

interface RatioValidation {
  bcRatio: number;
  cdRatio: number;
  bcValid: boolean;
  cdValid: boolean;
  overallValid: boolean;
  bcClosestTarget: number;
  cdClosestTarget: number;
}

class ABCDPatternPaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: ABCDPatternOptions;
  _validation: RatioValidation;
  _prices: number[];

  constructor(
    points: ViewPoint[],
    options: ABCDPatternOptions,
    validation: RatioValidation,
    prices: number[]
  ) {
    this._points = points;
    this._options = options;
    this._validation = validation;
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

      // Determine the overall color based on validity
      const lineColor = this._validation.overallValid
        ? this._options.validColor
        : this._options.lineColor;

      // Draw the pattern lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle, hRatio));

      // Draw A→B
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
      ctx.lineTo(scaledPoints[1].x, scaledPoints[1].y);
      ctx.stroke();

      // Draw B→C
      ctx.beginPath();
      ctx.moveTo(scaledPoints[1].x, scaledPoints[1].y);
      ctx.lineTo(scaledPoints[2].x, scaledPoints[2].y);
      ctx.stroke();

      // Draw C→D
      ctx.beginPath();
      ctx.moveTo(scaledPoints[2].x, scaledPoints[2].y);
      ctx.lineTo(scaledPoints[3].x, scaledPoints[3].y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Draw point handles with labels
      const pointLabels = ['A', 'B', 'C', 'D'];
      const handleRadius = 5 * hRatio;

      scaledPoints.forEach((point, index) => {
        // Determine color based on ratio validity for intermediate points
        let handleColor = lineColor;
        if (index === 2) { // Point C - BC retracement
          handleColor = this._validation.bcValid ? this._options.validColor : this._options.invalidColor;
        } else if (index === 3) { // Point D - CD extension
          handleColor = this._validation.cdValid ? this._options.validColor : this._options.invalidColor;
        }

        // Draw handle outer circle
        ctx.fillStyle = handleColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw handle inner circle (white)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, handleRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw point label
        if (this._options.showLabels) {
          ctx.font = `bold ${this._options.labelFontSize * hRatio}px Arial`;
          ctx.fillStyle = handleColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          // Position label above the point
          const labelOffset = 12 * vRatio;
          ctx.fillText(pointLabels[index], point.x, point.y - labelOffset);
        }
      });

      // Draw ratio labels
      if (this._options.showRatios) {
        const fontSize = (this._options.labelFontSize - 1) * hRatio;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // BC Retracement ratio label (near point C)
        const bcRatioText = `BC: ${this._validation.bcRatio.toFixed(3)} (${(this._validation.bcClosestTarget * 100).toFixed(1)}%)`;
        const bcColor = this._validation.bcValid ? this._options.validColor : this._options.invalidColor;
        
        // Draw BC ratio background
        const bcLabelX = scaledPoints[2].x + 50 * hRatio;
        const bcLabelY = scaledPoints[2].y;
        const bcTextWidth = ctx.measureText(bcRatioText).width + 8 * hRatio;
        const bcLabelHeight = 16 * vRatio;
        
        ctx.fillStyle = bcColor + '20';
        ctx.fillRect(bcLabelX - bcTextWidth / 2, bcLabelY - bcLabelHeight / 2, bcTextWidth, bcLabelHeight);
        ctx.fillStyle = bcColor;
        ctx.fillText(bcRatioText, bcLabelX, bcLabelY);

        // CD Extension ratio label (near point D)
        const cdRatioText = `CD: ${this._validation.cdRatio.toFixed(3)} (${(this._validation.cdClosestTarget * 100).toFixed(1)}%)`;
        const cdColor = this._validation.cdValid ? this._options.validColor : this._options.invalidColor;
        
        // Draw CD ratio background
        const cdLabelX = scaledPoints[3].x + 50 * hRatio;
        const cdLabelY = scaledPoints[3].y;
        const cdTextWidth = ctx.measureText(cdRatioText).width + 8 * hRatio;
        const cdLabelHeight = 16 * vRatio;
        
        ctx.fillStyle = cdColor + '20';
        ctx.fillRect(cdLabelX - cdTextWidth / 2, cdLabelY - cdLabelHeight / 2, cdTextWidth, cdLabelHeight);
        ctx.fillStyle = cdColor;
        ctx.fillText(cdRatioText, cdLabelX, cdLabelY);

        // Draw AB leg label (midpoint)
        const abMidX = (scaledPoints[0].x + scaledPoints[1].x) / 2;
        const abMidY = (scaledPoints[0].y + scaledPoints[1].y) / 2;
        ctx.fillStyle = lineColor + '80';
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText('AB', abMidX, abMidY - 8 * vRatio);

        // Draw price values near each point
        ctx.font = `${(this._options.labelFontSize - 2) * hRatio}px Arial`;
        ctx.fillStyle = lineColor;
        ctx.textAlign = 'left';
        this._prices.forEach((price, index) => {
          const point = scaledPoints[index];
          const priceText = price.toFixed(2);
          ctx.fillText(priceText, point.x + handleRadius + 4 * hRatio, point.y);
        });
      }

      // Draw pattern validity indicator
      const validX = scaledPoints[3].x + 10 * hRatio;
      const validY = scaledPoints[3].y + 20 * vRatio;
      ctx.font = `bold ${this._options.labelFontSize * hRatio}px Arial`;
      
      if (this._validation.overallValid) {
        ctx.fillStyle = this._options.validColor;
        ctx.fillText('✓ Valid ABCD', validX, validY);
      } else {
        ctx.fillStyle = this._options.invalidColor;
        ctx.fillText('✗ Invalid', validX, validY);
      }
    });
  }
}

class ABCDPatternPaneView implements IPrimitivePaneView {
  _source: ABCDPatternDrawing;
  _points: ViewPoint[] = [
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
  ];
  _validation: RatioValidation = {
    bcRatio: 0,
    cdRatio: 0,
    bcValid: false,
    cdValid: false,
    overallValid: false,
    bcClosestTarget: 0.618,
    cdClosestTarget: 1.272,
  };

  constructor(source: ABCDPatternDrawing) {
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

    // Calculate ratios
    const prices = this._source._points.map(p => p.price);
    const bcRatio = calculateBCRetracement(prices[0], prices[1], prices[2]);
    const cdRatio = calculateCDExtension(prices[1], prices[2], prices[3]);

    // Validate ratios
    const bcValid = isValidRatio(bcRatio, BC_RETRACEMENT_RATIOS, this._source._options.tolerance);
    const cdValid = isValidRatio(cdRatio, CD_EXTENSION_RATIOS, this._source._options.tolerance);

    this._validation = {
      bcRatio,
      cdRatio,
      bcValid,
      cdValid,
      overallValid: bcValid && cdValid,
      bcClosestTarget: getClosestTarget(bcRatio, BC_RETRACEMENT_RATIOS),
      cdClosestTarget: getClosestTarget(cdRatio, CD_EXTENSION_RATIOS),
    };
  }

  renderer(): IPrimitivePaneRenderer {
    return new ABCDPatternPaneRenderer(
      this._points,
      this._source._options,
      this._validation,
      this._source._points.map(p => p.price)
    );
  }
}

// Price axis view for showing point prices
class ABCDPatternPriceAxisView implements ISeriesPrimitiveAxisView {
  _source: ABCDPatternDrawing;
  _y: Coordinate | null = null;
  _price: number = 0;

  constructor(source: ABCDPatternDrawing) {
    this._source = source;
  }

  update() {
    // Show price for the last point (D)
    if (this._source._points.length >= 4) {
      const series = this._source.series;
      this._y = series.priceToCoordinate(this._source._points[3].price);
      this._price = this._source._points[3].price;
    }
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
    return `D: ${this._price.toFixed(2)}`;
  }

  textColor(): string {
    return this._source._options.lineColor;
  }

  backColor(): string {
    return this._source._options.lineColor;
  }
}

export class ABCDPatternDrawing extends PluginBase {
  _points: Point[];
  _paneViews: ABCDPatternPaneView[];
  _priceAxisViews: ABCDPatternPriceAxisView[];
  _options: ABCDPatternOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    points: [Point, Point, Point, Point],
    options?: Partial<ABCDPatternOptions>
  ) {
    super();
    this._points = points;
    this._options = { ...defaultOptions, ...options };

    // Calculate min and max prices for autoscaling
    const prices = points.map(p => p.price);
    this._minPrice = Math.min(...prices);
    this._maxPrice = Math.max(...prices);

    // Add some padding for the pattern
    const padding = (this._maxPrice - this._minPrice) * 0.1;
    this._minPrice -= padding;
    this._maxPrice += padding;

    this._paneViews = [new ABCDPatternPaneView(this)];
    this._priceAxisViews = [new ABCDPatternPriceAxisView(this)];
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const xCoords = this._points.map(p => timeScale.timeToCoordinate(p.time));
    
    // Check if any coordinate is null
    if (xCoords.some(x => x === null)) return null;

    const startX = Math.min(...xCoords as number[]);
    const endX = Math.max(...xCoords as number[]);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p4Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p4Index === null) return null;
    if (endTime < p1Index || startTime > p4Index) return null;

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

  /**
   * Get the current ratio validation status
   */
  getValidation(): RatioValidation {
    const view = this._paneViews[0];
    return view._validation;
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
      
      const padding = (this._maxPrice - this._minPrice) * 0.1;
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
}
