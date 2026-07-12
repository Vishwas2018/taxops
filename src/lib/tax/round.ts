/** Round a dollar amount to the nearest cent using banker-safe rounding. */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
