/**
 * Drawing Tools for lightweight-charts
 * 
 * This module provides custom drawing tools that work with lightweight-charts v5.
 * Drawings are rendered as SVG overlays on top of the chart.
 * 
 * @see https://tradingview.github.io/lightweight-charts/docs/api
 */

import type { IChartApi, Time } from "lightweight-charts";

// Types
export interface Point {
  time: number;
  price: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export type DrawingType = 
  | "trend_line" 
  | "horizontal_line" 
  | "vertical_line" 
  | "rectangle" 
  | "fibonacci"
  | "text";

export interface Drawing {
  id: string;
  type: DrawingType;
  points: Point[];
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  selected?: boolean;
  text?: string;
}

export type DrawingTool = DrawingType | "cursor" | "crosshair";

// Constants
const DRAWING_COLORS = [
  "#2962ff", // Blue
  "#26a69a", // Green
  "#ef5350", // Red
  "#ff9800", // Orange
  "#9c27b0", // Purple
  "#00bcd4", // Cyan
  "#ffeb3b", // Yellow
  "#ffffff", // White
];

// Helper functions
function generateId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function pointToScreen(
  chart: IChartApi,
  point: Point
): ScreenPoint | null {
  try {
    const timeScale = chart.timeScale();
    const priceScale = chart.priceScale("right");
    
    if (!priceScale) return null;
    
    const time = point.time as Time;
    const x = timeScale.timeToCoordinate(time);
    const y = priceScale.priceToCoordinate(point.price);
    
    if (x === null || y === null) return null;
    
    return { x, y };
  } catch (error) {
    console.error("pointToScreen error:", error);
    return null;
  }
}

function screenToPoint(
  chart: IChartApi,
  screenPoint: ScreenPoint
): Point | null {
  try {
    const timeScale = chart.timeScale();
    const priceScale = chart.priceScale("right");
    
    if (!priceScale) return null;
    
    const time = timeScale.coordinateToTime(screenPoint.x);
    const price = priceScale.coordinateToPrice(screenPoint.y);
    
    if (time === null || price === null) return null;
    
    return {
      time: typeof time === 'number' ? time : (time as unknown as number),
      price,
    };
  } catch (error) {
    console.error("screenToPoint error:", error);
    return null;
  }
}

// Drawing Renderer - renders drawings as SVG elements
export class DrawingRenderer {
  private svg: SVGSVGElement | null = null;
  private wrapper: HTMLDivElement | null = null;
  private chart: IChartApi;
  private drawings: Drawing[] = [];
  private selectedId: string | null = null;

  constructor(container: HTMLElement, chart: IChartApi) {
    this.chart = chart;
    this.createSvgOverlay(container);
  }

  private createSvgOverlay(container: HTMLElement): void {
    // Create wrapper div for SVG
    this.wrapper = document.createElement("div");
    this.wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      overflow: visible;
    `;
    
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    `;
    
    this.wrapper.appendChild(this.svg);
    container.appendChild(this.wrapper);
  }

  setDrawings(drawings: Drawing[]): void {
    this.drawings = drawings;
    this.render();
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.render();
  }

  setPointerEvents(enabled: boolean): void {
    if (this.wrapper) {
      this.wrapper.style.pointerEvents = enabled ? "auto" : "none";
    }
    if (this.svg) {
      this.svg.style.pointerEvents = enabled ? "auto" : "none";
    }
  }

  render(): void {
    if (!this.svg) return;

    // Clear existing drawings
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    // Render each drawing
    for (const drawing of this.drawings) {
      try {
        const elements = this.renderDrawing(drawing);
        for (const element of elements) {
          this.svg.appendChild(element);
        }
      } catch (error) {
        console.error("Error rendering drawing:", error);
      }
    }
  }

  private renderDrawing(drawing: Drawing): SVGElement[] {
    const elements: SVGElement[] = [];

    switch (drawing.type) {
      case "trend_line":
        elements.push(...this.renderTrendLine(drawing));
        break;
      case "horizontal_line":
        elements.push(...this.renderHorizontalLine(drawing));
        break;
      case "vertical_line":
        elements.push(...this.renderVerticalLine(drawing));
        break;
      case "rectangle":
        elements.push(...this.renderRectangle(drawing));
        break;
      case "fibonacci":
        elements.push(...this.renderFibonacci(drawing));
        break;
    }

    // Add selection handles if selected
    if (drawing.id === this.selectedId && drawing.points.length > 0) {
      elements.push(...this.renderSelectionHandles(drawing));
    }

    return elements;
  }

