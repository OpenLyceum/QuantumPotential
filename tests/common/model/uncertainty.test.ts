/**
 * The harmonic-oscillator ground state is a minimum-uncertainty state, so Δx·Δk = ½ with k the
 * angular wavenumber p/ħ. This pins the units used by the wavenumber chart's description (which
 * plots 1/λ = k/2π and must multiply by 2π before comparing with Heisenberg's bound).
 */

import { describe, expect, it } from "vitest";
import { calculateRMSStatistics } from "../../../src/common/model/DistributionStatistics.js";
import { PotentialType } from "../../../src/common/model/PotentialFunction.js";
import { IntroModel } from "../../../src/intro/model/IntroModel.js";

describe("position–momentum uncertainty", () => {
  it("is ½ for the harmonic-oscillator ground state", () => {
    const model = new IntroModel();
    model.potentialTypeProperty.value = PotentialType.HARMONIC_OSCILLATOR;

    const boundStates = model.getBoundStates()!;
    const position = model.getWavefunctionInNmUnits(1)!;
    const transform = model.getWavenumberTransform()!;

    const xNm = boundStates.xGrid.map((x) => x * 1e9);
    const deltaX = calculateRMSStatistics(xNm, position.probabilityDensity)!.rms; // nm

    const kRadPerNm = transform.kGrid.map((k) => k * 1e-9);
    const phi = transform.wavenumberWavefunctions[0]!;
    const deltaK = calculateRMSStatistics(
      kRadPerNm,
      phi.map((value) => value * value),
    )!.rms; // rad/nm

    expect(deltaX * deltaK).toBeCloseTo(0.5, 2);
    expect(model.getWavenumberDistribution(0)?.uncertaintyProduct).toBeCloseTo(0.5, 2);
    expect(model.getPositionStatistics(0)?.rms).toBeCloseTo(deltaX, 8);
    model.dispose();
  });
});

describe("calculateRMSStatistics", () => {
  it("returns null for an empty distribution instead of NaN", () => {
    expect(calculateRMSStatistics([0, 1, 2], [0, 0, 0])).toBeNull();
  });

  it("never reports a NaN spread for a point-like distribution", () => {
    const stats = calculateRMSStatistics([0, 1, 2, 3], [0, 1, 1, 0]);
    expect(stats).not.toBeNull();
    expect(Number.isFinite(stats!.rms)).toBe(true);
  });
});

it("uses the same phase for an eigenstate and a single-state superposition", () => {
  const model = new IntroModel();
  model.timeProperty.value = 0.25;
  const eigenstate = model.getTimeEvolvedEigenstateInNmUnits(0)!;
  const superposition = model.getTimeEvolvedSuperpositionInNmUnits(0.25e-15)!;
  expect(eigenstate.realPart[500]).toBeCloseTo(superposition.realPart[500]!, 12);
  expect(eigenstate.imagPart[500]).toBeCloseTo(superposition.imagPart[500]!, 12);
  model.dispose();
});
