import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { LeaderboardRow } from "./LeaderboardRow";

type Props = ComponentProps<typeof LeaderboardRow>;

const base: Props = {
  rank: 4,
  name: "Ada Lovelace",
  school: "Lincoln High School",
  chessScore: 1250,
  chessRecord: { wins: 12, draws: 3, losses: 5, gamesPlayed: 20 },
  score: 1840,
};

// A row needs a table around it.
const renderRow = (props: Partial<Props> = {}) =>
  render(
    <table>
      <tbody>
        <LeaderboardRow {...base} {...props} />
      </tbody>
    </table>
  );

const getRow = () => screen.getByRole("row");
const getCells = () => within(getRow()).getAllByRole("cell");

describe("LeaderboardRow", () => {
  it("renders the rank, name, school, chess result and score in five cells", () => {
    renderRow();
    const cells = getCells();
    expect(cells).toHaveLength(5);
    expect(within(cells[0]).getByRole("img", { name: "Rank 4" })).toBeInTheDocument();
    expect(cells[1]).toHaveTextContent("Ada Lovelace");
    expect(cells[2]).toHaveTextContent("Lincoln High School");
    expect(cells[3]).toHaveTextContent("1250");
    expect(cells[4]).toHaveTextContent("1840");
  });

  it("uses RankBadge for the rank, with medals for the top 3", () => {
    renderRow({ rank: 1 });
    expect(screen.getByRole("img", { name: "Rank 1" })).toHaveAttribute("data-tier", "gold");
  });

  it("passes medal={false} through to RankBadge", () => {
    renderRow({ rank: 2, medal: false });
    expect(screen.getByRole("img", { name: "Rank 2" })).toHaveAttribute("data-tier", "plain");
  });

  it("keeps the rank on the row as data-rank", () => {
    renderRow({ rank: 9 });
    expect(getRow()).toHaveAttribute("data-rank", "9");
  });

  it("alternates light and soft backgrounds in the default variant", () => {
    renderRow();
    expect(getRow()).toHaveClass("odd:bg-light", "even:bg-soft");
    expect(getRow()).not.toHaveClass("bg-accent/20");
    expect(getRow()).not.toHaveClass("font-bold");
  });

  it("highlights the logged-in student's row in the self variant", () => {
    renderRow({ variant: "self" });
    expect(getRow()).toHaveClass("bg-accent/20", "font-bold");
    expect(getRow()).not.toHaveClass("odd:bg-light");
  });

  it("tells screen readers which row is theirs", () => {
    renderRow({ variant: "self" });
    expect(getRow()).toHaveAttribute("aria-current", "true");
    expect(getCells()[1]).toHaveTextContent("Ada Lovelace (you)");
  });

  it("marks no row as theirs in the default variant", () => {
    renderRow();
    expect(getRow()).not.toHaveAttribute("aria-current");
    expect(getCells()[1]).not.toHaveTextContent("(you)");
  });

  it("falls back to the default variant and sm size", () => {
    renderRow();
    expect(getRow()).toHaveClass("odd:bg-light", "text-sm");
    expect(getRow()).not.toHaveClass("text-base");
  });

  test.each([
    ["sm", "text-sm", ["px-1.5", "py-2", "sm:px-2.5", "sm:py-2.5"], "h-7"],
    ["lg", "text-base", ["px-2", "py-2.5", "sm:px-3", "sm:py-3"], "h-10"],
  ] as const)("renders the %s size (tighter cells on phones)", (size, text, padding, avatar) => {
    renderRow({ size });
    expect(getRow()).toHaveClass(text);
    getCells().forEach((cell) => expect(cell).toHaveClass(...padding));
    expect(screen.getByTestId("leaderboardrow-initials")).toHaveClass(avatar);
  });

  it("drops the soft pattern image on even rows but keeps the soft color", () => {
    renderRow();
    expect(getRow()).toHaveClass("even:bg-soft", "even:bg-none");
  });

  it("passes the size on to RankBadge", () => {
    renderRow({ size: "lg" });
    expect(screen.getByRole("img", { name: "Rank 4" })).toHaveClass("h-10");
  });

  it("shows initials in a colored circle when there is no avatar", () => {
    renderRow();
    const initials = screen.getByTestId("leaderboardrow-initials");
    expect(initials).toHaveTextContent("AL");
    expect(initials).toHaveClass("rounded-full", "bg-secondary", "text-dark");
    expect(initials).toHaveAttribute("aria-hidden", "true");
  });

  test.each([
    ["magnus", "M"],
    ["maya_chen", "M"],
    ["  Judit   Polgar  ", "JP"],
  ])("uses the same initials as GameResultCard (%p -> %s)", (name, initials) => {
    renderRow({ name });
    expect(screen.getByTestId("leaderboardrow-initials")).toHaveTextContent(initials);
  });

  it("shows initials when avatarSrc is null", () => {
    renderRow({ avatarSrc: null });
    expect(screen.getByTestId("leaderboardrow-initials")).toBeInTheDocument();
  });

  it("shows the avatar instead of initials when one is given", () => {
    renderRow({ avatarSrc: "/img/avatars/ada.png" });
    // The avatar is decorative (alt=""), so it is found among hidden elements.
    const avatar = screen.getByRole("presentation", { hidden: true });
    expect(avatar).toHaveAttribute("src", "/img/avatars/ada.png");
    expect(avatar).toHaveAttribute("alt", "");
    expect(avatar).toHaveClass("rounded-full", "object-cover");
    expect(screen.queryByTestId("leaderboardrow-initials")).not.toBeInTheDocument();
  });

  it("shows a dash instead of a chess result when no games were played", () => {
    renderRow({ chessScore: 0, chessRecord: { wins: 0, draws: 0, losses: 0, gamesPlayed: 0 } });
    const chess = getCells()[3];
    expect(within(chess).getByText("—")).toHaveAttribute("aria-hidden", "true");
    expect(within(chess).getByTitle("No student-vs-student games yet")).toHaveClass("text-muted");
    expect(chess).toHaveTextContent("No games yet");
    expect(chess).not.toHaveTextContent("0");
  });

  it("shows the chess score and the W–D–L record in text-3xs", () => {
    renderRow();
    const chess = getCells()[3];
    expect(within(chess).getByText("1250")).toHaveClass("font-bold");
    expect(within(chess).getByText("12–3–5")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("leaderboardrow-record")).toHaveClass("text-3xs", "text-gray");
  });

  it("spells out the record for screen readers and on hover", () => {
    renderRow({ chessRecord: { wins: 1, draws: 1, losses: 1, gamesPlayed: 3 } });
    const chess = getCells()[3];
    expect(chess).toHaveTextContent("1 win, 1 draw, 1 loss");
    expect(within(chess).getByTitle("1 win, 1 draw, 1 loss")).toBeInTheDocument();
  });

  it("shows the school in its own column from sm up and under the name on phones", () => {
    renderRow();
    expect(getCells()[2]).toHaveClass("hidden", "sm:table-cell");
    expect(screen.getByTestId("leaderboardrow-school-inline")).toHaveTextContent("Lincoln High School");
    expect(screen.getByTestId("leaderboardrow-school-inline")).toHaveClass("sm:hidden");
  });

  it("merges className onto the row without breaking variants", () => {
    renderRow({ variant: "self", className: "border-t" });
    expect(getRow()).toHaveClass("border-t", "bg-accent/20");
  });

  it("uses design tokens only: no inline styles, hex values or bracket classes", () => {
    renderRow({ variant: "self", size: "lg", rank: 1 });
    const parts = [
      getRow(),
      ...getCells(),
      screen.getByRole("img", { name: "Rank 1" }),
      screen.getByTestId("leaderboardrow-initials"),
      screen.getByTestId("leaderboardrow-school-inline"),
      screen.getByTestId("leaderboardrow-record"),
    ];
    for (const el of parts) {
      expect(el).not.toHaveAttribute("style");
      expect(el.className).not.toMatch(/\[|#/);
    }
  });
});
