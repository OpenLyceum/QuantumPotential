/**
 * Thrown by an analytical solver when the requested parameters admit no bound states (for example
 * a Morse or Eckart well that is too shallow). This is a legitimate physical outcome the user can
 * reach with the sliders, not a failure: models catch it and show "no bound states" without
 * reporting an error.
 */
export class NoBoundStatesError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "NoBoundStatesError";
  }
}
