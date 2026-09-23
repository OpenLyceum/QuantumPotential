/**
 * Screen identity guards use the explicit kind; capability guards check optional controls.
 */

import type { IntroModel } from "../../intro/model/IntroModel.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import type { ScreenModel } from "./ScreenModels.js";

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
 * Type guard to check if a model has barrier height property.
 * This is used by One Well and Intro potentials and by the Two Wells barrier controls.
 */
export function hasBarrierHeight(model: ScreenModel): model is OneWellModel | IntroModel | TwoWellsModel {
  return "barrierHeightProperty" in model;
}

/**
 * Type guard to check if a model has potential offset property.
 * This is specific to certain potentials in OneWellModel and IntroModel.
 */
export function hasPotentialOffset(model: ScreenModel): model is OneWellModel | IntroModel {
  return "potentialOffsetProperty" in model;
}

/**
 * Type guard to check if a model has well separation property.
 * This applies to both TwoWellsModel and ManyWellsModel.
 */
export function hasWellSeparation(model: ScreenModel): model is TwoWellsModel | ManyWellsModel {
  return "wellSeparationProperty" in model;
}

/**
 * Type guard to check if a model has superposition configuration.
 * This applies to OneWellModel, TwoWellsModel, and ManyWellsModel.
 */
/**
 * Type guard to check if a model has electric field property.
 * This is specific to ManyWellsModel.
 */
export function hasElectricField(model: ScreenModel): model is ManyWellsModel {
  return "electricFieldProperty" in model;
}

/**
 * Type guard to check if a model has the getClassicalTurningPoints method.
 * This applies to OneWellModel and IntroModel.
 */
export function hasClassicalTurningPoints(model: ScreenModel): model is OneWellModel | IntroModel {
  return "getClassicalTurningPoints" in model;
}

/**
 * Type guard to check if a model has the getClassicallyForbiddenProbability method.
 * This applies to OneWellModel and IntroModel.
 */
export function hasClassicallyForbiddenProbability(model: ScreenModel): model is OneWellModel | IntroModel {
  return "getClassicallyForbiddenProbability" in model;
}
