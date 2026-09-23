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
  LOCALIZED: "localized",
  MOVING_LOCALIZED: "movingLocalized",
  TWO_LOBED: "twoLobed",
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
  /** Zero-based indices of the selected pair for the two-state preset */
  stateIndices?: [number, number];
  /** Displacement from equilibrium in nm (for coherent states) */
  displacement?: number;
  /** Center of a localized wave packet in nm */
  position?: number;
  /** Standard deviation of its probability density in nm */
  width?: number;
  /** Mean momentum in units of ℏ/nm for a moving packet */
  momentum?: number;
  /** Center of the second lobe in nm */
  secondPosition?: number;
  /** Relative phase of the second lobe in radians */
  relativePhase?: number;
};

qppw.register("SuperpositionType", { SuperpositionType });

export default SuperpositionType;
