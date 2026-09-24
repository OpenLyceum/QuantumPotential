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

export const PotentialFactory = {
  /**
   * The closed-form solution for a potential type, or null when the type is solved another way (the double
   * square well's own function, or the numerical solver). The typed switch keeps each potential's required
   * parameters beside its constructor.
   */
  createAnalyticalSolution(params: WellParameters, mass: number): AnalyticalSolution | null {
    switch (params.type) {
      case PotentialType.INFINITE_WELL:
        return new InfiniteSquareWellSolution(params.wellWidth, mass);
      case PotentialType.FINITE_WELL:
        return new FiniteSquareWellSolution(params.wellWidth, params.wellDepth, mass);
      case PotentialType.HARMONIC_OSCILLATOR:
        return new HarmonicOscillatorSolution(params.springConstant, mass);
      case PotentialType.MORSE:
        return new MorsePotentialSolution(
          params.dissociationEnergy,
          params.wellWidth,
          params.equilibriumPosition,
          mass,
        );
      case PotentialType.POSCHL_TELLER:
        return new PoschlTellerPotentialSolution(params.potentialDepth, params.wellWidth, mass);
      case PotentialType.ROSEN_MORSE:
        return new RosenMorsePotentialSolution(params.potentialDepth, params.barrierHeight, params.wellWidth, mass);
      case PotentialType.ECKART:
        return new EckartPotentialSolution(params.potentialDepth, params.barrierHeight, params.wellWidth, mass);
      case PotentialType.ASYMMETRIC_TRIANGLE:
        return new AsymmetricTrianglePotentialSolution(params.slope, params.wellWidth, mass);
      case PotentialType.COULOMB_1D:
        return new Coulomb1DPotentialSolution(params.coulombStrength, mass);
      case PotentialType.TRIANGULAR:
        return new TriangularPotentialSolution(params.wellDepth, params.wellWidth, params.energyOffset, mass);
      default:
        return null;
    }
  },
};
