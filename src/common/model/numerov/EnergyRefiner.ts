/**
 * EnergyRefiner refines energy eigenvalues using false-position (regula falsi) with a bisection
 * fallback. Used to find the precise energy where the wave function satisfies boundary conditions.
 *
 * The caller supplies a mismatchFunction(energy) that returns a signed value whose zero
 * corresponds to an eigenvalue (e.g. ψ(x_max), a Wronskian, or a log-derivative difference).
 * The bracket [lowerEnergyBound, upperEnergyBound] must straddle the root (opposite signs at the ends).
 *
 * False-position converges much faster than bisection for smooth mismatch functions by linearly
 * interpolating the root position each step. Bisection is used as a fallback when the bracket is
 * numerically flat.
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0).
 *
 * @author Martin Veillette
 */

import { optionize } from "scenerystack/phet-core";

// Default relative precision of 10^-8 gives absolute tolerance = 10^-8 × (bracket width)
const DEFAULT_RELATIVE_TOLERANCE = 1e-8;

// Minimum |fHi - fLo| to attempt a false-position step; below this the function is numerically
// flat across the bracket and bisection is safer.
const SMALL = 1e-10;

// Backstop against infinite loops when the bracket cannot shrink below floating-point resolution.
const MAX_REFINEMENT_ITERATIONS = 200;

/**
 * Configuration options for EnergyRefiner.
 */
type SelfOptions = {
  tolerance?: number; // Tolerance value (default: 1e-8)
  isRelative?: boolean; // If true, tolerance is relative to bracket width; if false, absolute in eV (default: true)
};

export type EnergyRefinerOptions = SelfOptions;

export default class EnergyRefiner {
  // See SelfOptions for documentation.
  private readonly tolerance: number;
  private readonly isRelative: boolean;

  /**
   * Physical motivation for tolerance:
   * The eigenvalue should be resolved to much better precision than the level spacing.
   * Typical quantum systems have level spacing ΔE, and we want tolerance << ΔE.
   *
   * The initial bracket width (E2 - E1) should be a fraction of the level spacing. A relative
   * precision of say 10^-8 ensures the eigenvalue is accurate to ~8 significant figures relative to
   * the bracket width.
   *
   * @param providedOptions - Configuration options
   *   - tolerance: Energy tolerance value. If isRelative is true, this is a dimensionless
   *                relative tolerance. If isRelative is false, this is an absolute tolerance in eV.
   *                Default: 1e-8
   *   - isRelative: If true, tolerance is relative to the energy bracket width.
   *                 If false, tolerance is an absolute value in eV. Default: true
   */
  public constructor(providedOptions?: EnergyRefinerOptions) {
    const options = optionize<EnergyRefinerOptions, SelfOptions>()(
      {
        // SelfOptions
        tolerance: DEFAULT_RELATIVE_TOLERANCE,
        isRelative: true,
      },
      providedOptions,
    );

    this.tolerance = options.tolerance;
    this.isRelative = options.isRelative;
  }

  /**
   * Refines energy eigenvalue using false-position with bisection fallback.
   *
   * @param lowerEnergyBound - Lower energy bound (eV); mismatchFunction(lower) and mismatchFunction(upper) must have opposite signs
   * @param upperEnergyBound - Upper energy bound (eV)
   * @param mismatchFunction - Function returning a signed value whose zero is the eigenvalue
   * @returns Refined energy eigenvalue (eV)
   */
  public refine(
    lowerEnergyBound: number,
    upperEnergyBound: number,
    mismatchFunction: (energy: number) => number,
  ): number {
    let energyLow = lowerEnergyBound;
    let energyHigh = upperEnergyBound;

    const computedTolerance = this.isRelative ? this.tolerance * Math.abs(energyHigh - energyLow) : this.tolerance;

    // A relative tolerance on a micro-bracket can demand sub-ulp precision at the energy scale.
    // This floor clamps the effective tolerance to ~1 ulp (energyScale * Number.EPSILON), giving the
    // eigenvalue the full ~16 significant figures that double precision supports. The refine loop's
    // other guards (endpoint check, no-progress break, MAX_REFINEMENT_ITERATIONS) ensure termination
    // when the bracket reaches floating-point resolution. See https://github.com/phetsims/quantum-bound-states/issues/57.
    const energyScale = Math.max(Math.abs(energyLow), Math.abs(energyHigh), 1);
    const machineEpsilonFloor = energyScale * Number.EPSILON;
    const absoluteTolerance = Math.max(computedTolerance, machineEpsilonFloor);

    let mismatchLow = mismatchFunction(energyLow);
    let mismatchHigh = mismatchFunction(energyHigh);

    // Illinois false-position with bisection fallback.
    // Plain regula falsi can stagnate when the mismatch function is curved: one endpoint
    // stays fixed indefinitely, the bracket width converges to a non-zero value, and the
    // while-loop never exits. The Illinois fix detects this by counting consecutive
    // same-side replacements; after two in a row it halves the stagnant endpoint's mismatch
    // value, biasing the next interpolated point toward the stagnant side and restoring
    // superlinear convergence. Falls back to the bisection midpoint when the bracket is
    // numerically flat (|mismatchHigh − mismatchLow| < SMALL) or the interpolated point
    // lands outside the bracket due to floating-point rounding.
    let consecutiveSameSide = 0;
    let lastReplacedLow: boolean | null = null;
    let iteration = 0;
    let previousBracketWidth = energyHigh - energyLow;

    while (energyHigh - energyLow > absoluteTolerance) {
      if (iteration >= MAX_REFINEMENT_ITERATIONS) {
        break;
      }
      iteration++;

      let energyMid: number;
      if (Math.abs(mismatchHigh - mismatchLow) > SMALL) {
        energyMid = energyLow + ((energyHigh - energyLow) * -mismatchLow) / (mismatchHigh - mismatchLow);
      } else {
        energyMid = (energyLow + energyHigh) / 2;
      }

      // Guard: floating-point can place energyMid exactly at an endpoint
      if (energyMid <= energyLow || energyMid >= energyHigh) {
        energyMid = (energyLow + energyHigh) / 2;
      }

      const mismatchMid = mismatchFunction(energyMid);
      if (mismatchMid === 0) {
        return energyMid;
      }

      const replaceLow = Math.sign(mismatchMid) === Math.sign(mismatchLow);

      // Illinois correction: after two consecutive same-side replacements, halve the
      // stagnant endpoint's mismatch value to push the next step toward that side.
      if (lastReplacedLow !== null && replaceLow === lastReplacedLow) {
        consecutiveSameSide++;
        if (consecutiveSameSide >= 2) {
          if (replaceLow) {
            mismatchHigh /= 2;
          } else {
            mismatchLow /= 2;
          }
        }
      } else {
        consecutiveSameSide = 1;
      }
      lastReplacedLow = replaceLow;

      if (replaceLow) {
        energyLow = energyMid;
        mismatchLow = mismatchMid;
      } else {
        energyHigh = energyMid;
        mismatchHigh = mismatchMid;
      }

      const bracketWidth = energyHigh - energyLow;
      if (bracketWidth >= previousBracketWidth) {
        break;
      }
      previousBracketWidth = bracketWidth;
    }

    // Midpoint of the final bracket when tolerance or iteration limit is reached.
    return (energyLow + energyHigh) / 2;
  }
}
