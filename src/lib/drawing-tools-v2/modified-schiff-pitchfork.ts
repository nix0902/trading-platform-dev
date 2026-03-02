/**
 * Modified Schiff Pitchfork Drawing Tool
 * A variation of the Schiff Pitchfork where the handle is offset by 2/3 of the 
 * distance from P1 to the midpoint M (between P2 and P3).
 * 
 * Handle position: P1 + (2/3) * (M - P1)
 * This places the handle 2/3 of the way from P1 toward M.
 * 
 * Three prongs extend forward from the modified handle start:
 * - Upper prong: parallel to (handleStart -> P2)
 * - Median line: parallel to (handleStart -> M)
 * - Lower prong: parallel to (handleStart -> P3)
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
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

export interface ModifiedSchiffPitchforkOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
}

const defaultOptions: ModifiedSchiffPitchforkOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: ModifiedSchiffPitchforkOptions['lineStyle']): number[] {
  switch (style) {
    case 'dashed':
      return [8, 4];
    case 'dotted':
      return [2, 4];
    case 'solid':
    default:
      return [];
  }
}

/**
 * Calculates a point along a line extended forward from a start point through an end point
 * Returns the point at the given x coordinate
 */
function extendLineToPoint(
  startX: number,
  startY: number,
  throughX: number,
  throughY: number,
  targetX: number
): { x: number; y: number } {
  const dx = throughX - startX;
  const dy = throughY - startY;
  
  // Avoid division by zero
  if (dx === 0) {
    return { x: targetX, y: throughY };
  }
  
  const t = (targetX - startX) / dx;
  return {
    x: targetX,
    y: startY + dy * t,
  };
}

class ModifiedSchiffPitchforkPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _handleStart: ViewPoint;
  _midpoint: ViewPoint;
  _chartWidth: number;
  _options: ModifiedSchiffPitchforkOptions;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    handleStart: ViewPoint,
    midpoint: ViewPoint,
    chartWidth: number,
    options: ModifiedSchiffPitchforkOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._handleStart = handleStart;
    this._midpoint = midpoint;
    this._chartWidth = chartWidth;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null ||
        this._p3.x === null ||
        this._p3.y === null ||
        this._handleStart.x === null ||
        this._handleStart.y === null ||
        this._midpoint.x === null ||
        this._midpoint.y === null
      )
        return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      // Scale coordinates to bitmap space
      const p1x = this._p1.x * hRatio;
      const p1y = this._p1.y * vRatio;
      const p2x = this._p2.x * hRatio;
      const p2y = this._p2.y * vRatio;
      const p3x = this._p3.x * hRatio;
      const p3y = this._p3.y * vRatio;
      const handleX = this._handleStart.x * hRatio;
      const handleY = this._handleStart.y * vRatio;
      const midX = this._midpoint.x * hRatio;
      const midY = this._midpoint.y * vRatio;
      const chartWidthScaled = this._chartWidth * hRatio;

      // Calculate extension points for the three prongs
      // Upper prong: from handle through P2
      const upperEnd = extendLineToPoint(handleX, handleY, p2x, p2y, chartWidthScaled);
      
      // Median line: from handle through midpoint
      const medianEnd = extendLineToPoint(handleX, handleY, midX, midY, chartWidthScaled);
      
      // Lower prong: from handle through P3
      const lowerEnd = extendLineToPoint(handleX, handleY, p3x, p3y, chartWidthScaled);

      // Set line style
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle));
      ctx.lineCap = 'round';

      // Draw handle line from P1 to handle start (dashed to indicate it's the handle)
      ctx.save();
      ctx.setLineDash([4 * hRatio, 4 * hRatio]);
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(handleX, handleY);
      ctx.stroke();
      ctx.restore();

      // Draw upper prong
      ctx.beginPath();
      ctx.moveTo(handleX, handleY);
      ctx.lineTo(upperEnd.x, upperEnd.y);
      ctx.stroke();

      // Draw median line
      ctx.beginPath();
      ctx.moveTo(handleX, handleY);
      ctx.lineTo(medianEnd.x, medianEnd.y);
      ctx.stroke();

      // Draw lower prong
      ctx.beginPath();
      ctx.moveTo(handleX, handleY);
      ctx.lineTo(lowerEnd.x, lowerEnd.y);
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);

      // Draw anchor point handles
      const handleRadius = 5 * hRatio;
      ctx.fillStyle = this._options.lineColor;
      
      // P1 handle
      ctx.beginPath();
      ctx.arc(p1x, p1y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // P2 handle
      ctx.beginPath();
      ctx.arc(p2x, p2y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // P3 handle
      ctx.beginPath();
      ctx.arc(p3x, p3y, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw handle start point (smaller, different style)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = 2 * hRatio;
      ctx.beginPath();
      ctx.arc(handleX, handleY, handleRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw labels if enabled
      if (this._options.showLabels) {
        ctx.font = `${11 * hRatio}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Label backgrounds
        const labelPadding = 4 * hRatio;
        const labels = [
          { text: 'P1', x: p1x, y: p1y },
          { text: 'P2', x: p2x, y: p2y },
          { text: 'P3', x: p3x, y: p3y },
        ];

        labels.forEach(label => {
          const textWidth = ctx.measureText(label.text).width;
          
          // Draw label background
          ctx.fillStyle = this._options.lineColor;
          ctx.fillRect(
            label.x + handleRadius + labelPadding,
            label.y - 8 * vRatio,
            textWidth + labelPadding * 2,
            16 * vRatio
          );
          
          // Draw label text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label.text, label.x + handleRadius + labelPadding * 2, label.y);
        });

        // Draw "M" label for midpoint
        const midLabelText = 'M';
        const midLabelWidth = ctx.measureText(midLabelText).width;
        ctx.fillStyle = this._options.lineColor;
        ctx.fillRect(
          midX - midLabelWidth / 2 - labelPadding,
          midY - 20 * vRatio,
          midLabelWidth + labelPadding * 2,
          16 * vRatio
        );
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(midLabelText, midX, midY - 12 * vRatio);

        // Draw "H" label for handle start point
        const handleLabelText = 'H';
        const handleLabelWidth = ctx.measureText(handleLabelText).width;
        ctx.fillStyle = this._options.lineColor;
        ctx.fillRect(
          handleX - handleLabelWidth / 2 - labelPadding,
          handleY + 8 * vRatio,
          handleLabelWidth + labelPadding * 2,
          16 * vRatio
        );
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(handleLabelText, handleX, handleY + 16 * vRatio);
      }
    });
  }
}

class ModifiedSchiffPitchforkPaneView implements IPrimitivePaneView {
  _source: ModifiedSchiffPitchforkDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _handleStart: ViewPoint = { x: null, y: null };
  _midpoint: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;

  constructor(source: ModifiedSchiffPitchforkDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    // Get coordinates for the three anchor points
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

    // Calculate midpoint M between P2 and P3
    const midPrice = (this._source._p2.price + this._source._p3.price) / 2;
    const midTime = this._source._midpointTime;
    
    this._midpoint = {
      x: midTime ? timeScale.timeToCoordinate(midTime) : null,
      y: series.priceToCoordinate(midPrice),
    };

    // Calculate handle start position using Modified Schiff formula
    // Handle = P1 + (2/3) * (M - P1)
    const handlePrice = this._source._p1.price + (2 / 3) * (midPrice - this._source._p1.price);
    const handleTime = this._source._handleStartTime;
    
    this._handleStart = {
      x: handleTime ? timeScale.timeToCoordinate(handleTime) : null,
      y: series.priceToCoordinate(handlePrice),
    };

    // Get chart width for line extensions
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const x = timeScale.logicalToCoordinate(visibleRange.to);
      if (x !== null) {
        this._chartWidth = x + 100;
      }
    }
  }

  renderer() {
    return new ModifiedSchiffPitchforkPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._handleStart,
      this._midpoint,
      this._chartWidth,
      this._source._options
    );
  }
}

export class ModifiedSchiffPitchforkDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _options: ModifiedSchiffPitchforkOptions;
  _paneViews: ModifiedSchiffPitchforkPaneView[];
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<ModifiedSchiffPitchforkOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    
    // Calculate price range for autoscaling
    const midPrice = (p2.price + p3.price) / 2;
    // Modified Schiff: Handle is at P1 + (2/3) * (M - P1)
    const handlePrice = p1.price + (2 / 3) * (midPrice - p1.price);
    this._minPrice = Math.min(p1.price, p2.price, p3.price, handlePrice);
    this._maxPrice = Math.max(p1.price, p2.price, p3.price, handlePrice);
    
    this._paneViews = [new ModifiedSchiffPitchforkPaneView(this)];
  }

  /**
   * Calculate the time for the midpoint between P2 and P3
   */
  get _midpointTime(): Time | null {
    const timeScale = this.chart?.timeScale();
    if (!timeScale) return null;
    
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    const x3 = timeScale.timeToCoordinate(this._p3.time);
    
    if (x2 === null || x3 === null) return null;
    
    const midX = (x2 + x3) / 2;
    const midLogical = timeScale.coordinateToLogical(midX);
    
    if (midLogical === null) return null;
    
    return timeScale.logicalToTime(midLogical);
  }

  /**
   * Calculate the time for the handle start point
   * Modified Schiff: Handle is at P1 + (2/3) * (M - P1)
   */
  get _handleStartTime(): Time | null {
    const timeScale = this.chart?.timeScale();
    if (!timeScale) return null;
    
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const midTime = this._midpointTime;
    
    if (x1 === null || !midTime) return null;
    
    const midX = timeScale.timeToCoordinate(midTime);
    if (midX === null) return null;
    
    // Modified Schiff: Handle is 2/3 of the way from P1 toward M
    const handleX = x1 + (2 / 3) * (midX - x1);
    const handleLogical = timeScale.coordinateToLogical(handleX);
    
    if (handleLogical === null) return null;
    
    return timeScale.logicalToTime(handleLogical);
  }

  autoscaleInfo(startTime: Logical, endTime: Logical): AutoscaleInfo | null {
    const timeScale = this.chart.timeScale();
    
    const x1 = timeScale.timeToCoordinate(this._p1.time);
    const x2 = timeScale.timeToCoordinate(this._p2.time);
    const x3 = timeScale.timeToCoordinate(this._p3.time);
    
    if (x1 === null || x2 === null || x3 === null) return null;

    const startX = Math.min(x1, x2, x3);
    const endX = Math.max(x1, x2, x3);

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
  }

  paneViews() {
    return this._paneViews;
  }
}

/**
 * Required number of anchor points for Modified Schiff Pitchfork
 */
export const MODIFIED_SCHIFF_PITCHFORK_REQUIRED_POINTS = 3;
