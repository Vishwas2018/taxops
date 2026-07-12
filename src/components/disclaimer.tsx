import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { cn } from "@/lib/utils";

type DisclaimerVariant = "inline" | "footer" | "calculator";

const VARIANT_CLASSES: Record<DisclaimerVariant, string> = {
  inline: "text-sm text-muted-foreground",
  footer: "text-xs text-muted-foreground text-center",
  calculator: "text-sm text-muted-foreground border-t pt-3 mt-4",
};

/**
 * Renders the standard general-advice disclaimer. Wording is fixed (no free-text prop) so
 * it can never be weakened or paraphrased at a call site - see CLAUDE.md.
 */
export function Disclaimer({ variant = "inline" }: { variant?: DisclaimerVariant }) {
  return <p className={cn(VARIANT_CLASSES[variant])}>{STANDARD_DISCLAIMER}</p>;
}
