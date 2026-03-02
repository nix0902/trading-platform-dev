/**
 * Andrews Pitchfork Drawing Tool
 * Standard Andrews Pitchfork with three parallel lines from anchor points.
 * 
 * Construction:
 * 1. Takes 3 points: P1, P2, P3
 * 2. Calculate the midpoint M between P2 and P3
 * 3. Handle starts from P1
 * 4. Three prongs extend from P1:
 *    - Upper prong: through P2 (parallel to P1-M direction)
 *    - Median line: through M (parallel to P1-M direction)
 *    - Lower prong: through P3 (parallel to P1-M direction)
 * 5. Lines extend from P1 to the right edge of the chart
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

export interface PitchforkOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
}

const defaultOptions: PitchforkOptions = {
  lineColor: '#2962FF',
  lineWidth: 2,
  lineStyle: 'solid',
  showLabels: true,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: PitchforkOptions['lineStyle']): number[] {
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

/**
 * Calculates the intersection point of a line through a point parallel to another line
 * with a vertical line at targetX
 */
function parallelLineAtX(
  originX: number,
  originY: number,
  directionStartX: number,
  directionStartY: number,
  directionEndX: number,
  directionEndY: number,
  targetX: number
): { x: number; y: number } {
  // Direction vector of the reference line
  const dx = directionEndX - directionStartX;
  const dy = directionEndY - directionStartY;
  
  if (dx === 0) {
    return { x: targetX, y: originY };
  }
  
  // Calculate the y at targetX for a line through (originX, originY) with same slope
  const t = (targetX - originX) / dx;
  return {
    x: targetX,
    y: originY + dy * t,
  };
}

class PitchforkPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _midpoint: ViewPoint;
  _chartWidth: number;
  _options: PitchforkOptions;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    midpoint: ViewPoint,
    chartWidth: number,
    options: PitchforkOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
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
      const midX = this._midpoint.x * hRatio;
      const midY = this._midpoint.y * vRatio;
      const chartWidthScaled = this._chartWidth * hRatio;

      // Calculate extension points for the three prongs
      // All prongs are parallel to the P1-M direction (median line)
      
      // Median line: from P1 through M
      const medianEnd = extendLineToPoint(p1x, p1y, midX, midY, chartWidthScaled);
      
      // Upper prong: parallel to median line, passing through P2
      const upperEnd = parallelLineAtX(
        p2x, p2y,           // Line passes through P2
        p1x, p1y, midX, midY, // Direction of median line
        chartWidthScaled
      );
      
      // Lower prong: parallel to median line, passing through P3
      const lowerEnd = parallelLineAtX(
        p3x, p3y,           // Line passes through P3
        p1x, p1y, midX, midY, // Direction of median line
        chartWidthScaled
      );

      // Set line style
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.setLineDash(getLineDash(this._options.lineStyle));
      ctx.lineCap = 'round';

      // Draw upper prong (from P2 to the right)
      ctx.beginPath();
      ctx.moveTo(p2x, p2y);
      ctx.lineTo(upperEnd.x, upperEnd.y);
      ctx.stroke();

      // Draw median line (from P1 through M to the right)
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(medianEnd.x, medianEnd.y);
      ctx.stroke();

      // Draw lower prong (from P3 to the right)
      ctx.beginPath();
      ctx.moveTo(p3x, p3y);
      ctx.lineTo(lowerEnd.x, lowerEnd.y);
      ctx.stroke();

      // Draw handle line from P1 to M (dashed to indicate it's the handle)
      ctx.save();
      ctx.setLineDash([4 * hRatio, 4 * hRatio]);
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(midX, midY);
      ctx.stroke();
      ctx.restore();

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

      // Draw midpoint (smaller, different style)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = 2 * hRatio;
      ctx.beginPath();
      ctx.arc(midX, midY, handleRadius * 0.7, 0, Math.PI * 2);
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
      }
    });
  }
}

class PitchforkPaneView implements IPrimitivePaneView {
  _source: PitchforkDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _midpoint: ViewPoint = { x: null, y: null };
  _chartWidth: number = 0;

  constructor(source: PitchforkDrawing) {
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
    return new PitchforkPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._midpoint,
      this._chartWidth,
      this._source._options
    );
  }
}

export class PitchforkDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _options: PitchforkOptions;
  _paneViews: PitchforkPaneView[];
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<PitchforkOptions>
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
    this._minPrice = Math.min(p1.price, p2.price, p3.price, midPrice);
    this._maxPrice = Math.max(p1.price, p2.price, p3.price, midPrice);
    
    this._paneViews = [new PitchforkPaneView(this)];
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
 * Required number of anchor points for Andrews Pitchfork
 */
export const PITCHFORK_REQUIRED_POINTS = 3;
