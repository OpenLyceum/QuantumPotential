/**
 * quantumPotentialQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in QuantumPotentialPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?numericalMethod=fgh` or `?numberOfPoints=3001` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { NumericalMethod } from "../common/model/NumericalMethod.js";
import QuantumPotentialNamespace from "../QuantumPotentialNamespace.js";

const quantumPotentialQueryParameters = QueryStringMachine.getAll({
  /**
   * Numerical method for the potentials without a closed-form solution (the Many Wells screen).
   * Numerov is the sim's solver; FGH is a developer cross-check.
   */
  numericalMethod: {
    type: "string",
    defaultValue: NumericalMethod.NUMEROV,
    validValues: Object.values(NumericalMethod),
  },

  /**
   * Number of points in the spatial grid used for numerical solutions. Must be odd so that x = 0 is a
   * grid point (the Numerov solver mirrors symmetric potentials about it).
   */
  numberOfPoints: {
    type: "number",
    defaultValue: 1001,
    isValidValue: (value: number) => Number.isInteger(value) && value % 2 === 1 && value >= 501 && value <= 10001,
  },

  /**
   * Whether the simulation pauses when the browser tab is hidden.
   */
  autoPauseWhenTabHidden: {
    type: "boolean",
    defaultValue: true,
    public: true,
  },
});

QuantumPotentialNamespace.register("quantumPotentialQueryParameters", quantumPotentialQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default quantumPotentialQueryParameters;
