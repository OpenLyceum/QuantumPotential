/**
 * Screen identity guards use the explicit kind; capability guards name the screens that have a control.
 */

import type {
  IntroScreenModel,
  ManyWellsScreenModel,
  OneWellScreenModel,
  ScreenModel,
  TwoWellsScreenModel,
} from "./ScreenModels.js";
import { SingleWellModel } from "./SingleWellModel.js";

/**
 * Type guard to check if a model is IntroScreenModel.
 * IntroScreenModel has a simplified display mode (no phase color).
 */
export function isIntroModel(model: ScreenModel): model is IntroScreenModel {
  return model.screenKind === "intro";
}

/**
 * Type guard to check if a model is OneWellScreenModel.
 * OneWellScreenModel has coherent displacement and superposition features.
 */
export function isOneWellModel(model: ScreenModel): model is OneWellScreenModel {
  return model.screenKind === "oneWell";
}

/**
 * Type guard to check if a model is TwoWellsScreenModel.
 * TwoWellsScreenModel has well separation but not multiple wells.
 */
export function isTwoWellsModel(model: ScreenModel): model is TwoWellsScreenModel {
  return model.screenKind === "twoWells";
}

/**
 * Type guard to check if a model is ManyWellsScreenModel.
 * ManyWellsScreenModel has both well separation and number of wells.
 */
export function isManyWellsModel(model: ScreenModel): model is ManyWellsScreenModel {
  return model.screenKind === "manyWells";
}

/**
 * Type guard for the single-well screens (Intro and One Well): barrier height, potential offset, turning points and
 * the classically forbidden probability.
 */
export function isSingleWellModel(model: ScreenModel): model is OneWellScreenModel | IntroScreenModel {
  return model instanceof SingleWellModel;
}

/**
 * Type guard to check if a model has well separation property.
 * This applies to both TwoWellsScreenModel and ManyWellsScreenModel.
 */
export function hasWellSeparation(model: ScreenModel): model is TwoWellsScreenModel | ManyWellsScreenModel {
  return isTwoWellsModel(model) || isManyWellsModel(model);
}

/**
 * Type guard to check if a model has electric field property.
 * This is specific to ManyWellsScreenModel.
 */
export function hasElectricField(model: ScreenModel): model is ManyWellsScreenModel {
  return isManyWellsModel(model);
}
