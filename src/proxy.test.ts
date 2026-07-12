import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

const mockUpdateSession = vi.mocked(updateSession);

function mockUser() {
  return { id: "11111111-1111-1111-1111-111111111111" } as never;
}

beforeEach(() => {
  mockUpdateSession.mockReset();
});

describe("proxy", () => {
  it("redirects an unauthenticated request for a protected path to sign-in with redirectTo", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const result = await proxy(request);

    expect(result.status).toBe(307);
    const location = new URL(result.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirectTo")).toBe("/dashboard");
  });

  it("passes through an unauthenticated request for a public path", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = new NextRequest("http://localhost:3000/");
    const result = await proxy(request);

    expect(result.headers.get("location")).toBeNull();
  });

  it.each(["/sign-in", "/sign-up", "/reset-password", "/update-password"])(
    "treats %s as public for unauthenticated requests",
    async (path) => {
      const passthrough = NextResponse.next();
      mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

      const request = new NextRequest(`http://localhost:3000${path}`);
      const result = await proxy(request);

      expect(result.headers.get("location")).toBeNull();
    },
  );

  it("treats /tips/* as public for unauthenticated requests", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = new NextRequest("http://localhost:3000/tips/contractor-expenses/home-office");
    const result = await proxy(request);

    expect(result.headers.get("location")).toBeNull();
  });

  it("treats /auth/confirm as public for unauthenticated requests", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: null });

    const request = new NextRequest("http://localhost:3000/auth/confirm?code=abc");
    const result = await proxy(request);

    expect(result.headers.get("location")).toBeNull();
  });

  it("does not redirect an authenticated request for a protected path", async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: passthrough, user: mockUser() });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const result = await proxy(request);

    expect(result.headers.get("location")).toBeNull();
  });
});
