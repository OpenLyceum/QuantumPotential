/**
 * Utility functions for RMS (Root Mean Square) indicators.
 * These functions are used to calculate statistics and create visual indicators
 * for displaying average values and RMS spreads in charts.
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

/**
 * Calculates average and RMS (root mean square) for a given distribution.
 * Uses trapezoidal integration to compute:
 * - Average: <x> = ∫ x * ρ(x) dx
 * - RMS: sqrt(<x²> - <x>²) = sqrt(∫ x² * ρ(x) dx - (∫ x * ρ(x) dx)²)
 *   This is the standard deviation, representing the spread/uncertainty.
 *
 * @param grid - Array of x values (position or wavenumber)
 * @param density - Array of probability density values ρ(x)
 * @returns Object containing average and RMS values (standard deviation)
 */
export function calculateRMSStatistics(grid: number[], density: number[]): { avg: number; rms: number } {
  // Normalize the distribution first using trapezoidal integration
  let totalProbability = 0;
  for (let i = 0; i < grid.length - 1; i++) {
    const dx = grid[i + 1]! - grid[i]!;
    const avgDensity = (density[i]! + density[i + 1]!) / 2;
    totalProbability += avgDensity * dx;
  }

  // Calculate average: <x> = ∫ x * ρ(x) dx
  let avg = 0;
  for (let i = 0; i < grid.length - 1; i++) {
    const dx = grid[i + 1]! - grid[i]!;
    const avgDensity = (density[i]! + density[i + 1]!) / 2;
    const avgX = (grid[i]! + grid[i + 1]!) / 2;
    avg += avgX * avgDensity * dx;
  }
  avg /= totalProbability;

  // Calculate RMS: sqrt(<x²> - <x>²) where <x²> = ∫ x² * ρ(x) dx
  let avgSquared = 0;
  for (let i = 0; i < grid.length - 1; i++) {
    const dx = grid[i + 1]! - grid[i]!;
    const avgDensity = (density[i]! + density[i + 1]!) / 2;
    const avgX = (grid[i]! + grid[i + 1]!) / 2;
    avgSquared += avgX * avgX * avgDensity * dx;
  }
  avgSquared /= totalProbability;
  const rms = Math.sqrt(avgSquared - avg * avg);

  return { avg, rms };
}
