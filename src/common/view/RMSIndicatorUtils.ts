/**
 * View geometry for RMS (Root Mean Square) indicators.
 */

import { Shape } from "scenerystack/kite";

/**
 * Creates a double-headed horizontal arrow shape for the RMS indicator.
 * The arrow spans from x1 to x2 at height y.
 *
 * @param x1 - Left x-coordinate
 * @param x2 - Right x-coordinate
 * @param y - Y-coordinate (height) of the arrow
 * @returns Shape object representing the double arrow
 */
export function createDoubleArrowShape(x1: number, x2: number, y: number): Shape {
  const shape = new Shape();
  const arrowHeadLength = 8;
  const arrowHeadWidth = 6;

  // Main horizontal line
  shape.moveTo(x1, y);
  shape.lineTo(x2, y);

  // Left arrow head
  shape.moveTo(x1, y);
  shape.lineTo(x1 + arrowHeadLength, y - arrowHeadWidth / 2);
  shape.lineTo(x1 + arrowHeadLength, y + arrowHeadWidth / 2);
  shape.lineTo(x1, y);
  shape.close();

  // Right arrow head
  shape.moveTo(x2, y);
  shape.lineTo(x2 - arrowHeadLength, y - arrowHeadWidth / 2);
  shape.lineTo(x2 - arrowHeadLength, y + arrowHeadWidth / 2);
  shape.lineTo(x2, y);
  shape.close();

  return shape;
}
