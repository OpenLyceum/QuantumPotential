/**
 * Analytical solutions for well-known quantum potentials.
 * These provide exact solutions without numerical approximation.
 *
 * This module exports all analytical solution functions and classes for various quantum potentials.
 */

import qppw from "../../../QPPWNamespace.js";

// Export the abstract base class
export { AnalyticalSolution } from "./AnalyticalSolution.js";
export {
  AsymmetricTrianglePotentialSolution,
  calculateAsymmetricTriangleClassicalProbability,
  calculateAsymmetricTriangleTurningPoints,
  calculateAsymmetricTriangleWavefunctionSecondDerivative,
  calculateAsymmetricTriangleWavefunctionZeros,
  createAsymmetricTrianglePotential,
  solveAsymmetricTrianglePotential,
} from "./asymmetric-triangle-potential.js";
export {
  Coulomb1DPotentialSolution,
  calculateCoulomb1DClassicalProbability,
  calculateCoulomb1DTurningPoints,
  calculateCoulomb1DWavefunctionSecondDerivative,
  calculateCoulomb1DWavefunctionZeros,
  createCoulomb1DPotential,
  solveCoulomb1DPotential,
} from "./coulomb-1d-potential.js";
export { solveDoubleSquareWellAnalytical } from "./double-square-well.js";
export {
  calculateEckartPotentialClassicalProbability,
  calculateEckartPotentialTurningPoints,
  calculateEckartPotentialWavefunctionSecondDerivative,
  calculateEckartPotentialWavefunctionZeros,
  createEckartPotential,
  EckartPotentialSolution,
  solveEckartPotential,
} from "./eckart-potential.js";
export {
  calculateFiniteWellClassicalProbability,
  calculateFiniteWellTurningPoints,
  calculateFiniteWellWavefunctionSecondDerivative,
  calculateFiniteWellWavefunctionZeros,
  createFiniteWellPotential,
  FiniteSquareWellSolution,
  solveFiniteSquareWell,
} from "./finite-square-well.js";
// Export Fourier transform helper functions
export {
  computeNumericalFourierTransform,
  convertToMomentum,
  convertToWavenumber,
} from "./fourier-transform-helper.js";
export {
  calculateHarmonicOscillatorClassicalProbability,
  calculateHarmonicOscillatorTurningPoints,
  calculateHarmonicOscillatorWavefunctionSecondDerivative,
  calculateHarmonicOscillatorWavefunctionZeros,
  createHarmonicOscillatorPotential,
  HarmonicOscillatorSolution,
  solveHarmonicOscillator,
} from "./harmonic-oscillator.js";
// Export all analytical solution functions and classes
export {
  calculateInfiniteWellClassicalProbability,
  calculateInfiniteWellTurningPoints,
  calculateInfiniteWellWavefunctionSecondDerivative,
  calculateInfiniteWellWavefunctionZeros,
  createInfiniteWellPotential,
  InfiniteSquareWellSolution,
  solveInfiniteWell,
} from "./infinite-square-well.js";
// Export utility functions that may be useful externally
export * from "./math-utilities.js";
export {
  calculateMorsePotentialClassicalProbability,
  calculateMorsePotentialTurningPoints,
  calculateMorsePotentialWavefunctionSecondDerivative,
  calculateMorsePotentialWavefunctionZeros,
  createMorsePotential,
  MorsePotentialSolution,
  solveMorsePotential,
} from "./morse-potential.js";
export { solveMultiCoulomb1D } from "./multi-coulomb-1d.js";
export { solveMultiSquareWell } from "./multi-square-well.js";
export {
  calculatePoschlTellerClassicalProbability,
  calculatePoschlTellerTurningPoints,
  calculatePoschlTellerWavefunctionSecondDerivative,
  calculatePoschlTellerWavefunctionZeros,
  createPoschlTellerPotential,
  PoschlTellerPotentialSolution,
  solvePoschlTellerPotential,
} from "./poschl-teller-potential.js";
export {
  calculateRosenMorsePotentialClassicalProbability,
  calculateRosenMorsePotentialTurningPoints,
  calculateRosenMorsePotentialWavefunctionSecondDerivative,
  calculateRosenMorsePotentialWavefunctionZeros,
  createRosenMorsePotential,
  RosenMorsePotentialSolution,
  solveRosenMorsePotential,
} from "./rosen-morse-potential.js";
export {
  calculateTriangularPotentialClassicalProbability,
  calculateTriangularPotentialTurningPoints,
  calculateTriangularPotentialWavefunctionSecondDerivative,
  calculateTriangularPotentialWavefunctionZeros,
  createTriangularPotential,
  solveTriangularPotential,
  TriangularPotentialSolution,
} from "./triangular-potential.js";

import { solveAsymmetricTrianglePotential } from "./asymmetric-triangle-potential.js";
import { solveCoulomb1DPotential } from "./coulomb-1d-potential.js";
import { solveDoubleSquareWellAnalytical } from "./double-square-well.js";
import { solveEckartPotential } from "./eckart-potential.js";
import { solveFiniteSquareWell } from "./finite-square-well.js";
import { solveHarmonicOscillator } from "./harmonic-oscillator.js";
// Import all functions for registration
import { solveInfiniteWell } from "./infinite-square-well.js";
import { solveMorsePotential } from "./morse-potential.js";
import { solveMultiCoulomb1D } from "./multi-coulomb-1d.js";
import { solveMultiSquareWell } from "./multi-square-well.js";
import { solvePoschlTellerPotential } from "./poschl-teller-potential.js";
import { solveRosenMorsePotential } from "./rosen-morse-potential.js";
import { solveTriangularPotential } from "./triangular-potential.js";

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
