/**
 * Linear algebra utilities for quantum mechanics solvers.
 *
 * This module provides matrix operations and eigenvalue decomposition optimized
 * for quantum mechanical calculations. The Matrix class API is designed to be
 * compatible with scenerystack/dot's Matrix class, ensuring seamless integration
 * with the broader SceneryStack ecosystem.
 *
 * ## Matrix Implementation
 *
 * The DotMatrix class exported from this module provides a lightweight, efficient
 * implementation of core matrix operations needed for quantum mechanics:
 * - Matrix construction, indexing (get/set)
 * - Arithmetic operations (addition, multiplication, scalar multiplication)
 * - Matrix algebra (transpose, inverse, submatrix extraction)
 * - Utility methods (identity, diagonal matrices)
 *
 * This implementation uses Float64Array for efficient numerical computations and
 * maintains full compatibility across browser and Node.js test environments.
 *
 * ## Design Philosophy
 *
 * Rather than attempting dynamic imports of scenerystack/dot's Matrix class
 * (which can cause ESM module resolution issues in test environments), we provide
 * a carefully crafted implementation that:
 * 1. Implements the exact API subset needed by quantum mechanics solvers
 * 2. Uses efficient Float64Array storage for numerical stability
 * 3. Works reliably in both browser and Node.js test environments
 * 4. Maintains API compatibility with scenerystack/dot for future upgrades
 *
 * @module LinearAlgebraUtils
 */

import qppw from "../../QPPWNamespace.js";

/**
 * Matrix class providing core linear algebra operations for quantum mechanics.
 *
 * This class implements a compatible subset of the scenerystack/dot Matrix API,
 * optimized for the specific needs of quantum mechanical calculations. The
 * implementation uses Float64Array for efficient numerical computations and
 * provides all essential matrix operations needed by the solver algorithms.
 *
 * ## Key Features
 * - Efficient Float64Array-based storage
 * - Row-major indexing for memory locality
 * - Full support for matrix arithmetic (add, multiply, transpose, inverse)
 * - Gaussian elimination with partial pivoting for matrix inversion
 * - Static factory methods for identity and diagonal matrices
 *
 * ## API Compatibility
 * The API is designed to match scenerystack/dot's Matrix class for methods
 * used by quantum mechanics solvers, enabling potential future migration to
 * the official implementation when environment constraints allow.
 *
 * @example
 * ```typescript
 * // Create a 3x3 identity matrix
 * const I = DotMatrix.identity(3, 3);
 *
 * // Create a matrix from values
 * const A = new DotMatrix(2, 2, [1, 2, 3, 4]);
 *
 * // Matrix operations
 * const B = A.transpose();
 * const C = A.times(B);
 * const D = A.inverse();
 * ```
 */
class CustomDotMatrix {
  private m: number; // rows
  private n: number; // columns
  private entries: Float64Array;

  /**
   * Construct a matrix.
   *
   * @param m - Number of rows
   * @param n - Number of columns
   * @param entries - Optional initial entries (row-major order)
   */
  constructor(m: number, n: number, entries?: number[] | Float64Array) {
    this.m = m;
    this.n = n;
    if (entries) {
      this.entries = new Float64Array(entries);
    } else {
      this.entries = new Float64Array(m * n);
    }
  }

  getRowDimension(): number {
    return this.m;
  }

  getColumnDimension(): number {
    return this.n;
  }

  /**
   * Get element at (i, j).
   */
  get(i: number, j: number): number {
    return this.entries[i * this.n + j]!;
  }

  /**
   * Set element at (i, j).
   */
  set(i: number, j: number, value: number): void {
    this.entries[i * this.n + j] = value;
  }

