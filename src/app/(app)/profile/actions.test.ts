import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { saveTaxProfileSectionAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

function mockSupabase({
  user,
  upsertError = null,
}: {
  user: { id: string } | null;
  upsertError?: { message: string } | null;
}) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const from = vi.fn().mockReturnValue({ upsert });
  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from,
    },
    upsert,
    from,
  };
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

describe("saveTaxProfileSectionAction", () => {
  it("rejects an unauthenticated caller without touching the database", async () => {
    const { client, from } = mockSupabase({ user: null });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await saveTaxProfileSectionAction({ workArrangement: "mix" });

    expect(result.status).toBe("error");
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an invalid enum value before checking auth", async () => {
    const { client } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await saveTaxProfileSectionAction({
      // @ts-expect-error - deliberately invalid for this test
      workArrangement: "freelancer",
    });

    expect(result.status).toBe("error");
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it("upserts only the provided columns, scoped to the authenticated user's id", async () => {
    const { client, from, upsert } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await saveTaxProfileSectionAction({ householdIncomeBand: "under_100k" });

    expect(result.status).toBe("success");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledWith(
      { id: "u1", household_income_band: "under_100k" },
      { onConflict: "id" },
    );
  });

  it("does not send unrelated columns from a single-section edit", async () => {
    const { client, upsert } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    await saveTaxProfileSectionAction({ hasAbn: true });

    const [payload] = upsert.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(["has_abn", "id"]);
  });

  it("surfaces a database error as a failed result", async () => {
    const { client } = mockSupabase({ user: { id: "u1" } }, );
    client.from = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: "db down" } }),
    });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await saveTaxProfileSectionAction({ hasAbn: false });
    expect(result.status).toBe("error");
  });
});
