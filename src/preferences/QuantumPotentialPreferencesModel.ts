/**
 * QuantumPotentialPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in quantumPotentialQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import QuantumPotentialNamespace from "../QuantumPotentialNamespace.js";
import quantumPotentialQueryParameters from "./quantumPotentialQueryParameters.js";

export class QuantumPotentialPreferencesModel {
  /**
   * Whether to automatically pause the simulation when the browser tab is hidden.
   */
  public readonly autoPauseWhenTabHiddenProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.autoPauseWhenTabHiddenProperty = new BooleanProperty(quantumPotentialQueryParameters.autoPauseWhenTabHidden, {
      phetioFeatured: true,
      ...(tandem && { tandem: tandem.createTandem("autoPauseWhenTabHiddenProperty") }),
    });
  }

  public reset(): void {
    this.autoPauseWhenTabHiddenProperty.reset();
  }
}

QuantumPotentialNamespace.register("QuantumPotentialPreferencesModel", QuantumPotentialPreferencesModel);
