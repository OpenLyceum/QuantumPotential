# Accessibility helpers

What the sim implements, and the checklist for new controls, are in
[`doc/ACCESSIBILITY.md`](../../../../doc/ACCESSIBILITY.md). This directory holds the two helpers that turn
model state into text.

## `QPPWDescriber.ts`

Stateless functions that return localized text. Names and help text are returned as
`TReadOnlyProperty<string>` so they follow locale changes; sentences built from the current state are
plain strings filled from `*Pattern` strings with `StringUtils.fillIn`.

```typescript
comboBoxItem.accessibleName = QPPWDescriber.getPotentialTypeNameProperty(PotentialType.HARMONIC_OSCILLATOR);
const helpText = QPPWDescriber.getSliderHelpText("wellWidth");
const alert = QPPWDescriber.createEnergyLevelAnnouncement(2, 1.234, 5);
```

## `QPPWAlerter.ts`

Created once per screen by `BaseScreenView`. It links to the model and announces level selection,
potential and superposition changes, and play/pause through the utterance queue. Parameter-change alerts
are debounced. The reset button calls `alertResetAll()`.

All strings live under the `a11y` group of `src/i18n/strings_*.json`.
