/**
 * Time Cycles Drawing Tool
 * Draws vertical lines at regular time intervals based on a cycle period.
 *
 * Usage:
 * - P1: Start time (first vertical line)
 * - P2: Second point to define the cycle period (time difference = cycle duration)
 * - Lines are drawn at P1, P1 + cycle, P1 + 2*cycle, etc.
 * - Optionally extends to the left (P1 - cycle, P1 - 2*cycle, etc.)
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

interface ViewPoint {
  x: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

export interface TimeCyclesOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  extendLeft: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
}

const defaultOptions: TimeCyclesOptions = {
  lineColor: '#2962FF',
  lineWidth: 1,
  lineStyle: 'dashed',
  showLabels: true,
  extendLeft: false,
  labelBackgroundColor: 'rgba(41, 98, 255, 0.85)',
  labelTextColor: 'white',
};

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
 * Helper to format time for label display
 */
function formatCycleTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * Renderer for Time Cycles vertical lines
 */
class TimeCyclesPaneRenderer implements IPrimitivePaneRenderer {
  _cycleLines: { x: Coordinate | null; cycleNumber: number; time: number }[];
  _height: number;
  _options: TimeCyclesOptions;
  _startX: Coordinate | null;

  constructor(
    cycleLines: { x: Coordinate | null; cycleNumber: number; time: number }[],
    height: number,
    options: TimeCyclesOptions,
    startX: Coordinate | null
  ) {
    this._cycleLines = cycleLines;
    this._height = height;
    this._options = options;
    this._startX = startX;
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

      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.lineCap = 'round';

      // Draw each cycle line
      for (const line of this._cycleLines) {
        if (line.x === null) continue;

        const xScaled = Math.round(line.x * horizontalRatio);

        // Highlight the start line (cycle 0)
        if (line.cycleNumber === 0) {
          ctx.strokeStyle = this._options.lineColor;
          ctx.lineWidth = (this._options.lineWidth + 1) * horizontalRatio;
        } else {
          ctx.strokeStyle = this._options.lineColor + 'AA'; // Slightly transparent for other cycles
          ctx.lineWidth = this._options.lineWidth * horizontalRatio;
        }

        ctx.beginPath();
        ctx.moveTo(xScaled, 0);
        ctx.lineTo(xScaled, heightScaled);
        ctx.stroke();
      }

      // Reset dash for labels and handles
      ctx.setLineDash([]);

      // Draw labels
      if (this._options.showLabels) {
        ctx.font = `${11 * horizontalRatio}px Arial`;

        for (const line of this._cycleLines) {
          if (line.x === null) continue;

          const xScaled = Math.round(line.x * horizontalRatio);
          const label = line.cycleNumber === 0 
            ? 'Start' 
            : line.cycleNumber > 0 
              ? `+${line.cycleNumber}` 
              : `${line.cycleNumber}`;

          const textWidth = ctx.measureText(label).width + 8 * horizontalRatio;
          const labelHeight = 14 * verticalRatio;

          // Draw label background at top
          ctx.fillStyle = line.cycleNumber === 0 
            ? this._options.labelBackgroundColor 
            : this._options.lineColor + 'CC';
          ctx.fillRect(xScaled - textWidth / 2, 2 * verticalRatio, textWidth, labelHeight);

          // Draw label text
          ctx.fillStyle = this._options.labelTextColor;
          ctx.textAlign = 'center';
          ctx.fillText(label, xScaled, 12 * verticalRatio);
        }
      }

      // Draw handles at start point and second point
      if (this._startX !== null) {
        const startXScaled = Math.round(this._startX * horizontalRatio);
        const handleRadius = 5 * horizontalRatio;

        // Start point handle
        ctx.fillStyle = this._options.lineColor;
        ctx.beginPath();
        ctx.arc(startXScaled, 20 * verticalRatio, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        // White inner circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(startXScaled, 20 * verticalRatio, handleRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

/**
 * Pane view for Time Cycles
 */
class TimeCyclesPaneView implements IPrimitivePaneView {
  _source: TimeCyclesDrawing;
  _cycleLines: { x: Coordinate | null; cycleNumber: number; time: number }[] = [];
  _height: number = 0;
  _startX: Coordinate | null = null;

  constructor(source: TimeCyclesDrawing) {
    this._source = source;
  }

  update() {
    const timeScale = this._source.chart.timeScale();
    const p1Timestamp = timeToTimestamp(this._source._p1.time);
    const p2Timestamp = timeToTimestamp(this._source._p2.time);

    // Calculate cycle period in seconds
    const cyclePeriod = Math.abs(p2Timestamp - p1Timestamp);

    if (cyclePeriod === 0) {
      this._cycleLines = [];
      return;
    }

    // Determine the start timestamp (earlier of p1 and p2)
    const startTimestamp = Math.min(p1Timestamp, p2Timestamp);

    // Get visible time range to determine how many cycles to draw
    const visibleRange = timeScale.getVisibleLogicalRange();
    let minTime: number | null = null;
    let maxTime: number | null = null;

    if (visibleRange) {
      const leftCoord = timeScale.logicalToCoordinate(visibleRange.from);
      const rightCoord = timeScale.logicalToCoordinate(visibleRange.to);

      if (leftCoord !== null) {
        minTime = timeScale.coordinateToTime(leftCoord) as number | null;
        if (typeof minTime !== 'number') minTime = null;
      }
      if (rightCoord !== null) {
        maxTime = timeScale.coordinateToTime(rightCoord) as number | null;
        if (typeof maxTime !== 'number') maxTime = null;
      }
    }

    // Calculate cycle lines
    this._cycleLines = [];

    // Extend left if option is enabled
    if (this._source._options.extendLeft) {
      // Calculate cycles to the left
      let leftCycles = 0;
      let currentTime = startTimestamp;

      if (minTime !== null) {
        // Calculate how many cycles we need to extend left to cover visible range
        while (currentTime >= (minTime - cyclePeriod)) {
          const x = timeScale.timeToCoordinate(timestampToTime(currentTime));
          if (x !== null) {
            this._cycleLines.push({
              x,
              cycleNumber: leftCycles,
              time: currentTime,
            });
          }
          leftCycles--;
          currentTime = startTimestamp + leftCycles * cyclePeriod;
        }
      } else {
        // Default: extend a few cycles to the left
        for (let i = 1; i <= 5; i++) {
          currentTime = startTimestamp - i * cyclePeriod;
          const x = timeScale.timeToCoordinate(timestampToTime(currentTime));
          if (x !== null) {
            this._cycleLines.push({
              x,
              cycleNumber: -i,
              time: currentTime,
            });
          }
        }
      }
    }

    // Add the start point (cycle 0)
    const startX = timeScale.timeToCoordinate(this._source._p1.time);
    this._startX = startX;
    if (startX !== null) {
      this._cycleLines.push({
        x: startX,
        cycleNumber: 0,
        time: p1Timestamp,
      });
    }

    // Extend to the right
    let rightCycles = 1;
    let currentTime = startTimestamp + cyclePeriod;

    if (maxTime !== null) {
      // Calculate how many cycles we need to extend right to cover visible range
      while (currentTime <= (maxTime + cyclePeriod)) {
        const x = timeScale.timeToCoordinate(timestampToTime(currentTime));
        if (x !== null) {
          this._cycleLines.push({
            x,
            cycleNumber: rightCycles,
            time: currentTime,
          });
        }
        rightCycles++;
        currentTime = startTimestamp + rightCycles * cyclePeriod;
      }
    } else {
      // Default: extend a few cycles to the right
      for (let i = 1; i <= 10; i++) {
        currentTime = startTimestamp + i * cyclePeriod;
        const x = timeScale.timeToCoordinate(timestampToTime(currentTime));
        if (x !== null) {
          this._cycleLines.push({
            x,
            cycleNumber: i,
            time: currentTime,
          });
        }
      }
    }

    // Sort by cycle number for proper rendering
    this._cycleLines.sort((a, b) => a.cycleNumber - b.cycleNumber);

    // Get chart height
    const panes = this._source.chart.panes();
    if (panes.length > 0) {
      this._height = panes[0].height();
    }
  }

  renderer() {
    return new TimeCyclesPaneRenderer(
      this._cycleLines,
      this._height,
      this._source._options,
      this._startX
    );
  }
}

/**
 * Time Cycles Drawing Tool
 * 
 * Draws vertical lines at regular time intervals based on a cycle period
 * defined by two points. The first point marks the start, and the time
 * difference between the two points defines the cycle period.
 */
export class TimeCyclesDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: TimeCyclesPaneView[];
  _options: TimeCyclesOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<TimeCyclesOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new TimeCyclesPaneView(this)];
  }

  /**
   * Get the cycle period in seconds
   */
  getCyclePeriod(): number {
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
   * Set new points
   */
  setPoints(p1: Point, p2: Point): void {
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(p1.price, p2.price);
    this._maxPrice = Math.max(p1.price, p2.price);
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
    this._minPrice = Math.min(this._p1.price, this._p2.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price);
    this.requestUpdate();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<TimeCyclesOptions>): void {
    this._options = {
      ...this._options,
      ...options,
    };
    this.requestUpdate();
  }

  /**
   * Time cycles don't affect autoscale since vertical lines don't have a price range
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
