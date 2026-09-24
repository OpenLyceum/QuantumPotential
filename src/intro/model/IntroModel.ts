/**
 * IntroModel represents the physics model for the intro screen: a single closed-form potential, without
 * superpositions. Everything it needs is shared with One Well in SingleWellModel.
 */

import { SingleWellModel } from "../../common/model/SingleWellModel.js";

export class IntroModel extends SingleWellModel {
  public constructor() {
    super({ screenKind: "intro", wellWidth: 5.5, wellDepth: 12, analyticalGridPoints: 1024 });

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }
}
