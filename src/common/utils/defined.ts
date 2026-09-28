/**
 * A value that is present.
 *
 * Indexing under `noUncheckedIndexedAccess` is `T | undefined`, and several solvers
 * return `T | null`. The grids and lookups in this sim are packed, so a missing
 * value is a programming error rather than a case to handle at the call site.
 */
export function defined<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new Error("Expected a value.");
  }
  return value;
}
