/** Shared panel chrome for the simulation. */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import QuantumPotentialColors from "../QuantumPotentialColors.js";

export type QuantumPotentialPanelOptions = PanelOptions;

export class QuantumPotentialPanel extends Panel {
  public constructor(content: Node, providedOptions?: QuantumPotentialPanelOptions) {
    const options = optionize<QuantumPotentialPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: QuantumPotentialColors.panelFillProperty,
        stroke: QuantumPotentialColors.panelStrokeProperty,
        cornerRadius: 5,
        xMargin: 15,
        yMargin: 15,
      },
      providedOptions,
    );

    super(content, options);
  }
}
