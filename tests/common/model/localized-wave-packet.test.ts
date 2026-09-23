import { describe, expect, it } from "vitest";
import {
  createLocalizedWavePacket,
  createMovingWavePacket,
  createTwoLobedWavePacket,
} from "../../../src/common/model/LocalizedWavePacket.js";
import type { BoundStateResult } from "../../../src/common/model/PotentialFunction.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";
import { type SuperpositionConfig, SuperpositionType } from "../../../src/common/model/SuperpositionType.js";
import { OneWellModel } from "../../../src/one-well/model/OneWellModel.js";

function moments(states: BoundStateResult, config: SuperpositionConfig): { mean: number; spread: number } {
  let total = 0;
  let first = 0;
  let second = 0;
  for (let i = 0; i < states.xGrid.length; i++) {
    let wave = 0;
    for (let n = 0; n < config.amplitudes.length; n++) {
      wave += config.amplitudes[n]! * Math.cos(config.phases[n]!) * states.wavefunctions[n]![i]!;
    }
    const weight = wave * wave;
    const xNm = states.xGrid[i]! * QuantumConstants.M_TO_NM;
    total += weight;
    first += xNm * weight;
    second += xNm * xNm * weight;
  }
  const mean = first / total;
  return { mean, spread: Math.sqrt(second / total - mean * mean) };
}

function complexWave(states: BoundStateResult, config: SuperpositionConfig): { real: number[]; imaginary: number[] } {
  const real = new Array<number>(states.xGrid.length).fill(0);
  const imaginary = new Array<number>(states.xGrid.length).fill(0);
  for (let n = 0; n < config.amplitudes.length; n++) {
    const coefficientReal = config.amplitudes[n]! * Math.cos(config.phases[n]!);
    const coefficientImaginary = config.amplitudes[n]! * Math.sin(config.phases[n]!);
    for (let i = 0; i < states.xGrid.length; i++) {
      real[i]! += coefficientReal * states.wavefunctions[n]![i]!;
      imaginary[i]! += coefficientImaginary * states.wavefunctions[n]![i]!;
    }
  }
  return { real, imaginary };
}

describe("localized wave packet", () => {
  it("projects position and width onto every available bound state", () => {
    const model = new OneWellModel();
    const states = model.getBoundStates()!;
    const left = createLocalizedWavePacket(states, -0.7, 0.35);
    const right = createLocalizedWavePacket(states, 0.7, 0.35);
    const wide = createLocalizedWavePacket(states, 0.7, 0.8);

    expect(right.amplitudes).toHaveLength(states.energies.length);
    expect(right.phases).toHaveLength(states.energies.length);
    expect(right.amplitudes.reduce((sum, amplitude) => sum + amplitude * amplitude, 0)).toBeCloseTo(1, 8);
    expect(moments(states, right).mean).toBeGreaterThan(moments(states, left).mean + 0.8);
    expect(moments(states, wide).spread).toBeGreaterThan(moments(states, right).spread);

    model.superpositionConfigProperty.value = right;
    model.superpositionTypeProperty.value = SuperpositionType.LOCALIZED;
    model.wellWidthProperty.value = 3.2;
    const changedStates = model.getBoundStates()!;
    const updated = model.getSuperpositionConfigForBoundStates(changedStates);
    expect(updated.amplitudes).toHaveLength(changedStates.energies.length);
    expect(updated.position).toBe(0.7);
    expect(updated.width).toBe(0.35);
    expect(updated.amplitudes.reduce((sum, amplitude) => sum + amplitude * amplitude, 0)).toBeCloseTo(1, 8);
    model.dispose();
  });
});

describe("complex wave packet presets", () => {
  it("uses momentum to set the direction of travel", () => {
    const model = new OneWellModel();
    const states = model.getBoundStates()!;
    const momentumSign = (momentum: number) => {
      const config = createMovingWavePacket(states, 0, 0.4, momentum);
      const wave = complexWave(states, config);
      let current = 0;
      for (let i = 0; i < states.xGrid.length - 1; i++) {
        current += wave.real[i]! * wave.imaginary[i + 1]! - wave.imaginary[i]! * wave.real[i + 1]!;
      }
      return current;
    };
    expect(momentumSign(3)).toBeGreaterThan(0);
    expect(momentumSign(-3)).toBeLessThan(0);
    model.dispose();
  });

  it("uses relative phase to control interference between two lobes", () => {
    const model = new OneWellModel();
    const states = model.getBoundStates()!;
    const inPhase = createTwoLobedWavePacket(states, -0.7, 0.7, 0.4, 0);
    const outOfPhase = createTwoLobedWavePacket(states, -0.7, 0.7, 0.4, Math.PI);
    const center = Math.floor(states.xGrid.length / 2);
    const evenWave = complexWave(states, inPhase);
    const oddWave = complexWave(states, outOfPhase);
    const evenDensity = evenWave.real[center]! ** 2 + evenWave.imaginary[center]! ** 2;
    const oddDensity = oddWave.real[center]! ** 2 + oddWave.imaginary[center]! ** 2;
    expect(oddDensity).toBeLessThan(evenDensity * 0.1);
    expect(outOfPhase.amplitudes.reduce((sum, amplitude) => sum + amplitude ** 2, 0)).toBeCloseTo(1, 8);
    model.dispose();
  });
});
