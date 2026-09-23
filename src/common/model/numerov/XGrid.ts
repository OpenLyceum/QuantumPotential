/**
 * XGrid is an equally spaced, symmetric 1D spatial grid (in nm) for the Numerov solver.
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0),
 * with the PhET-iO instrumentation removed.
 *
 * @author Martin Veillette
 */

export default class XGrid {
  public readonly xMin: number; // nm
  public readonly xMax: number; // nm
  public readonly numberOfPoints: number;

  // Equal spacing between x-coordinates (nm)
  public readonly dx: number;

  // Equally spaced spatial coordinates (nm), in ascending order.
  public readonly xCoordinates: readonly number[];

  public constructor(xMin: number, xMax: number, numberOfPoints: number) {
    if (!(xMax > xMin)) {
      throw new Error("xMax must be greater than xMin");
    }
    if (numberOfPoints < 3 || numberOfPoints % 2 !== 1) {
      throw new Error(`Number of grid points must be odd and at least 3: ${numberOfPoints}`);
    }

    this.xMin = xMin;
    this.xMax = xMax;
    this.numberOfPoints = numberOfPoints;
    this.dx = (xMax - xMin) / (numberOfPoints - 1);

    const xCoordinates: number[] = [];
    for (let i = 0; i < numberOfPoints - 1; i++) {
      xCoordinates.push(xMin + i * this.dx);
    }
    xCoordinates.push(xMax); // ensure xMax is included exactly
    this.xCoordinates = xCoordinates;
  }

  /**
   * Gets the index of the x-coordinate that is closest to the specified x value (nm).
   */
  public getClosestIndex(x: number): number {
    const index = Math.round((x - this.xMin) / this.dx);
    return Math.min(this.numberOfPoints - 1, Math.max(0, index));
  }
}
