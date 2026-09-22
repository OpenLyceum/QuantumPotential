/**
 * Root finding utilities with scenerystack/dot integration.
 *
 * This module provides a wrapper around scenerystack/dot's findRoot function
 * with fallback to custom implementations for test environment compatibility.
 *
 * The findRoot function from dot uses a hybrid Newton's/bisection method that
 * combines the robustness of bisection with the speed of Newton's method.
 */

/**
 * Find a root of f(x) = 0 in the interval [minX, maxX] using a hybrid
 * Newton's/bisection method.
 *
 * This is a robust root-finding algorithm that combines:
 * - Newton's method for fast quadratic convergence
 * - Bisection for guaranteed convergence when Newton diverges
 *
 * The algorithm automatically switches between methods as needed, providing
 * both speed and reliability.
 *
 * @param minX - Lower bound of search interval
 * @param maxX - Upper bound of search interval
 * @param tolerance - Convergence tolerance for |f(x)|
 * @param valueFunction - Function to find root of
 * @param derivativeFunction - Derivative of the function
 * @returns Root x such that |f(x)| < tolerance
 */
export function findRootHybrid(
  minX: number,
  maxX: number,
  tolerance: number,
  valueFunction: (x: number) => number,
  derivativeFunction: (x: number) => number,
): number {
  // Hybrid Newton's/bisection method from scenerystack/dot
  // Adapted from: https://github.com/phetsims/dot/blob/main/js/util/findRoot.ts
  let lo = minX;
  let hi = maxX;
  let x = (lo + hi) / 2;
  let y = valueFunction(x);

  while (Math.abs(y) > tolerance) {
    const dy = derivativeFunction(x);

    if (y < 0) {
      lo = x;
    } else {
      hi = x;
    }

    // Newton's method first
    x -= y / dy;

    // Bounded to be bisection at the very least
    if (x <= lo || x >= hi) {
      x = (lo + hi) / 2;

      // Check to see if it's impossible to pass our tolerance
      if (x === lo || x === hi) {
        break;
      }
    }
    y = valueFunction(x);
  }

  return x;
}