  /**
   * Get a submatrix.
   *
   * @param i0 - Initial row index
   * @param i1 - Final row index
   * @param j0 - Initial column index
   * @param j1 - Final column index
   * @returns Submatrix
   */
  getMatrix(i0: number, i1: number, j0: number, j1: number): CustomDotMatrix {
    const rows = i1 - i0 + 1;
    const cols = j1 - j0 + 1;
    const result = new CustomDotMatrix(rows, cols);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result.set(i, j, this.get(i0 + i, j0 + j));
      }
    }
    return result;
  }

  /**
   * Create a copy of this matrix.
   */
  copy(): CustomDotMatrix {
    return new CustomDotMatrix(this.m, this.n, this.entries);
  }

  /**
   * Matrix transpose.
   */
  transpose(): CustomDotMatrix {
    const result = new CustomDotMatrix(this.n, this.m);
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  /**
   * Matrix addition.
   */
  plus(B: CustomDotMatrix): CustomDotMatrix {
    const result = new CustomDotMatrix(this.m, this.n);
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        result.set(i, j, this.get(i, j) + B.get(i, j));
      }
    }
    return result;
  }

  /**
   * Multiply matrix by scalar in place.
   */
  timesEquals(scalar: number): CustomDotMatrix {
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i]! *= scalar;
    }
    return this;
  }

  /**
   * Matrix multiplication.
   */
  times(B: CustomDotMatrix): CustomDotMatrix {
    const result = new CustomDotMatrix(this.m, B.n);
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < B.n; j++) {
        let sum = 0;
        for (let k = 0; k < this.n; k++) {
          sum += this.get(i, k) * B.get(k, j);
        }
        result.set(i, j, sum);
      }
    }
    return result;
  }

  /**
   * Matrix inverse using Gaussian elimination with partial pivoting.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: dense Gaussian-elimination inverse
  inverse(): CustomDotMatrix {
    if (this.m !== this.n) {
      throw new Error("Matrix must be square for inverse");
    }
    const N = this.m;

    // Create augmented matrix [A | I]
    const aug = new CustomDotMatrix(N, 2 * N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        aug.set(i, j, this.get(i, j));
        aug.set(i, j + N, i === j ? 1 : 0);
      }
    }

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < N; col++) {
      // Find pivot
      let maxVal = Math.abs(aug.get(col, col));
      let maxRow = col;
      for (let row = col + 1; row < N; row++) {
        const absVal = Math.abs(aug.get(row, col));
        if (absVal > maxVal) {
          maxVal = absVal;
          maxRow = row;
        }
      }

      // Swap rows
      if (maxRow !== col) {
        for (let j = 0; j < 2 * N; j++) {
          const temp = aug.get(col, j);
          aug.set(col, j, aug.get(maxRow, j));
          aug.set(maxRow, j, temp);
        }
      }

      // Scale pivot row
      const pivot = aug.get(col, col);
      if (Math.abs(pivot) < 1e-14) {
        throw new Error("Matrix is singular");
      }
      for (let j = 0; j < 2 * N; j++) {
        aug.set(col, j, aug.get(col, j) / pivot);
      }

      // Eliminate column
      for (let row = 0; row < N; row++) {
        if (row !== col) {
          const factor = aug.get(row, col);
          for (let j = 0; j < 2 * N; j++) {
            aug.set(row, j, aug.get(row, j) - factor * aug.get(col, j));
          }
        }
      }
    }

    // Extract inverse from augmented matrix
    const inv = new CustomDotMatrix(N, N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        inv.set(i, j, aug.get(i, j + N));
      }
    }
    return inv;
  }

  /**
   * Create identity matrix.
   */
  static identity(m: number, n: number): CustomDotMatrix {
    const result = new CustomDotMatrix(m, n);
    const min = Math.min(m, n);
    for (let i = 0; i < min; i++) {
      result.set(i, i, 1);
    }
    return result;
  }

  /**
   * Create diagonal matrix from array.
   */
  static diagonalMatrix(values: number[]): CustomDotMatrix {
    const N = values.length;
    const result = new CustomDotMatrix(N, N);
    for (let i = 0; i < N; i++) {
      result.set(i, i, values[i]!);
    }
    return result;
  }
}

/**
 * Export the matrix class as DotMatrix for backward compatibility.
 * This provides a consistent API that works across browser and test environments.
 */
export { CustomDotMatrix as DotMatrix };

/**
 * Simple complex number interface for FFT operations.
 * We use a lightweight interface rather than the full dot Complex class
 * for better test environment compatibility and reduced overhead for FFT operations.
 */
export type Complex = {
  real: number;
  imaginary: number;
};

/**
 * Result of eigenvalue decomposition
 */
export type EigenDecompositionResult = {
  eigenvalues: number[];
  eigenvectors: number[][];
};

/**
 * Convert a dot Matrix to a 2D number array.
 *
 * @param matrix - Matrix object
 * @returns 2D array in row-major order
 */
export function matrixToArray(matrix: CustomDotMatrix): number[][] {
  const m = matrix.getRowDimension();
  const n = matrix.getColumnDimension();
  const array: number[][] = [];

  for (let i = 0; i < m; i++) {
    array[i] = [];
    for (let j = 0; j < n; j++) {
      array[i]![j] = matrix.get(i, j);
    }
  }

  return array;
}

