import type { Locator, Page } from "@playwright/test";

/**
 * True if `locator`'s bounding box is entirely within the current viewport without needing to
 * scroll - used to check "the disclaimer is visible in the same viewport as the results", not
 * just "present somewhere in the DOM" (jsdom/RTL can't tell the two apart at all; this is the
 * one thing a real browser viewport check gets us that a unit test can't).
 */
export async function isFullyInViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) return false;
  return box.y >= 0 && box.y + box.height <= viewport.height && box.x >= 0 && box.x + box.width <= viewport.width;
}
