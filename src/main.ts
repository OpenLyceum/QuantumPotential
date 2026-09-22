/**
 * main.ts
 *
 * Entry point for the simulation. Creates the four screens and the preferences dialog content,
 * then starts the sim.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import stringManager from "./i18n/StringManager.js";
import { IntroScreen } from "./intro/IntroScreen.js";
import { ManyWellsScreen } from "./many-wells/ManyWellsScreen.js";
import { OneWellScreen } from "./one-well/OneWellScreen.js";
import { QPPWPreferencesNode } from "./preferences/QPPWPreferencesNode.js";
import { TwoWellsScreen } from "./two-wells/TwoWellsScreen.js";

onReadyToLaunch(() => {
  const screenNames = stringManager.getScreenNames();

  const screens = [
    new IntroScreen({
      name: screenNames.introStringProperty,
      tandem: Tandem.ROOT.createTandem("introScreen"),
    }),
    new OneWellScreen({
      name: screenNames.oneWellStringProperty,
      tandem: Tandem.ROOT.createTandem("oneWellScreen"),
    }),
    new TwoWellsScreen({
      name: screenNames.twoWellsStringProperty,
      tandem: Tandem.ROOT.createTandem("twoWellsScreen"),
    }),
    new ManyWellsScreen({
      name: screenNames.manyWellsStringProperty,
      tandem: Tandem.ROOT.createTandem("manyWellsScreen"),
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    webgl: true,
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      audioOptions: {
        supportsVoicing: true,
        supportsSound: true,
      },
      simulationOptions: {
        customPreferences: [{ createContent: () => new QPPWPreferencesNode() }],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),
  });
  sim.start();
});
