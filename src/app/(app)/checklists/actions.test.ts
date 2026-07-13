import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  addCustomItemAction,
  deleteCustomItemAction,
  editCustomItemLabelAction,
  toggleChecklistItemAction,
  toggleCustomItemAction,
} from "./actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

const REAL_ITEM_ID = "property-documents.loan-statements";
// zod's z.uuid() requires the variant nibble ([89ab]) - a plain repeated-digit fixture like
// "1111...1111" fails that check, so tests exercising the schema need a shape-valid UUID.
const VALID_CUSTOM_ITEM_ID = "11111111-1111-4111-8111-111111111111";

function mockSupabase({
  user,
  upsertError = null,
  insertError = null,
  insertedId = "new-id",
  countValue = 0,
  updateError = null,
  deleteError = null,
}: {
  user: { id: string } | null;
  upsertError?: { message: string } | null;
  insertError?: { message: string } | null;
  insertedId?: string;
  countValue?: number;
  updateError?: { message: string } | null;
  deleteError?: { message: string } | null;
}) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });

  const selectCount = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: countValue }),
    }),
  });
  const insertSelectSingle = vi
    .fn()
    .mockResolvedValue({ data: insertError ? null : { id: insertedId }, error: insertError });
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: insertSelectSingle }),
  });

  const updateEqEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: updateEqEq }) });

  const deleteEqEq = vi.fn().mockResolvedValue({ error: deleteError });
  const del = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: deleteEqEq }) });

  const from = vi.fn((table: string) => {
    if (table === "checklist_item_states") return { upsert };
    if (table === "checklist_custom_items") {
      return { select: selectCount, insert, update, delete: del };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    client: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) }, from },
    upsert,
    insert,
    update,
    del,
  };
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

describe("toggleChecklistItemAction", () => {
  it("rejects an item id that doesn't exist in the real template, without touching auth or the database", async () => {
    const { client } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await toggleChecklistItemAction({ itemId: "not-a-real.item", checked: true });

    expect(result.status).toBe("error");
    expect(client.auth.getUser).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    const { client, upsert } = mockSupabase({ user: null });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await toggleChecklistItemAction({ itemId: REAL_ITEM_ID, checked: true });

    expect(result.status).toBe("error");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts checked=true with a checked_at timestamp", async () => {
    const { client, upsert } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await toggleChecklistItemAction({ itemId: REAL_ITEM_ID, checked: true });

    expect(result.status).toBe("success");
    const [payload, options] = upsert.mock.calls[0];
    expect(payload).toMatchObject({ user_id: "u1", item_id: REAL_ITEM_ID, checked: true });
    expect(typeof payload.checked_at).toBe("string");
    expect(options).toEqual({ onConflict: "user_id,item_id" });
  });

  it("clears checked_at to null when unchecking", async () => {
    const { client, upsert } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    await toggleChecklistItemAction({ itemId: REAL_ITEM_ID, checked: false });

    const [payload] = upsert.mock.calls[0];
    expect(payload.checked_at).toBeNull();
  });

  it("surfaces a database error as a failed result", async () => {
    const { client } = mockSupabase({ user: { id: "u1" }, upsertError: { message: "db down" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await toggleChecklistItemAction({ itemId: REAL_ITEM_ID, checked: true });
    expect(result.status).toBe("error");
  });
});

describe("addCustomItemAction", () => {
  it("rejects a label over the length cap without touching the database", async () => {
    const { client, insert } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await addCustomItemAction({
      groupId: "property-documents",
      label: "x".repeat(121),
    });

    expect(result.status).toBe("error");
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts with position equal to the current count for that group", async () => {
    const { client, insert } = mockSupabase({ user: { id: "u1" }, countValue: 3, insertedId: "abc" });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await addCustomItemAction({
      groupId: "property-documents",
      label: "2019 depreciation schedule",
    });

    expect(result.status).toBe("success");
    expect(result.id).toBe("abc");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", group_id: "property-documents", position: 3 }),
    );
  });
});

describe("editCustomItemLabelAction / toggleCustomItemAction / deleteCustomItemAction", () => {
  it("edit scopes the update to both the item id and the caller's own user id", async () => {
    const { client, update } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await editCustomItemLabelAction({
      id: VALID_CUSTOM_ITEM_ID,
      label: "Updated name",
    });

    expect(result.status).toBe("success");
    expect(update).toHaveBeenCalledWith({ label: "Updated name" });
  });

  it("toggle updates only the checked column", async () => {
    const { client, update } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    await toggleCustomItemAction({ id: VALID_CUSTOM_ITEM_ID, checked: true });
    expect(update).toHaveBeenCalledWith({ checked: true });
  });

  it("delete rejects an unauthenticated caller", async () => {
    const { client, del } = mockSupabase({ user: null });
    mockCreateClient.mockResolvedValue(client as never);

    const result = await deleteCustomItemAction({ id: VALID_CUSTOM_ITEM_ID });
    expect(result.status).toBe("error");
    expect(del).not.toHaveBeenCalled();
  });
});

describe("custom item labels are never logged (constitution's logging rule)", () => {
  it("a validation failure never reaches console.log/warn/error, and no returned message contains the label", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client } = mockSupabase({ user: { id: "u1" } });
    mockCreateClient.mockResolvedValue(client as never);

    const secretLabel = "SENSITIVE-DOCUMENT-NAME-1234567890".repeat(10);
    const result = await addCustomItemAction({ groupId: "property-documents", label: secretLabel });

    expect(result.status).toBe("error");
    expect(result.message).toBeDefined();
    expect(result.message).not.toContain("SENSITIVE-DOCUMENT-NAME-1234567890");
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("a database failure on a valid label still never logs the label", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { client } = mockSupabase({ user: { id: "u1" }, insertError: { message: "db down" } });
    mockCreateClient.mockResolvedValue(client as never);

    const label = "2019 depreciation schedule";
    const result = await addCustomItemAction({ groupId: "property-documents", label });

    expect(result.status).toBe("error");
    expect(result.message).not.toContain(label);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
