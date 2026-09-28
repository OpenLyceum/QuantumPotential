/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
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
import { NumericalMethod } from "./common/model/NumericalMethod.js";
import Schrodinger1DSolver from "./common/model/Schrodinger1DSolver.js";
import Logger from "./common/utils/Logger.js";
import stringManager from "./i18n/StringManager.js";
import { IntroScreen } from "./intro/IntroScreen.js";
import { ManyWellsScreen } from "./many-wells/ManyWellsScreen.js";
import { OneWellScreen } from "./one-well/OneWellScreen.js";
import { QuantumPotentialPreferencesModel } from "./preferences/QuantumPotentialPreferencesModel.js";
import { QuantumPotentialPreferencesNode } from "./preferences/QuantumPotentialPreferencesNode.js";
import quantumPotentialQueryParameters from "./preferences/quantumPotentialQueryParameters.js";
import { TwoWellsScreen } from "./two-wells/TwoWellsScreen.js";

function launch(): void {
  const screenNames = stringManager.getScreenNames();
  const quantumPotentialPreferences = new QuantumPotentialPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new IntroScreen({
      // The screen name Property updates automatically when the locale changes
      name: screenNames.introStringProperty,
      tandem: Tandem.ROOT.createTandem("introScreen"),
    }),
    new OneWellScreen({
      // The screen name Property updates automatically when the locale changes
      name: screenNames.oneWellStringProperty,
      tandem: Tandem.ROOT.createTandem("oneWellScreen"),
    }),
    new TwoWellsScreen({
      // The screen name Property updates automatically when the locale changes
      name: screenNames.twoWellsStringProperty,
      tandem: Tandem.ROOT.createTandem("twoWellsScreen"),
    }),
    new ManyWellsScreen({
      // The screen name Property updates automatically when the locale changes
      name: screenNames.manyWellsStringProperty,
      tandem: Tandem.ROOT.createTandem("manyWellsScreen"),
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [{ createContent: () => new QuantumPotentialPreferencesNode(quantumPotentialPreferences) }],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
      audioOptions: {
        // Initializes tambo and the Audio preferences. Pair with supportsSound in src/init.ts.
        // Stock UI sounds only. Voicing is deferred fleet-wide (Baton/ACCESSIBILITY.md) and this sim
        // has no voicing responses, so the Voicing toolbar is not offered.
        supportsSound: true,
      },
    }),
    webgl: true,
  });
  sim.start();
}

onReadyToLaunch(() => {
  // The FGH cross-check is split out of the main bundle; fetch it before any screen solves
  if (quantumPotentialQueryParameters.numericalMethod === NumericalMethod.FGH) {
    Schrodinger1DSolver.loadFGH().then(launch, (error: unknown) => {
      // Launch anyway: the solver falls back to Numerov
      Logger.warn("Could not load the FGH solver", error);
      launch();
    });
  } else {
    launch();
  }
});
