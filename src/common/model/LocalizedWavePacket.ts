/** Project position-space wave packets onto the available bound eigenstates. */

import type { BoundStateResult } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";
import { type SuperpositionConfig, SuperpositionType } from "./SuperpositionType.js";

type ComplexValue = { real: number; imaginary: number };

function gaussian(xNm: number, centerNm: number, widthNm: number): number {
  const distance = (xNm - centerNm) / Math.max(widthNm, 0.01);
  // |ψ|² has standard deviation widthNm when ψ ∝ exp(-d² / 4).
  return Math.exp(-(distance * distance) / 4);
}

function projectTarget(
  states: BoundStateResult,
  target: (xNm: number) => ComplexValue,
  parameters: Pick<
    SuperpositionConfig,
    "type" | "position" | "width" | "momentum" | "secondPosition" | "relativePhase"
  >,
): SuperpositionConfig {
  const xGrid = states.xGrid;
  const values = xGrid.map((x) => target(x * QuantumConstants.M_TO_NM));
  const coefficients = states.wavefunctions.map((wavefunction) => {
    let real = 0;
    let imaginary = 0;
    for (let i = 1; i < xGrid.length; i++) {
      const dx = xGrid[i]! - xGrid[i - 1]!;
      real += (dx / 2) * (wavefunction[i - 1]! * values[i - 1]!.real + wavefunction[i]! * values[i]!.real);
      imaginary +=
        (dx / 2) * (wavefunction[i - 1]! * values[i - 1]!.imaginary + wavefunction[i]! * values[i]!.imaginary);
    }
    return { real, imaginary };
  });

  const squaredNorm = coefficients.reduce(
    (sum, coefficient) => sum + coefficient.real ** 2 + coefficient.imaginary ** 2,
    0,
  );
  const norm = Math.sqrt(squaredNorm);
  const amplitudes = coefficients.map(({ real, imaginary }) => (norm > 0 ? Math.hypot(real, imaginary) / norm : 0));
  if (norm === 0 && amplitudes.length > 0) {
    amplitudes[0] = 1;
  }
  return {
    ...parameters,
    amplitudes,
    phases: coefficients.map(({ real, imaginary }) => Math.atan2(imaginary, real)),
  };
}

export function createLocalizedWavePacket(
  states: BoundStateResult,
  positionNm: number,
  widthNm: number,
): SuperpositionConfig {
  return projectTarget(states, (xNm) => ({ real: gaussian(xNm, positionNm, widthNm), imaginary: 0 }), {
    type: SuperpositionType.LOCALIZED,
    position: positionNm,
    width: widthNm,
  });
}

/** Momentum is measured in ℏ/nm, so its numeric value is the carrier wave number in rad/nm. */
export function createMovingWavePacket(
  states: BoundStateResult,
  positionNm: number,
  widthNm: number,
  momentum: number,
): SuperpositionConfig {
  return projectTarget(
    states,
    (xNm) => {
      const envelope = gaussian(xNm, positionNm, widthNm);
      const phase = momentum * (xNm - positionNm);
      return { real: envelope * Math.cos(phase), imaginary: envelope * Math.sin(phase) };
    },
    { type: SuperpositionType.MOVING_LOCALIZED, position: positionNm, width: widthNm, momentum },
  );
}

export function createTwoLobedWavePacket(
  states: BoundStateResult,
  firstPositionNm: number,
  secondPositionNm: number,
  widthNm: number,
  relativePhase: number,
): SuperpositionConfig {
  return projectTarget(
    states,
    (xNm) => {
      const first = gaussian(xNm, firstPositionNm, widthNm);
      const second = gaussian(xNm, secondPositionNm, widthNm);
      return { real: first + second * Math.cos(relativePhase), imaginary: second * Math.sin(relativePhase) };
    },
    {
      type: SuperpositionType.TWO_LOBED,
      position: firstPositionNm,
      secondPosition: secondPositionNm,
      width: widthNm,
      relativePhase,
    },
  );
}

export function isSpatialPresetType(type: SuperpositionConfig["type"]): boolean {
  return (
    type === SuperpositionType.LOCALIZED ||
    type === SuperpositionType.MOVING_LOCALIZED ||
    type === SuperpositionType.TWO_LOBED
  );
}

/** Build the spatial preset described by a config, using defaults for parameters not yet chosen. */
export function createProjectedWavePacket(
  states: BoundStateResult,
  parameters: Pick<
    SuperpositionConfig,
    "type" | "position" | "width" | "momentum" | "secondPosition" | "relativePhase"
  >,
): SuperpositionConfig {
  const position = parameters.position ?? 0;
  const width = parameters.width ?? 0.5;
  switch (parameters.type) {
    case SuperpositionType.MOVING_LOCALIZED:
      return createMovingWavePacket(states, position, width, parameters.momentum ?? 2);
    case SuperpositionType.TWO_LOBED:
      return createTwoLobedWavePacket(
        states,
        position,
        parameters.secondPosition ?? 1.5,
        width,
        parameters.relativePhase ?? 0,
      );
    case SuperpositionType.LOCALIZED:
      return createLocalizedWavePacket(states, position, width);
    default:
      throw new Error(`Unsupported spatial preset: ${parameters.type}`);
  }
}
