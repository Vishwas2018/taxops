import type { AuthActionResult } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export function ActionMessage({ result }: { result: AuthActionResult }) {
  if (!result) return null;

  return (
    <p
      role="alert"
      className={cn(
        "text-sm",
        result.status === "error" ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {result.message}
    </p>
  );
}
