/**
 * Diverging Channel Drawing Tool
 * Creates two lines that diverge from a common apex point.
 * 
 * Usage:
 * - P1: The apex point (common starting point for both lines)
 * - P2: Defines the direction of the upper line
 * - P3: Defines the direction of the lower line
 * - Both lines extend from P1 to the right edge of the chart
 * - The area between the lines can be optionally filled
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
  y: Coordinate | null;
}

interface Point {
  time: Time;
  price: number;
}

export interface DivergingChannelOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string;
  showLabels: boolean;
}

const defaultOptions: DivergingChannelOptions = {
  lineColor: '#2962ff',
  lineWidth: 2,
  lineStyle: 'solid',
  fillColor: 'rgba(41, 98, 255, 0.1)',
  showLabels: true,
};

/**
 * Gets the line dash pattern based on line style
 */
function getLineDash(style: DivergingChannelOptions['lineStyle'], pixelRatio: number): number[] {
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
 * Diverging Channel Pane Renderer
 * Renders the diverging channel lines on the chart canvas
 */
class DivergingChannelPaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _p3: ViewPoint;
  _chartWidth: number;
  _chartHeight: number;
  _options: DivergingChannelOptions;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    p3: ViewPoint,
    chartWidth: number,
    chartHeight: number,
    options: DivergingChannelOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._chartWidth = chartWidth;
    this._chartHeight = chartHeight;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null ||
        this._p3.x === null ||
        this._p3.y === null
      )
        return;

      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      // Scale coordinates to bitmap space
      const x1 = this._p1.x * hRatio;
      const y1 = this._p1.y * vRatio;
      const x2 = this._p2.x * hRatio;
      const y2 = this._p2.y * vRatio;
      const x3 = this._p3.x * hRatio;
      const y3 = this._p3.y * vRatio;

      const chartWidthScaled = this._chartWidth * hRatio;
      const chartHeightScaled = this._chartHeight * vRatio;

      // Calculate extension points for both lines
      // Upper line: extend from P1 through P2 to the right edge
      const dxUpper = x2 - x1;
      const dyUpper = y2 - y1;

      // Lower line: extend from P1 through P3 to the right edge
      const dxLower = x3 - x1;
      const dyLower = y3 - y1;

      // Calculate where the extended lines intersect the right edge
      let upperEndX = chartWidthScaled;
      let upperEndY = y1;
      let lowerEndX = chartWidthScaled;
      let lowerEndY = y1;

      // Calculate upper line extension
      if (dxUpper > 0) {
        // Line goes to the right
        const t = (chartWidthScaled - x1) / dxUpper;
        upperEndY = y1 + dyUpper * t;
      } else if (dxUpper < 0) {
        // Line goes to the left, extend backward (mirror)
        const t = (x1) / Math.abs(dxUpper);
        upperEndX = chartWidthScaled;
        upperEndY = y1 - dyUpper * t;
      }

      // Calculate lower line extension
      if (dxLower > 0) {
        // Line goes to the right
        const t = (chartWidthScaled - x1) / dxLower;
        lowerEndY = y1 + dyLower * t;
      } else if (dxLower < 0) {
        // Line goes to the left, extend backward (mirror)
        const t = (x1) / Math.abs(dxLower);
        lowerEndX = chartWidthScaled;
        lowerEndY = y1 - dyLower * t;
      }

      // Clip Y coordinates to chart boundaries
      upperEndY = Math.max(0, Math.min(chartHeightScaled, upperEndY));
      lowerEndY = Math.max(0, Math.min(chartHeightScaled, lowerEndY));

      // Fill the area between the lines
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(upperEndX, upperEndY);
      ctx.lineTo(lowerEndX, lowerEndY);
      ctx.closePath();
      ctx.fill();

      // Set line style
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * hRatio;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(getLineDash(this._options.lineStyle, hRatio));

      // Draw upper line (P1 to extended P2)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(upperEndX, upperEndY);
      ctx.stroke();

      // Draw lower line (P1 to extended P3)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(lowerEndX, lowerEndY);
      ctx.stroke();

      // Reset line dash
      ctx.setLineDash([]);

      // Draw handles at the three points
      const handleRadius = 6 * hRatio;
      const innerHandleRadius = 3 * hRatio;

      // Draw outer circles
      ctx.fillStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x3, y3, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw inner white circle for apex (P1)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x1, y1, innerHandleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw labels if enabled
      if (this._options.showLabels) {
        ctx.font = `${Math.round(10 * hRatio)}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Upper line label
        const upperLabelY = Math.max(14 * vRatio, Math.min(chartHeightScaled - 14 * vRatio, upperEndY));
        ctx.fillStyle = this._options.lineColor;
        ctx.fillText('Upper', upperEndX - 40 * hRatio, upperLabelY);

        // Lower line label
        const lowerLabelY = Math.max(14 * vRatio, Math.min(chartHeightScaled - 14 * vRatio, lowerEndY));
        ctx.fillText('Lower', lowerEndX - 40 * hRatio, lowerLabelY);
      }
    });
  }
}

/**
 * Diverging Channel Pane View
 * Calculates coordinates and provides the renderer
 */
class DivergingChannelPaneView implements IPrimitivePaneView {
  _source: DivergingChannelDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _p3: ViewPoint = { x: null, y: null };
  _chartWidth: number = 800;
  _chartHeight: number = 600;

  constructor(source: DivergingChannelDrawing) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const chart = this._source.chart;
    const timeScale = chart.timeScale();

    // Convert points to view coordinates
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

    // Get chart width from visible range
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rightX = timeScale.logicalToCoordinate(visibleRange.to);
      if (rightX !== null) {
        this._chartWidth = rightX + 100; // Extra padding for labels
      }
    }

    // Get approximate chart height from price scale
    const priceScale = chart.priceScale('right');
    if (priceScale) {
      // Use a reasonable default height estimate
      this._chartHeight = 600;
    }
  }

  renderer() {
    return new DivergingChannelPaneRenderer(
      this._p1,
      this._p2,
      this._p3,
      this._chartWidth,
      this._chartHeight,
      this._source._options
    );
  }
}

/**
 * Diverging Channel Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class DivergingChannelDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _p3: Point;
  _paneViews: DivergingChannelPaneView[];
  _options: DivergingChannelOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    p3: Point,
    options?: Partial<DivergingChannelOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._p3 = p3;
    this._minPrice = Math.min(p1.price, p2.price, p3.price);
    this._maxPrice = Math.max(p1.price, p2.price, p3.price);
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new DivergingChannelPaneView(this)];
  }

  /**
   * Provides autoscale information for the chart
   * Ensures the diverging channel is visible when autoscaling
   */
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

    // Expand price range to account for extended lines
    const priceRange = this._maxPrice - this._minPrice;
    const expandedMin = this._minPrice - priceRange * 0.3;
    const expandedMax = this._maxPrice + priceRange * 0.3;

    return {
      priceRange: {
        minValue: expandedMin,
        maxValue: expandedMax,
      },
    };
  }

  /**
   * Updates all view objects
   */
  updateAllViews() {
    this._paneViews.forEach((v) => v.update());
  }

  /**
   * Returns the pane views for rendering
   */
  paneViews() {
    return this._paneViews;
  }

  /**
   * Set new options
   */
  setOptions(options: Partial<DivergingChannelOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  /**
   * Move a point to a new position
   */
  movePoint(pointIndex: number, newPoint: Point) {
    if (pointIndex === 0) {
      this._p1 = newPoint;
    } else if (pointIndex === 1) {
      this._p2 = newPoint;
    } else if (pointIndex === 2) {
      this._p3 = newPoint;
    }
    this._minPrice = Math.min(this._p1.price, this._p2.price, this._p3.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price, this._p3.price);
    this.requestUpdate();
  }

  /**
   * Get the apex point (P1)
   */
  getApexPoint(): Point {
    return this._p1;
  }

  /**
   * Get the upper line defining point (P2)
   */
  getUpperPoint(): Point {
    return this._p2;
  }

  /**
   * Get the lower line defining point (P3)
   */
  getLowerPoint(): Point {
    return this._p3;
  }

  /**
   * Get all three points
   */
  getPoints(): [Point, Point, Point] {
    return [this._p1, this._p2, this._p3];
  }
}
