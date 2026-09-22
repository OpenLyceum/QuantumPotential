/**
 * TwoWellsScreen represents the screen for exploring quantum tunneling in a double potential well.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QPPWKeyboardHelpContent } from "../common/view/QPPWKeyboardHelpContent.js";
import QPPWColors from "../QPPWColors.js";
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
          backgroundColorProperty: QPPWColors.backgroundColorProperty,
          homeScreenIcon: new TwoWellsScreenIcon(),
          createKeyboardHelpNode: () => new QPPWKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
