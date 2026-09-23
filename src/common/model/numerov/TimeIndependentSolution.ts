/**
 * Types shared by the Numerov solver. Energies are in eV, positions in nm, and wave functions in nm^(-1/2).
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0),
 * with the PhET-iO serialization removed.
 */

/** Potential energy V(x) in eV, with x in nm. */
export type PotentialEnergyFunction = (x: number) => number;

export type TimeIndependentSolution = {
  solutionMethod: "numerov";

  /** Potential energy values (eV) on the grid, in ascending x. */
  potentialEnergyValues: number[];

  /** Energy eigenvalues (eV), ascending. */
  eigenvalues: number[];

  /** Normalized wave functions (nm^(-1/2)), one per eigenvalue. */
  waveFunctionSolutions: number[][];
};
