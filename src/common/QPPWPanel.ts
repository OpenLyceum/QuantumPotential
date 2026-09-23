/** Shared panel chrome for the simulation. */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import QPPWColors from "../QPPWColors.js";

export type QPPWPanelOptions = PanelOptions;

export class QPPWPanel extends Panel {
  public constructor(content: Node, providedOptions?: QPPWPanelOptions) {
    const options = optionize<QPPWPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: QPPWColors.panelFillProperty,
        stroke: QPPWColors.panelStrokeProperty,
        cornerRadius: 5,
        xMargin: 15,
        yMargin: 15,
      },
      providedOptions,
    );

    super(content, options);
  }
}
