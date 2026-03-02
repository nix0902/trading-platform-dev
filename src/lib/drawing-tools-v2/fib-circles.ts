import {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitive,
  ISeriesPrimitivePaneView,
  SeriesAttachedParameter,
  Time,
  CanvasRenderingTarget2D,
  MediaCoordinatesRenderingTarget,
} from 'lightweight-charts';
import { PluginBase } from './plugin-base';
import { DrawingToolOptions, ViewPoint } from './types';
import { DefaultOptions } from './constants';

/**
 * Fibonacci levels for the circles
 */
const FIB_LEVELS = [
  { level: 0, label: '0%' },
  { level: 0.236, label: '23.6%' },
  { level: 0.382, label: '38.2%' },
  { level: 0.5, label: '50%' },
  { level: 0.618, label: '61.8%' },
  { level: 0.786, label: '78.6%' },
  { level: 1, label: '100%' },
  { level: 1.272, label: '127.2%' },
  { level: 1.618, label: '161.8%' },
];

/**
 * Options specific to Fibonacci Circles
 */
export interface FibCirclesOptions extends DrawingToolOptions {
  showLabels: boolean;
}

/**
 * Default Fibonacci Circles options
 */
const defaultFibCirclesOptions: FibCirclesOptions = {
  lineColor: DefaultOptions.lineColor,
  lineWidth: DefaultOptions.lineWidth,
  lineStyle: DefaultOptions.lineStyle,
  showLabels: true,
};

/**
 * Renderer for Fibonacci Circles in the pane
 */
class FibCirclesPaneRenderer implements IPrimitivePaneRenderer {
  private _centerPoint: ViewPoint | null = null;
  private _radiusPoint: ViewPoint | null = null;
  private _options: FibCirclesOptions;
  private _baseRadius: number = 0;

  constructor(options: FibCirclesOptions) {
    this._options = options;
  }

  /**
   * Set the center point in view coordinates
   */
  setCenterPoint(point: ViewPoint | null): void {
    this._centerPoint = point;
    this._updateBaseRadius();
  }

  /**
   * Set the radius-defining point in view coordinates
   */
  setRadiusPoint(point: ViewPoint | null): void {
    this._radiusPoint = point;
    this._updateBaseRadius();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<FibCirclesOptions>): void {
    this._options = { ...this._options, ...options };
  }

  /**
   * Calculate base radius from center and radius point
   */
  private _updateBaseRadius(): void {
    if (this._centerPoint && this._radiusPoint) {
      const dx = this._radiusPoint.x - this._centerPoint.x;
      const dy = this._radiusPoint.y - this._centerPoint.y;
      this._baseRadius = Math.sqrt(dx * dx + dy * dy);
    } else {
      this._baseRadius = 0;
    }
  }

  /**
   * Draw the Fibonacci circles
   */
  draw(target: CanvasRenderingTarget2D): void {
    if (!this._centerPoint || this._baseRadius <= 0) {
      return;
    }

    target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingTarget) => {
      const ctx = scope.context;
      const centerX = this._centerPoint!.x;
      const centerY = this._centerPoint!.y;

      // Draw each Fibonacci level circle
      for (const fibLevel of FIB_LEVELS) {
        const radius = this._baseRadius * fibLevel.level;
        
        if (radius <= 0) continue;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this._options.lineColor;
        ctx.lineWidth = this._options.lineWidth;
        
        // Apply line style
        this._applyLineStyle(ctx);
        
        ctx.stroke();

        // Draw label if enabled
        if (this._options.showLabels && radius > 10) {
          this._drawLabel(ctx, centerX, centerY, radius, fibLevel.label);
        }
      }

      // Draw center point marker
      this._drawCenterMarker(ctx, centerX, centerY);
    });
  }

  /**
   * Apply line style to context
   */
  private _applyLineStyle(ctx: CanvasRenderingContext2D): void {
    switch (this._options.lineStyle) {
      case 1: // Dashed
        ctx.setLineDash([6, 4]);
        break;
      case 2: // Dotted
        ctx.setLineDash([2, 2]);
        break;
      default: // Solid
        ctx.setLineDash([]);
        break;
    }
  }

  /**
   * Draw a label at the top of the circle
   */
  private _drawLabel(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    label: string
  ): void {
    const labelX = centerX;
    const labelY = centerY - radius - 8;

    ctx.save();
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = this._options.lineColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Draw background for better readability
    const textMetrics = ctx.measureText(label);
    const padding = 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(
      labelX - textMetrics.width / 2 - padding,
      labelY - 11,
      textMetrics.width + padding * 2,
      13
    );
    
    // Draw text
    ctx.fillStyle = this._options.lineColor;
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }

  /**
   * Draw a small marker at the center point
   */
  private _drawCenterMarker(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number
  ): void {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = this._options.lineColor;
    ctx.fill();
    
    // Draw a small cross
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY);
    ctx.lineTo(centerX + 6, centerY);
    ctx.moveTo(centerX, centerY - 6);
    ctx.lineTo(centerX, centerY + 6);
    ctx.strokeStyle = this._options.lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();
  }
}

/**
 * Pane view for Fibonacci Circles
 */
