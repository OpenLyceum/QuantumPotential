/**
 * Type definitions for superposition states.
 */

import qppw from "../../QPPWNamespace.js";

/**
 * Type of superposition state
 */
export const SuperpositionType = {
  PSI_I_PSI_J: "psiIPsiJ",
  SINGLE: "eigenfunction",
  LOCALIZED_NARROW: "localizedNarrow",
  LOCALIZED_WIDE: "localizedWide",
  COHERENT: "coherent",
  CUSTOM: "custom",
} as const;

export type SuperpositionType = (typeof SuperpositionType)[keyof typeof SuperpositionType];

/**
 * Configuration for a superposition state
 */
export type SuperpositionConfig = {
  /** Type of superposition */
  type: SuperpositionType;
  /** Amplitudes for each eigenstate (must sum to 1 when squared) */
  amplitudes: number[];
  /** Phases for each eigenstate (in radians) */
  phases: number[];
  /** Displacement from equilibrium in nm (for coherent states) */
  displacement?: number;
};

qppw.register("SuperpositionType", { SuperpositionType });

export default SuperpositionType;
