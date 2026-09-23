/**
 * Whether the sim was started with ?dev. Developer-only UI (e.g. the parameter sliders that the on-chart
 * potential handles replace) is shown only then.
 */

type PhetGlobal = { phet?: { chipper?: { queryParameters?: { dev?: boolean } } } };

export default function isDevMode(): boolean {
  return (globalThis as PhetGlobal).phet?.chipper?.queryParameters?.dev === true;
}
