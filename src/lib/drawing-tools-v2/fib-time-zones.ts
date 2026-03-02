/**
 * Fibonacci Time Zones Drawing Tool
 * Draws vertical lines at Fibonacci sequence intervals.
 *
 * Usage:
 * - P1: Start time (first vertical line position)
 * - P2: Second point to define the base time unit (time difference = base unit)
 * - Lines are drawn at Fibonacci intervals: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 * - Each line is at: start_time + (fib_number * base_unit)
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

interface Point {
  time: Time;
  price: number;
}

export interface FibTimeZonesOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  maxLines: number;
  labelBackgroundColor: string;
  labelTextColor: string;
}

const defaultOptions: FibTimeZonesOptions = {
  lineColor: '#2962FF',
  lineWidth: 1,
  lineStyle: 'dashed',
  showLabels: true,
  maxLines: 12,
  labelBackgroundColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
};

/**
 * Generate Fibonacci sequence up to maxLines count
 */
function generateFibonacciSequence(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [1, 1];

  const sequence: number[] = [1, 1];
  for (let i = 2; i < count; i++) {
    sequence.push(sequence[i - 1] + sequence[i - 2]);
  }
  return sequence;
}

/**
 * Helper to convert Time to Unix timestamp in seconds
 */
function timeToTimestamp(time: Time): number {
  if (typeof time === 'number') {
    return time;
  } else if (typeof time === 'string') {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  // BusinessDay object
  const d = new Date(time.year, time.month - 1, time.day);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Helper to convert Unix timestamp to Time
 */
function timestampToTime(timestamp: number): Time {
  return timestamp as Time;
}

/**
 * Renderer for Fibonacci Time Zones vertical lines
 */
class FibTimeZonesPaneRenderer implements IPrimitivePaneRenderer {
  _fibLines: { x: Coordinate | null; fibNumber: number }[];
  _height: number;
  _options: FibTimeZonesOptions;
  _startX: Coordinate | null;
  _secondX: Coordinate | null;

  constructor(
    fibLines: { x: Coordinate | null; fibNumber: number }[],
    height: number,
    options: FibTimeZonesOptions,
    startX: Coordinate | null,
    secondX: Coordinate | null
  ) {
    this._fibLines = fibLines;
    this._height = height;
    this._options = options;
    this._startX = startX;
    this._secondX = secondX;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;
      const heightScaled = this._height * verticalRatio;

      // Set line style
      if (this._options.lineStyle === 'dashed') {
        ctx.setLineDash([8 * verticalRatio, 4 * verticalRatio]);
      } else if (this._options.lineStyle === 'dotted') {
        ctx.setLineDash([2 * verticalRatio, 4 * verticalRatio]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.lineCap = 'round';

      // Draw each Fibonacci line
      for (const line of this._fibLines) {
        if (line.x === null) continue;

        const xScaled = Math.round(line.x * horizontalRatio);

        // Use a gradient of colors based on Fibonacci number
        const alpha = Math.max(0.4, 1 - (line.fibNumber / 144) * 0.6);
        ctx.strokeStyle = this._options.lineColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = this._options.lineWidth * horizontalRatio;

        ctx.beginPath();
        ctx.moveTo(xScaled, 0);
        ctx.lineTo(xScaled, heightScaled);
        ctx.stroke();
      }

      // Reset dash for labels and handles
      ctx.setLineDash([]);

      // Draw labels
      if (this._options.showLabels) {
        ctx.font = `bold ${11 * horizontalRatio}px Arial`;

        for (const line of this._fibLines) {
          if (line.x === null) continue;

          const xScaled = Math.round(line.x * horizontalRatio);
          const label = line.fibNumber.toString();

          const textWidth = ctx.measureText(label).width + 10 * horizontalRatio;
          const labelHeight = 16 * verticalRatio;

          // Draw label background at top
          ctx.fillStyle = this._options.labelBackgroundColor;
          ctx.fillRect(xScaled - textWidth / 2, 2 * verticalRatio, textWidth, labelHeight);

          // Draw label text
          ctx.fillStyle = this._options.labelTextColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, xScaled, 10 * verticalRatio);
        }
      }

      // Draw handles at start point and second point
      if (this._startX !== null) {
        const startXScaled = Math.round(this._startX * horizontalRatio);
        const handleRadius = 6 * horizontalRatio;

        // Start point handle (first point)
        ctx.fillStyle = this._options.lineColor;
        ctx.beginPath();
        ctx.arc(startXScaled, 30 * verticalRatio, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        // White inner circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(startXScaled, 30 * verticalRatio, handleRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Label for start point
        ctx.font = `${10 * horizontalRatio}px Arial`;
        ctx.fillStyle = this._options.lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Start', startXScaled, (30 + handleRadius + 4) * verticalRatio);
      }

      if (this._secondX !== null) {
        const secondXScaled = Math.round(this._secondX * horizontalRatio);
        const handleRadius = 6 * horizontalRatio;

        // Second point handle
        ctx.fillStyle = this._options.lineColor;
        ctx.beginPath();
        ctx.arc(secondXScaled, 30 * verticalRatio, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        // White inner circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(secondXScaled, 30 * verticalRatio, handleRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Label for base unit point
        ctx.font = `${10 * horizontalRatio}px Arial`;
        ctx.fillStyle = this._options.lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Base', secondXScaled, (30 + handleRadius + 4) * verticalRatio);
      }
    });
  }
}

/**
 * Pane view for Fibonacci Time Zones
 */
class FibTimeZonesPaneView implements IPrimitivePaneView {
  _source: FibTimeZonesDrawing;
  _fibLines: { x: Coordinate | null; fibNumber: number }[] = [];
  _height: number = 0;
  _startX: Coordinate | null = null;
  _secondX: Coordinate | null = null;

  constructor(source: FibTimeZonesDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    const startTimestamp = timeToTimestamp(this._source._p1.time);
    const secondTimestamp = timeToTimestamp(this._source._p2.time);

    // Calculate base unit in seconds (time difference between P1 and P2)
    const baseUnit = Math.abs(secondTimestamp - startTimestamp);

    if (baseUnit === 0) {
      this._fibLines = [];
      return;
    }

    // Determine direction (P2 can be before or after P1)
    const direction = secondTimestamp >= startTimestamp ? 1 : -1;

    // Get start point x coordinate
    this._startX = timeScale.timeToCoordinate(this._source._p1.time);
    this._secondX = timeScale.timeToCoordinate(this._source._p2.time);

    // Generate Fibonacci sequence
    const fibSequence = generateFibonacciSequence(this._source._options.maxLines);

    // Calculate Fibonacci lines
    this._fibLines = [];

    for (let i = 0; i < fibSequence.length; i++) {
      const fibNumber = fibSequence[i];
      const lineTimestamp = startTimestamp + direction * fibNumber * baseUnit;
      const lineTime = timestampToTime(lineTimestamp);
      const x = timeScale.timeToCoordinate(lineTime);

      if (x !== null) {
        this._fibLines.push({
          x,
          fibNumber,
        });
      }
    }

    // Get chart height
    const panes = this._source.chart.panes();
    if (panes.length > 0) {
      this._height = panes[0].height();
    }
  }

  renderer() {
    return new FibTimeZonesPaneRenderer(
      this._fibLines,
      this._height,
      this._source._options,
      this._startX,
      this._secondX
    );
  }
}

/**
 * Fibonacci Time Zones Drawing Tool
 *
 * Draws vertical lines at Fibonacci sequence intervals.
 * The first point marks the start time, and the time difference
 * between the two points defines the base time unit.
 *
 * Lines appear at: start + (fib_number * base_unit)
 * Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 */
export class FibTimeZonesDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: FibTimeZonesPaneView[];
  _options: FibTimeZonesOptions;

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<FibTimeZonesOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new FibTimeZonesPaneView(this)];
  }

  /**
   * Get the base time unit in seconds
   */
  getBaseUnit(): number {
    const p1Timestamp = timeToTimestamp(this._p1.time);
    const p2Timestamp = timeToTimestamp(this._p2.time);
    return Math.abs(p2Timestamp - p1Timestamp);
  }

  /**
   * Get the start time
   */
  getStartTime(): Time {
    return this._p1.time;
  }

  /**
   * Get the Fibonacci sequence being used
   */
  getFibonacciSequence(): number[] {
    return generateFibonacciSequence(this._options.maxLines);
  }

  /**
   * Set new points
   */
  setPoints(p1: Point, p2: Point): void {
    this._p1 = p1;
    this._p2 = p2;
    this.requestUpdate();
  }

  /**
   * Move a specific point
   */
  movePoint(pointIndex: number, newPoint: Point): void {
    if (pointIndex === 0) {
      this._p1 = newPoint;
    } else if (pointIndex === 1) {
      this._p2 = newPoint;
    }
    this.requestUpdate();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<FibTimeZonesOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.requestUpdate();
  }

  /**
   * Fibonacci time zones don't affect autoscale since vertical lines don't have a price range
   */
  autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
    return null;
  }

  /**
   * Update all views when chart data changes
   */
  updateAllViews(): void {
    this._paneViews.forEach(view => view.update());
  }

  /**
   * Return pane views for rendering
   */
  paneViews() {
    return this._paneViews;
  }
}
