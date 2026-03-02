import {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  IPrimitiveDataSource,
  ISeriesPrimitive,
  Time,
  CanvasRenderingTarget2D,
  MediaCoordinatesRenderingTarget,
  MediaCoordinate,
  TimePointIndex,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';

/**
 * Point stored in chart coordinates
 */
interface BrushPoint {
  time: Time;
  price: number;
}

/**
 * Point in media coordinates for rendering
 */
interface MediaPoint {
  x: MediaCoordinate;
  y: MediaCoordinate;
}

/**
 * Options for the brush drawing tool
 */
export interface BrushDrawingOptions {
  lineColor: string;
  lineWidth: number;
  smooth: boolean;
}

/**
 * Default options for brush drawing
 */
const DEFAULT_OPTIONS: BrushDrawingOptions = {
  lineColor: '#FF0000',
  lineWidth: 2,
  smooth: true,
};

/**
 * Renderer for the brush stroke on the pane
 */
class BrushPaneRenderer implements IPrimitivePaneRenderer {
  private _points: MediaPoint[];
  private _options: BrushDrawingOptions;

  constructor(points: MediaPoint[], options: BrushDrawingOptions) {
    this._points = points;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D): void {
    if (this._points.length < 1) {
      return;
    }

    // Use media coordinates rendering target for proper scaling
    const mediaTarget = target as unknown as MediaCoordinatesRenderingTarget;
    
    mediaTarget.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const points = this._points;

      if (points.length === 1) {
        // Single point - draw a small circle
        ctx.beginPath();
        ctx.arc(
          points[0].x as number,
          points[0].y as number,
          this._options.lineWidth / 2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = this._options.lineColor;
        ctx.fill();
        return;
      }

      // Set line properties
      ctx.strokeStyle = this._options.lineColor;
      ctx.lineWidth = this._options.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      if (this._options.smooth && points.length > 2) {
        // Draw smooth bezier curve through all points
        this._drawSmoothCurve(ctx, points);
      } else {
        // Draw straight line segments
        this._drawStraightLines(ctx, points);
      }

      ctx.stroke();
    });
  }

  /**
   * Draw smooth bezier curve through all points
   */
  private _drawSmoothCurve(ctx: CanvasRenderingContext2D, points: MediaPoint[]): void {
    if (points.length < 2) return;

    // Move to the first point
    ctx.moveTo(points[0].x as number, points[0].y as number);

    if (points.length === 2) {
      // Just two points - draw a straight line
      ctx.lineTo(points[1].x as number, points[1].y as number);
      return;
    }

    // For smooth curve, use quadratic bezier curves
    // We'll use a simplified approach where we draw through midpoints
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      if (i === 0) {
        // First segment - quadratic curve to midpoint
        const midX = ((current.x as number) + (next.x as number)) / 2;
        const midY = ((current.y as number) + (next.y as number)) / 2;
        ctx.quadraticCurveTo(current.x as number, current.y as number, midX, midY);
      } else if (i === points.length - 2) {
        // Last segment - curve to the end
        const prev = points[i - 1];
        const prevMidX = ((prev.x as number) + (current.x as number)) / 2;
        const prevMidY = ((prev.y as number) + (current.y as number)) / 2;
        ctx.quadraticCurveTo(prevMidX, prevMidY, current.x as number, current.y as number);
        ctx.lineTo(next.x as number, next.y as number);
      } else {
        // Middle segments - smooth curve through the point
        const prev = points[i - 1];
        const prevMidX = ((prev.x as number) + (current.x as number)) / 2;
        const prevMidY = ((prev.y as number) + (current.y as number)) / 2;
        const nextMidX = ((current.x as number) + (next.x as number)) / 2;
        const nextMidY = ((current.y as number) + (next.y as number)) / 2;
        
        ctx.quadraticCurveTo(prevMidX, prevMidY, current.x as number, current.y as number);
        ctx.lineTo(nextMidX, nextMidY);
      }
    }
  }

  /**
   * Draw straight line segments connecting all points
   */
  private _drawStraightLines(ctx: CanvasRenderingContext2D, points: MediaPoint[]): void {
    ctx.moveTo(points[0].x as number, points[0].y as number);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x as number, points[i].y as number);
    }
  }
}

/**
 * Pane view for the brush drawing
 */
class BrushPaneView implements IPrimitivePaneView {
  private _dataSource: BrushDrawing;
  private _renderer: BrushPaneRenderer | null = null;

  constructor(dataSource: BrushDrawing) {
    this._dataSource = dataSource;
  }

