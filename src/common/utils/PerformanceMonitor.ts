/**
 * Performance monitoring utility for tracking execution times of operations.
 * Collects metrics and warns about slow operations that exceed frame budget (16.67ms at 60fps).
 */

import Logger from "./Logger.js";

type PerformanceMetrics = {
  count: number;
  mean: number;
  max: number;
  min: number;
  total: number;
};

const metrics: Map<string, number[]> = new Map();
let monitorEnabled = true;

/** Operations slower than one 60 fps frame (ms) are reported as slow. */
const FRAME_TIME_THRESHOLD = 16.67;

export const PerformanceMonitor = {
  /**
   * Enable or disable performance monitoring.
   */
  setEnabled(enabled: boolean): void {
    monitorEnabled = enabled;
  },

  /**
   * Check if performance monitoring is enabled.
   */
  isEnabled(): boolean {
    return monitorEnabled;
  },

  /**
   * Measure the execution time of a synchronous function.
   * Returns the function's result and logs a warning if execution exceeds frame time.
   *
   * @param name - Identifier for this operation (used in logs and metrics)
   * @param fn - Function to measure
   * @returns The result of the function
   *
   * @example
   * const result = PerformanceMonitor.measure('solve-schrodinger', () => {
   *   return solver.solveNumerical(potential, mass, numStates, grid);
   * });
   */
  measure<T>(name: string, fn: () => T): T {
    if (!monitorEnabled) {
      return fn();
    }

    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;

      // Store the metric
      const existing = metrics.get(name) || [];
      existing.push(duration);
      metrics.set(name, existing);

      // Warn if operation is slow (exceeds one frame at 60fps)
      if (duration > FRAME_TIME_THRESHOLD) {
        Logger.warn(
          `Slow operation: ${name} took ${duration.toFixed(2)}ms (>${FRAME_TIME_THRESHOLD.toFixed(2)}ms threshold)`,
        );
      }
    }
  },

  /**
   * Measure the execution time of an async function.
   * Returns a promise that resolves to the function's result.
   *
   * @param name - Identifier for this operation
   * @param fn - Async function to measure
   * @returns Promise resolving to the function's result
   *
   * @example
   * const result = await PerformanceMonitor.measureAsync('load-data', async () => {
   *   return await fetch('/api/data').then(r => r.json());
   * });
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!monitorEnabled) {
      return fn();
    }

    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;

      // Store the metric
      const existing = metrics.get(name) || [];
      existing.push(duration);
      metrics.set(name, existing);

      // Warn if operation is slow
      if (duration > FRAME_TIME_THRESHOLD) {
        Logger.warn(
          `Slow async operation: ${name} took ${duration.toFixed(2)}ms (>${FRAME_TIME_THRESHOLD.toFixed(2)}ms threshold)`,
        );
      }
    }
  },

  /**
   * Get statistics for a specific operation.
   * Returns count, mean, max, min, and total time.
   *
   * @param name - Identifier for the operation
   * @returns Performance statistics or null if no data exists
   */
  getStats(name: string): PerformanceMetrics | null {
    const values = metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const total = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      mean: total / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
      total,
    };
  },

  /**
   * Get statistics for all tracked operations.
   *
   * @returns Map of operation names to their statistics
   */
  getAllStats(): Map<string, PerformanceMetrics> {
    const allStats = new Map<string, PerformanceMetrics>();

    for (const [name, values] of metrics.entries()) {
      if (values.length > 0) {
        const total = values.reduce((a, b) => a + b, 0);
        allStats.set(name, {
          count: values.length,
          mean: total / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          total,
        });
      }
    }

    return allStats;
  },

  /**
   * Clear metrics for a specific operation.
   *
   * @param name - Identifier for the operation
   */
  clearStats(name: string): void {
    metrics.delete(name);
  },

  /**
   * Clear all collected metrics.
   */
  clearAllStats(): void {
    metrics.clear();
  },

  /**
   * Log a summary of all performance metrics to the console.
   */
  logSummary(): void {
    const allStats = PerformanceMonitor.getAllStats();

    if (allStats.size === 0) {
      Logger.info("No performance metrics collected yet.");
      return;
    }

    Logger.info("=== Performance Metrics Summary ===");
    for (const [name, stats] of allStats.entries()) {
      Logger.info(
        `${name}: count=${stats.count}, mean=${stats.mean.toFixed(2)}ms, ` +
          `min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, ` +
          `total=${stats.total.toFixed(2)}ms`,
      );
    }
    Logger.info("===================================");
  },
};

export default PerformanceMonitor;
