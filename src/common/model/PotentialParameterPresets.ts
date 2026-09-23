/** Starting parameters for each potential, with edits retained when switching between types. */

import type { NumberProperty, Property } from "scenerystack/axon";
import { PotentialType } from "./PotentialFunction.js";

/** Shapes chosen for the ±4 nm energy chart; depths and barrier heights are in eV. */
export const SINGLE_WELL_PARAMETER_PRESETS = {
  [PotentialType.FINITE_WELL]: { wellWidth: 5.5, wellDepth: 12, barrierHeight: 4 },
  [PotentialType.HARMONIC_OSCILLATOR]: { wellWidth: 5, wellDepth: 5 },
  [PotentialType.MORSE]: { wellWidth: 1.4, wellDepth: 12 },
  [PotentialType.POSCHL_TELLER]: { wellWidth: 1.5, wellDepth: 12 },
  [PotentialType.ROSEN_MORSE]: { wellWidth: 1.5, wellDepth: 12, barrierHeight: 4 },
  [PotentialType.ECKART]: { wellWidth: 1, wellDepth: 13, barrierHeight: 9 },
  [PotentialType.ASYMMETRIC_TRIANGLE]: { wellWidth: 5.5, wellDepth: 12 },
  [PotentialType.TRIANGULAR]: { wellWidth: 5.5, wellDepth: 12 },
};

export class PotentialParameterPresets<Key extends string> {
  private readonly potentialTypeProperty: Property<PotentialType>;
  private currentType: PotentialType;
  private readonly savedValues = new Map<PotentialType, Record<Key, number>>();
  private readonly properties: Record<Key, NumberProperty>;
  private readonly presets: Partial<Record<PotentialType, Partial<Record<Key, number>>>>;
  private resetting = false;

  public constructor(
    potentialTypeProperty: Property<PotentialType>,
    properties: Record<Key, NumberProperty>,
    presets: Partial<Record<PotentialType, Partial<Record<Key, number>>>>,
  ) {
    this.potentialTypeProperty = potentialTypeProperty;
    this.currentType = potentialTypeProperty.value;
    this.properties = properties;
    this.presets = presets;
    potentialTypeProperty.lazyLink((type) => {
      if (this.resetting) {
        return;
      }

      this.savedValues.set(this.currentType, this.readValues());
      this.currentType = type;
      const values = this.savedValues.get(type) ?? this.presets[type];
      if (values) {
        for (const key of Object.keys(this.properties) as Key[]) {
          const value = values[key];
          if (value !== undefined) {
            this.properties[key].value = value;
          }
        }
      }
    });
  }

  private readValues(): Record<Key, number> {
    return Object.fromEntries(
      (Object.keys(this.properties) as Key[]).map((key) => [key, this.properties[key].value]),
    ) as Record<Key, number>;
  }

  /** Let each Property reset normally, then forget parameters saved for previously visited potentials. */
  public reset(resetProperties: () => void): void {
    this.resetting = true;
    try {
      resetProperties();
    } finally {
      this.resetting = false;
      this.savedValues.clear();
      this.currentType = this.potentialTypeProperty.value;
    }
  }
}
