import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "./FilterChip";

const getChip = (name = "All Schools") => screen.getByRole("button", { name });

describe("FilterChip", () => {
  it("renders a button with the label", () => {
    render(<FilterChip label="All Schools" />);
    expect(getChip()).toHaveTextContent("All Schools");
    expect(getChip()).toHaveAttribute("type", "button");
  });

  it("is inactive by default", () => {
    render(<FilterChip label="All Schools" />);
    expect(getChip()).toHaveAttribute("aria-pressed", "false");
    expect(getChip()).toHaveClass("bg-light", "border-borderLight", "text-gray");
    expect(getChip()).not.toHaveClass("bg-primary");
  });

  it("shows the active style when active", () => {
    render(<FilterChip label="Canada" active />);
    const chip = getChip("Canada");
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("bg-primary", "text-dark", "border-primary");
    expect(chip).not.toHaveClass("bg-light");
    expect(chip).not.toHaveClass("text-gray");
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<FilterChip label="Canada" onToggle={onToggle} />);
    await user.click(getChip("Canada"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle with Enter", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<FilterChip label="Canada" onToggle={onToggle} />);
    await user.tab();
    expect(getChip("Canada")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle with Space", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<FilterChip label="Canada" onToggle={onToggle} />);
    await user.tab();
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not submit a surrounding form", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FilterChip label="Canada" />
      </form>
    );
    await user.click(getChip("Canada"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("works without onToggle", async () => {
    const user = userEvent.setup();
    render(<FilterChip label="Canada" />);
    await user.click(getChip("Canada"));
    expect(getChip("Canada")).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps a long label inside its container, with the full label in the title", () => {
    const label = "St. Mary's Preparatory School for Excellence in the Arts";
    render(<FilterChip label={label} />);
    const chip = getChip(label);
    expect(chip).toHaveClass("max-w-full");
    expect(chip).toHaveAttribute("title", label);
    expect(screen.getByText(label)).toHaveClass("truncate");
  });

  it("merges className without breaking variants", () => {
    render(<FilterChip label="Canada" active className="mt-2" />);
    expect(getChip("Canada")).toHaveClass("mt-2", "bg-primary", "rounded-full");
  });

  it("uses design tokens only: a pill with a token focus ring, no inline styles or bracket classes", () => {
    render(<FilterChip label="Canada" />);
    const chip = getChip("Canada");
    expect(chip).toHaveClass("rounded-full", "border", "focus-visible:ring-2", "focus-visible:ring-primary");
    expect(chip).not.toHaveAttribute("style");
    expect(chip.className).not.toMatch(/\[|#/);
  });
});
