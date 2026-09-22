/**
 * QPPWAlerter manages live announcements to screen readers.
 * It uses the global voicing utterance queue from scenery to provide
 * non-visual feedback for state changes.
 */

import { AriaLiveAnnouncer, Utterance, UtteranceQueue } from "scenerystack/utterance-queue";

// Create a global utteranceQueue instance for accessibility announcements
// Using AriaLiveAnnouncer for screen reader support via aria-live regions
const utteranceQueue = new UtteranceQueue(new AriaLiveAnnouncer());

import type { ManyWellsModel } from "../../../many-wells/model/ManyWellsModel.js";
import type { OneWellModel } from "../../../one-well/model/OneWellModel.js";
import type { TwoWellsModel } from "../../../two-wells/model/TwoWellsModel.js";
import type { BaseModel } from "../../model/BaseModel.js";
import type { PotentialType } from "../../model/PotentialFunction.js";
import type { SuperpositionType } from "../../model/SuperpositionType.js";
import { QPPWDescriber } from "./QPPWDescriber.js";

export class QPPWAlerter {
  private readonly model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel;
  private debouncedAlertTimer: number | null = null;

  public constructor(model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel) {
    this.model = model;
    this.setupAlerts();
  }

  /**
   * Set up listeners for important state changes that should be announced.
   */
  private setupAlerts(): void {
    // Energy level changes
    this.model.selectedEnergyLevelIndexProperty.lazyLink((level: number) => {
      this.alertEnergyLevelChange(level);
    });

    // Potential type changes
    this.model.potentialTypeProperty.lazyLink((newType: PotentialType) => {
      this.alertPotentialTypeChange(newType);
    });

    // Superposition type changes
    this.model.superpositionTypeProperty.lazyLink((newType: SuperpositionType) => {
      this.alertSuperpositionTypeChange(newType);
    });

    // Play/pause state
    this.model.isPlayingProperty.lazyLink((isPlaying: boolean) => {
      this.alertPlaybackStateChange(isPlaying);
    });

    // Mass changes (debounced)
    this.model.particleMassProperty.lazyLink((mass: number) => {
      this.debouncedAlert(
        QPPWDescriber.createParameterChangeAnnouncement(
          "Particle mass",
          mass,
          "electron masses",
          "Energy levels recalculated.",
        ),
        500,
      );
    });

    // Width changes (debounced)
    this.model.wellWidthProperty.lazyLink((width: number) => {
      const numLevels = this.model.getEnergyLevels().length;
      this.debouncedAlert(
        QPPWDescriber.createParameterChangeAnnouncement(
          "Well width",
          width,
          "nanometers",
          `Found ${numLevels} bound state${numLevels !== 1 ? "s" : ""}.`,
        ),
        500,
      );
    });

    // Depth changes (debounced)
    this.model.wellDepthProperty.lazyLink((depth: number) => {
      const numLevels = this.model.getEnergyLevels().length;
      this.debouncedAlert(
        QPPWDescriber.createParameterChangeAnnouncement(
          "Well depth",
          depth,
          "electron volts",
          `Found ${numLevels} bound state${numLevels !== 1 ? "s" : ""}.`,
        ),
        500,
      );
    });
  }

  /**
   * Alert when energy level selection changes.
   */
  private alertEnergyLevelChange(level: number): void {
    const energyLevels = this.model.getEnergyLevels();
    if (energyLevels.length === 0) {
      return;
    }

    const energy = energyLevels[level]!;
    const announcement = QPPWDescriber.createEnergyLevelAnnouncement(level, energy, energyLevels.length);

    utteranceQueue.addToBack(new Utterance({ alert: announcement }));
  }

  /**
   * Alert when potential type changes.
   */
  private alertPotentialTypeChange(potentialType: PotentialType): void {
    const energyLevels = this.model.getEnergyLevels();
    const numLevels = energyLevels.length;
    const groundEnergy = numLevels > 0 ? energyLevels[0] : undefined;

    // Get potential name from string manager would be ideal, but for now use enum
    const potentialName = potentialType.toString();

    const announcement = QPPWDescriber.createPotentialTypeAnnouncement(
      potentialType,
      potentialName,
      numLevels,
      groundEnergy,
    );

    utteranceQueue.addToBack(new Utterance({ alert: announcement }));
  }

  /**
   * Alert when superposition type changes.
   */
  private alertSuperpositionTypeChange(superpositionType: SuperpositionType): void {
    const description = QPPWDescriber.getSuperpositionTypeDescription(superpositionType);
    utteranceQueue.addToBack(new Utterance({ alert: description }));
  }

  /**
   * Alert when playback state changes.
   */
  private alertPlaybackStateChange(isPlaying: boolean): void {
    const alert = isPlaying ? "Simulation playing. Wavefunction evolving in time." : "Simulation paused.";
    utteranceQueue.addToBack(new Utterance({ alert }));
  }

  /**
   * Alert that simulation was reset.
   */
  public alertResetAll(): void {
    const alert = "Simulation reset. All parameters returned to initial values.";
    utteranceQueue.addToBack(new Utterance({ alert }));
  }

  /**
   * Helper for debounced alerts (to avoid spamming during continuous slider changes).
   */
  private debouncedAlert(message: string, delay: number): void {
    if (this.debouncedAlertTimer !== null) {
      clearTimeout(this.debouncedAlertTimer);
    }

    this.debouncedAlertTimer = window.setTimeout(() => {
      utteranceQueue.addToBack(new Utterance({ alert: message }));
      this.debouncedAlertTimer = null;
    }, delay);
  }

  /**
   * Clean up timers when disposing.
   */
  public dispose(): void {
    if (this.debouncedAlertTimer !== null) {
      clearTimeout(this.debouncedAlertTimer);
      this.debouncedAlertTimer = null;
    }
  }
}
