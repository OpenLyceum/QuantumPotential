/**
 * Utilities for standardizing wavefunction parity/sign across different solvers.
 *
 * Convention:
 * - For even states (even number of nodes): ψ(x=0) > 0
 * - For odd states (odd number of nodes): dψ/dx < 0 at x=0 (equivalently, ψ(x>0) > 0 for first non-zero point)
 *
 * For non-symmetric potentials: use the value at the grid center as reference point
 */

/**
 * Detect parity of a wavefunction by counting zero-crossings (nodes).
 *
 * @param psi - The wavefunction values
 * @returns "even" if even number of nodes, "odd" if odd number of nodes
 */
export function detectParity(psi: number[]): "even" | "odd" {
  let nodeCount = 0;

  // Count sign changes (zero-crossings)
  for (let i = 1; i < psi.length; i++) {
    // Check for sign change between consecutive points
    if (psi[i - 1]! * psi[i]! < 0) {
      nodeCount++;
    }
  }

  // Even number of nodes → even parity state
  // Odd number of nodes → odd parity state
  return nodeCount % 2 === 0 ? "even" : "odd";
}

/**
 * Standardize the sign of a wavefunction according to our convention.
 *
 * For symmetric potentials:
 * - Even states: Ensure ψ(x=0) > 0
 * - Odd states: Ensure dψ/dx < 0 at x=0 (slope is negative at center)
 *
 * For asymmetric potentials: Use center of grid as reference point
 *
 * @param psi - The wavefunction values
 * @param xGrid - The spatial grid points
 * @param parity - Optional parity hint ("even" or "odd"). If not provided, will be auto-detected.
 * @returns The standardized wavefunction (may be negated)
 */
export function standardizeWavefunctionSign(psi: number[], xGrid: number[], parity?: "even" | "odd"): number[] {
  // Auto-detect parity if not provided
  const detectedParity = parity || detectParity(psi);

  // Find the center index of the grid
  const centerIndex = Math.floor(psi.length / 2);

  if (detectedParity === "even") {
    // Even states: Ensure ψ(center) > 0
    if (psi[centerIndex]! < 0) {
      return psi.map((val) => -val);
    }
    // If ψ(center) ≈ 0 (shouldn't happen for even states, but handle edge case)
    if (Math.abs(psi[centerIndex]!) < 1e-10) {
      // Find the maximum absolute value and use its sign
      const maxAbsIndex = psi.reduce((iMax, val, i, arr) => (Math.abs(val) > Math.abs(arr[iMax]!) ? i : iMax), 0);
      if (psi[maxAbsIndex]! < 0) {
        return psi.map((val) => -val);
      }
    }
  } else {
    // Odd states: Ensure negative slope at center (dψ/dx < 0 at x=0)
    // This is equivalent to: ψ(x>0) > 0 for the first significant non-zero point right of center

    // Find first significant point to the right of center
    let rightIndex = centerIndex + 1;
    while (rightIndex < psi.length && Math.abs(psi[rightIndex]!) < 1e-10) {
      rightIndex++;
    }

    if (rightIndex < psi.length) {
      // Ensure ψ(x>0) > 0
      if (psi[rightIndex]! < 0) {
        return psi.map((val) => -val);
      }
    } else {
      // Fallback: check slope at center using finite difference
      if (centerIndex > 0 && centerIndex < psi.length - 1) {
        const slope =
          (psi[centerIndex + 1]! - psi[centerIndex - 1]!) / (xGrid[centerIndex + 1]! - xGrid[centerIndex - 1]!);

        // We want slope < 0 at center (negative slope)
        if (slope > 0) {
          return psi.map((val) => -val);
        }
      }
    }
  }

  // No sign change needed
  return psi;
}

/**
 * Convenience function to standardize a wavefunction with automatic parity detection.
 *
 * @param psi - The wavefunction values
 * @param xGrid - The spatial grid points
 * @returns The standardized wavefunction
 */
export function standardizeWavefunction(psi: number[], xGrid: number[]): number[] {
  return standardizeWavefunctionSign(psi, xGrid);
}
