import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toggleChecklistItemAction } from "@/app/(app)/checklists/actions";
import type { ChecklistGroup } from "@/lib/checklists/templates";
import { ChecklistsClient } from "./checklists-client";

vi.mock("@/app/(app)/checklists/actions", () => ({
  toggleChecklistItemAction: vi.fn(),
  addCustomItemAction: vi.fn(),
  editCustomItemLabelAction: vi.fn(),
  toggleCustomItemAction: vi.fn(),
  deleteCustomItemAction: vi.fn(),
}));

const mockToggle = vi.mocked(toggleChecklistItemAction);

const CONTRACTOR_GROUP: ChecklistGroup = {
  id: "contractor-income-expense",
  title: "Contractor income & expense records",
  description: "Test description",
  items: [{ id: "invoices-issued", label: "Invoices issued this financial year" }],
};

const PROPERTY_GROUP: ChecklistGroup = {
  id: "property-documents",
  title: "Property documents",
  description: "Test description",
  items: [{ id: "loan-statements", label: "Investment loan interest statements" }],
};

const ALL_GROUPS = [CONTRACTOR_GROUP, PROPERTY_GROUP];

beforeEach(() => {
  mockToggle.mockReset();
  mockToggle.mockResolvedValue({ status: "success" });
});

describe("ChecklistsClient", () => {
  it("shows only the default-selected group's items, not a hidden group's items", () => {
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{}}
        initialCustomItems={[]}
      />,
    );

    expect(screen.getByText("Invoices issued this financial year")).toBeInTheDocument();
    expect(screen.queryByText("Investment loan interest statements")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add.*property documents/i })).toBeInTheDocument();
  });

  it("reveals a hidden group's items via the 'add other groups' affordance", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{}}
        initialCustomItems={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add.*property documents/i }));

    expect(screen.getByText("Investment loan interest statements")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add.*property documents/i }),
    ).not.toBeInTheDocument();
  });

  it("toggling a checkbox updates the UI immediately (optimistic), before the server action resolves", async () => {
    let resolveAction: (value: { status: "success" }) => void;
    mockToggle.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );
    const user = userEvent.setup();
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{}}
        initialCustomItems={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /invoices issued/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    resolveAction!({ status: "success" });
  });

  it("reverts the optimistic toggle if the server action fails", async () => {
    mockToggle.mockResolvedValue({ status: "error", message: "Could not save. Try again." });
    const user = userEvent.setup();
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{}}
        initialCustomItems={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /invoices issued/i });
    await user.click(checkbox);

    // The mocked action resolves immediately (error), so by the time the click's microtasks
    // settle the optimistic-then-revert cycle may already be done - assert the end state, not
    // a transient one already covered by the "before resolve" test above.
    await vi.waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("shows overall progress that updates as items are checked", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{}}
        initialCustomItems={[]}
      />,
    );

    // The percent figure is wrapped in its own `tabular-nums` span (docs/design.md), so the
    // full sentence is split across elements - a plain string/regex match can't span that, hence
    // the function matcher checking the paragraph's assembled textContent instead.
    function progressText(text: string) {
      return (_: string, element: Element | null) =>
        element?.tagName === "P" && element.textContent === text;
    }

    expect(screen.getByText(progressText("0 of 1 items checked (0% complete)"))).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /invoices issued/i }));

    expect(screen.getByText(progressText("1 of 1 items checked (100% complete)"))).toBeInTheDocument();
  });

  it("starts from an already-checked initial state (e.g. loaded from the database)", () => {
    render(
      <ChecklistsClient
        allGroups={ALL_GROUPS}
        defaultGroupIds={["contractor-income-expense"]}
        initialItemStates={{ "contractor-income-expense.invoices-issued": true }}
        initialCustomItems={[]}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /invoices issued/i })).toBeChecked();
  });
});
