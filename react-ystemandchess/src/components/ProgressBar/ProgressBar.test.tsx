import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

const variants = [
  ["default", "bg-primary/20", "bg-primary"],
  ["accent", "bg-accent/20", "bg-accent"],
  ["muted", "bg-borderLight", "bg-muted"],
] as const;
const sizes = [
  ["sm", "h-1", "text-3xs"],
  ["md", "h-2", "text-2xs"],
  ["lg", "h-4", "text-sm"],
] as const;
// [variant, size, trackColor, fillColor, height, labelSize]
const combos = variants.flatMap(([variant, trackColor, fillColor]) =>
  sizes.map(([size, height, labelSize]) =>
    [variant, size, trackColor, fillColor, height, labelSize] as const
  )
);

const getBar = () => screen.getByRole("progressbar");
const getTrack = () => screen.getByTestId("progressbar-track");
const getFill = () => screen.getByTestId("progressbar-fill");

describe("ProgressBar", () => {
  it("renders a progressbar with min, max and current value", () => {
    render(<ProgressBar value={40} />);
    expect(getBar()).toHaveAttribute("aria-valuemin", "0");
    expect(getBar()).toHaveAttribute("aria-valuemax", "100");
    expect(getBar()).toHaveAttribute("aria-valuenow", "40");
    expect(getBar()).toHaveAttribute("aria-valuetext", "40%");
  });

  test.each(combos)(
    "renders the %s variant at %s size",
    (variant, size, trackColor, fillColor, height, labelSize) => {
      render(<ProgressBar value={50} variant={variant} size={size} showLabel />);
      expect(getTrack()).toHaveClass(trackColor, height);
      expect(getFill()).toHaveClass(fillColor);
      expect(screen.getByText("50%")).toHaveClass(labelSize);
    }
  );

  it("falls back to the default variant and md size", () => {
    render(<ProgressBar value={50} />);
    expect(getTrack()).toHaveClass("bg-primary/20", "h-2");
    expect(getTrack()).not.toHaveClass("bg-soft");
    expect(getFill()).toHaveClass("bg-primary");
  });

  it("sets the fill width from the value", () => {
    render(<ProgressBar value={65} />);
    expect(getFill()).toHaveStyle({ width: "65%" });
  });

  it("clamps values above 100", () => {
    render(<ProgressBar value={140} showLabel />);
    expect(getBar()).toHaveAttribute("aria-valuenow", "100");
    expect(getFill()).toHaveStyle({ width: "100%" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("clamps values below 0", () => {
    render(<ProgressBar value={-20} showLabel />);
    expect(getBar()).toHaveAttribute("aria-valuenow", "0");
    expect(getFill()).toHaveStyle({ width: "0%" });
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("treats a value that isn't a number as 0", () => {
    render(<ProgressBar value={NaN} />);
    expect(getBar()).toHaveAttribute("aria-valuenow", "0");
    expect(getFill()).toHaveStyle({ width: "0%" });
  });

  it("animates width changes with a CSS transition", () => {
    const { rerender } = render(<ProgressBar value={20} />);
    expect(getFill()).toHaveClass("transition-width", "duration-500", "ease-out");
    rerender(<ProgressBar value={80} />);
    expect(getFill()).toHaveStyle({ width: "80%" });
  });

  it("turns the transition off for users who prefer reduced motion", () => {
    render(<ProgressBar value={20} />);
    expect(getFill()).toHaveClass("motion-reduce:transition-none");
  });

  it("shows the percentage label in dark text so it stays readable on colored cards", () => {
    render(<ProgressBar value={30} showLabel />);
    expect(screen.getByText("30%")).toHaveClass("text-dark", "font-bold");
  });

  it("hides the percentage label unless showLabel is set", () => {
    render(<ProgressBar value={30} />);
    expect(screen.queryByText("30%")).not.toBeInTheDocument();
  });

  it("shows a rounded percentage label that screen readers skip", () => {
    render(<ProgressBar value={33.4} showLabel />);
    expect(screen.getByText("33%")).toHaveAttribute("aria-hidden", "true");
    expect(getBar()).toHaveAttribute("aria-valuetext", "33%");
  });

  it("uses Progress as the default accessible name", () => {
    render(<ProgressBar value={10} />);
    expect(screen.getByRole("progressbar", { name: "Progress" })).toBeInTheDocument();
  });

  it("accepts a custom accessible name", () => {
    render(<ProgressBar value={10} label="Lesson progress" />);
    expect(screen.getByRole("progressbar", { name: "Lesson progress" })).toBeInTheDocument();
  });

  it("merges className without breaking variants", () => {
    render(<ProgressBar value={50} variant="accent" className="gap-4" />);
    expect(getBar()).toHaveClass("gap-4", "flex");
    expect(getBar()).not.toHaveClass("gap-2");
    expect(getTrack()).toHaveClass("bg-accent/20");
  });

  it("uses design tokens only, with no hex, px or bracket values", () => {
    render(<ProgressBar value={50} variant="muted" size="lg" showLabel />);
    const classes = getBar().outerHTML.match(/class="[^"]*"/g) ?? [];
    expect(classes.length).toBe(4);
    for (const value of classes) {
      expect(value).not.toMatch(/#[0-9a-f]{3,8}|\d+px|\[/i);
    }
  });
});
