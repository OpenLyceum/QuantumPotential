/**
 * QPPWDescriber provides accessible descriptions for quantum potential concepts.
 * This helps screen reader users understand the physics behind different potential types
 * and simulation states.
 */

import { PotentialType } from "../../model/PotentialFunction.js";
import { SuperpositionType } from "../../model/SuperpositionType.js";

export const QPPWDescriber = {
  /**
   * Get a simple name for a potential type.
   */
  getPotentialTypeName(potentialType: PotentialType): string {
    const names: Record<PotentialType, string> = {
      [PotentialType.INFINITE_WELL]: "Infinite Well",
      [PotentialType.FINITE_WELL]: "Finite Well",
      [PotentialType.HARMONIC_OSCILLATOR]: "Harmonic Oscillator",
      [PotentialType.MORSE]: "Morse Potential",
      [PotentialType.POSCHL_TELLER]: "Pöschl-Teller Potential",
      [PotentialType.ROSEN_MORSE]: "Rosen-Morse Potential",
      [PotentialType.ECKART]: "Eckart Potential",
      [PotentialType.ASYMMETRIC_TRIANGLE]: "Asymmetric Triangle",
      [PotentialType.TRIANGULAR]: "Triangular Well",
      [PotentialType.COULOMB_1D]: "1D Coulomb Potential",
      [PotentialType.COULOMB_3D]: "3D Coulomb Potential",
      [PotentialType.DOUBLE_SQUARE_WELL]: "Double Square Well",
      [PotentialType.MULTI_SQUARE_WELL]: "Multiple Square Wells",
      [PotentialType.MULTI_COULOMB_1D]: "Multiple Coulomb Centers",
      [PotentialType.CUSTOM]: "Custom Potential",
    };

    return names[potentialType] || "Unknown Potential";
  },

  /**
   * Get a physics description for a potential type.
   */
  getPotentialTypeDescription(potentialType: PotentialType): string {
    const descriptions: Record<PotentialType, string> = {
      [PotentialType.INFINITE_WELL]:
        "Particle confined in rigid box with infinite barriers. Exactly solvable with uniform energy spacing.",

      [PotentialType.FINITE_WELL]:
        "Square well with finite barrier height. " +
        "Realistic model with exponentially decaying wavefunctions outside well.",

      [PotentialType.HARMONIC_OSCILLATOR]:
        "Quadratic potential resembling mass on spring. Energy levels uniformly spaced.",

      [PotentialType.MORSE]:
        "Models molecular vibrations with anharmonic oscillations. Energy spacing decreases at higher levels.",

      [PotentialType.POSCHL_TELLER]:
        "Exactly solvable hyperbolic secant potential. Important in quantum scattering theory.",

      [PotentialType.ROSEN_MORSE]: "Variant of Pöschl-Teller with different asymptotic behavior.",

      [PotentialType.ECKART]: "Barrier potential used in molecular physics. Models quantum tunneling through barriers.",

      [PotentialType.ASYMMETRIC_TRIANGLE]:
        "Tilted potential well with linear slope. Models particle in electric field.",

      [PotentialType.TRIANGULAR]: "V-shaped potential well. Related to Airy functions.",

      [PotentialType.COULOMB_1D]:
        "One-dimensional hydrogen-like attractive potential. Energy levels follow 1/n² pattern.",

      [PotentialType.COULOMB_3D]:
        "Three-dimensional hydrogen atom potential. Includes angular momentum quantum numbers.",

      [PotentialType.DOUBLE_SQUARE_WELL]:
        "Two square wells separated by barrier. Demonstrates quantum tunneling and energy level splitting.",

      [PotentialType.MULTI_SQUARE_WELL]:
        "Multiple square wells forming a periodic structure. Models solid state physics and band structure.",

      [PotentialType.MULTI_COULOMB_1D]: "Multiple Coulomb centers in one dimension. Models molecular ion systems.",

      [PotentialType.CUSTOM]: "Custom quantum potential defined by user parameters.",
    };

    return descriptions[potentialType] || "Custom quantum potential.";
  },

  /**
   * Get a description for a superposition type.
   */
  getSuperpositionTypeDescription(superpositionType: SuperpositionType): string {
    const descriptions: Record<SuperpositionType, string> = {
      [SuperpositionType.SINGLE]: "Single eigenstate selected. Stationary state with no time evolution.",

      [SuperpositionType.PSI_I_PSI_J]: "Superposition of two eigenstates. Wavefunction oscillates between states.",

      [SuperpositionType.LOCALIZED_NARROW]:
        "Narrow Gaussian wavepacket. Localized particle with large momentum uncertainty.",

      [SuperpositionType.LOCALIZED_WIDE]:
        "Wide Gaussian wavepacket. Spread out particle with small momentum uncertainty.",

      [SuperpositionType.COHERENT]: "Coherent state superposition. Minimal uncertainty wavepacket that oscillates.",

      [SuperpositionType.CUSTOM]:
        "Custom superposition configured by user. Arbitrary linear combination of eigenstates.",
    };

    return descriptions[superpositionType] || "Superposition state.";
  },

  /**
   * Get a description for a display mode.
   */
  getDisplayModeDescription(displayMode: string): string {
    const descriptions: Record<string, string> = {
      probabilityDensity:
        "Showing probability density |ψ(x)|². Indicates where the particle is most likely to be found.",

      waveFunction: "Showing wavefunction components. Real and imaginary parts of the complex quantum state.",

      phaseColor: "Showing phase angle of complex wavefunction. Color-coded visualization of quantum phase.",
    };

    return descriptions[displayMode] || "Visualization mode.";
  },

  /**
   * Create an announcement for energy level selection.
   */
  createEnergyLevelAnnouncement(level: number, energy: number, totalLevels: number): string {
    const levelNumber = level + 1; // Convert to 1-indexed
    const nodes = level; // Number of nodes equals n-1

    return (
      `Selected energy level ${levelNumber} of ${totalLevels}. ` +
      `Energy: ${energy.toFixed(3)} electron volts. ` +
      `Wavefunction has ${nodes} node${nodes !== 1 ? "s" : ""}.`
    );
  },

  /**
   * Create an announcement for potential type change.
   */
  createPotentialTypeAnnouncement(
    _potentialType: PotentialType,
    potentialName: string,
    numBoundStates: number,
    groundStateEnergy?: number,
  ): string {
    let announcement = `Potential changed to ${potentialName}. `;

    if (numBoundStates === 0) {
      announcement += "No bound states found for current configuration.";
    } else {
      announcement += `Found ${numBoundStates} bound state${numBoundStates !== 1 ? "s" : ""}. `;
      if (groundStateEnergy !== undefined) {
        announcement += `Ground state energy: ${groundStateEnergy.toFixed(3)} electron volts.`;
      }
    }

    return announcement;
  },

  /**
   * Create an announcement for parameter changes (debounced).
   */
  createParameterChangeAnnouncement(parameterName: string, value: number, unit: string, effect?: string): string {
    let announcement = `${parameterName} changed to ${value.toFixed(2)} ${unit}.`;

    if (effect) {
      announcement += ` ${effect}`;
    }

    return announcement;
  },

  /**
   * Get help text for a slider control.
   */
  getSliderHelpText(parameterName: string, effect: string): string {
    return (
      `Adjust ${parameterName}. ${effect} ` +
      `Use Left/Right arrow keys for small changes, ` +
      `Shift+Arrow for fine control, ` +
      `Page Up/Down for large steps, ` +
      `Home for minimum, End for maximum.`
    );
  },
};
