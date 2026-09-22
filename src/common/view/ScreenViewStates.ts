/**
 * Union type for all screen view states used in QPPW.
 * This type allows components to accept any of the screen-specific view states.
 */

import type { IntroViewState } from "../../intro/view/IntroViewState.js";
import type { ManyWellsViewState } from "../../many-wells/view/ManyWellsViewState.js";
import type { OneWellViewState } from "../../one-well/view/OneWellViewState.js";
import type { TwoWellsViewState } from "../../two-wells/view/TwoWellsViewState.js";

/**
 * Union type representing any screen view state in the application.
 * Use this type for components that need to work with multiple screen view states.
 */
export type ScreenViewState = IntroViewState | OneWellViewState | TwoWellsViewState | ManyWellsViewState;
