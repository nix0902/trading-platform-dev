/**
 * Common types for drawing tools
 */

import type { Time } from 'lightweight-charts';

/**
 * Represents a point in a drawing
 */
export interface DrawingPoint {
  time: Time;
  price: number;
}

/**
 * Represents a hovered object during interaction
 */
export interface HoveredObject {
  externalId: string;
  cursorStyle: string;
  zOrder: 'top' | 'bottom' | 'normal';
}

/**
 * View point with screen coordinates
 */
export interface ViewPoint {
  x: number | null;
  y: number | null;
}

/**
 * Drawing tool options base interface
 */
export interface DrawingToolOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: number; // 0 = solid, 1 = dashed, 2 = dotted
}
