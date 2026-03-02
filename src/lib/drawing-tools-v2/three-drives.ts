/**
 * Three Drives Pattern Drawing Tool
 * A reversal pattern with three peaks/troughs
 * 
 * The Three Drives pattern consists of 6 points:
 * - Point 1: First peak (bearish) or trough (bullish)
 * - Point 2: First valley (bearish) or peak (bullish)
 * - Point 3: Second peak (bearish) or trough (bullish)
 * - Point 4: Second valley (bearish) or peak (bullish)
 * - Point 5: Third peak (bearish) or trough (bullish)
 * - Point 6: Third valley (bearish) or peak (bullish) - completion
 * 
 * Each drive should project 127.2% or 161.8% of the previous drive
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

export interface ThreeDrivesOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  showRatios: boolean;
  labelFontSize: number;
  validColor: string;
  invalidColor: string;
  tolerance: number; // Tolerance for ratio validation (default 0.10 = 10%)
}

const defaultOptions: ThreeDrivesOptions = {
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

// Standard Fibonacci extension ratios for Three Drives pattern
const DRIVE_EXTENSION_RATIOS = [1.272, 1.618];

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: ThreeDrivesOptions['lineStyle'], pixelRatio: number = 1): number[] {
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
 * Calculate the extension ratio between two drives
 * For bearish: ratio = |P3 - P2| / |P1 - P2|
 * For bullish: ratio = |P3 - P2| / |P1 - P2|
 */
