import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { SortHeader } from "./SortHeader";

type Props = ComponentProps<typeof SortHeader>;

// A header cell needs a table around it.
const renderHeader = (props: Partial<Props> = {}) =>
  render(
    <table>
      <thead>
        <tr>
          <SortHeader label="Score" {...props} />
        </tr>
      </thead>
    </table>
  );

const getHeader = () => screen.getByRole("columnheader");
const getButton = () => screen.getByRole("button", { name: "Score" });

describe("SortHeader", () => {
  it("renders a column header with a button named by the label", () => {
    renderHeader();
    expect(getHeader()).toHaveAttribute("scope", "col");
    expect(getHeader()).toContainElement(getButton());
    expect(getButton()).toHaveAttribute("type", "button");
  });

  test.each([
    ["asc", "ascending", "▲"],
    ["desc", "descending", "▼"],
  ] as const)("shows %s as aria-sort=%s with %s", (direction, ariaSort, arrow) => {
    renderHeader({ direction });
    expect(getHeader()).toHaveAttribute("aria-sort", ariaSort);
    expect(screen.getByTestId("sortheader-arrow")).toHaveTextContent(arrow);
  });

  it("shows no arrow and aria-sort=none when the column isn't sorted", () => {
    renderHeader({ direction: "none" });
    expect(getHeader()).toHaveAttribute("aria-sort", "none");
    expect(screen.queryByTestId("sortheader-arrow")).not.toBeInTheDocument();
  });

  it("defaults to no sort", () => {
    renderHeader();
    expect(getHeader()).toHaveAttribute("aria-sort", "none");
    expect(screen.queryByTestId("sortheader-arrow")).not.toBeInTheDocument();
  });

  it("hides the arrow from screen readers so the button is named by the label only", () => {
    renderHeader({ direction: "desc" });
    expect(screen.getByTestId("sortheader-arrow")).toHaveAttribute("aria-hidden", "true");
    expect(getButton()).toHaveAccessibleName("Score");
  });

  it("calls onSort when clicked", async () => {
    const user = userEvent.setup();
    const onSort = jest.fn();
    renderHeader({ onSort });
    await user.click(getButton());
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("calls onSort with Enter", async () => {
    const user = userEvent.setup();
    const onSort = jest.fn();
    renderHeader({ onSort });
    await user.tab();
    expect(getButton()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("calls onSort with Space", async () => {
    const user = userEvent.setup();
    const onSort = jest.fn();
    renderHeader({ onSort });
    await user.tab();
    await user.keyboard(" ");
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("works without onSort", async () => {
    const user = userEvent.setup();
    renderHeader({ direction: "asc" });
    await user.click(getButton());
    expect(getHeader()).toHaveAttribute("aria-sort", "ascending");
  });

  it("puts className on the header cell, merged with its own classes", () => {
    renderHeader({ className: "bg-accent text-center" });
    expect(getHeader()).toHaveClass("bg-accent", "text-center", "font-extrabold", "px-2.5");
  });

  it("sizes the arrow with a token, not an inline font size", () => {
    renderHeader({ direction: "asc" });
    const arrow = screen.getByTestId("sortheader-arrow");
    expect(arrow).toHaveClass("text-xs");
    expect(arrow).not.toHaveAttribute("style");
  });

  it("uses design tokens only: no inline styles, hex values or bracket classes", () => {
    renderHeader({ direction: "desc", className: "bg-accent" });
    for (const el of [getHeader(), getButton(), screen.getByTestId("sortheader-arrow")]) {
      expect(el).not.toHaveAttribute("style");
      expect(el.className).not.toMatch(/\[|#/);
    }
    expect(getButton()).toHaveClass("focus-visible:ring-2", "focus-visible:ring-dark");
  });
});
