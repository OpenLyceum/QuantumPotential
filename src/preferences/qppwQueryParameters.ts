/**
 * qppwQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every sim-specific
 * query parameter is declared and documented. Public-facing parameters (intended for end users /
 * sharing links) set `public: true`.
 *
 * Each parameter seeds the initial value of the matching Property in QPPWPreferencesModel, which
 * remains user-editable at runtime in Preferences → Simulation.
 *
 * Usage: append e.g. `?numericalMethod=dvr&gridPoints=256` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { NumericalMethod } from "../common/model/NumericalMethod.js";
import qppw from "../QPPWNamespace.js";

/** Grid sizes offered by the Preferences slider: powers of two from 2^5 to 2^9. */
export const GRID_POINTS_VALUES = [32, 64, 128, 256, 512] as const;

const qppwQueryParameters = QueryStringMachine.getAll({
  /**
   * Initial numerical method for the Schrödinger solver.
   */
  numericalMethod: {
    type: "string",
    defaultValue: NumericalMethod.FGH,
    validValues: Object.values(NumericalMethod),
    public: true,
  },

  /**
   * Initial number of grid points used by the numerical solvers.
   */
  gridPoints: {
    type: "number",
    defaultValue: 64,
    validValues: [...GRID_POINTS_VALUES],
    public: true,
  },
});

qppw.register("qppwQueryParameters", qppwQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default qppwQueryParameters;
