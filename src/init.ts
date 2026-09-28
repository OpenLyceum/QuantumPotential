import { init, madeWithSceneryStackSplashDataURI } from "scenerystack/init";
import { version } from "../package.json";

// Initialize values that will be used at import-time by other modules.
// This needs to happen first, so we have init.ts => assert.ts => splash.ts => brand.ts => everything else (in main.ts)
init({
  // Internal name of the simulation.
  name: "quantum-potential",

  // Version (will be shown in the About dialog)
  version,

  // The brand name used (should be the same as in brand.ts)
  brand: "made-with-scenerystack",

  // Should be one of the keys from https://github.com/phetsims/babel/blob/main/localeData.json
  // Can be omitted, will default to 'en'
  locale: "en",

  // List of locales that are supported (and can be switched between in the simulation while running)
  availableLocales: ["en", "fr", "es"],

  // Image to show while loading the simulation. Can be any image URL.
  splashDataURI: madeWithSceneryStackSplashDataURI,

  allowLocaleSwitching: true,

  // Unmutes tambo at startup. Pair with audioOptions.supportsSound in src/main.ts.
  supportsSound: true,

  // Color profiles supported by this simulation
  colorProfiles: ["default", "projector"],
});
