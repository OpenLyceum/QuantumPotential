/**
 * QuantumPotentialConstants.ts
 *
 * Root constants entry required by the fleet layout. Physical SI values for the
 * solvers live here; `src/common/model/QuantumConstants.ts` re-exports this
 * object so existing model/view imports keep working.
 *
 * Chart ranges stay on the models (`BaseModel.CHART_HALF_RANGE_NM`, etc.) and
 * chart margins stay on `BaseChartNode`.
 */

import QuantumPotentialNamespace from "./QuantumPotentialNamespace.js";

const ELEMENTARY_CHARGE = 1.602176634e-19; // Coulombs

const QuantumConstants = {
  /**
   * Reduced Planck constant (ℏ) in J·s
   */
  HBAR: 1.054571817e-34,

  /**
   * Electron mass in kg
   */
  ELECTRON_MASS: 9.10938356e-31,

  /**
   * Elementary charge in Coulombs
   */
  ELEMENTARY_CHARGE: ELEMENTARY_CHARGE,

  /**
   * Electron volt in Joules (for unit conversions)
   */
  EV_TO_JOULES: ELEMENTARY_CHARGE,

  /**
   * Joules to electron volt (for unit conversions)
   */
  JOULES_TO_EV: 1.0 / ELEMENTARY_CHARGE,

  /**
   * Nanometer to meters conversion
   */
  NM_TO_M: 1e-9,

  /**
   * Meters to nanometer conversion
   */
  M_TO_NM: 1e9,

  /**
   * Femtoseconds to seconds conversion (the models keep time in femtoseconds)
   */
  FS_TO_S: 1e-15,
};

// Keep the historical PhET-iO registration name used by the nested path.
QuantumPotentialNamespace.register("QuantumConstants", QuantumConstants);
QuantumPotentialNamespace.register("QuantumPotentialConstants", {
  QuantumConstants,
});

export default QuantumConstants;
