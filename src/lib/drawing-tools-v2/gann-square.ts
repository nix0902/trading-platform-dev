/**
 * Gann Square Drawing Tool
 * A technical analysis tool that draws a square with time and price equally scaled,
 * plus diagonal lines from the center to corners and side midpoints, and a grid pattern.
 * 
 * The Gann Square is based on W.D. Gann's concept that price and time must be
 * balanced. The square represents equal units of price and time movement.
 * 
 * Usage:
 * - P1: First corner of the square
 * - P2: Opposite corner of the square (diagonally opposite)
 * - The square is formed with equal time and price units
 * - Lines from center go to corners, side midpoints, and form a grid
 */

import { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  Coordinate,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
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

export interface GannSquareOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLabels: boolean;
  showGrid: boolean;
  showDiagonals: boolean;
  fillColor: string;
  labelFontSize: number;
  labelBackgroundColor: string;
  gridColor: string;
  diagonalColor: string;
}

const defaultOptions: GannSquareOptions = {
  lineColor: '#2962ff',
  lineWidth: 1,
  lineStyle: 'solid',
  showLabels: true,
  showGrid: true,
  showDiagonals: true,
  fillColor: 'rgba(41, 98, 255, 0.05)',
  labelFontSize: 10,
  labelBackgroundColor: '#2962ff',
  gridColor: 'rgba(41, 98, 255, 0.3)',
  diagonalColor: '#2962ff',
};

/**
 * Gann Square Pane Renderer
 * Renders the Gann Square with grid, diagonals, and labels on the chart canvas
 */
class GannSquarePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _options: GannSquareOptions;
  _squarePoints: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
    center: { x: number; y: number };
    side: number; // The side length of the square
  } | null;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    options: GannSquareOptions,
    squarePoints: typeof GannSquarePaneRenderer.prototype._squarePoints
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
    this._squarePoints = squarePoints;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null ||
        !this._squarePoints
      )
        return;

      const ctx = scope.context;
      const horizontalRatio = scope.horizontalPixelRatio;
      const verticalRatio = scope.verticalPixelRatio;

      const { topLeft, topRight, bottomLeft, bottomRight, center, side } = this._squarePoints;

      // Scale all coordinates
      const tlX = Math.round(topLeft.x * horizontalRatio);
      const tlY = Math.round(topLeft.y * verticalRatio);
      const trX = Math.round(topRight.x * horizontalRatio);
      const trY = Math.round(topRight.y * verticalRatio);
      const blX = Math.round(bottomLeft.x * horizontalRatio);
      const blY = Math.round(bottomLeft.y * verticalRatio);
      const brX = Math.round(bottomRight.x * horizontalRatio);
      const brY = Math.round(bottomRight.y * verticalRatio);
      const centerX = Math.round(center.x * horizontalRatio);
      const centerY = Math.round(center.y * verticalRatio);
      const sideScaled = Math.round(side * Math.max(horizontalRatio, verticalRatio));

      // Set line style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw square fill
      ctx.fillStyle = this._options.fillColor;
      ctx.beginPath();
      ctx.moveTo(tlX, tlY);
      ctx.lineTo(trX, trY);
      ctx.lineTo(brX, brY);
      ctx.lineTo(blX, blY);
      ctx.closePath();
      ctx.fill();

      // Draw grid if enabled
      if (this._options.showGrid) {
        this._drawGrid(ctx, tlX, tlY, trX, brY, centerX, centerY, horizontalRatio, verticalRatio);
      }

      // Draw diagonals from center if enabled
      if (this._options.showDiagonals) {
        this._drawDiagonals(ctx, tlX, tlY, trX, trY, blX, blY, brX, brY, centerX, centerY, horizontalRatio);
      }

      // Draw square border
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth * horizontalRatio;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(tlX, tlY);
      ctx.lineTo(trX, trY);
      ctx.lineTo(brX, brY);
      ctx.lineTo(blX, blY);
      ctx.closePath();
      ctx.stroke();

      // Draw labels if enabled
      if (this._options.showLabels) {
        this._drawLabels(ctx, tlX, tlY, trX, trY, blX, blY, brX, brY, centerX, centerY, horizontalRatio, verticalRatio);
      }

      // Draw corner handles
      this._drawHandles(ctx, tlX, tlY, trX, trY, blX, blY, brX, brY, centerX, centerY, horizontalRatio);
    });
  }

  private _drawGrid(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    right: number,
    bottom: number,
    centerX: number,
    centerY: number,
    horizontalRatio: number,
    verticalRatio: number
  ) {
    ctx.strokeStyle = this._options.gridColor;
    ctx.lineWidth = this._options.lineWidth * horizontalRatio * 0.5;

    // Set line style for grid
    if (this._options.lineStyle === 'dashed') {
      ctx.setLineDash([4 * horizontalRatio, 2 * horizontalRatio]);
    } else if (this._options.lineStyle === 'dotted') {
      ctx.setLineDash([1 * horizontalRatio, 2 * horizontalRatio]);
    } else {
      ctx.setLineDash([]);
    }

    const width = right - left;
    const height = bottom - top;

    // Draw vertical grid lines (dividing into thirds, or 8ths for more detail)
    const divisions = 8;
    for (let i = 1; i < divisions; i++) {
      const x = left + (width * i) / divisions;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let i = 1; i < divisions; i++) {
      const y = top + (height * i) / divisions;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // Draw center lines (slightly thicker)
    ctx.lineWidth = this._options.lineWidth * horizontalRatio;
    ctx.strokeStyle = this._options.lineColor;

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(centerX, top);
    ctx.lineTo(centerX, bottom);
    ctx.stroke();

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(left, centerY);
    ctx.lineTo(right, centerY);
    ctx.stroke();
  }

  private _drawDiagonals(
    ctx: CanvasRenderingContext2D,
    tlX: number,
    tlY: number,
    trX: number,
    trY: number,
    blX: number,
    blY: number,
    brX: number,
    brY: number,
    centerX: number,
    centerY: number,
    horizontalRatio: number
  ) {
    ctx.strokeStyle = this._options.diagonalColor;
    ctx.lineWidth = this._options.lineWidth * horizontalRatio;
    ctx.setLineDash([]);

    // Lines from center to all four corners
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(tlX, tlY);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(trX, trY);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(blX, blY);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(brX, brY);
    ctx.stroke();

    // Lines from center to midpoints of all sides
    // Top midpoint
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo((tlX + trX) / 2, tlY);
    ctx.stroke();

    // Bottom midpoint
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo((blX + brX) / 2, blY);
    ctx.stroke();

    // Left midpoint
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(tlX, (tlY + blY) / 2);
    ctx.stroke();

    // Right midpoint
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(trX, (trY + brY) / 2);
    ctx.stroke();

    // Draw main diagonals (corner to corner) with emphasis
    ctx.lineWidth = this._options.lineWidth * horizontalRatio * 1.5;

    // Top-left to bottom-right
    ctx.beginPath();
    ctx.moveTo(tlX, tlY);
    ctx.lineTo(brX, brY);
    ctx.stroke();

    // Top-right to bottom-left
    ctx.beginPath();
    ctx.moveTo(trX, trY);
    ctx.lineTo(blX, blY);
    ctx.stroke();
  }

  private _drawLabels(
    ctx: CanvasRenderingContext2D,
    tlX: number,
    tlY: number,
    trX: number,
    trY: number,
    blX: number,
    blY: number,
    brX: number,
    brY: number,
    centerX: number,
    centerY: number,
    horizontalRatio: number,
    verticalRatio: number
  ) {
    ctx.font = `${this._options.labelFontSize * horizontalRatio}px Arial`;
    ctx.setLineDash([]);

    const labels: { text: string; x: number; y: number; position: 'inside' | 'outside' }[] = [
      { text: 'TL', x: tlX, y: tlY, position: 'outside' },
      { text: 'TR', x: trX, y: trY, position: 'outside' },
      { text: 'BL', x: blX, y: blY, position: 'outside' },
      { text: 'BR', x: brX, y: brY, position: 'outside' },
      { text: 'C', x: centerX, y: centerY, position: 'inside' },
      { text: 'T', x: (tlX + trX) / 2, y: tlY, position: 'outside' },
      { text: 'B', x: (blX + brX) / 2, y: blY, position: 'outside' },
      { text: 'L', x: tlX, y: (tlY + blY) / 2, position: 'outside' },
      { text: 'R', x: trX, y: (trY + brY) / 2, position: 'outside' },
    ];

    for (const label of labels) {
      this._drawLabel(ctx, label.text, label.x, label.y, horizontalRatio, verticalRatio, label.position);
    }
  }

  private _drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    horizontalRatio: number,
    verticalRatio: number,
    position: 'inside' | 'outside'
  ) {
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width + 6 * horizontalRatio;
    const textHeight = this._options.labelFontSize * verticalRatio + 4 * verticalRatio;

    let labelX = x - textWidth / 2;
    let labelY = y - textHeight / 2;

    // Adjust position based on whether label is inside or outside the square
    if (position === 'outside') {
      // Offset labels slightly outside the corners/edges
      if (text === 'TL') {
        labelX = x - textWidth - 2 * horizontalRatio;
        labelY = y - textHeight - 2 * verticalRatio;
      } else if (text === 'TR') {
        labelX = x + 2 * horizontalRatio;
        labelY = y - textHeight - 2 * verticalRatio;
      } else if (text === 'BL') {
        labelX = x - textWidth - 2 * horizontalRatio;
        labelY = y + 2 * verticalRatio;
      } else if (text === 'BR') {
        labelX = x + 2 * horizontalRatio;
        labelY = y + 2 * verticalRatio;
      } else if (text === 'T') {
        labelY = y - textHeight - 4 * verticalRatio;
      } else if (text === 'B') {
        labelY = y + 4 * verticalRatio;
      } else if (text === 'L') {
        labelX = x - textWidth - 4 * horizontalRatio;
      } else if (text === 'R') {
        labelX = x + 4 * horizontalRatio;
      }
    }

    // Draw label background
    ctx.fillStyle = this._options.labelBackgroundColor;
    ctx.fillRect(labelX, labelY, textWidth, textHeight);

    // Draw label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, labelX + 3 * horizontalRatio, labelY + textHeight - 3 * verticalRatio);
  }

  private _drawHandles(
    ctx: CanvasRenderingContext2D,
    tlX: number,
    tlY: number,
    trX: number,
    trY: number,
    blX: number,
    blY: number,
    brX: number,
    brY: number,
    centerX: number,
    centerY: number,
    horizontalRatio: number
  ) {
    const handleRadius = 4 * horizontalRatio;
    ctx.setLineDash([]);

    // Draw corner handles
    const corners = [
      { x: tlX, y: tlY },
      { x: trX, y: trY },
      { x: blX, y: blY },
      { x: brX, y: brY },
    ];

    ctx.fillStyle = this._options.lineColor;
    for (const corner of corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this._options.lineColor;
    }

    // Draw center handle (slightly larger)
    const centerHandleRadius = 5 * horizontalRatio;
    ctx.fillStyle = this._options.lineColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerHandleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerHandleRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Gann Square Pane View
 * Calculates coordinates and provides the renderer
 */
class GannSquarePaneView implements IPrimitivePaneView {
  _source: GannSquareDrawing;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };
  _squarePoints: typeof GannSquarePaneRenderer.prototype._squarePoints = null;

  constructor(source: GannSquareDrawing) {
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

    // Calculate square points
    if (
      this._p1.x !== null &&
      this._p1.y !== null &&
      this._p2.x !== null &&
      this._p2.y !== null
    ) {
      this._squarePoints = this._calculateSquarePoints(this._p1, this._p2);
    } else {
      this._squarePoints = null;
    }
  }

  private _calculateSquarePoints(p1: ViewPoint, p2: ViewPoint) {
    if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
      return null;
    }

    // Calculate the center point between p1 and p2
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;

    // Calculate the half-diagonal (distance from center to a corner)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const halfDiagonal = Math.sqrt(dx * dx + dy * dy) / 2;

    // For a Gann Square, we want equal time and price scaling
    // The side length of the square equals halfDiagonal * sqrt(2)
    const side = halfDiagonal * Math.sqrt(2);

    // Calculate the angle of the diagonal
    const angle = Math.atan2(dy, dx);

    // Calculate the four corners of the square
    // The corners are at 45-degree offsets from the diagonal
    const halfSide = side / 2;

    // Top-left corner
    const topLeft = {
      x: centerX - halfSide,
      y: centerY - halfSide,
    };

    // Top-right corner
    const topRight = {
      x: centerX + halfSide,
      y: centerY - halfSide,
    };

    // Bottom-left corner
    const bottomLeft = {
      x: centerX - halfSide,
      y: centerY + halfSide,
    };

    // Bottom-right corner
    const bottomRight = {
      x: centerX + halfSide,
      y: centerY + halfSide,
    };

    return {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      center: { x: centerX, y: centerY },
      side,
    };
  }

  renderer() {
    return new GannSquarePaneRenderer(this._p1, this._p2, this._source._options, this._squarePoints);
  }
}

/**
 * Gann Square Drawing
 * Main class that extends PluginBase and manages the drawing
 */
export class GannSquareDrawing extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: GannSquarePaneView[];
  _options: GannSquareOptions;

  constructor(p1: Point, p2: Point, options?: Partial<GannSquareOptions>) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = { ...defaultOptions, ...options };
    this._paneViews = [new GannSquarePaneView(this)];
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
  setOptions(options: Partial<GannSquareOptions>) {
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
    }
    this.requestUpdate();
  }

  /**
   * Get the first point (P1)
   */
  getPoint1(): Point {
    return this._p1;
  }

  /**
   * Get the second point (P2)
   */
  getPoint2(): Point {
    return this._p2;
  }

  /**
   * Get the center of the square (time and price)
   */
  getCenter(): { time: Time; price: number } {
    // Average the times (convert to numbers if they are numbers)
    const t1 = typeof this._p1.time === 'number' ? this._p1.time : 0;
    const t2 = typeof this._p2.time === 'number' ? this._p2.time : 0;
    const centerTime = (t1 + t2) / 2;

    const centerPrice = (this._p1.price + this._p2.price) / 2;

    return { time: centerTime as Time, price: centerPrice };
  }
}
