import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Fills a number input that react-hook-form pre-populates with a default value client-side
 * (`register()` sets the field's value via ref on mount, not a server-rendered `value`/
 * `defaultValue` attribute - see the three calculator forms). Filling immediately after
 * `page.goto()` races that mount effect: Playwright's `fill()` can land between the field
 * reading as empty and react-hook-form writing its default, producing a doubled value (e.g.
 * "800800") instead of "800" - a real hydration-timing issue E2E surfaced (see PROGRESS.md Day
 * 9). Waiting for the field to reach a stable, non-empty value first avoids the race.
 */
export async function fillNumberField(locator: Locator, value: string): Promise<void> {
  await expect(locator).not.toHaveValue("");
  await locator.fill(value);
}
