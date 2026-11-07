import { render, screen } from "@testing-library/react";
import { MentorCard } from "./MentorCard";

const mentor = {
  avatarSrc: "/img/avatars/ada.png",
  name: "Ada Lovelace",
  specialty: "Chess Openings",
  sessionCount: 12,
};

const variants = ["default", "featured"] as const;
const sizes = ["sm", "lg"] as const;
const combos = variants.flatMap((v) => sizes.map((s) => [v, s] as const));

// The avatar is decorative (alt=""), so it is found among hidden elements.
const getCard = () => screen.getByRole("article", { name: "Ada Lovelace" });
const getAvatar = () => screen.getByRole("presentation", { hidden: true });

describe("MentorCard", () => {
  it("renders the avatar, name, specialty and session count", () => {
    render(<MentorCard {...mentor} />);
    expect(getAvatar()).toHaveAttribute("src", "/img/avatars/ada.png");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Chess Openings")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  test.each(combos)("renders %s variant at %s size", (variant, size) => {
    render(<MentorCard {...mentor} variant={variant} size={size} />);
    expect(getCard()).toHaveClass(variant === "featured" ? "bg-soft" : "bg-light");
    expect(getCard()).toHaveClass(size === "sm" ? "p-2" : "p-4");
    expect(getAvatar()).toHaveClass(size === "sm" ? "h-10" : "h-16");
  });

  it("falls back to the default variant and sm size", () => {
    render(<MentorCard {...mentor} />);
    expect(getCard()).toHaveClass("bg-light", "border-borderLight", "p-2");
    expect(getCard()).not.toHaveClass("bg-soft");
    expect(screen.getByText("Ada Lovelace")).toHaveClass("text-sm");
    expect(screen.getByText("Chess Openings")).toHaveClass("text-2xs");
  });

  it("highlights the session count StatCard when featured", () => {
    render(<MentorCard {...mentor} variant="featured" />);
    expect(screen.getByText("12")).toHaveClass("text-primary");
  });

  it("uses StatCard for the session count, with a singular label for one session", () => {
    render(<MentorCard {...mentor} sessionCount={1} size="lg" />);
    expect(screen.getByText("1")).toHaveClass("text-2xl");
    expect(screen.getByText("Session")).toBeInTheDocument();
  });

  it("merges className without breaking variants", () => {
    render(<MentorCard {...mentor} variant="featured" className="p-6" />);
    expect(getCard()).toHaveClass("p-6", "bg-soft");
    expect(getCard()).not.toHaveClass("p-2");
  });

  it("labels the card with the mentor's name", () => {
    render(<MentorCard {...mentor} />);
    expect(getCard()).toHaveAttribute("aria-labelledby", screen.getByText("Ada Lovelace").id);
  });

  it("hides the decorative avatar and session icon from screen readers", () => {
    render(<MentorCard {...mentor} />);
    expect(getAvatar()).toHaveAttribute("alt", "");
    expect(getAvatar()).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("📅")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a primary dot labelled Available when the mentor is available", () => {
    render(<MentorCard {...mentor} status="available" />);
    const dot = screen.getByRole("img", { name: "Available" });
    expect(dot).toHaveClass("bg-primary");
    expect(dot).not.toHaveClass("bg-red");
  });

  it("shows a red dot labelled Busy when the mentor is busy", () => {
    render(<MentorCard {...mentor} status="busy" />);
    expect(screen.getByRole("img", { name: "Busy" })).toHaveClass("bg-red");
  });

  it("shows no status dot when no status is given", () => {
    render(<MentorCard {...mentor} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses design tokens only, with no hex or px values", () => {
    render(<MentorCard {...mentor} variant="featured" size="lg" status="busy" />);
    const classes = getCard().outerHTML.match(/class="[^"]*"/g) ?? [];
    expect(classes.length).toBeGreaterThan(5);
    for (const value of classes) {
      expect(value).not.toMatch(/#[0-9a-f]{3,8}|\d+px|\[/i);
    }
  });
});
