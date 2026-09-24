/**
 * OneWellModel represents the physics model for a single quantum potential well, with superpositions and time
 * evolution. The potentials, bound states, turning points and classical probability are shared with Intro in
 * SingleWellModel; this class adds the superposition presets.
 */

import { NumberProperty } from "scenerystack/axon";
import { clamp, Range } from "scenerystack/dot";
import { calculateCoherentStateCoefficients } from "../../common/model/analytical-solutions/harmonic-oscillator.js";
import { BaseModel } from "../../common/model/BaseModel.js";
import { createProjectedWavePacket, isSpatialPresetType } from "../../common/model/LocalizedWavePacket.js";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import { SingleWellModel } from "../../common/model/SingleWellModel.js";
import { SuperpositionType } from "../../common/model/SuperpositionType.js";

export class OneWellModel extends SingleWellModel {
  // ==================== CONSTANTS ====================

  /** Default coherent-state displacement from the centre, in nm. */
  private static readonly DEFAULT_COHERENT_DISPLACEMENT = 0.5;
  private static readonly COHERENT_DISPLACEMENT_RANGE = new Range(-4, 4);

  /** Width, in eigenstate index, of the Gaussian envelope of the coherent-like packet (non-oscillator wells). */
  private static readonly COHERENT_GAUSSIAN_SIGMA = 3.0;

  /** Eigenstate index the coherent-like packet is centred on. */
  private static readonly COHERENT_CENTER_EIGENSTATE = 5;

  /** Phase step per eigenstate that gives the coherent-like packet its momentum toward the centre. */
  private static readonly COHERENT_PHASE_GRADIENT = 0.1;

  // ==================== PROPERTIES ====================

  public readonly coherentDisplacementProperty: NumberProperty; // nm

  public constructor() {
    super({ screenKind: "oneWell", wellWidth: 5.5, wellDepth: 12, analyticalGridPoints: 1000 });

    this.coherentDisplacementProperty = new NumberProperty(OneWellModel.DEFAULT_COHERENT_DISPLACEMENT, {
      range: OneWellModel.COHERENT_DISPLACEMENT_RANGE,
    });

    // Update superposition coefficients when superposition type or coherent displacement changes
    this.superpositionTypeProperty.link(() => this.updateSuperpositionCoefficients());
    this.coherentDisplacementProperty.link(() => {
      if (this.superpositionTypeProperty.value === SuperpositionType.COHERENT) {
        this.updateSuperpositionCoefficients();
      }
    });

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }

  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();

