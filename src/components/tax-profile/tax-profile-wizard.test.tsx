import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTaxProfileSectionAction } from "@/app/(app)/profile/actions";
import { TaxProfileWizard } from "./tax-profile-wizard";

vi.mock("@/app/(app)/profile/actions", () => ({
  saveTaxProfileSectionAction: vi.fn(),
}));

const mockSave = vi.mocked(saveTaxProfileSectionAction);

beforeEach(() => {
  mockSave.mockReset();
  mockSave.mockResolvedValue({ status: "success" });
});

describe("TaxProfileWizard", () => {
  it("starts on step 1 of 6 with Back disabled", () => {
    render(<TaxProfileWizard />);
    expect(screen.getByText(/step 1 of 6: work arrangement/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });

  it("supports keyboard-only navigation: select an option, advance with Next, go Back", async () => {
    const user = userEvent.setup();
    render(<TaxProfileWizard />);

    // Tab from the top of the document into the first radio option.
    await user.tab();
    expect(screen.getByRole("radio", { name: /payg employee/i })).toHaveFocus();

    // Select it via keyboard (Space), matching the native ARIA radio pattern.
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: /payg employee/i })).toBeChecked();

    // Keep tabbing until Next receives focus (Back is disabled and skipped by Tab), then
    // activate it with the keyboard.
    let guard = 0;
    while (
      screen.queryByRole("button", { name: /^next$/i })?.matches(":focus") !== true &&
      guard < 10
    ) {
      await user.tab();
      guard += 1;
    }
    await user.keyboard("{Enter}");

    expect(screen.getByText(/step 2 of 6: abn/i)).toBeInTheDocument();

    // Back is now enabled and returns to step 1, preserving the earlier answer.
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 1 of 6: work arrangement/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /payg employee/i })).toBeChecked();
  });

  it("allows advancing through every step without answering (fully skippable)", async () => {
    const user = userEvent.setup();
    render(<TaxProfileWizard />);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: i === 5 ? /review/i : /next/i }));
    }

    expect(screen.getByRole("heading", { name: /review your answers/i })).toBeInTheDocument();
    expect(screen.getAllByText("Not answered").length).toBe(6);
  });

  it("lets Review jump back to a specific step via its Edit button", async () => {
    const user = userEvent.setup();
    render(<TaxProfileWizard />);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: i === 5 ? /review/i : /next/i }));
    }

    const householdIncomeRow = screen.getByText("Household income").closest("div")!.parentElement!;
    await user.click(within(householdIncomeRow).getByRole("button", { name: /edit/i }));

    expect(screen.getByText(/step 5 of 6: household income/i)).toBeInTheDocument();
  });

  it("confirms via the server action and shows the completion screen with the inline disclaimer", async () => {
    const user = userEvent.setup();
    render(<TaxProfileWizard />);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: i === 5 ? /review/i : /next/i }));
    }
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("heading", { name: /profile saved/i })).toBeInTheDocument();
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/general and educational only/i),
    ).toBeInTheDocument();
  });

  it("shows an error and stays on the review step when the save fails", async () => {
    mockSave.mockResolvedValue({ status: "error", message: "Could not save. Try again." });
    const user = userEvent.setup();
    render(<TaxProfileWizard />);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: i === 5 ? /review/i : /next/i }));
    }
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
    expect(screen.getByRole("heading", { name: /review your answers/i })).toBeInTheDocument();
  });
});
