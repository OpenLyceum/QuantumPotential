/**
 * Type guard functions for narrowing ScreenModel union types.
 * These functions provide type-safe checks without manual type assertions.
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
  // IntroModel doesn't have superpositionTypeProperty
  return !("superpositionTypeProperty" in model);
}

/**
 * Type guard to check if a model is OneWellModel.
 * OneWellModel has coherent displacement and superposition features.
 */
export function isOneWellModel(model: ScreenModel): model is OneWellModel {
  return "coherentDisplacementProperty" in model && "superpositionTypeProperty" in model;
}

/**
 * Type guard to check if a model is TwoWellsModel.
 * TwoWellsModel has well separation but not multiple wells.
 */
export function isTwoWellsModel(model: ScreenModel): model is TwoWellsModel {
  return "wellSeparationProperty" in model && !("numberOfWellsProperty" in model);
}

/**
 * Type guard to check if a model is ManyWellsModel.
 * ManyWellsModel has both well separation and number of wells.
 */
export function isManyWellsModel(model: ScreenModel): model is ManyWellsModel {
  return "numberOfWellsProperty" in model;
}

/**
 * Type guard to check if a model has barrier height property.
 * This is specific to certain potentials in OneWellModel and IntroModel.
 */
export function hasBarrierHeight(model: ScreenModel): model is OneWellModel | IntroModel {
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
export function hasSuperpositionConfig(model: ScreenModel): model is OneWellModel | TwoWellsModel | ManyWellsModel {
  return "superpositionConfigProperty" in model;
}

/**
 * Type guard to check if a model has well offset property.
 * This applies to TwoWellsModel.
 */
export function hasWellOffset(model: ScreenModel): model is TwoWellsModel {
  return "wellOffsetProperty" in model;
}

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
