/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates each screen model inside a function boundary, disposes it, forces garbage
 * collection via global.gc (--expose-gc in vitest.config.ts), then asserts via WeakRef that
 * the model was collected. Models link to the global QuantumPotentialPreferences properties, so a model
 * whose dispose() forgets to unlink stays reachable and fails here.
 *
 * SuperpositionDialog is rebuilt every time the user configures a superposition, so its
 * Cancel / OK exits are cycled below against a live model and the global string Properties.
 */

import { Property } from "scenerystack/axon";
import { Node } from "scenerystack/scenery";
import { RectangularPushButton } from "scenerystack/sun";
import { describe, expect, it } from "vitest";
import { SuperpositionType } from "../src/common/model/SuperpositionType.js";
import { SuperpositionDialog } from "../src/common/view/SuperpositionDialog.js";
import stringManager from "../src/i18n/StringManager.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";
import { describeDisposalLeaks, expectNoListenerGrowth, forceGC } from "./helpers/memoryLeak.js";

type MutableGlobal = Record<string, Record<string, Record<string, unknown>>>;

/** Popups handed to the stub sim's showPopup, so a test can reach the shown dialog. */
const shownPopups: Node[] = [];

/** Minimal phet.joist.sim stub so Dialog can construct under happy-dom (MazeGame pattern). */
function installSimStub(): Record<string, unknown> {
  const globals = globalThis as unknown as MutableGlobal;
  globals["phet"] = globals["phet"] ?? {};
  globals["phet"]["joist"] = globals["phet"]["joist"] ?? {};
  const sim = {
    boundsProperty: new Property(null),
    screenBoundsProperty: new Property(null),
    scaleProperty: new Property(null),
    selectedScreenProperty: new Property(null),
    isConstructionCompleteProperty: new Property(true),
    topLayer: new Node(),
    showPopup: (popup: Node): void => {
      shownPopups.push(popup);
    },
    hidePopup: (popup: Node): void => {
      shownPopups.splice(shownPopups.indexOf(popup), 1);
    },
  };
  globals["phet"]["joist"]["sim"] = sim;
  return sim;
}

const sim = installSimStub();

// Outlives every dialog, like the screen model outlives the dialogs it opens.
const superpositionModel = new OneWellModel();

describeDisposalLeaks([
  { name: "IntroModel", create: () => new IntroModel(), idempotentDispose: true },
  { name: "OneWellModel", create: () => new OneWellModel(), idempotentDispose: true },
  { name: "TwoWellsModel", create: () => new TwoWellsModel(), idempotentDispose: true },
  { name: "ManyWellsModel", create: () => new ManyWellsModel(), idempotentDispose: true },
  {
    name: "SuperpositionDialog",
    create: () => new SuperpositionDialog(superpositionModel, SuperpositionType.PSI_I_PSI_J),
    keepAlive: () => [superpositionModel, stringManager.superpositionDialogTitleStringProperty],
  },
]);

/** The push button in `root` whose label reads `label`. */
function findButton(root: Node, label: string): RectangularPushButton {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node instanceof RectangularPushButton) {
      const texts: Node[] = [node];
      while (texts.length > 0) {
        const candidate = texts.pop()!;
        if ("string" in candidate && candidate.string === label) {
          return node;
        }
        texts.push(...candidate.children);
      }
    }
    stack.push(...node.children);
  }
  throw new Error(`no "${label}" button in the shown dialog`);
}

function press(button: RectangularPushButton): void {
  (button as unknown as { pushButtonModel: { fire(): void } }).pushButtonModel.fire();
}

/** Open a dialog as ControlPanelNode does, exit through `label`, and return a WeakRef to it. */
function openAndExit(label: () => string): WeakRef<object> {
  const dialog = new SuperpositionDialog(superpositionModel, superpositionModel.superpositionTypeProperty.value);
  dialog.show();
  const popup = shownPopups.at(-1)!;
  press(findButton(popup, label()));
  expect(shownPopups, "the exit hides the dialog").not.toContain(popup);
  return new WeakRef(dialog);
}

/** Let any deferred teardown (scheduled when the dialog hides) run. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const exits = [
  { name: "Cancel", label: () => stringManager.cancelButtonStringProperty.value },
  { name: "OK", label: () => stringManager.okButtonStringProperty.value },
];

describe("SuperpositionDialog open/exit cycles", () => {
  const watched = () => [
    stringManager.superpositionDialogTitleStringProperty,
    stringManager.okButtonStringProperty,
    stringManager.cancelButtonStringProperty,
    stringManager.stateStringProperty,
    stringManager.customStringProperty,
    stringManager.waveFunctionPreviewStringProperty,
    sim["boundsProperty"] as object,
    sim["selectedScreenProperty"] as object,
    superpositionModel.superpositionTypeProperty,
    superpositionModel.superpositionConfigProperty,
  ];

  for (const exit of exits) {
    it(`${exit.name} releases the dialog's string and sim listeners`, async () => {
      await expectNoListenerGrowth(watched(), async () => {
        openAndExit(exit.label);
        await settle();
      });
    });

    it(`dialogs closed with ${exit.name} are garbage-collected`, async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 5; i++) {
        refs.push(openAndExit(exit.label));
      }
      await settle();
      await forceGC(refs);
      expect(refs.filter((ref) => ref.deref() !== undefined).length, `${exit.name} dialogs retained`).toBe(0);
      expect(superpositionModel.superpositionConfigProperty.value).toBeDefined();
    });
  }
});