function calculateDriveRatio(p1: number, p2: number, p3: number): number {
  const prevMove = Math.abs(p2 - p1);
  const currentMove = Math.abs(p3 - p2);
  if (prevMove === 0) return 0;
  return currentMove / prevMove;
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

/**
 * Determine if the pattern is bullish (reversal to upside)
 * Bullish: peaks get lower (1 > 3 > 5), troughs get higher (2 < 4 < 6)
 */
function isBullishPattern(prices: number[]): boolean {
  // Check if odd points (1, 3, 5) are decreasing (peaks for bearish, so we check for troughs)
  // Actually, for bullish reversal: troughs get higher, so points 1, 3, 5 should be troughs
  // For bearish reversal: peaks get lower, so points 1, 3, 5 should be peaks
  // We determine by checking if point 1 is below point 2 (indicating point 1 is a trough)
  return prices[0] < prices[1];
}

interface DriveValidation {
  drive1Ratio: number;
  drive2Ratio: number;
  drive1Valid: boolean;
  drive2Valid: boolean;
  overallValid: boolean;
  drive1ClosestTarget: number;
  drive2ClosestTarget: number;
  isBullish: boolean;
}

class ThreeDrivesPaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: ThreeDrivesOptions;
  _validation: DriveValidation;
  _prices: number[];

  constructor(
    points: ViewPoint[],
    options: ThreeDrivesOptions,
    validation: DriveValidation,
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

      // Draw the pattern lines connecting all points
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle, hRatio));

      // Draw all connecting lines (1→2→3→4→5→6)
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
      }
      ctx.stroke();

      ctx.setLineDash([]);

      // Draw drive projection lines (dashed)
      ctx.strokeStyle = lineColor + '60';
      ctx.lineWidth = 1 * hRatio;
      ctx.setLineDash([4 * hRatio, 4 * vRatio]);

      // Project from each peak/trough
      // Drive 1: from point 2 to point 3 (projecting the move from 1-2)
      // Drive 2: from point 4 to point 5 (projecting the move from 3-4)
      // Drive 3: from point 6 (projecting the move from 5-6)
      
      ctx.setLineDash([]);

      // Draw point handles with labels
      const pointLabels = ['1', '2', '3', '4', '5', '6'];
      const handleRadius = 5 * hRatio;

      scaledPoints.forEach((point, index) => {
        // Determine color based on drive validity for completion points
        let handleColor = lineColor;
        if (index === 2) { // Point 3 - Drive 1 completion
          handleColor = this._validation.drive1Valid ? this._options.validColor : this._options.invalidColor;
        } else if (index === 4) { // Point 5 - Drive 2 completion
          handleColor = this._validation.drive2Valid ? this._options.validColor : this._options.invalidColor;
        } else if (index === 5) { // Point 6 - Drive 3 completion (final)
          handleColor = this._validation.overallValid ? this._options.validColor : this._options.invalidColor;
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
          
          // Position label above or below the point depending on pattern direction
          const isPeak = this._validation.isBullish 
            ? index % 2 === 1  // For bullish: even indices are troughs, odd are peaks
            : index % 2 === 0; // For bearish: even indices are peaks, odd are troughs
          
          const labelOffset = isPeak ? -12 * vRatio : 18 * vRatio;
          ctx.fillText(pointLabels[index], point.x, point.y + labelOffset);
        }
      });

      // Draw ratio labels
      if (this._options.showRatios) {
        const fontSize = (this._options.labelFontSize - 1) * hRatio;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Drive 1 ratio label (between points 2 and 3)
        const drive1RatioText = `Drive 1: ${this._validation.drive1Ratio.toFixed(3)} (${(this._validation.drive1ClosestTarget * 100).toFixed(1)}%)`;
        const drive1Color = this._validation.drive1Valid ? this._options.validColor : this._options.invalidColor;
        
        const drive1LabelX = (scaledPoints[1].x + scaledPoints[2].x) / 2;
        const drive1LabelY = (scaledPoints[1].y + scaledPoints[2].y) / 2;
        const drive1TextWidth = ctx.measureText(drive1RatioText).width + 8 * hRatio;
        const labelHeight = 16 * vRatio;
        
        ctx.fillStyle = drive1Color + '20';
        ctx.fillRect(drive1LabelX - drive1TextWidth / 2, drive1LabelY - labelHeight / 2, drive1TextWidth, labelHeight);
        ctx.fillStyle = drive1Color;
        ctx.fillText(drive1RatioText, drive1LabelX, drive1LabelY);

        // Drive 2 ratio label (between points 4 and 5)
        const drive2RatioText = `Drive 2: ${this._validation.drive2Ratio.toFixed(3)} (${(this._validation.drive2ClosestTarget * 100).toFixed(1)}%)`;
        const drive2Color = this._validation.drive2Valid ? this._options.validColor : this._options.invalidColor;
        
        const drive2LabelX = (scaledPoints[3].x + scaledPoints[4].x) / 2;
        const drive2LabelY = (scaledPoints[3].y + scaledPoints[4].y) / 2;
        const drive2TextWidth = ctx.measureText(drive2RatioText).width + 8 * hRatio;
        
        ctx.fillStyle = drive2Color + '20';
        ctx.fillRect(drive2LabelX - drive2TextWidth / 2, drive2LabelY - labelHeight / 2, drive2TextWidth, labelHeight);
        ctx.fillStyle = drive2Color;
        ctx.fillText(drive2RatioText, drive2LabelX, drive2LabelY);

        // Drive 3 label (between points 5 and 6)
        const drive3LabelX = (scaledPoints[4].x + scaledPoints[5].x) / 2;
        const drive3LabelY = (scaledPoints[4].y + scaledPoints[5].y) / 2;
        ctx.fillStyle = lineColor + '80';
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText('Drive 3', drive3LabelX, drive3LabelY);

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

      // Draw pattern name and validity indicator
      const patternLabelX = scaledPoints[5].x + 10 * hRatio;
      const patternLabelY = scaledPoints[5].y + (this._validation.isBullish ? -20 : 20) * vRatio;
      ctx.font = `bold ${this._options.labelFontSize * hRatio}px Arial`;
      
      // Pattern type label
      ctx.fillStyle = lineColor;
      const patternType = this._validation.isBullish ? 'Bullish' : 'Bearish';
      ctx.fillText(`${patternType} Three Drives`, patternLabelX, patternLabelY);
      
      // Validity indicator
      if (this._validation.overallValid) {
        ctx.fillStyle = this._options.validColor;
        ctx.fillText('✓ Valid Pattern', patternLabelX, patternLabelY + 14 * vRatio);
      } else {
        ctx.fillStyle = this._options.invalidColor;
        ctx.fillText('✗ Invalid', patternLabelX, patternLabelY + 14 * vRatio);
      }
    });
  }
}

