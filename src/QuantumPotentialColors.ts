/**
 * QuantumPotentialColors defines the color palette for the Quantum Physics Potential Wells simulation.
 * Colors are defined as ProfileColorProperty instances which can adapt to different color profiles.
 */

import { Color, ProfileColorProperty } from "scenerystack/scenery";
import QuantumPotentialNamespace from "./QuantumPotentialNamespace.js";

const QuantumPotentialColors = {
  // Background colors
  backgroundColorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "background", {
    default: new Color(10, 10, 30), // Deep blue-black for quantum theme
    projector: new Color(255, 255, 255), // White for projector mode
  }),

  // Panel and control colors
  panelFillProperty: new ProfileColorProperty(QuantumPotentialNamespace, "panelFill", {
    default: new Color(10, 10, 30, 0),
    projector: new Color(245, 245, 250, 0),
  }),

  panelStrokeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "panelStroke", {
    default: new Color(100, 100, 120),
    projector: new Color(80, 80, 100),
  }),

  // Wavefunction colors
  wavefunctionRealProperty: new ProfileColorProperty(QuantumPotentialNamespace, "wavefunctionReal", {
    default: new Color(0, 150, 255), // Bright blue
    projector: new Color(0, 100, 200), // Darker blue for projector
  }),

  wavefunctionImaginaryProperty: new ProfileColorProperty(QuantumPotentialNamespace, "wavefunctionImaginary", {
    default: new Color(255, 100, 0), // Orange
    projector: new Color(200, 80, 0), // Darker orange for projector
  }),

  wavefunctionProbabilityProperty: new ProfileColorProperty(QuantumPotentialNamespace, "wavefunctionProbability", {
    default: new Color(255, 200, 0), // Gold/yellow
    projector: new Color(200, 150, 0), // Darker yellow for projector
  }),

  wavefunctionMagnitudeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "wavefunctionMagnitude", {
    default: new Color(160, 32, 240), // Purple
    projector: new Color(128, 0, 128), // Darker purple for projector
  }),

  wavefunctionProbabilityFillProperty: new ProfileColorProperty(
    QuantumPotentialNamespace,
    "wavefunctionProbabilityFill",
    {
      default: new Color(255, 215, 0, 0.2), // Semi-transparent gold
      projector: new Color(200, 150, 0, 0.3), // Semi-transparent darker gold for projector
    },
  ),

  classicalProbabilityProperty: new ProfileColorProperty(QuantumPotentialNamespace, "classicalProbability", {
    default: new Color(0, 255, 200), // Cyan/turquoise
    projector: new Color(0, 180, 140), // Darker cyan for projector
  }),

  // Potential well colors
  potentialWellProperty: new ProfileColorProperty(QuantumPotentialNamespace, "potentialWell", {
    default: new Color(150, 150, 200), // Light purple
    projector: new Color(100, 100, 150), // Darker purple for projector
  }),

  potentialBarrierProperty: new ProfileColorProperty(QuantumPotentialNamespace, "potentialBarrier", {
    default: new Color(180, 50, 50), // Red
    projector: new Color(150, 40, 40), // Darker red for projector
  }),

  // Energy level colors
  energyLevelProperty: new ProfileColorProperty(QuantumPotentialNamespace, "energyLevel", {
    default: new Color(0, 255, 150), // Bright green
    projector: new Color(0, 150, 100), // Darker green for projector
  }),

  // Drag handles on the potential curve (energy chart)
  potentialHandleFillProperty: new ProfileColorProperty(QuantumPotentialNamespace, "potentialHandleFill", {
    default: new Color(255, 120, 200), // Magenta, distinct from the levels and the curve
    projector: new Color(200, 40, 140),
  }),

  potentialHandleStrokeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "potentialHandleStroke", {
    default: new Color(40, 10, 40),
    projector: new Color(60, 0, 40),
  }),

  energyLevelSelectedProperty: new ProfileColorProperty(QuantumPotentialNamespace, "energyLevelSelected", {
    default: new Color(255, 255, 100), // Bright yellow
    projector: new Color(200, 200, 0), // Darker yellow for projector
  }),

  // Grid and axis colors
  gridLineProperty: new ProfileColorProperty(QuantumPotentialNamespace, "gridLine", {
    default: new Color(80, 80, 100, 0.3),
    projector: new Color(160, 160, 180, 0.5),
  }),

  axisProperty: new ProfileColorProperty(QuantumPotentialNamespace, "axis", {
    default: new Color(200, 200, 220),
    projector: new Color(100, 100, 120),
  }),

  // Text colors
  textFillProperty: new ProfileColorProperty(QuantumPotentialNamespace, "textFill", {
    default: new Color(255, 255, 255),
    projector: new Color(0, 0, 0), // Black text for projector mode
  }),

  labelFillProperty: new ProfileColorProperty(QuantumPotentialNamespace, "labelFill", {
    default: new Color(200, 200, 220),
    projector: new Color(40, 40, 60), // Dark gray for projector mode
  }),

  // Warning and notification colors
  warningColorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "warning", {
    default: new Color(255, 165, 0), // Orange
    projector: new Color(200, 100, 0), // Darker orange for projector
  }),

  // Control panel specific colors (for ComboBox, buttons, etc.)
  controlPanelBackgroundColorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "controlPanelBackground", {
    default: new Color(30, 30, 50), // Slightly lighter than main background
    projector: new Color(250, 250, 255), // Almost white for projector
  }),

  controlPanelStrokeColorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "controlPanelStroke", {
    default: new Color(120, 120, 160), // Light purple-gray
    projector: new Color(100, 100, 140), // Darker for projector
  }),

  disabledButtonColorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "disabledButton", {
    default: new Color(55, 55, 75),
    projector: new Color(220, 220, 230),
  }),

  // Forbidden region colors (for classically forbidden areas)
  forbiddenRegionLightProperty: new ProfileColorProperty(QuantumPotentialNamespace, "forbiddenRegionLight", {
    default: new Color(255, 200, 200, 0.1), // Very faint red
    projector: new Color(255, 200, 200, 0.15), // Slightly more visible for projector
  }),

  forbiddenRegionDarkProperty: new ProfileColorProperty(QuantumPotentialNamespace, "forbiddenRegionDark", {
    default: new Color(255, 200, 200, 0.3), // Semi-transparent red
    projector: new Color(255, 200, 200, 0.4), // More visible for projector
  }),

  // Measurement tool colors
  areaMeasurementLightProperty: new ProfileColorProperty(QuantumPotentialNamespace, "areaMeasurementLight", {
    default: new Color(100, 150, 255, 0.1), // Very faint blue
    projector: new Color(100, 150, 255, 0.15), // Slightly more visible for projector
  }),

  areaMeasurementDarkProperty: new ProfileColorProperty(QuantumPotentialNamespace, "areaMeasurementDark", {
    default: new Color(100, 150, 255, 0.3), // Semi-transparent blue
    projector: new Color(100, 150, 255, 0.4), // More visible for projector
  }),

  // Curvature tool colors
  curvatureToolStrokeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "curvatureToolStroke", {
    default: new Color(255, 100, 100, 0.8), // Semi-transparent red
    projector: new Color(200, 80, 80, 0.9), // Darker red for projector
  }),

  curvatureToolFillLightProperty: new ProfileColorProperty(QuantumPotentialNamespace, "curvatureToolFillLight", {
    default: new Color(255, 100, 100, 0.9), // Semi-transparent red
    projector: new Color(200, 80, 80, 1), // Darker red for projector
  }),

  curvatureToolFillDarkProperty: new ProfileColorProperty(QuantumPotentialNamespace, "curvatureToolFillDark", {
    default: new Color(255, 100, 100, 1), // Solid red
    projector: new Color(200, 80, 80, 1), // Darker red for projector
  }),

  // Derivative tool colors
  derivativeToolStrokeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "derivativeToolStroke", {
    default: new Color(100, 200, 100, 0.8), // Semi-transparent green
    projector: new Color(80, 160, 80, 0.9), // Darker green for projector
  }),

  derivativeToolFillLightProperty: new ProfileColorProperty(QuantumPotentialNamespace, "derivativeToolFillLight", {
    default: new Color(100, 200, 100, 0.9), // Semi-transparent green
    projector: new Color(80, 160, 80, 1), // Darker green for projector
  }),

  derivativeToolFillDarkProperty: new ProfileColorProperty(QuantumPotentialNamespace, "derivativeToolFillDark", {
    default: new Color(100, 200, 100, 1), // Solid green
    projector: new Color(80, 160, 80, 1), // Darker green for projector
  }),

  // Phase visualization
  phaseIndicatorProperty: new ProfileColorProperty(QuantumPotentialNamespace, "phaseIndicator", {
    default: new Color(255, 255, 255), // White
    projector: new Color(0, 0, 0), // Black for projector
  }),

  // Screen icon colors
  iconBackgroundTopProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconBackgroundTop", {
    default: new Color(26, 26, 58), // Dark blue-purple
    projector: new Color(240, 240, 255), // Light for projector
  }),

  iconBackgroundBottomProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconBackgroundBottom", {
    default: new Color(10, 10, 31), // Very dark blue
    projector: new Color(255, 255, 255), // White for projector
  }),

  iconWellStrokeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconWellStroke", {
    default: new Color(150, 150, 200), // Light purple-gray
    projector: new Color(100, 100, 150), // Darker for projector
  }),

  iconWaveFunctionProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconWaveFunction", {
    default: new Color(0, 200, 255), // Bright cyan
    projector: new Color(0, 150, 200), // Darker cyan for projector
  }),

  iconProbabilityFillProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconProbabilityFill", {
    default: new Color(100, 200, 255, 0.5), // Semi-transparent blue
    projector: new Color(80, 160, 200, 0.6), // Darker for projector
  }),

  iconBarrierEdgeProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconBarrierEdge", {
    default: new Color(180, 50, 50), // Red
    projector: new Color(150, 40, 40), // Darker red for projector
  }),

  iconBarrierCenterProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconBarrierCenter", {
    default: new Color(255, 107, 61), // Orange-red
    projector: new Color(200, 85, 50), // Darker orange-red for projector
  }),

  iconTunnelEffectProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconTunnelEffect", {
    default: new Color(160, 32, 240), // Purple
    projector: new Color(128, 0, 192), // Darker purple for projector
  }),

  iconEnergyLevelProperty: new ProfileColorProperty(QuantumPotentialNamespace, "iconEnergyLevel", {
    default: new Color(0, 255, 150), // Bright green
    projector: new Color(0, 180, 100), // Darker green for projector
  }),

  // Band colors for many-wells periodic structures
  band1Property: new ProfileColorProperty(QuantumPotentialNamespace, "band1", {
    default: new Color(0, 255, 150), // Bright green
    projector: new Color(0, 180, 100), // Darker green for projector
  }),

  band2Property: new ProfileColorProperty(QuantumPotentialNamespace, "band2", {
    default: new Color(255, 255, 100), // Bright yellow
    projector: new Color(200, 200, 0), // Darker yellow for projector
  }),

  band3Property: new ProfileColorProperty(QuantumPotentialNamespace, "band3", {
    default: new Color(0, 200, 255), // Cyan
    projector: new Color(0, 150, 200), // Darker cyan for projector
  }),

  band4Property: new ProfileColorProperty(QuantumPotentialNamespace, "band4", {
    default: new Color(255, 150, 255), // Magenta
    projector: new Color(200, 100, 200), // Darker magenta for projector
  }),

  // Secondary (description) text in the Preferences dialog, which always has a light background
  preferencesDescriptionTextProperty: new ProfileColorProperty(
    QuantumPotentialNamespace,
    "preferencesDescriptionText",
    {
      default: new Color(80, 80, 80),
      projector: new Color(80, 80, 80),
    },
  ),
};

export default QuantumPotentialColors;
