/**
 * Memoization utility for caching expensive calculations.
 * Useful for analytical solutions where the same wavefunctions may be computed multiple times
 * with the same parameters.
 */

export class MemoizationCache<T> {
  private cache: Map<string, T> = new Map();
  private maxSize: number;

  /**
   * Create a new memoization cache.
   * @param maxSize - Maximum number of entries to cache (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Generate a cache key from multiple parameters.
   * @param params - Parameters to use for the cache key
   * @returns String key for the cache
   */
  static generateKey(...params: (string | number | boolean)[]): string {
    return params.map((p) => String(p)).join("::");
  }

  /**
   * Get a value from the cache.
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * Check if a key exists in the cache.
   * @param key - Cache key
   * @returns true if the key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Store a value in the cache.
   * If the cache is full, removes the oldest entry (FIFO).
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: string, value: T): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Clear all cached values.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute a value. If the value exists in cache, return it.
   * Otherwise, compute it using the provided function and cache the result.
   *
   * @param key - Cache key
   * @param computeFn - Function to compute the value if not cached
   * @returns The cached or newly computed value
   */
  getOrCompute(key: string, computeFn: () => T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = computeFn();
    this.set(key, value);
    return value;
  }
}

/**
 * Decorator-style memoization function for methods.
 * Caches the result of a function based on its arguments.
 *
 * @param fn - Function to memoize
 * @param keyGenerator - Optional function to generate cache key from arguments
 * @param maxSize - Maximum cache size
 * @returns Memoized version of the function
 *
 * @example
 * const memoizedCalculation = memoize(
 *   (n: number, width: number, depth: number) => expensiveCalculation(n, width, depth),
 *   (n, width, depth) => `${n}-${width}-${depth}`
 * );
 */
export function memoize<T, Args extends readonly unknown[]>(
  fn: (...args: Args) => T,
  keyGenerator?: (...args: Args) => string,
  maxSize: number = 100,
): (...args: Args) => T {
  const cache = new MemoizationCache<T>(maxSize);

  return (...args: Args): T => {
    const key = keyGenerator ? keyGenerator(...args) : MemoizationCache.generateKey(...args.map(String));

    return cache.getOrCompute(key, () => fn(...args));
  };
}

export default MemoizationCache;
