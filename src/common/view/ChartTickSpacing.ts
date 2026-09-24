/**
 * Tick spacing for charts whose model range follows the data.
 */

/**
 * Picks a 1–2–5 tick spacing that puts at least four intervals across the given span.
 */
export function computeTickSpacing(span: number): number {
  const rawStep = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return niceStep * magnitude;
}

/**
 * Decimal places that show every tick at the given spacing without trailing noise.
 */
export function getTickDecimals(spacing: number): number {
  return Math.max(0, Math.ceil(-Math.log10(spacing) - 1e-9));
}
