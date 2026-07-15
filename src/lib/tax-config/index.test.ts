import { describe, expect, it } from "vitest";
import { fy2025_26 } from "./fy2025-26";
import { fy2026_27 } from "./fy2026-27";
import {
  DEFAULT_SELECTABLE_FINANCIAL_YEAR,
  SELECTABLE_FINANCIAL_YEARS,
  TAX_YEAR_CONFIGS,
} from "./index";

describe("TAX_YEAR_CONFIGS", () => {
  it("maps each selectable financial year label to the config with the matching financialYear", () => {
    for (const year of SELECTABLE_FINANCIAL_YEARS) {
      expect(TAX_YEAR_CONFIGS[year].financialYear).toBe(year);
    }
  });

  it("has exactly the two configs built so far", () => {
    expect(TAX_YEAR_CONFIGS["2025-26"]).toBe(fy2025_26);
    expect(TAX_YEAR_CONFIGS["2026-27"]).toBe(fy2026_27);
  });

  it("defaults to FY2026-27, per docs/updating-tax-data.md", () => {
    expect(DEFAULT_SELECTABLE_FINANCIAL_YEAR).toBe("2026-27");
  });
});
