import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCustomItemAction,
  deleteCustomItemAction,
  editCustomItemLabelAction,
  toggleChecklistItemAction,
  toggleCustomItemAction,
} from "@/app/(app)/checklists/actions";
import type { ChecklistCustomItem } from "@/lib/checklists/derived";
import type { ChecklistGroup } from "@/lib/checklists/templates";
import { ChecklistGroupSection } from "./checklist-group-section";

vi.mock("@/app/(app)/checklists/actions", () => ({
  toggleChecklistItemAction: vi.fn(),
  addCustomItemAction: vi.fn(),
  editCustomItemLabelAction: vi.fn(),
  toggleCustomItemAction: vi.fn(),
  deleteCustomItemAction: vi.fn(),
}));

const mockAdd = vi.mocked(addCustomItemAction);
const mockEdit = vi.mocked(editCustomItemLabelAction);
const mockToggleCustom = vi.mocked(toggleCustomItemAction);
const mockDelete = vi.mocked(deleteCustomItemAction);
vi.mocked(toggleChecklistItemAction).mockResolvedValue({ status: "success" });

const GROUP: ChecklistGroup = {
  id: "property-documents",
  title: "Property documents",
  description: "Test description",
  items: [{ id: "loan-statements", label: "Investment loan interest statements" }],
};

function Harness({ initialCustomItems = [] as ChecklistCustomItem[] }) {
  return (
    <ChecklistGroupSection
      group={GROUP}
      itemStates={{}}
      customItems={initialCustomItems}
      onToggleItem={vi.fn()}
      onCustomItemAdded={vi.fn()}
      onCustomItemToggled={vi.fn()}
      onCustomItemLabelChanged={vi.fn()}
      onCustomItemDeleted={vi.fn()}
    />
  );
}

beforeEach(() => {
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ status: "success", id: "default-id" });
  mockEdit.mockReset();
  mockEdit.mockResolvedValue({ status: "success" });
  mockToggleCustom.mockReset();
  mockToggleCustom.mockResolvedValue({ status: "success" });
  mockDelete.mockReset();
  mockDelete.mockResolvedValue({ status: "success" });
});

describe("adding a custom item", () => {
  it("rejects a whitespace-only label client-side without calling the server action", async () => {
    // The input also carries an HTML maxLength, which already stops a user from typing past
    // the cap - this exercises the other half of customItemLabelSchema (trim + non-empty)
    // that maxLength alone can't enforce.
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText(/depreciation schedule/i);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("submits a valid label and clears the input on success", async () => {
    mockAdd.mockResolvedValue({ status: "success", id: "new-id" });
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText(/depreciation schedule/i);
    await user.type(input, "2019 depreciation schedule");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(mockAdd).toHaveBeenCalledWith({
      groupId: "property-documents",
      label: "2019 depreciation schedule",
    });
    expect(await screen.findByDisplayValue("")).toBeInTheDocument();
  });

  it("shows a generic error message when the server action fails, without leaking the label", async () => {
    mockAdd.mockResolvedValue({ status: "error", message: "Could not add this item. Try again." });
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText(/depreciation schedule/i);
    await user.type(input, "a secret sounding label");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not add this item/i);
    expect(alert).not.toHaveTextContent("a secret sounding label");
  });
});

describe("editing and removing a custom item", () => {
  const existingItem: ChecklistCustomItem = {
    id: "c1",
    groupId: "property-documents",
    label: "Old label",
    checked: false,
    position: 0,
  };

  it("toggles a custom item's checked state", async () => {
    mockToggleCustom.mockResolvedValue({ status: "success" });
    const user = userEvent.setup();
    render(<Harness initialCustomItems={[existingItem]} />);

    await user.click(screen.getByRole("checkbox", { name: /old label/i }));
    expect(mockToggleCustom).toHaveBeenCalledWith({ id: "c1", checked: true });
  });

  it("edits a custom item's label", async () => {
    mockEdit.mockResolvedValue({ status: "success" });
    const user = userEvent.setup();
    render(<Harness initialCustomItems={[existingItem]} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const editInput = screen.getByRole("textbox", { name: /edit item name/i });
    await user.clear(editInput);
    await user.type(editInput, "New label");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockEdit).toHaveBeenCalledWith({ id: "c1", label: "New label" });
  });

  it("removes a custom item", async () => {
    mockDelete.mockResolvedValue({ status: "success" });
    const user = userEvent.setup();
    render(<Harness initialCustomItems={[existingItem]} />);

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(mockDelete).toHaveBeenCalledWith({ id: "c1" });
  });
});