class ThreeDrivesPaneView implements IPrimitivePaneView {
  _source: ThreeDrivesDrawing;
  _points: ViewPoint[] = [
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
    { x: null, y: null },
  ];
  _validation: DriveValidation = {
    drive1Ratio: 0,
    drive2Ratio: 0,
    drive1Valid: false,
    drive2Valid: false,
    overallValid: false,
    drive1ClosestTarget: 1.272,
    drive2ClosestTarget: 1.272,
    isBullish: true,
  };

  constructor(source: ThreeDrivesDrawing) {
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
    
    // Determine pattern direction
    const isBullish = isBullishPattern(prices);
    
    // Calculate drive ratios
    // Drive 1: ratio of move 2→3 relative to move 1→2
    const drive1Ratio = calculateDriveRatio(prices[0], prices[1], prices[2]);
    // Drive 2: ratio of move 4→5 relative to move 3→4
    const drive2Ratio = calculateDriveRatio(prices[2], prices[3], prices[4]);

    // Validate ratios
    const drive1Valid = isValidRatio(drive1Ratio, DRIVE_EXTENSION_RATIOS, this._source._options.tolerance);
    const drive2Valid = isValidRatio(drive2Ratio, DRIVE_EXTENSION_RATIOS, this._source._options.tolerance);

    this._validation = {
      drive1Ratio,
      drive2Ratio,
      drive1Valid,
      drive2Valid,
      overallValid: drive1Valid && drive2Valid,
      drive1ClosestTarget: getClosestTarget(drive1Ratio, DRIVE_EXTENSION_RATIOS),
      drive2ClosestTarget: getClosestTarget(drive2Ratio, DRIVE_EXTENSION_RATIOS),
      isBullish,
    };
  }

  renderer(): IPrimitivePaneRenderer {
    return new ThreeDrivesPaneRenderer(
      this._points,
      this._source._options,
      this._validation,
      this._source._points.map(p => p.price)
    );
  }
}

// Price axis view for showing point prices
class ThreeDrivesPriceAxisView implements ISeriesPrimitiveAxisView {
  _source: ThreeDrivesDrawing;
  _y: Coordinate | null = null;
  _price: number = 0;

  constructor(source: ThreeDrivesDrawing) {
    this._source = source;
  }

  update() {
    // Show price for the last point (6)
    if (this._source._points.length >= 6) {
      const series = this._source.series;
      this._y = series.priceToCoordinate(this._source._points[5].price);
      this._price = this._source._points[5].price;
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
    return `P6: ${this._price.toFixed(2)}`;
  }

  textColor(): string {
    return this._source._options.lineColor;
  }

  backColor(): string {
    return this._source._options.lineColor;
  }
}

export class ThreeDrivesDrawing extends PluginBase {
  _points: Point[];
  _paneViews: ThreeDrivesPaneView[];
  _priceAxisViews: ThreeDrivesPriceAxisView[];
  _options: ThreeDrivesOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    points: [Point, Point, Point, Point, Point, Point],
    options?: Partial<ThreeDrivesOptions>
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

    this._paneViews = [new ThreeDrivesPaneView(this)];
    this._priceAxisViews = [new ThreeDrivesPriceAxisView(this)];
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    const xCoords = this._points.map(p => timeScale.timeToCoordinate(p.time));
    
    // Check if any coordinate is null
    if (xCoords.some(x => x === null)) return null;

    const startX = Math.min(...xCoords as number[]);
    const endX = Math.max(...xCoords as number[]);

    const p1Index = timeScale.coordinateToLogical(startX);
    const p6Index = timeScale.coordinateToLogical(endX);

    if (p1Index === null || p6Index === null) return null;
    if (endTime < p1Index || startTime > p6Index) return null;

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
  getValidation(): DriveValidation {
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
