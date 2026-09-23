/**
 * Units used inside the Numerov solver, which works in eV, nm and electron masses (the unit system of
 * phetsims/quantum-bound-states, whose tolerances were tuned for it). Schrodinger1DSolver converts to and
 * from SI at its boundary.
 */

import QuantumConstants from "../QuantumConstants.js";

const NumerovConstants = {
  /** ħ in √(eV·mₑ)·nm, so that ħ²/(2m) is in eV·nm² when m is in electron masses. */
  HBAR:
    QuantumConstants.HBAR /
    Math.sqrt(QuantumConstants.EV_TO_JOULES * QuantumConstants.ELECTRON_MASS) /
    QuantumConstants.NM_TO_M,
} as const;

export default NumerovConstants;
