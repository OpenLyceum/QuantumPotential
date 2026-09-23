import {
  type AnalyticalSolution,
  AsymmetricTrianglePotentialSolution,
  Coulomb1DPotentialSolution,
  EckartPotentialSolution,
  FiniteSquareWellSolution,
  HarmonicOscillatorSolution,
  InfiniteSquareWellSolution,
  MorsePotentialSolution,
  PoschlTellerPotentialSolution,
  RosenMorsePotentialSolution,
  TriangularPotentialSolution,
} from "./analytical-solutions/index.js";
import { PotentialType, type WellParameters } from "./PotentialFunction.js";
import {
  AsymmetricTrianglePotential,
  type BasePotential,
  Coulomb1DPotential,
  EckartPotential,
  FiniteSquareWellPotential,
  HarmonicOscillatorPotential,
  InfiniteSquareWellPotential,
  MorsePotential,
  PoschlTellerPotential,
  RosenMorsePotential,
  TriangularPotential,
} from "./potentials/index.js";

/** The typed switch keeps each potential's required parameters beside its constructors. */
function creators(
  params: WellParameters,
  mass: number,
): {
  solution: () => AnalyticalSolution;
  potential: () => BasePotential;
} | null {
  switch (params.type) {
    case PotentialType.INFINITE_WELL:
      return {
        solution: () => new InfiniteSquareWellSolution(params.wellWidth, mass),
        potential: () => new InfiniteSquareWellPotential(params.wellWidth, mass),
      };
    case PotentialType.FINITE_WELL:
      return {
        solution: () => new FiniteSquareWellSolution(params.wellWidth, params.wellDepth, mass),
        potential: () => new FiniteSquareWellPotential(params.wellWidth, params.wellDepth, mass),
      };
    case PotentialType.HARMONIC_OSCILLATOR:
      return {
        solution: () => new HarmonicOscillatorSolution(params.springConstant, mass),
        potential: () => new HarmonicOscillatorPotential(params.springConstant, mass),
      };
    case PotentialType.MORSE:
      return {
        solution: () =>
          new MorsePotentialSolution(params.dissociationEnergy, params.wellWidth, params.equilibriumPosition, mass),
        potential: () =>
          new MorsePotential(params.dissociationEnergy, params.wellWidth, params.equilibriumPosition, mass),
      };
    case PotentialType.POSCHL_TELLER:
      return {
        solution: () => new PoschlTellerPotentialSolution(params.potentialDepth, params.wellWidth, mass),
        potential: () => new PoschlTellerPotential(params.potentialDepth, params.wellWidth, mass),
      };
    case PotentialType.ROSEN_MORSE:
      return {
        solution: () =>
          new RosenMorsePotentialSolution(params.potentialDepth, params.barrierHeight, params.wellWidth, mass),
        potential: () => new RosenMorsePotential(params.potentialDepth, params.barrierHeight, params.wellWidth, mass),
      };
    case PotentialType.ECKART:
      return {
        solution: () =>
          new EckartPotentialSolution(params.potentialDepth, params.barrierHeight, params.wellWidth, mass),
        potential: () => new EckartPotential(params.potentialDepth, params.barrierHeight, params.wellWidth, mass),
      };
    case PotentialType.ASYMMETRIC_TRIANGLE:
      return {
        solution: () => new AsymmetricTrianglePotentialSolution(params.slope, params.wellWidth, mass),
        potential: () => new AsymmetricTrianglePotential(params.slope, params.wellWidth, mass),
      };
    case PotentialType.COULOMB_1D:
      return {
        solution: () => new Coulomb1DPotentialSolution(params.coulombStrength, mass),
        potential: () => new Coulomb1DPotential(params.coulombStrength, mass),
      };
    case PotentialType.TRIANGULAR:
      return {
        solution: () => new TriangularPotentialSolution(params.wellDepth, params.wellWidth, params.energyOffset, mass),
        potential: () => new TriangularPotential(params.wellDepth, params.wellWidth, params.energyOffset, mass),
      };
    default:
      return null;
  }
}

export const PotentialFactory = {
  createAnalyticalSolution(params: WellParameters, mass: number): AnalyticalSolution | null {
    return creators(params, mass)?.solution() ?? null;
  },

  createPotential(params: WellParameters, mass: number): BasePotential | null {
    return creators(params, mass)?.potential() ?? null;
  },
};