  private createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth: number,
    lineStyle: string
  ): SVGLineElement {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", lineWidth.toString());
    
    if (lineStyle === "dashed") {
      line.setAttribute("stroke-dasharray", "8,4");
    } else if (lineStyle === "dotted") {
      line.setAttribute("stroke-dasharray", "2,4");
    }
    
    return line;
  }

  private renderTrendLine(drawing: Drawing): SVGElement[] {
    if (drawing.points.length < 2) return [];

    const p1 = pointToScreen(this.chart, drawing.points[0]);
    const p2 = pointToScreen(this.chart, drawing.points[1]);

    if (!p1 || !p2) return [];

    const elements: SVGElement[] = [];
    elements.push(
      this.createLine(
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        drawing.color,
        drawing.lineWidth,
        drawing.lineStyle
      )
    );

    // Add endpoint circles
    elements.push(this.createHandle(p1.x, p1.y, drawing.color, 4));
    elements.push(this.createHandle(p2.x, p2.y, drawing.color, 4));

    return elements;
  }

  private renderHorizontalLine(drawing: Drawing): SVGElement[] {
    if (drawing.points.length < 1 || !this.svg) return [];

    const p = pointToScreen(this.chart, drawing.points[0]);
    if (!p) return [];

    const width = this.svg.clientWidth || 1000;
    const elements: SVGElement[] = [];
    
    elements.push(
      this.createLine(
        0,
        p.y,
        width,
        p.y,
        drawing.color,
        drawing.lineWidth,
        drawing.lineStyle
      )
    );

    // Price label on the right
    elements.push(this.createPriceLabel(width - 75, p.y - 10, drawing.points[0].price.toFixed(2), drawing.color));

    return elements;
  }

  private renderVerticalLine(drawing: Drawing): SVGElement[] {
    if (drawing.points.length < 1 || !this.svg) return [];

    const p = pointToScreen(this.chart, drawing.points[0]);
    if (!p) return [];

    const height = this.svg.clientHeight || 500;
    const elements: SVGElement[] = [];
    
    elements.push(
      this.createLine(
        p.x,
        0,
        p.x,
        height,
        drawing.color,
        drawing.lineWidth,
        drawing.lineStyle
      )
    );

    return elements;
  }

  private renderRectangle(drawing: Drawing): SVGElement[] {
    if (drawing.points.length < 2 || !this.svg) return [];

    const p1 = pointToScreen(this.chart, drawing.points[0]);
    const p2 = pointToScreen(this.chart, drawing.points[1]);

    if (!p1 || !p2) return [];

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", `${drawing.color}20`); // 20 = 12.5% opacity
    rect.setAttribute("stroke", drawing.color);
    rect.setAttribute("stroke-width", drawing.lineWidth.toString());

    if (drawing.lineStyle === "dashed") {
      rect.setAttribute("stroke-dasharray", "8,4");
    }

    return [rect];
  }

  private renderFibonacci(drawing: Drawing): SVGElement[] {
    if (drawing.points.length < 2 || !this.svg) return [];

    const p1 = pointToScreen(this.chart, drawing.points[0]);
    const p2 = pointToScreen(this.chart, drawing.points[1]);

    if (!p1 || !p2) return [];

    const width = this.svg.clientWidth || 1000;
    const elements: SVGElement[] = [];

    // Fibonacci levels
    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const high = Math.max(drawing.points[0].price, drawing.points[1].price);
    const low = Math.min(drawing.points[0].price, drawing.points[1].price);
    const range = high - low;

    // Trend line
    elements.push(
      this.createLine(
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        drawing.color,
        drawing.lineWidth,
        drawing.lineStyle
      )
    );

    // Fibonacci levels
    for (const level of fibLevels) {
      const price = high - range * level;
      const screenPoint = pointToScreen(this.chart, { time: drawing.points[0].time, price });
      
      if (screenPoint) {
        // Horizontal line at each level
        elements.push(
          this.createLine(
            Math.min(p1.x, p2.x),
            screenPoint.y,
            width,
            screenPoint.y,
            `${drawing.color}80`,
            1,
            "dashed"
          )
        );

        // Level label
        elements.push(
          this.createPriceLabel(
            width - 95,
            screenPoint.y - 10,
            `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`,
            drawing.color
          )
        );
      }
    }

    return elements;
  }

  private createHandle(x: number, y: number, color: string, radius: number): SVGCircleElement {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", radius.toString());
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1");
    return circle;
  }

