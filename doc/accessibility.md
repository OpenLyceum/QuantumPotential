# Accessibility

Quantum Potential follows the fleet convention in
[Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md): a Parallel DOM
(PDOM) with accessible names, a screen summary, and full keyboard support. Voicing is not offered (deferred
fleet-wide).

## What is implemented

### Structure

- Every screen has the three-section PDOM layout: screen summary, play area, control area
  (`BaseScreenView.setupPDOMStructure`).
- The screen summary is built in `BaseScreenView` and its current-details paragraph updates with the
  model state (potential, selected level, energy).

### Keyboard

- **Energy levels:** arrow keys, Home and End move the selection on the energy chart.
- **Potential handles:** each drag handle on the potential (width, depth, barrier, offset, separation) is an
  `AccessibleSlider`, first in the chart's focus order. Handles pause time while they are moved.
- **Spinners:** particle mass, number of wells and electric field use ◀ ▶ number spinners.
- **Chart tools:** the area, derivative and curvature markers use `KeyboardDragListener` (arrows, with
  Shift for fine steps).
- **Combo boxes, radio buttons, checkboxes and dialogs** use the accessible sun components.
- The keyboard-help dialog (`QPPWKeyboardHelpContent`) lists all of the above.

### Descriptions and announcements

- `QPPWDescriber` builds accessible names, help text and chart descriptions from `*Pattern` strings, so
  they follow the locale.
- `QPPWAlerter` announces level selection, potential changes, playback and reset through the utterance
  queue, with parameter-change alerts debounced.
- All accessible text lives under the `a11y` group of `src/i18n/strings_*.json`
  (`StringManager.getA11yStrings()`).

## Not yet done

- Testing with screen readers (NVDA, JAWS, VoiceOver, TalkBack) and keyboard-only user testing.
- Voicing responses.

## Adding an interactive element

1. Give it an `accessibleName` (and `accessibleHelpText` if its purpose is not obvious), with the strings
   added to the `a11y` group of all three locale files.
2. Make it keyboard-operable: a sun component, an `AccessibleSlider`, or a `KeyboardDragListener`.
3. If a change it makes is not otherwise perceivable, announce it through `QPPWAlerter`.
4. Add it to `QPPWKeyboardHelpContent` if it has non-standard keys.
