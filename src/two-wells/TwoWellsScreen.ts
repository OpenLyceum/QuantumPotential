/**
 * TwoWellsScreen represents the screen for exploring quantum tunneling in a double potential well.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QuantumPotentialKeyboardHelpContent } from "../common/view/QuantumPotentialKeyboardHelpContent.js";
import QuantumPotentialColors from "../QuantumPotentialColors.js";
import { TwoWellsModel } from "./model/TwoWellsModel.js";
import { TwoWellsScreenIcon } from "./view/TwoWellsScreenIcon.js";
import { TwoWellsScreenView } from "./view/TwoWellsScreenView.js";

export type TwoWellsScreenOptions = ScreenOptions;

export class TwoWellsScreen extends Screen<TwoWellsModel, TwoWellsScreenView> {
  public constructor(options: TwoWellsScreenOptions) {
    super(
      () => new TwoWellsModel(),
      (model: TwoWellsModel) => new TwoWellsScreenView(model),
      optionize<TwoWellsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: QuantumPotentialColors.backgroundColorProperty,
          homeScreenIcon: new TwoWellsScreenIcon(),
          navigationBarIcon: new TwoWellsScreenIcon(),
          createKeyboardHelpNode: () => new QuantumPotentialKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