  private createPriceLabel(x: number, y: number, text: string, color: string): SVGElement {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", x.toString());
    bg.setAttribute("y", y.toString());
    
    // Calculate text width (approximate)
    const textWidth = text.length * 7 + 10;
    bg.setAttribute("width", textWidth.toString());
    bg.setAttribute("height", "18");
    bg.setAttribute("fill", color);
    bg.setAttribute("rx", "3");
    
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", (x + 5).toString());
    label.setAttribute("y", (y + 13).toString());
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("font-size", "11");
    label.setAttribute("font-family", "Trebuchet MS, Roboto, Ubuntu, sans-serif");
    label.textContent = text;
    
    group.appendChild(bg);
    group.appendChild(label);
    
    return group;
  }

  private renderSelectionHandles(drawing: Drawing): SVGElement[] {
    const elements: SVGElement[] = [];
    
    for (const point of drawing.points) {
      const screenPoint = pointToScreen(this.chart, point);
      if (!screenPoint) continue;
      
      elements.push(this.createHandle(screenPoint.x, screenPoint.y, "#2962ff", 6));
    }
    
    return elements;
  }

  destroy(): void {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.wrapper = null;
    this.svg = null;
  }
}

// Drawing Manager - manages drawing state and interactions
export class DrawingManager {
  private chart: IChartApi;
  private container: HTMLElement;
  private renderer: DrawingRenderer;
  private drawings: Drawing[] = [];
  private activeTool: DrawingTool = "cursor";
  private currentDrawing: Drawing | null = null;
  private isDrawing = false;
  private selectedDrawingId: string | null = null;
  