/**
 * Diagonalize a symmetric matrix using Jacobi eigenvalue algorithm.
 * Returns eigenvalues and eigenvectors.
 *
 * This implementation uses cyclic Jacobi rotations to find all eigenvalues
 * and eigenvectors of a real symmetric matrix.
 *
 * @param matrix - Symmetric N×N matrix (can be Matrix or number[][])
 * @returns Object with eigenvalues array and eigenvectors (array of column vectors)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Jacobi eigen-decomposition is inherently branched
export function diagonalize(matrix: CustomDotMatrix | number[][]): EigenDecompositionResult {
  // Convert to 2D array for Jacobi algorithm
  const A = Array.isArray(matrix) ? matrix.map((row) => [...row]) : matrixToArray(matrix);
  const N = A.length;

  // Initialize eigenvector matrix as identity
  const V: number[][] = [];
  for (let i = 0; i < N; i++) {
    V[i] = [];
    for (let j = 0; j < N; j++) {
      V[i]![j] = i === j ? 1 : 0;
    }
  }

  // Cyclic Jacobi method parameters
  // Each sweep processes all N(N-1)/2 off-diagonal elements
  // Typically converges in O(N) sweeps
  const maxSweeps = Math.max(50, 5 * N);

  // Calculate sum of squares of off-diagonal elements for convergence check
  const computeOffDiagNorm = (): number => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        sum += A[i]![j]! * A[i]![j]!;
      }
    }
    return Math.sqrt(2 * sum); // Factor of 2 for symmetry
  };

  // Calculate the Frobenius norm for relative tolerance
  let frobeniusNorm = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      frobeniusNorm += A[i]![j]! * A[i]![j]!;
    }
  }
  frobeniusNorm = Math.sqrt(frobeniusNorm);

  // Use relative tolerance based on matrix norm
  // For small matrices (norm < 1), use absolute tolerance of 1e-30 as floor
  const tolerance = Math.max(1e-30, 1e-10 * frobeniusNorm);

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    // Check convergence at start of each sweep
    const offDiagNorm = computeOffDiagNorm();
    if (offDiagNorm < tolerance) {
      break;
    }

    // Sweep through all off-diagonal elements in order
    for (let p = 0; p < N - 1; p++) {
      for (let q = p + 1; q < N; q++) {
        const Apq = A[p]![q]!;

        // Skip if element is already very small
        if (Math.abs(Apq) < 1e-40) {
          continue;
        }

        // Compute rotation angle
        const App = A[p]![p]!;
        const Aqq = A[q]![q]!;

        let c: number, s: number;
        const diff = Aqq - App;
        if (Math.abs(diff) < 1e-40) {
          c = Math.SQRT1_2;
          s = Apq > 0 ? Math.SQRT1_2 : -Math.SQRT1_2;
        } else {
          const phi = diff / (2 * Apq);
          const t = 1.0 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
          const signedT = phi < 0 ? -t : t;
          c = 1.0 / Math.sqrt(signedT * signedT + 1);
          s = signedT * c;
        }

        // Apply rotation to A
        const newApp = c * c * App - 2 * s * c * Apq + s * s * Aqq;
        const newAqq = s * s * App + 2 * s * c * Apq + c * c * Aqq;

        A[p]![p] = newApp;
        A[q]![q] = newAqq;
        A[p]![q] = 0;
        A[q]![p] = 0;

        for (let i = 0; i < N; i++) {
          if (i !== p && i !== q) {
            const Aip = A[i]![p]!;
            const Aiq = A[i]![q]!;
            A[i]![p] = c * Aip - s * Aiq;
            A[p]![i] = A[i]![p]!;
            A[i]![q] = s * Aip + c * Aiq;
            A[q]![i] = A[i]![q]!;
          }
        }

        // Update eigenvector matrix
        for (let i = 0; i < N; i++) {
          const Vip = V[i]![p]!;
          const Viq = V[i]![q]!;
          V[i]![p] = c * Vip - s * Viq;
          V[i]![q] = s * Vip + c * Viq;
        }
      }
    }
  }

  // Extract eigenvalues and eigenvectors
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];

  for (let i = 0; i < N; i++) {
    eigenvalues.push(A[i]![i]!);

    // Extract column i of V as eigenvector i
    const eigenvector: number[] = [];
    for (let j = 0; j < N; j++) {
      eigenvector.push(V[j]![i]!);
    }
    eigenvectors.push(eigenvector);
  }

  return { eigenvalues, eigenvectors };
}

/**
 * Normalize a wavefunction using trapezoidal rule.
 * Ensures ∫|ψ|² dx = 1.
 *
 * @param psi - Wavefunction array
 * @param dx - Grid spacing (meters)
 * @returns Normalized wavefunction
 */
