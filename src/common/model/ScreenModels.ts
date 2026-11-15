/** Shared capabilities consumed by charts and controls; screen implementations depend on these contracts. */

import type { NumberProperty } from "scenerystack/axon";
import type { BaseModel } from "./BaseModel.js";
import type { SingleWellModel } from "./SingleWellModel.js";

export type IntroScreenModel = SingleWellModel;

export interface OneWellScreenModel extends SingleWellModel {
  readonly coherentDisplacementProperty: NumberProperty;
  updateSuperpositionCoefficients(): void;
}

export interface TwoWellsScreenModel extends BaseModel {
  readonly wellSeparationProperty: NumberProperty;
}

export interface ManyWellsScreenModel extends TwoWellsScreenModel {
  readonly numberOfWellsProperty: NumberProperty;
  readonly electricFieldProperty: NumberProperty;
}

export type SuperpositionScreenModel = OneWellScreenModel | TwoWellsScreenModel | ManyWellsScreenModel;
export type ScreenModel = IntroScreenModel | SuperpositionScreenModel;
