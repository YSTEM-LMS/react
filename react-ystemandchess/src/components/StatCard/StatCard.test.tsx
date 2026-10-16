import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

const variants = ["default", "highlighted", "dark"] as const;
const sizes = ["sm", "lg"] as const;
const combos = variants.flatMap((v) => sizes.map((s) => [v, s] as const));

describe("StatCard", () => {
  test.each(combos)("renders %s variant at %s size", (variant, size) => {
    const { container } = render(
      <StatCard icon="🔥" value={5} label="Day Streak" variant={variant} size={size} />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Day Streak")).toBeInTheDocument();
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass(size === "sm" ? "p-2" : "p-4");
  });

  it("falls back to default variant, sm size, and vertical layout", () => {
    const { container } = render(<StatCard icon="🔥" value={5} label="Wins" />);
    expect(container.firstChild).toHaveClass("bg-light", "p-2", "flex-col");
  });

  it("supports a horizontal layout", () => {
    const { container } = render(
      <StatCard icon="🔥" value={5} label="Wins" layout="horizontal" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("flex-row");
    expect(card).not.toHaveClass("flex-col");
  });

  it("uses font size tokens for the label", () => {
    render(<StatCard icon="🔥" value={5} label="Wins" />);
    expect(screen.getByText("Wins")).toHaveClass("text-3xs");
  });

  it("merges className without breaking variants", () => {
    const { container } = render(
      <StatCard icon="🔥" value={5} label="Wins" variant="dark" className="p-8" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("p-8", "bg-dark");
    expect(card).not.toHaveClass("p-2");
  });

  it("hides the icon from screen readers", () => {
    render(<StatCard icon="🔥" value={5} label="Wins" />);
    expect(screen.getByText("🔥")).toHaveAttribute("aria-hidden", "true");
  });
});
