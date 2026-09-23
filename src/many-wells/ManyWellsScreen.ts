/**
 * ManyWellsScreen represents the screen for exploring energy bands in periodic potential wells.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QPPWKeyboardHelpContent } from "../common/view/QPPWKeyboardHelpContent.js";
import QPPWColors from "../QPPWColors.js";
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
          backgroundColorProperty: QPPWColors.backgroundColorProperty,
          homeScreenIcon: new ManyWellsScreenIcon(),
          createKeyboardHelpNode: () => new QPPWKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
