/**
 * Union type for all screen models used in QPPW.
 * This type allows components to accept any of the screen-specific models.
 */

import type { IntroModel } from "../../intro/model/IntroModel.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";

/**
 * Union type representing any screen model in the application.
 * Use this type for components that need to work with multiple screen models.
 */
export type ScreenModel = IntroModel | OneWellModel | TwoWellsModel | ManyWellsModel;