export function normalizeWavefunction(psi: number[], dx: number): number[] {
  // Calculate ∫|ψ|² dx using trapezoidal rule
  let integral = 0;
  for (let i = 0; i < psi.length - 1; i++) {
    integral += (psi[i]! * psi[i]! + psi[i + 1]! * psi[i + 1]!) / 2;
  }
  integral *= dx;

  const normalization = Math.sqrt(integral);

  // Avoid division by zero
  if (normalization < 1e-30) {
    return psi;
  }

  return psi.map((val) => val / normalization);
}

/**
 * Normalize a wavefunction sampled on an arbitrary (possibly non-uniform) grid, using the trapezoidal
 * rule over the actual abscissae. Used after interpolating to a finer display grid: a cubic spline
 * does not preserve ∫|ψ|² dx (by ~10 % near a Coulomb cusp).
 */
export function normalizeOnGrid(psi: number[], xGrid: number[]): number[] {
  let integral = 0;
  for (let i = 0; i < psi.length - 1; i++) {
    integral += ((psi[i]! * psi[i]! + psi[i + 1]! * psi[i + 1]!) / 2) * (xGrid[i + 1]! - xGrid[i]!);
  }
  const normalization = Math.sqrt(integral);
  return normalization < 1e-30 ? psi : psi.map((val) => val / normalization);
}

/**
 * Complex number addition (internal helper).
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Sum a + b
 */
function complexAdd(a: Complex, b: Complex): Complex {
  return {
    real: a.real + b.real,
    imaginary: a.imaginary + b.imaginary,
  };
}

/**
 * Complex number subtraction (internal helper).
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Difference a - b
 */
function complexSubtract(a: Complex, b: Complex): Complex {
  return {
    real: a.real - b.real,
    imaginary: a.imaginary - b.imaginary,
  };
}

/**
 * Complex number multiplication (internal helper).
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Product a × b
 */
function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imaginary * b.imaginary,
    imaginary: a.real * b.imaginary + a.imaginary * b.real,
  };
}

/**
 * Direct discrete Fourier transform, X_k = Σ_n x_n e^(−2πikn/N). O(N²); used by fft() for lengths
 * that are not a power of 2.
 */
function dft(x: Complex[]): Complex[] {
  const N = x.length;
  const result: Complex[] = [];
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imaginary = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * ((k * n) % N)) / N;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      real += x[n]!.real * cos - x[n]!.imaginary * sin;
      imaginary += x[n]!.real * sin + x[n]!.imaginary * cos;
    }
    result.push({ real, imaginary });
  }
  return result;
}

/**
 * Fast Fourier Transform (FFT)
 * Cooley-Tukey radix-2 decimation-in-time for power-of-2 lengths; other lengths use the direct DFT
 * (the radix-2 split previously read past the end of the arrays and threw for them).
 *
 * @param x - Input array of complex numbers
 * @returns FFT of input
 */
export function fft(x: Complex[]): Complex[] {
  const N = x.length;

  // Base case
  if (N <= 1) {
    return x;
  }
  if ((N & (N - 1)) !== 0) {
    return dft(x);
  }

  // Divide
  const even: Complex[] = [];
  const odd: Complex[] = [];
  for (let i = 0; i < N; i++) {
    if (i % 2 === 0) {
      even.push(x[i]!);
    } else {
      odd.push(x[i]!);
    }
  }

  // Conquer
  const fftEven = fft(even);
  const fftOdd = fft(odd);

  // Combine
  const result: Complex[] = new Array(N);
  for (let frequencyIndex = 0; frequencyIndex < N / 2; frequencyIndex++) {
    const angle = (-2 * Math.PI * frequencyIndex) / N;
    const twiddle: Complex = {
      real: Math.cos(angle),
      imaginary: Math.sin(angle),
    };

    const temp = complexMultiply(twiddle, fftOdd[frequencyIndex]!);
    result[frequencyIndex] = complexAdd(fftEven[frequencyIndex]!, temp);
    result[frequencyIndex + N / 2] = complexSubtract(fftEven[frequencyIndex]!, temp);
  }

  return result;
}

/**
 * Inverse Fast Fourier Transform (IFFT)
 *
 * @param X - Input array of complex numbers
 * @returns IFFT of input
 */
export function ifft(X: Complex[]): Complex[] {
  const N = X.length;

  // Conjugate input
  const XConj = X.map((x) => ({ real: x.real, imaginary: -x.imaginary }));

  // Apply FFT
  const result = fft(XConj);

  // Conjugate output and scale
  return result.map((x) => ({
    real: x.real / N,
    imaginary: -x.imaginary / N,
  }));
}

