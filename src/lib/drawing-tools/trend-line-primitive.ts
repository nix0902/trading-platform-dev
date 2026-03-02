/**
 * Trend Line Drawing Tool for lightweight-charts v5
 * Using the official Primitives API
 * 
 * Based on: https://tradingview.github.io/lightweight-charts/docs/next/plugins/intro
 */

import type {
  IChartApi,
  ISeriesApi,
  Time,
  SeriesType,
  SeriesOptions,
  SeriesDefinition,
  WhitespaceData,
  Primitive,
  SeriesAttachedParameter,
  DataItem,
} from "lightweight-charts";

export interface TrendLineData {
  time: Time;
  price: number;
}

export interface TrendLineOptions {
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 0 | 1 | 2 | 3 | 4;
}

const defaultOptions: TrendLineOptions = {
  lineColor: "#2962ff",
  lineWidth: 2,
  lineStyle: 0, // Solid
};

class TrendLineRendererData {
  public p1: TrendLineData | null = null;
  public p2: TrendLineData | null = null;
  public options: TrendLineOptions = defaultOptions;

  public isValid(): boolean {
    return this.p1 !== null && this.p2 !== null;
  }
}

interface TrendLineViewData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

class TrendLinePrimitive implements Primitive {
  private _data: TrendLineRendererData = new TrendLineRendererData();
  private _chart: IChartApi | null = null;
  private _series: ISeriesApi<SeriesType> | null = null;
  private _requestUpdate: () => void = () => {};

  private _isDrawing: boolean = false;
  private _currentPoint: TrendLineData | null = null;
  private _finished: boolean = false;
  private _pane: any = null;

  constructor(options?: TrendLineOptions) {
    this._data.options = { ...defaultOptions, ...options };
  }

  public setPoint1(data: TrendLineData): void {
    this._data.p1 = data;
    this._requestUpdate();
  }

  public setPoint2(data: TrendLineData): void {
    this._data.p2 = data;
    this._finished = true;
    this._requestUpdate();
  }

  public updateCurrentPoint(data: TrendLineData): void {
    this._currentPoint = data;
    this._requestUpdate();
  }

  public isFinished(): boolean {
    return this._finished;
  }

  public isDrawing(): boolean {
    return this._isDrawing;
  }

  public startDrawing(): void {
    this._isDrawing = true;
    this._finished = false;
    this._data.p1 = null;
    this._data.p2 = null;
    this._currentPoint = null;
  }

  public stopDrawing(): void {
    this._isDrawing = false;
  }

  // Primitive interface methods
  public updateAllViews(): void {
    // No views to update
  }

  public paneViews() {
    return [new TrendLinePaneView(this._data, this._chart, this._series, this._currentPoint)];
  }

  public attached(param: SeriesAttachedParameter): void {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  public detached(): void {
    this._chart = null;
    this._series = null;
  }

  public setData(data: TrendLineData[]): void {
    if (data.length >= 1) {
    this._data.p1 = data[0];
    }
    if (data.length >= 2) {
    this._data.p2 = data[1];
    }
    this._requestUpdate();
  }
}

class TrendLinePaneView {
  private _data: TrendLineRendererData;
  private _chart: IChartApi | null;
  private _series: ISeriesApi<SeriesType> | null;
  private _currentPoint: TrendLineData | null;

  constructor(
    data: TrendLineRendererData,
    chart: IChartApi | null,
    series: ISeriesApi<SeriesType> | null,
    currentPoint: TrendLineData | null
  ) {
    this._data = data;
    this._chart = chart;
    this._series = series;
    this._currentPoint = currentPoint;
  }

  public renderer() {
    return new TrendLineRenderer(this._data, this._chart, this._series, this._currentPoint);
  }

  public zOrder(): number {
    return 2;
  }
}

class TrendLineRenderer {
  private _data: TrendLineRendererData;
  private _chart: IChartApi | null;
  private _series: ISeriesApi<SeriesType> | null;
  private _currentPoint: TrendLineData | null;

  constructor(
    data: TrendLineRendererData,
    chart: IChartApi | null,
    series: ISeriesApi<SeriesType> | null,
    currentPoint: TrendLineData | null
  ) {
    this._data = data;
    this._chart = chart;
    this._series = series;
    this._currentPoint = currentPoint;
  }

