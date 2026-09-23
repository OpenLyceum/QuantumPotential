/**
 * QPPWPreferencesModel — user-editable preferences for the Quantum Potential Wells sim.
 * Startup values come from qppwQueryParameters.
 */

import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { StringIO, Tandem } from "scenerystack/tandem";
import { NumericalMethod } from "../common/model/NumericalMethod.js";
import qppw from "../QPPWNamespace.js";
import qppwQueryParameters from "./qppwQueryParameters.js";

const QPPWPreferences = {
  // Simulation Preferences

  /**
   * Whether to automatically pause the simulation when the browser tab is hidden
   */
  autoPauseWhenTabHiddenProperty: new BooleanProperty(true, {
    tandem: Tandem.PREFERENCES.createTandem("autoPauseWhenTabHiddenProperty"),
    phetioFeatured: true,
  }),

  /**
   * Numerical method for solving the Schrödinger equation
   * Options: 'numerov', 'matrix_numerov', 'dvr', 'fgh', 'spectral'
   */
  numericalMethodProperty: new Property<NumericalMethod>(qppwQueryParameters.numericalMethod as NumericalMethod, {
    tandem: Tandem.PREFERENCES.createTandem("numericalMethodProperty"),
    phetioFeatured: true,
    phetioValueType: StringIO,
    validValues: [
      NumericalMethod.NUMEROV,
      NumericalMethod.MATRIX_NUMEROV,
      NumericalMethod.DVR,
      NumericalMethod.FGH,
      NumericalMethod.SPECTRAL,
      NumericalMethod.QUANTUM_BOUND,
    ],
  }),

  /**
   * Number of grid points for numerical solvers
   * Range: 32-512 points. Higher values give more accurate results but slower computation.
   * Default: 64 points (fast computation for interactive exploration); seeded by ?gridPoints
   */
  gridPointsProperty: new NumberProperty(qppwQueryParameters.gridPoints, {
    tandem: Tandem.PREFERENCES.createTandem("gridPointsProperty"),
    phetioFeatured: true,
    range: new Range(32, 512),
  }),
};

qppw.register("QPPWPreferences", QPPWPreferences);

export default QPPWPreferences;
