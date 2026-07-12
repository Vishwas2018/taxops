import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE callback for Supabase auth email links (sign-up confirmation, password reset).
 * Exchanges the `code` query param for a session (setting cookies via the server client)
 * before redirecting to `next`. Must stay reachable without a session - see proxy.ts.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  redirect("/sign-in?error=auth-confirm-failed");
}
