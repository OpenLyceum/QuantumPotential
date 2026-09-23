/**
 * PhaseColorVisualization displays the wavefunction with colors representing the phase
 * of the complex wavefunction. The height represents magnitude, and the hue represents phase.
 */

import { Node, Rectangle } from "scenerystack/scenery";
import QPPWColors from "../../../QPPWColors.js";
import QuantumConstants from "../../model/QuantumConstants.js";

export type PhaseColorVisualizationOptions = {
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
};

export class PhaseColorVisualization extends Node {
  private readonly options: PhaseColorVisualizationOptions;
  private readonly container: Node;
  private phaseColorStrips: Rectangle[] = [];

  constructor(options: PhaseColorVisualizationOptions) {
    super();

    this.options = options;

    // Create container
    this.container = new Node({
      visible: false,
    });
    this.addChild(this.container);
  }

  /**
   * Show the phase color visualization
   */
  public show(): void {
    this.container.visible = true;
  }

  /**
   * Hide the phase color visualization
   */
  public hide(): void {
    this.container.visible = false;
  }

  /**
   * Plot phase-colored wavefunction for a single eigenstate
   */
  public plotWavefunction(xGrid: number[], wavefunction: number[], globalPhase: number): void {
    const { dataToViewX, dataToViewY } = this.options;
    const y0 = dataToViewY(0);
    const numStrips = xGrid.length - 1;

    // Ensure we have enough rectangles in the pool
    while (this.phaseColorStrips.length < numStrips) {
      const rect = new Rectangle(0, 0, 1, 1, {
        fill: QPPWColors.phaseIndicatorProperty,
        stroke: null,
      });
      this.phaseColorStrips.push(rect);
      this.container.addChild(rect);
    }

    // Update each strip
    for (let i = 0; i < numStrips; i++) {
      const x1 = dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);
      const x2 = dataToViewX(xGrid[i + 1]! * QuantumConstants.M_TO_NM);
      const stripWidth = x2 - x1;

      const psi = wavefunction[i]!;
      const magnitude = Math.abs(psi);

      // Apply global time evolution phase
      const cosPhi = Math.cos(globalPhase);
      const sinPhi = Math.sin(globalPhase);

      // Apply time evolution: ψ(x,t) = ψ(x) * e^(-iEt/ℏ)
      const realPart = psi * cosPhi;
      const imagPart = -psi * sinPhi;

      // Calculate local phase: arg(ψ) = atan2(Im(ψ), Re(ψ))
      const localPhase = Math.atan2(imagPart, realPart);

      // Normalize phase to [0, 1] for hue (0 to 360 degrees)
      const normalizedPhase = (localPhase + Math.PI) / (2 * Math.PI);
      const hue = Math.round(normalizedPhase * 360);

      // Create color using HSL: hue varies with phase, saturation and lightness are fixed
      const saturation = 80; // 80% saturation for vibrant colors
      const lightness = 60; // 60% lightness for good visibility
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      // Height of the strip is proportional to magnitude
      const yTop = dataToViewY(magnitude);
      const stripHeight = Math.abs(y0 - yTop);

      // Update the rectangle from the pool
      const strip = this.phaseColorStrips[i]!;
      strip.setRect(x1, Math.min(y0, yTop), stripWidth, stripHeight);
      strip.fill = color;
      strip.visible = stripHeight > 0.1; // Only show if visible
    }

    // Hide any extra strips we're not using
    for (let i = numStrips; i < this.phaseColorStrips.length; i++) {
      this.phaseColorStrips[i]!.visible = false;
    }
  }

  /**
   * Plot phase-colored superposition from real and imaginary parts
   */
  public plotSuperposition(xGrid: number[], realPart: number[], imagPart: number[]): void {
    const { dataToViewX, dataToViewY } = this.options;
    const y0 = dataToViewY(0);
    const numStrips = xGrid.length - 1;

    // Ensure we have enough rectangles in the pool
    while (this.phaseColorStrips.length < numStrips) {
      const rect = new Rectangle(0, 0, 1, 1, {
        fill: QPPWColors.phaseIndicatorProperty,
        stroke: null,
      });
      this.phaseColorStrips.push(rect);
      this.container.addChild(rect);
    }

    // Update each strip
    for (let i = 0; i < numStrips; i++) {
      const x1 = dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);
      const x2 = dataToViewX(xGrid[i + 1]! * QuantumConstants.M_TO_NM);
      const stripWidth = x2 - x1;

      const real = realPart[i]!;
      const imag = imagPart[i]!;
      const magnitude = Math.sqrt(real * real + imag * imag);

      // Calculate local phase: arg(ψ) = atan2(Im(ψ), Re(ψ))
      const localPhase = Math.atan2(imag, real);

      // Normalize phase to [0, 1] for hue (0 to 360 degrees)
      const normalizedPhase = (localPhase + Math.PI) / (2 * Math.PI);
      const hue = Math.round(normalizedPhase * 360);

      // Create color using HSL: hue varies with phase, saturation and lightness are fixed
      const saturation = 80; // 80% saturation for vibrant colors
      const lightness = 60; // 60% lightness for good visibility
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      // Height of the strip is proportional to magnitude
      const yTop = dataToViewY(magnitude);
      const stripHeight = Math.abs(y0 - yTop);

      // Update the rectangle from the pool
      const strip = this.phaseColorStrips[i]!;
      strip.setRect(x1, Math.min(y0, yTop), stripWidth, stripHeight);
      strip.fill = color;
      strip.visible = stripHeight > 0.1; // Only show if visible
    }

    // Hide any extra strips we're not using
    for (let i = numStrips; i < this.phaseColorStrips.length; i++) {
      this.phaseColorStrips[i]!.visible = false;
    }
  }
}
