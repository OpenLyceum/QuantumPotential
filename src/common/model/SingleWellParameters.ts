import { PotentialType, type SingleWellParameters } from "./PotentialFunction.js";

/** Converts the controls shared by Intro and One Well into the solver's typed SI parameters. */
export function createSingleWellParameters(
  type: PotentialType,
  width: number,
  depth: number,
  barrierHeight: number,
  energyOffset: number,
  springConstantMultiplier: number,
  coulombStrength: number,
): SingleWellParameters {
  switch (type) {
    case PotentialType.INFINITE_WELL:
      return { type, wellWidth: width };
    case PotentialType.FINITE_WELL:
      return { type, wellWidth: width, wellDepth: depth };
    case PotentialType.HARMONIC_OSCILLATOR:
      return { type, springConstant: (springConstantMultiplier * depth) / (width * width) };
    case PotentialType.MORSE:
      return { type, dissociationEnergy: depth, wellWidth: width, equilibriumPosition: 0 };
    case PotentialType.POSCHL_TELLER:
      return { type, potentialDepth: depth, wellWidth: width };
    case PotentialType.ROSEN_MORSE:
    case PotentialType.ECKART:
      return { type, potentialDepth: depth, barrierHeight, wellWidth: width };
    case PotentialType.ASYMMETRIC_TRIANGLE:
      return { type, slope: depth / width, wellWidth: width };
    case PotentialType.TRIANGULAR:
      return { type, wellDepth: depth, wellWidth: width, energyOffset };
    case PotentialType.COULOMB_1D:
      return { type, coulombStrength };
    default:
      throw new Error(`Unsupported single-well potential: ${type}`);
  }
}
