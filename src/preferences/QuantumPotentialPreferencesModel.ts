/**
 * QuantumPotentialPreferencesModel — user-editable preferences for the Quantum Potential Wells sim.
 * Startup values come from quantumPotentialQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import { Tandem } from "scenerystack/tandem";
import QuantumPotentialNamespace from "../QuantumPotentialNamespace.js";

const QuantumPotentialPreferences = {
  // Simulation Preferences

  /**
   * Whether to automatically pause the simulation when the browser tab is hidden
   */
  autoPauseWhenTabHiddenProperty: new BooleanProperty(true, {
    tandem: Tandem.PREFERENCES.createTandem("autoPauseWhenTabHiddenProperty"),
    phetioFeatured: true,
  }),
};

QuantumPotentialNamespace.register("QuantumPotentialPreferences", QuantumPotentialPreferences);

export default QuantumPotentialPreferences;