  public draw(target: CanvasRenderingContext2D): void {
    if (!this._chart || !this._series) return;

    const timeScale = this._chart.timeScale();
    const priceScale = this._chart.priceScale("right");

    if (!priceScale) return;

    let p1 = this._data.p1;
    let p2 = this._data.p2;

    // If drawing, use current point as second point
    if (!p2 && this._currentPoint) {
      p2 = this._currentPoint;
    }

    if (!p1) return;

    const x1 = timeScale.timeToCoordinate(p1.time);
    const y1 = priceScale.priceToCoordinate(p1.price);

    if (x1 === null || y1 === null) return;

    if (!p2) {
      // Draw only the first point
      target.beginPath();
      target.arc(x1, y1, 5, 0, 2 * Math.PI);
      target.fillStyle = this._data.options.lineColor || "#2962ff";
      target.fill();
      return;
    }

    const x2 = timeScale.timeToCoordinate(p2.time);
    const y2 = priceScale.priceToCoordinate(p2.price);

    if (x2 === null || y2 === null) return;

    // Draw line
    target.beginPath();
    target.moveTo(x1, y1);
    target.lineTo(x2, y2);
    target.strokeStyle = this._data.options.lineColor || "#2962ff";
    target.lineWidth = this._data.options.lineWidth || 2;

    // Line style
    if (this._data.options.lineStyle === 1) {
      target.setLineDash([4, 4]);
    } else if (this._data.options.lineStyle === 2) {
      target.setLineDash([2, 2]);
    } else if (this._data.options.lineStyle === 3) {
      target.setLineDash([8, 4, 2, 4]);
    } else {
      target.setLineDash([]);
    }

    target.stroke();
    target.setLineDash([]); // Reset

    // Draw endpoints
    target.beginPath();
    target.arc(x1, y1, 4, 0, 2 * Math.PI);
    target.fillStyle = this._data.options.lineColor || "#2962ff";
    target.fill();

    target.beginPath();
    target.arc(x2, y2, 4, 0, 2 * Math.PI);
    target.fillStyle = this._data.options.lineColor || "#2962ff";
    target.fill();
  }
}

// Manager for drawing interactions
export class TrendLineManager {
  private _chart: IChartApi;
  private _series: ISeriesApi<SeriesType>;
  private _primitive: TrendLinePrimitive | null = null;
  private _lines: TrendLinePrimitive[] = [];
  private _isDrawing: boolean = false;
  private _clickHandler: ((e: MouseEvent) => void) | null = null;
  private _moveHandler: ((e: MouseEvent) => void) | null = null;

  constructor(chart: IChartApi, series: ISeriesApi<SeriesType>) {
    this._chart = chart;
    this._series = series;
  }

  public startDrawing(options?: TrendLineOptions): void {
    if (this._isDrawing) return;

    this._isDrawing = true;
    this._primitive = new TrendLinePrimitive(options);
    this._series.attachPrimitive(this._primitive);

    const container = (this._chart as any)._internal._container as HTMLElement;

    this._clickHandler = (e: MouseEvent) => this._handleClick(e);
    this._moveHandler = (e: MouseEvent) => this._handleMove(e);

    container.addEventListener("click", this._clickHandler);
    container.addEventListener("mousemove", this._moveHandler);
    container.style.cursor = "crosshair";
  }

  public stopDrawing(): void {
    this._isDrawing = false;
    const container = (this._chart as any)._internal?._container as HTMLElement;

    if (this._clickHandler && container) {
      container.removeEventListener("click", this._clickHandler);
    }
    if (this._moveHandler && container) {
      container.removeEventListener("mousemove", this._moveHandler);
    }

    // Save finished line
    if (this._primitive && this._primitive.isFinished()) {
      this._lines.push(this._primitive);
    } else if (this._primitive) {
      // Remove unfinished line
      this._series.detachPrimitive(this._primitive);
    }

    this._primitive = null;

    if (container) {
      container.style.cursor = "default";
    }
  }

  private _handleClick(e: MouseEvent): void {
    if (!this._primitive) return;

    const container = (this._chart as any)._internal._container as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeScale = this._chart.timeScale();
    const priceScale = this._chart.priceScale("right");

    if (!priceScale) return;

    const time = timeScale.coordinateToTime(x);
    const price = priceScale.coordinateToPrice(y);

    if (time === null || price === null) return;

    const point: TrendLineData = { time, price };

    if (!this._primitive.isDrawing()) {
      this._primitive.startDrawing();
      this._primitive.setPoint1(point);
    } else if (!this._primitive.isFinished()) {
      this._primitive.setPoint2(point);
      // Finish this line and start a new one
      const finishedPrimitive = this._primitive;
      const options = finishedPrimitive["_data"].options;
      
      // Start a new primitive for the next line
      this._primitive = new TrendLinePrimitive(options);
      this._series.attachPrimitive(this._primitive);
    }
  }

  private _handleMove(e: MouseEvent): void {
    if (!this._primitive || !this._primitive.isDrawing()) return;

    const container = (this._chart as any)._internal._container as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeScale = this._chart.timeScale();
    const priceScale = this._chart.priceScale("right");

    if (!priceScale) return;

    const time = timeScale.coordinateToTime(x);
    const price = priceScale.coordinateToPrice(y);

    if (time === null || price === null) return;

    this._primitive.updateCurrentPoint({ time, price });
  }

  public clearAll(): void {
    for (const line of this._lines) {
      this._series.detachPrimitive(line);
    }
    this._lines = [];
    if (this._primitive) {
      this._series.detachPrimitive(this._primitive);
      this._primitive = null;
    }
    this._isDrawing = false;
  }

  public destroy(): void {
    this.stopDrawing();
    this.clearAll();
  }
}

export { TrendLinePrimitive };
