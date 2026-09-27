/**
 * OneWellScreen represents the screen for exploring a single quantum potential well.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QuantumPotentialKeyboardHelpContent } from "../common/view/QuantumPotentialKeyboardHelpContent.js";
import QuantumPotentialColors from "../QuantumPotentialColors.js";
import { OneWellModel } from "./model/OneWellModel.js";
import { OneWellScreenIcon } from "./view/OneWellScreenIcon.js";
import { OneWellScreenView } from "./view/OneWellScreenView.js";

export type OneWellScreenOptions = ScreenOptions;

export class OneWellScreen extends Screen<OneWellModel, OneWellScreenView> {
  public constructor(options: OneWellScreenOptions) {
    super(
      () => new OneWellModel(),
      (model: OneWellModel) => new OneWellScreenView(model),
      optionize<OneWellScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: QuantumPotentialColors.backgroundColorProperty,
          homeScreenIcon: new OneWellScreenIcon(),
          navigationBarIcon: new OneWellScreenIcon(),
          createKeyboardHelpNode: () => new QuantumPotentialKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
