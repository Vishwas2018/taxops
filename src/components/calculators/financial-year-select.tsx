import { SELECTABLE_FINANCIAL_YEARS, type SelectableFinancialYear } from "@/lib/tax-config";
import { FormField } from "@/components/ui/form-field";

/**
 * Shared FY selector for the three calculators that offer both years
 * (`contractor-take-home`, `property-cash-flow`, `division293` - see
 * `docs/updating-tax-data.md`'s "which surface defaults to which financial year" section).
 * Deliberately separate from each calculator's react-hook-form schema - the selected year picks
 * which `TaxYearConfig` is passed to the engine, it isn't itself a validated calculation input.
 */
export function FinancialYearSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: SelectableFinancialYear;
  onChange: (year: SelectableFinancialYear) => void;
}) {
  return (
    <FormField id={id} label="Financial year">
      <select
        className="flex h-8 w-full rounded-sm border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value as SelectableFinancialYear)}
      >
        {SELECTABLE_FINANCIAL_YEARS.map((year) => (
          <option key={year} value={year}>
            FY{year}
          </option>
        ))}
      </select>
    </FormField>
  );
}
