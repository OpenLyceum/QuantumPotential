/**
 * Polymorphic common/ view and ScreenModels intentionally import each well-screen
 * model/view-state. See AGENTS.md compliance carve-outs.
 *
 * @type {{ omitRules: string[] }}
 */
module.exports = {
  omitRules: ["no-common-to-screen"],
};
