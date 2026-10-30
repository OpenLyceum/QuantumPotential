/**
 * Analytical solutions for well-known quantum potentials.
 * These provide exact solutions without numerical approximation.
 *
 * The barrel exports each potential's AnalyticalSolution class and its solve function. The per-potential
 * helpers (classical probability, turning points, derivatives, …) are reached through the class; import a
 * potential's file directly if you need one on its own.
 */

import QuantumPotentialNamespace from "../../../QuantumPotentialNamespace.ts";
import { solveAsymmetricTrianglePotential } from "./asymmetric-triangle-potential.ts";
import { solveCoulomb1DPotential } from "./coulomb-1d-potential.ts";
import { solveDoubleSquareWellAnalytical } from "./double-square-well.ts";
import { solveEckartPotential } from "./eckart-potential.ts";
import { solveFiniteSquareWell } from "./finite-square-well.ts";
import { solveHarmonicOscillator } from "./harmonic-oscillator.ts";
import { solveInfiniteWell } from "./infinite-square-well.ts";
import { solveMorsePotential } from "./morse-potential.ts";
import { solveMultiSquareWell } from "./multi-square-well.ts";
import { solvePoschlTellerPotential } from "./poschl-teller-potential.ts";
import { solveRosenMorsePotential } from "./rosen-morse-potential.ts";
import { solveTriangularPotential } from "./triangular-potential.ts";

export { AnalyticalSolution } from "./AnalyticalSolution.ts";
export {
  AsymmetricTrianglePotentialSolution,
  solveAsymmetricTrianglePotential,
} from "./asymmetric-triangle-potential.ts";
export { Coulomb1DPotentialSolution, solveCoulomb1DPotential } from "./coulomb-1d-potential.ts";
export { solveDoubleSquareWellAnalytical } from "./double-square-well.ts";
export { EckartPotentialSolution, solveEckartPotential } from "./eckart-potential.ts";
export { FiniteSquareWellSolution, solveFiniteSquareWell } from "./finite-square-well.ts";
export { HarmonicOscillatorSolution, solveHarmonicOscillator } from "./harmonic-oscillator.ts";
export { InfiniteSquareWellSolution, solveInfiniteWell } from "./infinite-square-well.ts";
export { MorsePotentialSolution, solveMorsePotential } from "./morse-potential.ts";
export { solveMultiSquareWell } from "./multi-square-well.ts";
export { PoschlTellerPotentialSolution, solvePoschlTellerPotential } from "./poschl-teller-potential.ts";
export { RosenMorsePotentialSolution, solveRosenMorsePotential } from "./rosen-morse-potential.ts";
export { solveTriangularPotential, TriangularPotentialSolution } from "./triangular-potential.ts";

// Register all solutions with the QuantumPotential namespace
QuantumPotentialNamespace.register("AnalyticalSolutions", {
  solveFiniteSquareWell,
  solveInfiniteWell,
  solveHarmonicOscillator,
  solveMorsePotential,
  solvePoschlTellerPotential,
  solveRosenMorsePotential,
  solveEckartPotential,
  solveAsymmetricTrianglePotential,
  solveCoulomb1DPotential,
  solveTriangularPotential,
  solveDoubleSquareWellAnalytical,
  solveMultiSquareWell,
});
