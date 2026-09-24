/**
 * Screen identity guards use the explicit kind; capability guards name the screens that have a control.
 */

import type { IntroModel } from "../../intro/model/IntroModel.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import type { ScreenModel } from "./ScreenModels.js";
import { SingleWellModel } from "./SingleWellModel.js";

/**
 * Type guard to check if a model is IntroModel.
 * IntroModel has a simplified display mode (no phase color).
 */
export function isIntroModel(model: ScreenModel): model is IntroModel {
  return model.screenKind === "intro";
}

/**
 * Type guard to check if a model is OneWellModel.
 * OneWellModel has coherent displacement and superposition features.
 */
export function isOneWellModel(model: ScreenModel): model is OneWellModel {
  return model.screenKind === "oneWell";
}

/**
 * Type guard to check if a model is TwoWellsModel.
 * TwoWellsModel has well separation but not multiple wells.
 */
export function isTwoWellsModel(model: ScreenModel): model is TwoWellsModel {
  return model.screenKind === "twoWells";
}

/**
 * Type guard to check if a model is ManyWellsModel.
 * ManyWellsModel has both well separation and number of wells.
 */
export function isManyWellsModel(model: ScreenModel): model is ManyWellsModel {
  return model.screenKind === "manyWells";
}

/**
 * Type guard for the single-well screens (Intro and One Well): barrier height, potential offset, turning points and
 * the classically forbidden probability.
 */
export function isSingleWellModel(model: ScreenModel): model is OneWellModel | IntroModel {
  return model instanceof SingleWellModel;
}

/**
 * Type guard to check if a model has well separation property.
 * This applies to both TwoWellsModel and ManyWellsModel.
 */
export function hasWellSeparation(model: ScreenModel): model is TwoWellsModel | ManyWellsModel {
  return isTwoWellsModel(model) || isManyWellsModel(model);
}

/**
 * Type guard to check if a model has electric field property.
 * This is specific to ManyWellsModel.
 */
export function hasElectricField(model: ScreenModel): model is ManyWellsModel {
  return isManyWellsModel(model);
}
