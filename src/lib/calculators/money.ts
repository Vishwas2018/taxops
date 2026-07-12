/**
 * Rounding policy for every calculator engine: convert dollar inputs to whole cents once,
 * do all accumulation (bracket sums, offsets, etc.) in integer cents, round once per
 * intermediate money value with `Math.round`, and convert back to dollars only at the
 * output boundary. This avoids the float drift that comes from repeatedly adding rounded
 * dollar amounts across many bracket/step calculations.
 */

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function toDollars(cents: number): number {
  // Normalize -0 (e.g. from Math.round(-0 * rate)) to 0 so downstream equality checks and
  // display formatting never see a negative zero.
  return cents / 100 || 0;
}
