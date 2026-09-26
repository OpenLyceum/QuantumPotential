/**
 * Physical constants for quantum mechanics calculations.
 * All values are in SI units unless otherwise specified.
 */

import qppw from "../../QPPWNamespace.js";

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

qppw.register("QuantumConstants", QuantumConstants);

export default QuantumConstants;
