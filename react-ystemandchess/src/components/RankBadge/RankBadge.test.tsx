import { render, screen } from "@testing-library/react";
import { RankBadge } from "./RankBadge";

const getBadge = (rank: number) => screen.getByRole("img", { name: `Rank ${rank}` });

describe("RankBadge", () => {
  it("shows the rank and names it for screen readers", () => {
    render(<RankBadge rank={7} />);
    expect(getBadge(7)).toHaveTextContent("7");
  });

  test.each([
    [1, "gold", ["bg-accent", "text-dark", "ring-accent"]],
    [2, "silver", ["bg-muted", "text-light", "ring-muted"]],
    [3, "bronze", ["bg-light", "text-gray", "ring-gray"]],
  ] as const)("shows rank %d as a %s medal with a ring", (rank, tier, classes) => {
    render(<RankBadge rank={rank} />);
    const badge = getBadge(rank);
    expect(badge).toHaveAttribute("data-tier", tier);
    expect(badge).toHaveClass("rounded-full", "ring-2", "ring-offset-2", ...classes);
  });

  test.each([4, 10, 128])("shows rank %d as a plain number", (rank) => {
    render(<RankBadge rank={rank} />);
    const badge = getBadge(rank);
    expect(badge).toHaveAttribute("data-tier", "plain");
    expect(badge).toHaveClass("text-dark");
    expect(badge).not.toHaveClass("ring-2");
    expect(badge.className).not.toMatch(/\bbg-/);
  });

  it("puts a crown on first place only", () => {
    const { rerender } = render(<RankBadge rank={1} />);
    expect(screen.getByTestId("rankbadge-crown")).toHaveTextContent("👑");
    for (const rank of [2, 3, 4]) {
      rerender(<RankBadge rank={rank} />);
      expect(screen.queryByTestId("rankbadge-crown")).not.toBeInTheDocument();
    }
  });

  it("hides the crown from screen readers", () => {
    render(<RankBadge rank={1} />);
    expect(screen.getByTestId("rankbadge-crown")).toHaveAttribute("aria-hidden", "true");
    expect(getBadge(1)).toHaveAccessibleName("Rank 1");
  });

  test.each([
    ["sm", ["h-6", "min-w-6", "text-xs"], "-top-3.5"],
    ["lg", ["h-10", "min-w-10", "text-base"], "-top-5"],
  ] as const)("renders the %s size", (size, classes, crownOffset) => {
    render(<RankBadge rank={1} size={size} />);
    expect(getBadge(1)).toHaveClass(...classes);
    expect(screen.getByTestId("rankbadge-crown")).toHaveClass(crownOffset);
  });

  it("falls back to the sm size", () => {
    render(<RankBadge rank={2} />);
    expect(getBadge(2)).toHaveClass("h-6");
    expect(getBadge(2)).not.toHaveClass("h-10");
  });

  it("shows ranks 1-3 as plain numbers when medal is false", () => {
    const { rerender } = render(<RankBadge rank={1} medal={false} />);
    expect(getBadge(1)).toHaveAttribute("data-tier", "plain");
    expect(getBadge(1)).not.toHaveClass("bg-accent");
    expect(screen.queryByTestId("rankbadge-crown")).not.toBeInTheDocument();

    rerender(<RankBadge rank={3} medal={false} />);
    expect(getBadge(3)).toHaveAttribute("data-tier", "plain");
    expect(getBadge(3)).not.toHaveClass("ring-gray");
  });

  it("grows for long numbers instead of clipping them", () => {
    render(<RankBadge rank={1024} />);
    expect(getBadge(1024)).toHaveClass("min-w-6");
    expect(getBadge(1024)).not.toHaveClass("w-6");
  });

  it("merges className without breaking variants", () => {
    render(<RankBadge rank={1} className="ml-2" />);
    expect(getBadge(1)).toHaveClass("ml-2", "bg-accent", "h-6");
  });

  it("uses design tokens only: no inline styles, hex values or bracket classes", () => {
    render(<RankBadge rank={1} size="lg" />);
    for (const el of [getBadge(1), screen.getByTestId("rankbadge-crown")]) {
      expect(el).not.toHaveAttribute("style");
      expect(el.className).not.toMatch(/\[|#/);
    }
  });
});
