/**
 * Type definitions and interfaces for potential energy functions.
 */

import qppw from "../../QPPWNamespace.js";

/**
 * Type of potential well for analytical solution selection
 */
export const PotentialType = {
  INFINITE_WELL: "infiniteWell",
  FINITE_WELL: "finiteWell",
  HARMONIC_OSCILLATOR: "harmonicOscillator",
  MORSE: "morse",
  POSCHL_TELLER: "poschlTeller",
  ROSEN_MORSE: "rosenMorse",
  ECKART: "eckart",
  ASYMMETRIC_TRIANGLE: "asymmetricTriangle",
  COULOMB_1D: "coulomb1D",
  COULOMB_3D: "coulomb3D",
  DOUBLE_SQUARE_WELL: "doubleSquareWell",
  MULTI_SQUARE_WELL: "multiSquareWell",
  MULTI_COULOMB_1D: "multiCoulomb1D",
  TRIANGULAR: "triangular",
  CUSTOM: "custom",
} as const;

export type PotentialType = (typeof PotentialType)[keyof typeof PotentialType];

/**
 * Configuration for potential well parameters (for analytical solutions)
 */
export type WellParameters = {
  /** Type of potential well */
  type: PotentialType;
  /** Well width for infinite/finite well (meters) */
  wellWidth?: number;
  /** Well depth for finite square well (Joules, positive value) */
  wellDepth?: number;
  /** Spring constant for harmonic oscillator (N/m) */
  springConstant?: number;
  /** Dissociation energy for Morse potential (Joules) */
  dissociationEnergy?: number;
  /** Equilibrium position for Morse potential (meters) */
  equilibriumPosition?: number;
  /** Potential depth for Pöschl-Teller, Rosen-Morse, and Eckart potentials (Joules) */
  potentialDepth?: number;
  /** Barrier height for Rosen-Morse and Eckart potentials (Joules) */
  barrierHeight?: number;
  /** Slope parameter for asymmetric triangle potential (Joules/meter) */
  slope?: number;
  /** Coulomb strength parameter α for Coulomb potentials (J·m) */
  coulombStrength?: number;
  /** Well separation for double square well (meters) */
  wellSeparation?: number;
  /** Energy offset for triangular potential (Joules) */
  energyOffset?: number;
  /** Number of wells for multi-square well and multi-Coulomb 1D (1-10) */
  numberOfWells?: number;
};

/**
 * A function that returns the potential energy at a given position.
 * @param x - Position in meters
 * @returns Potential energy in Joules
 */
export type PotentialFunction = (x: number) => number;

/**
 * Configuration for the spatial grid used in numerical calculations
 */
export type GridConfig = {
  /** Minimum x value in meters */
  xMin: number;
  /** Maximum x value in meters */
  xMax: number;
  /** Number of grid points */
  numPoints: number;
};

/**
 * Valid solver method identifiers
 */
export type SolverMethod = "analytical" | "numerov" | "matrix_numerov" | "dvr" | "fgh" | "spectral" | "quantum_bound";

/**
 * Result from solving the Schrödinger equation
 */
export type BoundStateResult = {
  /** Energy eigenvalues in Joules */
  energies: number[];
  /** Wavefunctions (each row is one eigenstate) */
  wavefunctions: number[][];
  /** Grid x-positions in meters */
  xGrid: number[];
  /** Whether analytical or numerical solution was used */
  method: SolverMethod;
};

/**
 * Result from solving only for energies (no wavefunctions)
 */
export type EnergyOnlyResult = {
  /** Energy eigenvalues in Joules */
  energies: number[];
  /** Method used to find energies */
  method: SolverMethod;
};

/**
 * Result from computing the Fourier transform of a wavefunction.
 * The Fourier transform of ψ(x) is:
 * φ(p) = (1/√(2πℏ)) ∫ ψ(x) e^(-ipx/ℏ) dx
 *
 * where p is momentum in kg·m/s.
 */
export type FourierTransformResult = {
  /** Momentum values in kg·m/s */
  pGrid: number[];
  /** Fourier-transformed wavefunctions in momentum space (each row is one eigenstate) */
  momentumWavefunctions: number[][];
  /** Method used to compute the transform ('analytical' or 'numerical') */
  method: "analytical" | "numerical";
};

/**
 * Result from computing the Fourier transform in wavenumber representation.
 * This is the same as FourierTransformResult but with wavenumber k = p/ℏ instead of momentum p.
 * The wavenumber representation is often more convenient for visualization and analysis.
 */
export type WavenumberTransformResult = {
  /** Wavenumber values in rad/m (or 1/m) */
  kGrid: number[];
  /** Fourier-transformed wavefunctions in wavenumber space (each row is one eigenstate) */
  wavenumberWavefunctions: number[][];
  /** Method used to compute the transform ('analytical' or 'numerical') */
  method: "analytical" | "numerical";
};

qppw.register("PotentialFunction", { PotentialType });

export type { PotentialFunction as default };
