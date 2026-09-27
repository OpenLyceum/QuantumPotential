/**
 * Numerical methods for solving the Schrödinger equation
 */

import QuantumPotentialNamespace from "../../QuantumPotentialNamespace.js";

/**
 * Numerical methods for the time-independent Schrödinger equation. Numerov shooting is the sim's
 * solver; FGH is kept only as a cross-check, selected with ?numericalMethod=fgh.
 */
export const NumericalMethod = {
  /** Numerov shooting with node-count bracketing (ported from Quantum Bound States) */
  NUMEROV: "numerov",
  /** Fourier Grid Hamiltonian (dense diagonalization) */
  FGH: "fgh",
} as const;

export type NumericalMethod = (typeof NumericalMethod)[keyof typeof NumericalMethod];

QuantumPotentialNamespace.register("NumericalMethod", NumericalMethod);

export default NumericalMethod;