  // Callbacks
  private onDrawingsChange?: (drawings: Drawing[]) => void;
  private onToolChange?: (tool: DrawingTool) => void;

  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private mouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: ((e: MouseEvent) => void) | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    chart: IChartApi,
    container: HTMLElement,
    options?: {
      onDrawingsChange?: (drawings: Drawing[]) => void;
      onToolChange?: (tool: DrawingTool) => void;
    }
  ) {
    this.chart = chart;
    this.container = container;
    this.onDrawingsChange = options?.onDrawingsChange;
    this.onToolChange = options?.onToolChange;
    
    this.renderer = new DrawingRenderer(container, chart);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.mouseLeaveHandler = this.handleMouseLeave.bind(this);
    this.keyDownHandler = this.handleKeyDown.bind(this);

    // Use capture phase to ensure we get events before lightweight-charts
    this.container.addEventListener("mousedown", this.mouseDownHandler, true);
    this.container.addEventListener("mousemove", this.mouseMoveHandler, true);
    this.container.addEventListener("mouseup", this.mouseUpHandler, true);
    this.container.addEventListener("mouseleave", this.mouseLeaveHandler, true);
    document.addEventListener("keydown", this.keyDownHandler);
  }

  private isDrawingTool(tool: DrawingTool): boolean {
    return tool !== "cursor" && tool !== "crosshair";
  }

  private handleMouseDown(e: MouseEvent): void {
    console.log("[DrawingManager] Mouse down, active tool:", this.activeTool);
    if (!this.isDrawingTool(this.activeTool)) {
      console.log("[DrawingManager] Not a drawing tool, skipping");
      return;
    }

    // Prevent lightweight-charts from handling this event
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("[DrawingManager] Screen coordinates:", { x, y });
      const point = screenToPoint(this.chart, { x, y });
      console.log("[DrawingManager] Chart point:", point);
      
      if (!point) {
        console.warn("[DrawingManager] Could not convert screen point to chart coordinates");
        return;
      }

      this.isDrawing = true;
      this.currentDrawing = {
        id: generateId(),
        type: this.activeTool as DrawingType,
        points: [point],
        color: DRAWING_COLORS[0],
        lineWidth: 2,
        lineStyle: "solid",
      };
      console.log("[DrawingManager] Created drawing:", this.currentDrawing);

      // For single-point tools (horizontal/vertical lines), complete immediately
      if (this.activeTool === "horizontal_line" || this.activeTool === "vertical_line") {
        console.log("[DrawingManager] Single-point tool, completing immediately");
        this.drawings.push(this.currentDrawing);
        this.renderer.setDrawings(this.drawings);
        this.onDrawingsChange?.(this.drawings);
        this.currentDrawing = null;
        this.isDrawing = false;
      }
    } catch (error) {
      console.error("[DrawingManager] handleMouseDown error:", error);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing || !this.currentDrawing) return;
    
    // Prevent lightweight-charts from handling this event while drawing
    e.preventDefault();
    e.stopPropagation();

    try {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const point = screenToPoint(this.chart, { x, y });
      if (!point) return;

      // Update second point for two-point tools
      if (this.currentDrawing.points.length === 1) {
        this.currentDrawing.points.push(point);
      } else if (this.currentDrawing.points.length === 2) {
        this.currentDrawing.points[1] = point;
      }

      // Temporarily add to drawings for rendering
      const tempDrawings = [...this.drawings, this.currentDrawing];
      this.renderer.setDrawings(tempDrawings);
    } catch (error) {
      console.error("DrawingManager handleMouseMove error:", error);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDrawing) return;
    
    // Prevent lightweight-charts from handling this event
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (this.currentDrawing && this.currentDrawing.points.length >= 2) {
        this.drawings.push(this.currentDrawing);
        this.onDrawingsChange?.(this.drawings);
      }
      
      this.currentDrawing = null;
      this.isDrawing = false;
      this.renderer.setDrawings(this.drawings);
    } catch (error) {
      console.error("DrawingManager handleMouseUp error:", error);
    }
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (this.isDrawing && this.currentDrawing) {
      // Cancel drawing if mouse leaves the container
      this.currentDrawing = null;
      this.isDrawing = false;
      this.renderer.setDrawings(this.drawings);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Delete selected drawing with Delete or Backspace
    if (e.key === "Delete" || e.key === "Backspace") {
      if (this.selectedDrawingId) {
        this.removeDrawing(this.selectedDrawingId);
        this.selectedDrawingId = null;
        this.renderer.setSelected(null);
      }
    }

    // Escape to cancel drawing or deselect
    if (e.key === "Escape") {
      if (this.isDrawing) {
        this.currentDrawing = null;
        this.isDrawing = false;
        this.renderer.setDrawings(this.drawings);
      } else {
        this.selectedDrawingId = null;
        this.renderer.setSelected(null);
      }
    }
  }

  setActiveTool(tool: DrawingTool): void {
    console.log("[DrawingManager] Setting active tool:", tool);
    this.activeTool = tool;
    this.onToolChange?.(tool);
    
    // Enable pointer events on overlay when using drawing tools
    const isDrawing = this.isDrawingTool(tool);
    console.log("[DrawingManager] Is drawing tool:", isDrawing);
    this.renderer.setPointerEvents(isDrawing);
    
    // Change cursor based on tool
    if (tool === "cursor") {
      this.container.style.cursor = "default";
    } else if (tool === "crosshair") {
      this.container.style.cursor = "crosshair";
    } else {
      this.container.style.cursor = "crosshair";
    }
  }

  getActiveTool(): DrawingTool {
    return this.activeTool;
  }

  setDrawings(drawings: Drawing[]): void {
    this.drawings = drawings;
    this.renderer.setDrawings(drawings);
  }

  getDrawings(): Drawing[] {
    return this.drawings;
  }

  removeDrawing(id: string): void {
    this.drawings = this.drawings.filter((d) => d.id !== id);
    this.renderer.setDrawings(this.drawings);
    this.onDrawingsChange?.(this.drawings);
  }

  clearAllDrawings(): void {
    this.drawings = [];
    this.renderer.setDrawings([]);
    this.onDrawingsChange?.([]);
    this.selectedDrawingId = null;
    this.renderer.setSelected(null);
  }

  selectDrawing(id: string | null): void {
    this.selectedDrawingId = id;
    this.renderer.setSelected(id);
  }

  updateDrawingStyle(id: string, style: Partial<Drawing>): void {
    const drawing = this.drawings.find((d) => d.id === id);
    if (drawing) {
      Object.assign(drawing, style);
      this.renderer.setDrawings(this.drawings);
      this.onDrawingsChange?.(this.drawings);
    }
  }

  // Subscribe to visible range changes to re-render drawings
  subscribeToTimeScale(): void {
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      this.renderer.render();
    });
  }

  destroy(): void {
    if (this.mouseDownHandler) {
      this.container.removeEventListener("mousedown", this.mouseDownHandler, true);
    }
    if (this.mouseMoveHandler) {
      this.container.removeEventListener("mousemove", this.mouseMoveHandler, true);
    }
    if (this.mouseUpHandler) {
      this.container.removeEventListener("mouseup", this.mouseUpHandler, true);
    }
    if (this.mouseLeaveHandler) {
      this.container.removeEventListener("mouseleave", this.mouseLeaveHandler, true);
    }
    if (this.keyDownHandler) {
      document.removeEventListener("keydown", this.keyDownHandler);
    }
    
    this.renderer.destroy();
  }
}

// Export constants
export { DRAWING_COLORS };
