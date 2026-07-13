import { Info } from "lucide-react";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { cn } from "@/lib/utils";

type DisclaimerVariant = "inline" | "footer" | "calculator";

// Boxed with an icon (not just muted text) so the disclaimer stays visually
// prominent regardless of surrounding surface - color/weight alone isn't
// enough per CLAUDE.md's disclaimer + accessibility rules.
const VARIANT_CLASSES: Record<DisclaimerVariant, string> = {
  inline: "items-start gap-2 text-sm text-textSecondary",
  footer:
    "mx-auto max-w-2xl items-start justify-center gap-2 rounded-md border border-border bg-neutralSubtle px-4 py-3 text-xs text-textSecondary",
  calculator: "mt-4 items-start gap-2 rounded-md bg-neutralSubtle px-3 py-3 text-sm text-textSecondary",
};

/**
 * Renders the standard general-advice disclaimer. Wording is fixed (no free-text prop) so
 * it can never be weakened or paraphrased at a call site - see CLAUDE.md.
 */
export function Disclaimer({ variant = "inline" }: { variant?: DisclaimerVariant }) {
  return (
    <div className={cn("flex", VARIANT_CLASSES[variant])}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-textMuted" />
      <p>{STANDARD_DISCLAIMER}</p>
    </div>
  );
}
