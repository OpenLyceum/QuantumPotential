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
  DOUBLE_SQUARE_WELL: "doubleSquareWell",
  DOUBLE_POSCHL_TELLER: "doublePoschlTeller",
  MULTI_SQUARE_WELL: "multiSquareWell",
  MULTI_POSCHL_TELLER: "multiPoschlTeller",
  TRIANGULAR: "triangular",
  CUSTOM: "custom",
} as const;

export type PotentialType = (typeof PotentialType)[keyof typeof PotentialType];

/**
 * Typed parameters passed to analytical and numerical potential solvers.
 */
export type SingleWellParameters =
  | { type: typeof PotentialType.INFINITE_WELL; wellWidth: number }
  | { type: typeof PotentialType.FINITE_WELL; wellWidth: number; wellDepth: number }
  | { type: typeof PotentialType.HARMONIC_OSCILLATOR; springConstant: number }
  | { type: typeof PotentialType.MORSE; dissociationEnergy: number; wellWidth: number; equilibriumPosition: number }
  | { type: typeof PotentialType.POSCHL_TELLER; potentialDepth: number; wellWidth: number }
  | { type: typeof PotentialType.ROSEN_MORSE; potentialDepth: number; barrierHeight: number; wellWidth: number }
  | { type: typeof PotentialType.ECKART; potentialDepth: number; barrierHeight: number; wellWidth: number }
  | { type: typeof PotentialType.ASYMMETRIC_TRIANGLE; slope: number; wellWidth: number }
  | { type: typeof PotentialType.COULOMB_1D; coulombStrength: number }
  | { type: typeof PotentialType.TRIANGULAR; wellDepth: number; wellWidth: number; energyOffset: number };

export type MultiWellParameters =
  | {
      type: typeof PotentialType.DOUBLE_SQUARE_WELL;
      wellWidth: number;
      wellDepth: number;
      wellSeparation: number;
      electricField?: number;
    }
  | {
      type: typeof PotentialType.DOUBLE_POSCHL_TELLER;
      wellWidth: number;
      wellDepth: number;
      wellSeparation: number;
      electricField?: number;
    }
  | {
      type: typeof PotentialType.MULTI_SQUARE_WELL;
      numberOfWells: number;
      wellWidth: number;
      wellDepth: number;
      wellSeparation: number;
      electricField?: number;
    }
  | {
      type: typeof PotentialType.MULTI_POSCHL_TELLER;
      numberOfWells: number;
      wellWidth: number;
      wellDepth: number;
      wellSeparation: number;
      electricField?: number;
    };

/** All solver parameters are in SI units. Required fields follow the potential type. */
export type WellParameters = SingleWellParameters | MultiWellParameters;

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
export type SolverMethod = "analytical" | "numerov" | "fgh";

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

qppw.register("PotentialFunction", { PotentialType });

export type { PotentialFunction as default };
