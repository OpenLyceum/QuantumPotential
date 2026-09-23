/**
 * OneWellScreen represents the screen for exploring a single quantum potential well.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QPPWKeyboardHelpContent } from "../common/view/QPPWKeyboardHelpContent.js";
import QPPWColors from "../QPPWColors.js";
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
          backgroundColorProperty: QPPWColors.backgroundColorProperty,
          homeScreenIcon: new OneWellScreenIcon(),
          navigationBarIcon: new OneWellScreenIcon(),
          createKeyboardHelpNode: () => new QPPWKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
