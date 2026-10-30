import { render, screen } from "@testing-library/react";
import { BadgeCard } from "./BadgeCard";

describe("BadgeCard", () => {
  it("renders the icon and label", () => {
    render(<BadgeCard icon="🏆" label="First Win" />);
    expect(screen.getByText("🏆")).toBeInTheDocument();
    expect(screen.getByText("First Win")).toBeInTheDocument();
  });

  it("defaults to the earned state", () => {
    const { container } = render(<BadgeCard icon="🏆" label="First Win" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-light", "border-borderLight", "opacity-100");
    expect(card).not.toHaveClass("opacity-55");
    expect(screen.getByText("🏆")).not.toHaveClass("grayscale");
  });

  it("dims the card and grays out the icon when locked", () => {
    const { container } = render(<BadgeCard icon="🔒" label="30 Day Streak" state="locked" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-light", "border-borderLight", "opacity-55");
    expect(screen.getByText("🔒")).toHaveClass("grayscale");
  });

  it("uses font size tokens for the label", () => {
    render(<BadgeCard icon="🏆" label="First Win" />);
    expect(screen.getByText("First Win")).toHaveClass("text-3xs");
  });

  it("merges className without breaking the state", () => {
    const { container } = render(
      <BadgeCard icon="🏆" label="First Win" state="locked" className="rounded-md" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("rounded-md", "opacity-55");
    expect(card).not.toHaveClass("rounded-xl");
  });

  it("hides the icon from screen readers", () => {
    render(<BadgeCard icon="🏆" label="First Win" />);
    expect(screen.getByText("🏆")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders image paths as an image and grays it out when locked", () => {
    const { container } = render(
      <BadgeCard icon="/img/badges/streak_5.svg" label="5 Day Streak" state="locked" />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveAttribute("src", "/img/badges/streak_5.svg");
    expect(img).toHaveClass("grayscale");
    expect(screen.getByText("5 Day Streak")).toBeInTheDocument();
  });
});
