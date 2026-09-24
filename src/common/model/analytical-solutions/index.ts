/**
 * Analytical solutions for well-known quantum potentials.
 * These provide exact solutions without numerical approximation.
 *
 * The barrel exports each potential's AnalyticalSolution class and its solve function. The per-potential
 * helpers (classical probability, turning points, derivatives, …) are reached through the class; import a
 * potential's file directly if you need one on its own.
 */

import qppw from "../../../QPPWNamespace.js";
import { solveAsymmetricTrianglePotential } from "./asymmetric-triangle-potential.js";
import { solveCoulomb1DPotential } from "./coulomb-1d-potential.js";
import { solveDoubleSquareWellAnalytical } from "./double-square-well.js";
import { solveEckartPotential } from "./eckart-potential.js";
import { solveFiniteSquareWell } from "./finite-square-well.js";
import { solveHarmonicOscillator } from "./harmonic-oscillator.js";
import { solveInfiniteWell } from "./infinite-square-well.js";
import { solveMorsePotential } from "./morse-potential.js";
import { solveMultiCoulomb1D } from "./multi-coulomb-1d.js";
import { solveMultiSquareWell } from "./multi-square-well.js";
import { solvePoschlTellerPotential } from "./poschl-teller-potential.js";
import { solveRosenMorsePotential } from "./rosen-morse-potential.js";
import { solveTriangularPotential } from "./triangular-potential.js";

export { AnalyticalSolution } from "./AnalyticalSolution.js";
export {
  AsymmetricTrianglePotentialSolution,
  solveAsymmetricTrianglePotential,
} from "./asymmetric-triangle-potential.js";
export { Coulomb1DPotentialSolution, solveCoulomb1DPotential } from "./coulomb-1d-potential.js";
export { solveDoubleSquareWellAnalytical } from "./double-square-well.js";
export { EckartPotentialSolution, solveEckartPotential } from "./eckart-potential.js";
export { FiniteSquareWellSolution, solveFiniteSquareWell } from "./finite-square-well.js";
export { HarmonicOscillatorSolution, solveHarmonicOscillator } from "./harmonic-oscillator.js";
export { InfiniteSquareWellSolution, solveInfiniteWell } from "./infinite-square-well.js";
export { MorsePotentialSolution, solveMorsePotential } from "./morse-potential.js";
export { solveMultiCoulomb1D } from "./multi-coulomb-1d.js";
export { solveMultiSquareWell } from "./multi-square-well.js";
export { PoschlTellerPotentialSolution, solvePoschlTellerPotential } from "./poschl-teller-potential.js";
export { RosenMorsePotentialSolution, solveRosenMorsePotential } from "./rosen-morse-potential.js";
export { solveTriangularPotential, TriangularPotentialSolution } from "./triangular-potential.js";

// Register all solutions with the QPPW namespace
qppw.register("AnalyticalSolutions", {
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
  solveMultiCoulomb1D,
});
