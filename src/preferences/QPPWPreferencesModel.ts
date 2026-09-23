/**
 * QPPWPreferencesModel — user-editable preferences for the Quantum Potential Wells sim.
 * Startup values come from qppwQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import { Tandem } from "scenerystack/tandem";
import qppw from "../QPPWNamespace.js";

const QPPWPreferences = {
  // Simulation Preferences

  /**
   * Whether to automatically pause the simulation when the browser tab is hidden
   */
  autoPauseWhenTabHiddenProperty: new BooleanProperty(true, {
    tandem: Tandem.PREFERENCES.createTandem("autoPauseWhenTabHiddenProperty"),
    phetioFeatured: true,
  }),
};

qppw.register("QPPWPreferences", QPPWPreferences);

export default QPPWPreferences;