/**
 * Generate FFT frequency array similar to numpy.fft.fftfreq
 * Returns k = 2π * freq / dx
 *
 * @param N - Number of points
 * @param dx - Grid spacing
 * @returns Array of wave numbers k
 */
export function fftFreq(N: number, dx: number): number[] {
  const waveNumberArray: number[] = [];
  const dk = (2 * Math.PI) / (N * dx);

  for (let i = 0; i < N; i++) {
    if (i < N / 2) {
      waveNumberArray.push(i * dk);
    } else {
      waveNumberArray.push((i - N) * dk);
    }
  }

  return waveNumberArray;
}

/**
 * Cubic spline interpolation for smooth wavefunction upsampling.
 * Uses natural boundary conditions (second derivative = 0 at endpoints).
 *
 * @param xGrid - Original x-coordinates
 * @param yValues - Original y-values (wavefunction values)
 * @param upsampleFactor - Factor to increase resolution (e.g., 8 for 8x more points)
 * @returns Object with fineXGrid and fineYValues
 */
export function cubicSplineInterpolation(
  xGrid: number[],
  yValues: number[],
  upsampleFactor: number,
): { fineXGrid: number[]; fineYValues: number[] } {
  const n = xGrid.length;
  if (n < 2) {
    throw new Error("Need at least 2 points for interpolation");
  }
  if (yValues.length !== n) {
    throw new Error("xGrid and yValues must have the same length");
  }

  // Build cubic spline coefficients using natural boundary conditions
  // For each interval [x_i, x_{i+1}], the spline is:
  // S_i(x) = a_i + b_i(x-x_i) + c_i(x-x_i)² + d_i(x-x_i)³

  const h: number[] = []; // Interval widths
  for (let i = 0; i < n - 1; i++) {
    h.push(xGrid[i + 1]! - xGrid[i]!);
  }

  // Set up tridiagonal system for second derivatives
  // Natural boundary conditions: M_0 = M_{n-1} = 0
  const alpha: number[] = new Array(n - 1);
  for (let i = 1; i < n - 1; i++) {
    alpha[i] = (3 / h[i]!) * (yValues[i + 1]! - yValues[i]!) - (3 / h[i - 1]!) * (yValues[i]! - yValues[i - 1]!);
  }

  // Solve tridiagonal system for second derivatives M_i
  const l: number[] = new Array(n);
  const mu: number[] = new Array(n);
  const z: number[] = new Array(n);

  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;

  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xGrid[i + 1]! - xGrid[i - 1]!) - h[i - 1]! * mu[i - 1]!;
    mu[i] = h[i]! / l[i]!;
    z[i] = (alpha[i]! - h[i - 1]! * z[i - 1]!) / l[i]!;
  }

  l[n - 1] = 1;
  z[n - 1] = 0;

  const M: number[] = new Array(n); // Second derivatives
  M[n - 1] = 0;

  for (let j = n - 2; j >= 0; j--) {
    M[j] = z[j]! - mu[j]! * M[j + 1]!;
  }

  // Compute spline coefficients
  const a: number[] = [...yValues];
  const b: number[] = new Array(n - 1);
  const c: number[] = new Array(n - 1);
  const d: number[] = new Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    c[i] = M[i]!;
    b[i] = (yValues[i + 1]! - yValues[i]!) / h[i]! - (h[i]! * (M[i + 1]! + 2 * M[i]!)) / 3;
    d[i] = (M[i + 1]! - M[i]!) / (3 * h[i]!);
  }

  // Generate fine grid
  const fineXGrid: number[] = [];
  const fineYValues: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const x0 = xGrid[i]!;
    const x1 = xGrid[i + 1]!;

    // Generate upsampleFactor points in this interval
    // (include start point, exclude end point except for last interval)
    const pointsInInterval = i === n - 2 ? upsampleFactor + 1 : upsampleFactor;

    for (let j = 0; j < pointsInInterval; j++) {
      const t = j / upsampleFactor;
      const x = x0 + t * (x1 - x0);
      const dx = x - x0;

      // Evaluate cubic spline
      const y = a[i]! + b[i]! * dx + c[i]! * dx * dx + d[i]! * dx * dx * dx;

      fineXGrid.push(x);
      fineYValues.push(y);
    }
  }

  return { fineXGrid, fineYValues };
}

qppw.register("LinearAlgebraUtils", {
  matrixToArray,
  diagonalize,
  normalizeWavefunction,
  cubicSplineInterpolation,
  fft,
  ifft,
  fftFreq,
});
