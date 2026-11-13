import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameResultCard } from "./GameResultCard";

// "Now" for every test, so the time played always reads the same.
const NOW = new Date("2026-11-12T18:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const game = {
  opponent: { name: "Ada Lovelace" },
  record: { wins: 12, draws: 3, losses: 5 },
  playedAt: ago(2 * HOUR),
};

const results = ["win", "loss", "draw"] as const;
const sizes = ["sm", "lg"] as const;

const getCard = () => screen.getByRole("article");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("GameResultCard", () => {
  it("renders the opponent, result, time played and record", () => {
    render(<GameResultCard {...game} result="win" />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/Won/)).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(screen.getByTestId("gameresult-record")).toHaveTextContent("12Wwins3Ddraws5Llosses");
  });

  test.each([
    ["win", "bg-soft", "text-primary", /Won/],
    ["loss", "bg-redLight", "text-red", /Lost/],
    ["draw", "bg-light", "text-muted", /Draw/],
  ] as const)("renders the %s variant with %s and a %s label", (result, background, accent, label) => {
    render(<GameResultCard {...game} result={result} />);
    expect(getCard()).toHaveClass(background);
    expect(screen.getByText(label)).toHaveClass(accent, "text-3xs", "uppercase");
  });

  it("does not mix variant colors", () => {
    render(<GameResultCard {...game} result="loss" />);
    expect(getCard()).not.toHaveClass("bg-soft");
    expect(getCard()).not.toHaveClass("bg-light");
    expect(screen.getByText(/Lost/)).not.toHaveClass("text-primary");
  });

  test.each(sizes)("renders the %s size", (size) => {
    render(<GameResultCard {...game} result="win" size={size} />);
    expect(getCard()).toHaveClass(size === "sm" ? "p-2" : "p-4");
    expect(getCard()).toHaveClass(size === "sm" ? "gap-2" : "gap-4");
    expect(screen.getByText("Ada Lovelace")).toHaveClass(size === "sm" ? "text-sm" : "text-lg");
    expect(screen.getByTestId("gameresult-initials")).toHaveClass(size === "sm" ? "h-10" : "h-16");
  });

  it("falls back to the sm size", () => {
    render(<GameResultCard {...game} result="draw" />);
    expect(getCard()).toHaveClass("p-2");
    expect(getCard()).not.toHaveClass("p-4");
  });

  test.each([
    [30 * 1000, "Just now"],
    [5 * MINUTE, "5 min ago"],
    [HOUR, "1 hour ago"],
    [3 * HOUR, "3 hours ago"],
    [DAY + HOUR, "Yesterday"],
    [3 * DAY, "3 days ago"],
  ])("formats a recent game as relative time (%d ms ago -> %s)", (elapsed, expected) => {
    render(<GameResultCard {...game} result="win" playedAt={ago(elapsed)} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("formats an older game as a short date", () => {
    render(<GameResultCard {...game} result="win" playedAt="2026-10-03T12:00:00Z" />);
    expect(screen.getByText("Oct 3")).toBeInTheDocument();
  });

  it("adds the year to the date when the game was in another year", () => {
    render(<GameResultCard {...game} result="win" playedAt="2025-06-15T12:00:00Z" />);
    expect(screen.getByText("Jun 15, 2025")).toBeInTheDocument();
  });

  it("keeps the ISO date on the time element", () => {
    render(<GameResultCard {...game} result="win" />);
    expect(screen.getByText("2 hours ago")).toHaveAttribute("datetime", game.playedAt);
  });

  it("shows no time when the date can't be read", () => {
    render(<GameResultCard {...game} result="win" playedAt="not a date" />);
    expect(getCard()).not.toHaveTextContent(/ago|Invalid/);
    expect(getCard()).toHaveAttribute(
      "aria-label",
      "Won against Ada Lovelace. Record: 12 wins, 3 draws, 5 losses."
    );
  });

  it("shows initials in a colored circle when there is no avatar", () => {
    render(<GameResultCard {...game} result="win" />);
    const initials = screen.getByTestId("gameresult-initials");
    expect(initials).toHaveTextContent("AL");
    expect(initials).toHaveClass("rounded-full", "bg-secondary");
    expect(screen.queryByRole("presentation", { hidden: true })).not.toBeInTheDocument();
  });

  it("uses one initial for a single-word name", () => {
    render(<GameResultCard {...game} result="win" opponent={{ name: "stockfish" }} />);
    expect(screen.getByTestId("gameresult-initials")).toHaveTextContent("S");
  });

  it("shows the avatar instead of initials when one is given", () => {
    render(
      <GameResultCard
        {...game}
        result="win"
        opponent={{ name: "Ada Lovelace", avatarSrc: "/img/avatars/ada.png" }}
      />
    );
    // The avatar is decorative (alt=""), so it is found among hidden elements.
    const avatar = screen.getByRole("presentation", { hidden: true });
    expect(avatar).toHaveAttribute("src", "/img/avatars/ada.png");
    expect(avatar).toHaveAttribute("alt", "");
    expect(screen.queryByTestId("gameresult-initials")).not.toBeInTheDocument();
  });

  it("shows no Review button when onReview is not passed", () => {
    render(<GameResultCard {...game} result="win" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a labelled Review button that calls onReview", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onReview = jest.fn();
    render(<GameResultCard {...game} result="win" onReview={onReview} />);
    const button = screen.getByRole("button", { name: "Review game against Ada Lovelace" });
    expect(button).toHaveClass("btn-toolbar");
    await user.click(button);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("lets the keyboard reach and press the Review button", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onReview = jest.fn();
    render(<GameResultCard {...game} result="loss" onReview={onReview} />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["win", "Won against Ada Lovelace, 2 hours ago. Record: 12 wins, 3 draws, 5 losses."],
    ["loss", "Lost to Ada Lovelace, 2 hours ago. Record: 12 wins, 3 draws, 5 losses."],
    ["draw", "Drew with Ada Lovelace, 2 hours ago. Record: 12 wins, 3 draws, 5 losses."],
  ] as const)("describes the full %s result in the aria-label", (result, label) => {
    render(<GameResultCard {...game} result={result} />);
    expect(screen.getByRole("article", { name: label })).toBeInTheDocument();
  });

  it("uses singular words in the aria-label for a record of one", () => {
    render(<GameResultCard {...game} result="win" record={{ wins: 1, draws: 1, losses: 1 }} />);
    expect(getCard()).toHaveAttribute(
      "aria-label",
      "Won against Ada Lovelace, 2 hours ago. Record: 1 win, 1 draw, 1 loss."
    );
  });

  test.each(results)("hides the %s result icon and label from screen readers", (result) => {
    render(<GameResultCard {...game} result={result} />);
    expect(screen.getByText(/Won|Lost|Draw/)).toHaveAttribute("aria-hidden", "true");
  });

  it("merges className without breaking variants", () => {
    render(<GameResultCard {...game} result="loss" className="p-6" />);
    expect(getCard()).toHaveClass("p-6", "bg-redLight");
    expect(getCard()).not.toHaveClass("p-2");
  });

  test.each(results)("uses design tokens only for %s, with no hex, px or bracket values", (result) => {
    render(
      <GameResultCard
        {...game}
        result={result}
        size="lg"
        opponent={{ name: "Ada Lovelace", avatarSrc: "/img/avatars/ada.png" }}
        onReview={() => {}}
      />
    );
    const classes = getCard().outerHTML.match(/class="[^"]*"/g) ?? [];
    expect(classes.length).toBeGreaterThan(5);
    for (const value of classes) {
      expect(value).not.toMatch(/#[0-9a-f]{3,8}|\d+px|\[/i);
    }
    expect(getCard().outerHTML).not.toMatch(/style=/);
  });
});
