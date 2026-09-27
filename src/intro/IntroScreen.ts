/**
 * IntroScreen represents the introductory screen for exploring quantum potential wells.
 * This screen provides a simplified interface without play/pause controls or superposition options.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { QuantumPotentialKeyboardHelpContent } from "../common/view/QuantumPotentialKeyboardHelpContent.js";
import QuantumPotentialColors from "../QuantumPotentialColors.js";
import { IntroModel } from "./model/IntroModel.js";
import { IntroScreenIcon } from "./view/IntroScreenIcon.js";
import { IntroScreenView } from "./view/IntroScreenView.js";

export type IntroScreenOptions = ScreenOptions;

export class IntroScreen extends Screen<IntroModel, IntroScreenView> {
  public constructor(options: IntroScreenOptions) {
    super(
      () => new IntroModel(),
      (model: IntroModel) => new IntroScreenView(model),
      optionize<IntroScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: QuantumPotentialColors.backgroundColorProperty,
          homeScreenIcon: new IntroScreenIcon(),
          navigationBarIcon: new IntroScreenIcon(),
          createKeyboardHelpNode: () => new QuantumPotentialKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