  update(): void {
    const points = this._dataSource.points();
    const options = this._dataSource.options();
    const chart = this._dataSource.chart();
    const series = this._dataSource.series();

    if (!chart || !series || points.length < 1) {
      this._renderer = null;
      return;
    }

    // Convert time/price coordinates to media coordinates
    const mediaPoints: MediaPoint[] = [];
    
    for (const point of points) {
      const timeScale = chart.timeScale();
      const timePointIndex = timeScale.timeToCoordinate(point.time);
      const priceCoordinate = series.priceToCoordinate(point.price);

      if (timePointIndex !== null && priceCoordinate !== null) {
        mediaPoints.push({
          x: timePointIndex as MediaCoordinate,
          y: priceCoordinate as MediaCoordinate,
        });
      }
    }

    if (mediaPoints.length < 1) {
      this._renderer = null;
      return;
    }

    this._renderer = new BrushPaneRenderer(mediaPoints, options);
  }

  renderer(): IPrimitivePaneRenderer | null {
    return this._renderer;
  }

  zOrder(): 'bottom' | 'top' | 'normal' {
    return 'top';
  }
}

/**
 * Brush Drawing Tool
 * 
 * Allows freehand drawing on the chart by storing a series of points
 * and drawing a smooth line through them.
 */
export class BrushDrawing extends PluginBase implements ISeriesPrimitive<Time> {
  private _points: BrushPoint[] = [];
  private _options: BrushDrawingOptions;
  private _paneView: BrushPaneView;

  constructor(options: Partial<BrushDrawingOptions> = {}) {
    super();
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._paneView = new BrushPaneView(this);
  }

  /**
   * Get all stored points
   */
  points(): BrushPoint[] {
    return this._points;
  }

  /**
   * Get the current options
   */
  options(): BrushDrawingOptions {
    return this._options;
  }

  /**
   * Set new options
   */
  setOptions(options: Partial<BrushDrawingOptions>): void {
    this._options = { ...this._options, ...options };
    this._requestUpdate();
  }

  /**
   * Add a point to the brush stroke
   */
  addPoint(point: BrushPoint): void {
    this._points.push(point);
    this._requestUpdate();
  }

  /**
   * Set all points at once
   */
  setPoints(points: BrushPoint[]): void {
    this._points = [...points];
    this._requestUpdate();
  }

  /**
   * Clear all points
   */
  clearPoints(): void {
    this._points = [];
    this._requestUpdate();
  }

  /**
   * Remove the last added point
   */
  removeLastPoint(): void {
    if (this._points.length > 0) {
      this._points.pop();
      this._requestUpdate();
    }
  }

  /**
   * Get the number of points
   */
  pointCount(): number {
    return this._points.length;
  }

  /**
   * Check if the brush has any points
   */
  hasPoints(): boolean {
    return this._points.length > 0;
  }

  /**
   * Request an update to re-render
   */
  private _requestUpdate(): void {
    const chart = this.chart();
    if (chart) {
      // Force the chart to re-render
      const data = this._data;
      if (data) {
        data.update();
      }
    }
  }

  // ISeriesPrimitive interface implementation
  
  paneViews(): IPrimitivePaneView[] {
    return [this._paneView];
  }

  /**
   * Update all views
   */
  updateAllViews(): void {
    this._paneView.update();
  }

  /**
   * Get the data source (required by PluginBase)
   */
  protected _data(): IPrimitiveDataSource | null {
    // This will be set by the chart when attached
    return null;
  }
}

/**
 * Factory function to create a brush drawing
 */
export function createBrushDrawing(
  options: Partial<BrushDrawingOptions> = {}
): BrushDrawing {
  return new BrushDrawing(options);
}

/**
 * Helper function to start a brush drawing session
 * Returns functions to add points and finish drawing
 */
export function startBrushDrawing(
  series: any,
  options: Partial<BrushDrawingOptions> = {}
): {
  drawing: BrushDrawing;
  addPoint: (time: Time, price: number) => void;
  clear: () => void;
  finish: () => BrushDrawing;
} {
  const drawing = new BrushDrawing(options);
  
  // Attach to series if it has the attachPrimitive method
  if (series && typeof series.attachPrimitive === 'function') {
    series.attachPrimitive(drawing);
  }

  return {
    drawing,
    addPoint: (time: Time, price: number) => {
      drawing.addPoint({ time, price });
    },
    clear: () => {
      drawing.clearPoints();
    },
    finish: () => {
      return drawing;
    },
  };
}
