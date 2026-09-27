/**
 * ManyWellsScreen represents the screen for exploring energy bands in periodic potential wells.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QuantumPotentialKeyboardHelpContent } from "../common/view/QuantumPotentialKeyboardHelpContent.js";
import QuantumPotentialColors from "../QuantumPotentialColors.js";
import { ManyWellsModel } from "./model/ManyWellsModel.js";
import { ManyWellsScreenIcon } from "./view/ManyWellsScreenIcon.js";
import { ManyWellsScreenView } from "./view/ManyWellsScreenView.js";

export type ManyWellsScreenOptions = ScreenOptions;

export class ManyWellsScreen extends Screen<ManyWellsModel, ManyWellsScreenView> {
  public constructor(options: ManyWellsScreenOptions) {
    super(
      () => new ManyWellsModel(),
      (model: ManyWellsModel) => new ManyWellsScreenView(model),
      optionize<ManyWellsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: QuantumPotentialColors.backgroundColorProperty,
          homeScreenIcon: new ManyWellsScreenIcon(),
          navigationBarIcon: new ManyWellsScreenIcon(),
          createKeyboardHelpNode: () => new QuantumPotentialKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
