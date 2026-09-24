/**
 * QPPWDescriber turns simulation state into localized accessible text: names and physics
 * descriptions of potentials and superpositions, slider help text, and the sentences used by the
 * screen summary, chart descriptions and live alerts. All wording comes from the `a11y` group of
 * the locale files (StringManager.getA11yStrings()).
 *
 * Methods returning a TReadOnlyProperty are for static PDOM content (they follow locale changes);
 * methods returning a string fill a pattern with the current locale's text, for content that is
 * rebuilt whenever the model changes.
 */

import { PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import stringManager from "../../../i18n/StringManager.js";
import type { PotentialType } from "../../model/PotentialFunction.js";
import { SuperpositionType } from "../../model/SuperpositionType.js";

const a11y = stringManager.getA11yStrings();

/** Adjustable model parameters that have a localized name and effect description. */
export type QPPWParameter = keyof typeof a11y.parameters extends `${infer K}StringProperty` ? K : never;

/** Units spoken in parameter-change alerts. */
export type QPPWUnit = keyof typeof a11y.units extends `${infer K}StringProperty` ? K : never;

export type DisplayMode = "probabilityDensity" | "waveFunction" | "phaseColor";

// SuperpositionType.SINGLE's value ("eigenfunction") predates the string key ("single")
const SUPERPOSITION_KEYS: Record<
  SuperpositionType,
  keyof typeof a11y.superpositionNames extends `${infer K}StringProperty` ? K : never
> = {
  [SuperpositionType.SINGLE]: "single",
  [SuperpositionType.PSI_I_PSI_J]: "psiIPsiJ",
  [SuperpositionType.LOCALIZED]: "localized",
  [SuperpositionType.MOVING_LOCALIZED]: "movingLocalized",
  [SuperpositionType.TWO_LOBED]: "twoLobed",
  [SuperpositionType.COHERENT]: "coherent",
  [SuperpositionType.CUSTOM]: "custom",
};

/** Fixed-precision number formatting shared by every spoken value. */
const format = (value: number, decimals: number): string => value.toFixed(decimals);

export const QPPWDescriber = {
  getPotentialTypeNameProperty(potentialType: PotentialType): TReadOnlyProperty<string> {
    return a11y.potentialNames[`${potentialType}StringProperty`];
  },

  getPotentialTypeName(potentialType: PotentialType): string {
    return QPPWDescriber.getPotentialTypeNameProperty(potentialType).value;
  },

  getPotentialTypeDescriptionProperty(potentialType: PotentialType): TReadOnlyProperty<string> {
    return a11y.potentialDescriptions[`${potentialType}StringProperty`];
  },

  getSuperpositionTypeNameProperty(superpositionType: SuperpositionType): TReadOnlyProperty<string> {
    return a11y.superpositionNames[`${SUPERPOSITION_KEYS[superpositionType]}StringProperty`];
  },

  getSuperpositionTypeDescriptionProperty(superpositionType: SuperpositionType): TReadOnlyProperty<string> {
    return a11y.superpositionDescriptions[`${SUPERPOSITION_KEYS[superpositionType]}StringProperty`];
  },

  getDisplayModeDescriptionProperty(displayMode: DisplayMode): TReadOnlyProperty<string> {
    return a11y.displayModeDescriptions[`${displayMode}StringProperty`];
  },

  getParameterNameProperty(parameter: QPPWParameter): TReadOnlyProperty<string> {
    return a11y.parameters[`${parameter}StringProperty`];
  },

  /**
   * Help text for a parameter slider: what the parameter does, then the keyboard controls.
   */
  getSliderHelpText(parameter: QPPWParameter): TReadOnlyProperty<string> {
    return new PatternStringProperty(a11y.sliderHelpPatternStringProperty, {
      parameter: a11y.parameters[`${parameter}StringProperty`],
      effect: a11y.parameterEffects[`${parameter}StringProperty`],
    });
  },

  /** "Wavefunction has N nodes (zero crossings)." */
  describeNodes(count: number): string {
    return count === 1
      ? a11y.nodesOneStringProperty.value
      : StringUtils.fillIn(a11y.nodesPatternStringProperty, { count: count });
  },

  /** "Found N bound states." or "No bound states found …" */
  describeBoundStateCount(count: number): string {
    if (count === 0) {
      return a11y.noBoundStatesStringProperty.value;
    }
    return count === 1
      ? a11y.boundStatesOneStringProperty.value
      : StringUtils.fillIn(a11y.boundStatesPatternStringProperty, { count: count });
  },

  /**
   * Announcement for selecting an energy level (0-indexed `level`, energy in eV).
   */
  createEnergyLevelAnnouncement(level: number, energy: number, totalLevels: number): string {
    const selected = StringUtils.fillIn(a11y.energyLevelSelectedPatternStringProperty, {
      level: level + 1,
      total: totalLevels,
      energy: format(energy, 3),
    });
    // The n-th eigenstate (0-indexed) has n nodes
    return `${selected} ${QPPWDescriber.describeNodes(level)}`;
  },

  /**
   * Announcement for a change of potential type (ground-state energy in eV, when there are states).
   */
  createPotentialTypeAnnouncement(
    potentialType: PotentialType,
    numBoundStates: number,
    groundStateEnergy?: number,
  ): string {
    const parts = [
      StringUtils.fillIn(a11y.potentialChangedPatternStringProperty, {
        potential: QPPWDescriber.getPotentialTypeName(potentialType),
      }),
      QPPWDescriber.describeBoundStateCount(numBoundStates),
    ];
    if (numBoundStates > 0 && groundStateEnergy !== undefined) {
      parts.push(
        StringUtils.fillIn(a11y.groundStateEnergyPatternStringProperty, { energy: format(groundStateEnergy, 3) }),
      );
    }
    return parts.join(" ");
  },

  /**
   * Announcement for a (debounced) parameter change, optionally followed by its consequence.
   */
  createParameterChangeAnnouncement(parameter: QPPWParameter, value: number, unit: QPPWUnit, effect?: string): string {
    const announcement = StringUtils.fillIn(a11y.parameterChangedPatternStringProperty, {
      parameter: a11y.parameters[`${parameter}StringProperty`],
      value: format(value, 2),
      unit: a11y.units[`${unit}StringProperty`],
    });
    return effect ? `${announcement} ${effect}` : announcement;
  },
};
