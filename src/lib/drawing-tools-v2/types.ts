/**
 * Common types for drawing tools
 */

import type { Coordinate } from 'lightweight-charts';

/**
 * View point with screen coordinates
 * Uses Coordinate type from lightweight-charts for proper coordinate handling
 */
export interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

/**
 * Drawing tool options base interface
 */
export interface DrawingToolOptions {
  lineColor: string;
  lineWidth: number;
  lineStyle: number; // 0 = solid, 1 = dashed, 2 = dotted
}