class FibCirclesPaneView implements IPrimitivePaneView {
  private _renderer: FibCirclesPaneRenderer;
  private _centerPoint: ViewPoint | null = null;
  private _radiusPoint: ViewPoint | null = null;

  constructor(options: FibCirclesOptions) {
    this._renderer = new FibCirclesPaneRenderer(options);
  }

  /**
   * Set the center point in view coordinates
   */
  setCenterPoint(point: ViewPoint | null): void {
    this._centerPoint = point;
    this._renderer.setCenterPoint(point);
  }

  /**
   * Set the radius-defining point in view coordinates
   */
  setRadiusPoint(point: ViewPoint | null): void {
    this._radiusPoint = point;
    this._renderer.setRadiusPoint(point);
  }

  /**
   * Update renderer options
   */
  setOptions(options: Partial<FibCirclesOptions>): void {
    this._renderer.setOptions(options);
  }

  /**
   * Return the renderer
   */
  renderer(): IPrimitivePaneRenderer | null {
    if (!this._centerPoint || !this._radiusPoint) {
      return null;
    }
    return this._renderer;
  }

  /**
   * Check if the view is visible
   */
  visible(): boolean {
    return this._centerPoint !== null && this._radiusPoint !== null;
  }

  /**
   * Z-index for rendering order
   */
  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
  }
}

/**
 * Fibonacci Circles Drawing Tool
 * 
 * Draws concentric circles at Fibonacci levels from a center point.
 * Requires 2 points:
 * 1. Center point - the center of all circles
 * 2. Radius point - defines the base radius (100% level)
 */
export class FibCirclesDrawing extends PluginBase implements ISeriesPrimitive<Time> {
  private _options: FibCirclesOptions;
  private _paneView: FibCirclesPaneView;
  private _centerPoint: ViewPoint | null = null;
  private _radiusPoint: ViewPoint | null = null;

  constructor(options: Partial<FibCirclesOptions> = {}) {
    super();
    this._options = { ...defaultFibCirclesOptions, ...options };
    this._paneView = new FibCirclesPaneView(this._options);
  }

  /**
   * Number of required points for this drawing tool
   */
  static readonly requiredPoints = 2;

  /**
   * Get the number of required points
   */
  get requiredPoints(): number {
    return FibCirclesDrawing.requiredPoints;
  }

  /**
   * Update the drawing with new point data
   * @param points - Array of points [center, radius]
   */
  updatePoints(points: ViewPoint[]): void {
    if (points.length >= 1) {
      this._centerPoint = points[0];
      this._paneView.setCenterPoint(points[0]);
    }
    if (points.length >= 2) {
      this._radiusPoint = points[1];
      this._paneView.setRadiusPoint(points[1]);
    }
  }

  /**
   * Set the center point
   */
  setCenterPoint(point: ViewPoint): void {
    this._centerPoint = point;
    this._paneView.setCenterPoint(point);
  }

  /**
   * Set the radius-defining point
   */
  setRadiusPoint(point: ViewPoint): void {
    this._radiusPoint = point;
    this._paneView.setRadiusPoint(point);
  }

  /**
   * Update options
   */
  setOptions(options: Partial<FibCirclesOptions>): void {
    this._options = { ...this._options, ...options };
    this._paneView.setOptions(options);
  }

  /**
   * Get current options
   */
  getOptions(): FibCirclesOptions {
    return { ...this._options };
  }

  /**
   * Get the center point
   */
  getCenterPoint(): ViewPoint | null {
    return this._centerPoint;
  }

  /**
   * Get the radius point
   */
  getRadiusPoint(): ViewPoint | null {
    return this._radiusPoint;
  }

  /**
   * Calculate the base radius
   */
  getBaseRadius(): number {
    if (!this._centerPoint || !this._radiusPoint) {
      return 0;
    }
    const dx = this._radiusPoint.x - this._centerPoint.x;
    const dy = this._radiusPoint.y - this._centerPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get all Fibonacci level radii
   */
  getFibLevels(): Array<{ level: number; label: string; radius: number }> {
    const baseRadius = this.getBaseRadius();
    return FIB_LEVELS.map(fib => ({
      ...fib,
      radius: baseRadius * fib.level,
    }));
  }

  /**
   * Check if the drawing is complete (has all required points)
   */
  isComplete(): boolean {
    return this._centerPoint !== null && this._radiusPoint !== null;
  }

  /**
   * Called when attached to a series
   */
  attached(param: SeriesAttachedParameter<Time>): void {
    super.attached(param);
  }

  /**
   * Called when detached from a series
   */
  detached(): void {
    super.detached();
  }

  /**
   * Get all pane views for rendering
   */
  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }

  /**
   * Update the primitive
   */
  updateAllViews(): void {
    // Views are updated through setCenterPoint/setRadiusPoint
  }

  /**
   * Clear all points
   */
  clear(): void {
    this._centerPoint = null;
    this._radiusPoint = null;
    this._paneView.setCenterPoint(null);
    this._paneView.setRadiusPoint(null);
  }

  /**
   * Auto-fill options from another drawing or defaults
   */
  autoFillOptions(options: Partial<FibCirclesOptions>): void {
    this.setOptions(options);
  }
}

export default FibCirclesDrawing;