    // The barrier and offset also reshape the eigenstates the preset coefficients are built on
    const updateCoefficients = () => this.updateSuperpositionCoefficients();
    this.barrierHeightProperty.lazyLink(updateCoefficients);
    this.potentialOffsetProperty.lazyLink(updateCoefficients);
  }

  public override reset(): void {
    super.reset();

    // The superposition config is derived from the superposition type; rebuild it for the reset state
    this.updateSuperpositionCoefficients();
  }

  protected override resetSingleWellProperties(): void {
    super.resetSingleWellProperties();
    this.coherentDisplacementProperty.reset();
  }

  /**
   * Updates the superposition coefficients based on the selected superposition type.
   * This method computes the amplitudes and phases for predefined superposition types.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one branch per superposition preset
  public updateSuperpositionCoefficients(): void {
    const type = this.superpositionTypeProperty.value;

    // Skip CUSTOM type - coefficients are set manually by the user
    if (type === SuperpositionType.CUSTOM) {
      return;
    }

    // Ensure we have bound states
    if (this.boundStateResult === undefined) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult) {
      return;
    }

    // Extract to local constant for type narrowing
    const boundStates = this.boundStateResult;
    const numStates = boundStates.energies.length;
    if (isSpatialPresetType(type)) {
      const config = this.superpositionConfigProperty.value;
      this.superpositionConfigProperty.value = createProjectedWavePacket(boundStates, { ...config, type });
      return;
    }
    let amplitudes: number[];
    let phases: number[];
    let selectedPair: [number, number] | undefined;

    switch (type) {
      case SuperpositionType.PSI_I_PSI_J:
        // Equal superposition of the chosen pair, defaulting to the first two states.
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        if (numStates >= 2) {
          const [first, second] = this.superpositionConfigProperty.value.stateIndices ?? [0, 1];
          const firstIndex = clamp(first, 0, numStates - 1);
          const secondIndex = clamp(second, 0, numStates - 1);
          selectedPair = [firstIndex, secondIndex === firstIndex ? (firstIndex + 1) % numStates : secondIndex];
          amplitudes[firstIndex] = 1 / Math.sqrt(2);
          amplitudes[selectedPair[1]] = 1 / Math.sqrt(2);
        }
        break;

      case SuperpositionType.SINGLE:
        // Single eigenstate (ground state)
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        amplitudes[0] = 1;
        break;

      case SuperpositionType.COHERENT: {
        const displacement = this.coherentDisplacementProperty.value * QuantumConstants.NM_TO_M;

        if (this.potentialTypeProperty.value === PotentialType.HARMONIC_OSCILLATOR) {
          // True coherent state of the oscillator being solved
          const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
          const result = calculateCoherentStateCoefficients(displacement, this.getSpringConstant(), mass, numStates);
          amplitudes = result.amplitudes;
          phases = result.phases;
        } else {
          // Coherent-state-like wavepacket for other potentials
          // Create a localized superposition centered at the displacement position
          // using a Gaussian envelope in eigenstate space
          amplitudes = new Array(numStates).fill(0);
          phases = new Array(numStates).fill(0);

          // For each eigenstate, compute its overlap with a position-localized state
          // We use the eigenfunction values at the displacement position as weights
          const halfRange = BaseModel.CHART_HALF_RANGE_NM * QuantumConstants.NM_TO_M;
          const displacementIndex = Math.round(
            ((displacement + halfRange) / (2 * halfRange)) * (boundStates.xGrid.length - 1),
          );
          const clampedIndex = clamp(displacementIndex, 0, boundStates.xGrid.length - 1);

          // Weight each eigenstate by its wavefunction value at the displacement position
          // and apply a Gaussian envelope in eigenstate index to create localization
          const sigma = OneWellModel.COHERENT_GAUSSIAN_SIGMA; // Width of Gaussian in eigenstate space
          const n0 = Math.min(OneWellModel.COHERENT_CENTER_EIGENSTATE, Math.floor(numStates / 2)); // Center around a middle eigenstate

          for (let n = 0; n < numStates; n++) {
            if (n < boundStates.wavefunctions.length) {
              const psiNAtX = boundStates.wavefunctions[n]![clampedIndex]!;

              // Gaussian envelope in eigenstate space
              const gaussianWeight = Math.exp(-((n - n0) ** 2) / (2 * sigma * sigma));

              // Combine position-based and Gaussian weights
              amplitudes[n] = psiNAtX * gaussianWeight;
            }
          }

          // Normalize the amplitudes
          const norm = Math.sqrt(amplitudes.reduce((sum, a) => sum + a * a, 0));
          if (norm > 0) {
            amplitudes = amplitudes.map((a) => a / norm);
          } else {
            // Fallback: if all amplitudes are zero, just use ground state
            amplitudes[0] = 1;
          }

          // Set phases based on momentum (for a wavepacket moving toward the center)
          // Phase increases linearly with eigenstate index to create momentum
          const momentumDirection = displacement > 0 ? -1 : 1; // Move toward center
          for (let n = 0; n < numStates; n++) {
            phases[n] = momentumDirection * n * OneWellModel.COHERENT_PHASE_GRADIENT; // Small phase gradient
          }
        }
        break;
      }

      default:
        // Default to ground state
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        amplitudes[0] = 1;
        break;
    }

    // Update the superposition config
    this.superpositionConfigProperty.value = {
      type,
      amplitudes,
      phases,
      ...(type === SuperpositionType.COHERENT && { displacement: this.coherentDisplacementProperty.value }),
      ...(selectedPair && { stateIndices: selectedPair }),
    };
  }
}
