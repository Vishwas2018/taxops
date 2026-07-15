import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public marketing pages, the tips knowledge base, and the auth flow itself. Everything
// else is protected by default (fail closed) rather than allowlisting protected routes,
// so a newly added authenticated route doesn't need a matching proxy.ts update to stay
// protected.
const PUBLIC_PATHS = ["/", "/sign-up", "/sign-in", "/reset-password", "/update-password", "/tax-dates"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // /auth/confirm exchanges an email link for a session - it must be reachable without one.
  return pathname.startsWith("/tips") || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  // Everything except static assets and image optimization requests. This is an
  // optimistic redirect only (see Next.js Proxy docs) - protected server components/
  // actions still verify the user themselves rather than trusting this check alone.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
