/**
 * StringManager handles internationalization for the QPPW simulation.
 * It provides StringProperty instances for all translatable strings in the application.
 */

import { LocalizedString, type ReadOnlyProperty } from "scenerystack";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// ── Compile-time key-parity check ─────────────────────────────────────────────
// English is the canonical shape; every other locale must match it exactly.
// TypeScript errors here if any locale file is missing (or adds) a key relative to English.
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEs satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsEs);

/**
 * Manages all localized strings for the simulation
 */
export class StringManager {
  // The cached singleton instance
  private static instance: StringManager;

  // All string properties organized by category
  private readonly stringProperties;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Create localized string properties
    this.stringProperties = LocalizedString.getNestedStringProperties({
      en: stringsEn,
      fr: stringsFr,
      es: stringsEs,
    });
  }

  /**
   * Get the singleton instance of StringManager
   * @returns The StringManager instance
   */
  public static getInstance(): StringManager {
    if (!StringManager.instance) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  /**
   * Gets the title string property for the simulation.
   */
  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.titleStringProperty;
  }

  /**
   * Gets an object containing the screen name properties.
   */
  public getScreenNames() {
    return {
      introStringProperty: this.stringProperties.introScreenStringProperty,
      oneWellStringProperty: this.stringProperties.oneWellScreenStringProperty,
      twoWellsStringProperty: this.stringProperties.twoWellsScreenStringProperty,
      manyWellsStringProperty: this.stringProperties.manyWellsScreenStringProperty,
    };
  }

  /**
   * Gets an object containing the preferences string properties.
   */
  public getPreferencesLabels() {
    return {
      preferencesStringProperty: this.stringProperties.preferencesStringProperty,
      autoPauseWhenTabHiddenStringProperty: this.stringProperties.autoPauseWhenTabHiddenStringProperty,
      autoPauseDescriptionStringProperty: this.stringProperties.autoPauseDescriptionStringProperty,
    };
  }

  // Getter methods for individual string properties
  // These provide direct access to commonly used strings

  get titleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.titleStringProperty;
  }

  get oneWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellScreenStringProperty;
  }

  get twoWellsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsScreenStringProperty;
  }

  get manyWellsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsScreenStringProperty;
  }

  get introStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.introScreenStringProperty;
  }

  get introDescriptionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.introDescriptionStringProperty;
  }

  get introKeyConceptsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.introKeyConceptsStringProperty;
  }

  get introInteractionsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.introInteractionsStringProperty;
  }

  get introEducationalContentStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.introEducationalContentStringProperty;
  }

  get energyStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.energyStringProperty;
  }

  get positionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.positionStringProperty;
  }

  get wavefunctionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.waveFunctionStringProperty;
  }

  get probabilityStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.probabilityDensityStringProperty;
  }

  get potentialStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.potentialStringProperty;
  }

  get potentialEnergyStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.potentialEnergyStringProperty;
  }

  get playStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.playStringProperty;
  }

  get pauseStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.pauseStringProperty;
  }

  get resetStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.resetStringProperty;
  }

  get stepStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.stepStringProperty;
  }

  get singleWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.singleWellStringProperty;
  }

  get wellWidthStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.wellWidthStringProperty;
  }

  get wellDepthStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.wellDepthStringProperty;
  }

  get doubleWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.doubleWellStringProperty;
  }

  get barrierHeightStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.barrierHeightStringProperty;
  }

  get barrierWidthStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.barrierWidthStringProperty;
  }

  get potentialOffsetStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.potentialOffsetStringProperty;
  }

  get tunnelingStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.tunnelingStringProperty;
  }

  get wellSeparationStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.wellSeparationStringProperty;
  }

  get multipleWellsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.multipleWellsStringProperty;
  }

  get numberOfWellsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.numberOfWellsStringProperty;
  }

  get latticeConstantStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.latticeConstantStringProperty;
  }

  get energyBandsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.energyBandsStringProperty;
  }

  get electricFieldStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.electricFieldStringProperty;
  }

  get preferencesStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.preferencesStringProperty;
  }

  get autoPauseWhenTabHiddenStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.autoPauseWhenTabHiddenStringProperty;
  }

  get autoPauseDescriptionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.autoPauseDescriptionStringProperty;
  }

  get energyChartStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.energyChartStringProperty;
  }

  get bottomChartStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.bottomChartStringProperty;
  }

  get particleMassStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.particleMassStringProperty;
  }

  get wellConfigurationStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.wellConfigurationStringProperty;
  }

  get potentialWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.potentialWellStringProperty;
  }

  get displayStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.displayStringProperty;
  }

  get waveFunctionViewsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.waveFunctionViewsStringProperty;
  }

  get squareInfiniteStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.squareInfiniteStringProperty;
  }

  get squareFiniteStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.squareFiniteStringProperty;
  }

  get harmonicOscillatorStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.harmonicOscillatorStringProperty;
  }

  get morseStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.morseStringProperty;
  }

  get poschlTellerStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.poschlTellerStringProperty;
  }

  get rosenMorseStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.rosenMorseStringProperty;
  }

  get eckartStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.eckartStringProperty;
  }

  get asymmetricTriangleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.asymmetricTriangleStringProperty;
  }

  get triangularStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.triangularStringProperty;
  }

  get coulomb1DStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.coulomb1DStringProperty;
  }

  get coulomb3DStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.coulomb3DStringProperty;
  }

  get doubleSquareWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.doubleSquareWellStringProperty;
  }

  get doublePoschlTellerStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.doublePoschlTellerStringProperty;
  }

  get multiSquareWellStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.multiSquareWellStringProperty;
  }

  get multiPoschlTellerStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.multiPoschlTellerStringProperty;
  }

  get multiCoulomb1DStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.multiCoulomb1DStringProperty;
  }

  get probabilityDensityStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.probabilityDensityStringProperty;
  }

  get classicalProbabilityDensityStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.classicalProbabilityDensityStringProperty;
  }

  get phaseColorStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.phaseColorStringProperty;
  }

  get realPartStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.realPartStringProperty;
  }

  get imaginaryPartStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.imaginaryPartStringProperty;
  }

  get magnitudeStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.magnitudeStringProperty;
  }

  get phaseStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.phaseStringProperty;
  }

  get showZerosStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.showZerosStringProperty;
  }

  get energyEvStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.energyEvStringProperty;
  }

  get positionNmStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.positionNmStringProperty;
  }

  get totalEnergyStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.totalEnergyStringProperty;
  }

  get waveFunctionMagnitudeStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.waveFunctionMagnitudeStringProperty;
  }

  get energyLevelLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.energyLevelLabelStringProperty;
  }

  get electronVoltsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.electronVoltsStringProperty;
  }

  get nanometersStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.nanometersStringProperty;
  }

  get electronMassStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.electronMassStringProperty;
  }

  get timeStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.timeStringProperty;
  }

  get oneWellDescriptionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellDescriptionStringProperty;
  }

  get twoWellsDescriptionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsDescriptionStringProperty;
  }

  get manyWellsDescriptionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsDescriptionStringProperty;
  }

  get oneWellSummaryStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellSummaryStringProperty;
  }

  get twoWellsSummaryStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsSummaryStringProperty;
  }

  get manyWellsSummaryStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsSummaryStringProperty;
  }

  get superpositionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.superpositionStringProperty;
  }

  get psiIPsiJStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.psiIPsiJStringProperty;
  }

  get psiKStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.psiKStringProperty;
  }

  get localizedNarrowStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.localizedNarrowStringProperty;
  }

  get localizedWideStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.localizedWideStringProperty;
  }

  get coherentStateStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.coherentStateStringProperty;
  }

  get customStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.customStringProperty;
  }

  get configureSuperpositionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.configureSuperpositionStringProperty;
  }

  get amplitudeStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.amplitudeStringProperty;
  }

  get superpositionDialogTitleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.superpositionDialogTitleStringProperty;
  }

  get closeStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.closeStringProperty;
  }

  get displacementStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.displacementStringProperty;
  }

  get superpositionInstructionsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.superpositionInstructionsStringProperty;
  }

  get stateStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.stateStringProperty;
  }

  get probabilityColumnStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.probabilityColumnStringProperty;
  }

  get noBoundStatesForSuperpositionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.noBoundStatesForSuperpositionStringProperty;
  }

  get normalizationSumStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.normalizationSumStringProperty;
  }

  get normalizeButtonStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.normalizeButtonStringProperty;
  }

  get okButtonStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.okButtonStringProperty;
  }

  get cancelButtonStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.cancelButtonStringProperty;
  }

  get keyConceptsTitleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.keyConceptsStringProperty;
  }

  get oneWellKeyConceptsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellKeyConceptsStringProperty;
  }

  get interactionsTitleStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.interactionsStringProperty;
  }

  get oneWellInteractionsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellInteractionsStringProperty;
  }

  get oneWellEducationalContentStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.oneWellEducationalContentStringProperty;
  }

  get twoWellsKeyConceptsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsKeyConceptsStringProperty;
  }

  get twoWellsInteractionsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsInteractionsStringProperty;
  }

  get twoWellsEducationalContentStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.twoWellsEducationalContentStringProperty;
  }

  get manyWellsKeyConceptsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsKeyConceptsStringProperty;
  }

  get manyWellsInteractionsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsInteractionsStringProperty;
  }

  get manyWellsEducationalContentStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.manyWellsEducationalContentStringProperty;
  }

  get probabilityDensityAxisStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.probabilityDensityAxisStringProperty;
  }

  get positionNmAxisStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.positionNmAxisStringProperty;
  }

  get timeFormatStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.timeFormatStringProperty;
  }

  get classicallyForbiddenLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.classicallyForbiddenLabelStringProperty;
  }

  get secondDerivativeLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.secondDerivativeLabelStringProperty;
  }

  get firstDerivativeLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.firstDerivativeLabelStringProperty;
  }

  get notAvailableStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.notAvailableStringProperty;
  }

  get averageWavenumberLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.averageWavenumberLabelStringProperty;
  }

  get rmsWavenumberLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.rmsWavenumberLabelStringProperty;
  }

  get averagePositionLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.averagePositionLabelStringProperty;
  }

  get rmsPositionLabelStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.rmsPositionLabelStringProperty;
  }

  get stateLabelProbabilityStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.stateLabelProbabilityStringProperty;
  }

  get stateLabelWavefunctionStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.stateLabelWavefunctionStringProperty;
  }

  get valueWithNanometersStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.valueWithNanometersStringProperty;
  }

  get valueWithElectronVoltsStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.valueWithElectronVoltsStringProperty;
  }

  get valueWithElectronMassStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.valueWithElectronMassStringProperty;
  }

  get valueWithElectronVoltsPerNanometerStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.valueWithElectronVoltsPerNanometerStringProperty;
  }

  get percentageValueStringProperty(): ReadOnlyProperty<string> {
    return this.stringProperties.percentageValueStringProperty;
  }

  /**
   * Gets an object containing the keyboard shortcuts string properties.
   */
  public getKeyboardShortcutsStrings() {
    return {
      energyLevelNavigationStringProperty: this.stringProperties.keyboardShortcutsEnergyLevelNavigationStringProperty,
      arrowUpRightDescriptionStringProperty:
        this.stringProperties.keyboardShortcutsArrowUpRightDescriptionStringProperty,
      arrowDownLeftDescriptionStringProperty:
        this.stringProperties.keyboardShortcutsArrowDownLeftDescriptionStringProperty,
      homeDescriptionStringProperty: this.stringProperties.keyboardShortcutsHomeDescriptionStringProperty,
      endDescriptionStringProperty: this.stringProperties.keyboardShortcutsEndDescriptionStringProperty,
    };
  }

  /**
   * Accessibility strings (PDOM names, descriptions, help text and live alerts), plus the visible
   * chart/tool labels that sit alongside them. Nested exactly like the `a11y` group in the locale
   * files; `*Pattern` strings take `{{placeholders}}` for StringUtils.fillIn.
   */
  public getA11yStrings(): typeof this.stringProperties.a11y {
    return this.stringProperties.a11y;
  }

  /**
   * Screen-summary descriptions, one per screen.
   */
  public getScreenSummaryDescriptions() {
    return {
      introStringProperty: this.stringProperties.introDescriptionStringProperty,
      oneWellStringProperty: this.stringProperties.oneWellScreenSummaryStringProperty,
      twoWellsStringProperty: this.stringProperties.twoWellsScreenSummaryStringProperty,
      manyWellsStringProperty: this.stringProperties.manyWellsScreenSummaryStringProperty,
    };
  }

  /**
   * Get all raw string properties
   * This can be used if direct access is needed to a specific string property
   */
  public getAllStringProperties(): typeof this.stringProperties {
    return this.stringProperties;
  }
}

// Export singleton instance as default
export default StringManager.getInstance();
