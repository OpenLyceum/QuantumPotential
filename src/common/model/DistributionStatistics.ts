/** Probability-distribution moments used by model queries and chart descriptions. */

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
export function calculateRMSStatistics(
  grid: readonly number[],
  density: readonly number[],
): { avg: number; rms: number } | null {
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
  // An empty (or non-finite) distribution has no mean or spread
  if (!(totalProbability > 0 && Number.isFinite(totalProbability))) {
    return null;
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
  // Round-off can make the variance slightly negative for very narrow distributions
  const rms = Math.sqrt(Math.max(0, avgSquared - avg * avg));

  return Number.isFinite(avg) && Number.isFinite(rms) ? { avg, rms } : null;
}
