/**
 * Utility functions for drawing tools
 */

import type { Time } from 'lightweight-charts';
import type { DrawingPoint } from './drawing-types';

/**
 * Converts drawing points to anchor points
 * This is a simple pass-through for the basic case
 */
export function getAnchorPointsFromDrawingPoints(
  points: DrawingPoint[]
): Array<{ time: Time; price: number }> | null {
  if (!points || points.length === 0) {
    return null;
  }

  return points.map(point => ({
    time: point.time,
    price: point.price,
  }));
}

/**
 * Calculate the distance between two points
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a point is near a line segment
 */
export function isPointNearLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number
): boolean {
  const lineLength = distance(x1, y1, x2, y2);
  if (lineLength === 0) {
    return distance(px, py, x1, y1) < threshold;
  }

  // Calculate projection of point onto line
  const t = Math.max(0, Math.min(1, 
    ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength * lineLength)
  ));

  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  return distance(px, py, projX, projY) < threshold;
}
