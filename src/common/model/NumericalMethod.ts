/**
 * Numerical methods for solving the Schrödinger equation
 */

import qppw from "../../QPPWNamespace.js";

/**
 * Available numerical methods for solving the time-independent Schrödinger equation
 */
export const NumericalMethod = {
  /** Numerov shooting method */
  NUMEROV: "numerov",
  /** Matrix-based Numerov method */
  MATRIX_NUMEROV: "matrix_numerov",
  /** Discrete Variable Representation */
  DVR: "dvr",
  /** Fourier Grid Hamiltonian */
  FGH: "fgh",
  /** Spectral (Chebyshev) method */
  SPECTRAL: "spectral",
  /** Advanced quantum bound state solver with adaptive bracketing */
  QUANTUM_BOUND: "quantum_bound",
} as const;

export type NumericalMethod = (typeof NumericalMethod)[keyof typeof NumericalMethod];

qppw.register("NumericalMethod", NumericalMethod);

export default NumericalMethod;
