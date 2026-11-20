import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";
import { RankBadge } from "../RankBadge";

// Default rows alternate light and soft; the logged-in student's row is
// highlighted. bg-soft also brings the site's chess-piece pattern
// (index.css), which shows as cut-off pieces in a row this thin, so even rows
// keep the soft color without it (bg-none).
const leaderboardRow = cva("text-dark", {
  variants: {
    variant: {
      default: "odd:bg-light even:bg-soft even:bg-none",
      self: "bg-accent/20 font-bold",
    },
    size: {
      sm: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

const cellClass = cva("align-middle", {
  variants: {
    size: {
      sm: "px-1.5 py-2 sm:px-2.5 sm:py-2.5",
      lg: "px-2 py-2.5 sm:px-3 sm:py-3",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const avatarClass = cva("shrink-0 rounded-full", {
  variants: {
    size: {
      sm: "h-7 w-7 text-2xs",
      lg: "h-10 w-10 text-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

// "Ada Lovelace" -> "AL", "magnus" -> "M". Same as GameResultCard.
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

interface ChessRecord {
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
}

interface LeaderboardRowProps {
  rank: number;
  name: string;
  school: string;
  avatarSrc?: string | null;
  chessScore: number;
  chessRecord: ChessRecord;
  score: number;
  // "self" highlights the logged-in student's row.
  variant?: VariantProps<typeof leaderboardRow>["variant"];
  size?: VariantProps<typeof leaderboardRow>["size"];
  // Passed to RankBadge: false shows ranks 1-3 as plain numbers.
  medal?: boolean;
  className?: string;
}

// One row of the leaderboard table. On phones the school moves under the
// name so the columns stay readable; the School column shows from sm up.
export function LeaderboardRow({
  rank,
  name,
  school,
  avatarSrc,
  chessScore,
  chessRecord,
  score,
  variant,
  size,
  medal,
  className,
}: LeaderboardRowProps) {
  const isSelf = variant === "self";
  const cell = cellClass({ size });
  const record = `${plural(chessRecord.wins, "win")}, ${plural(chessRecord.draws, "draw")}, ${chessRecord.losses} ${
    chessRecord.losses === 1 ? "loss" : "losses"
  }`;

  return (
    <tr
      data-rank={rank}
      aria-current={isSelf ? "true" : undefined}
      className={cn(leaderboardRow({ variant, size }), className)}
    >
      <td className={cn(cell, "text-center")}>
        <RankBadge rank={rank} size={size} medal={medal} />
      </td>

      <td className={cell}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" aria-hidden="true" className={cn(avatarClass({ size }), "object-cover")} />
          ) : (
            <span
              data-testid="leaderboardrow-initials"
              aria-hidden="true"
              className={cn(
                avatarClass({ size }),
                "flex items-center justify-center bg-secondary font-bold text-dark"
              )}
            >
              {getInitials(name)}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="break-words font-semibold">
              {name}
              {isSelf && <span className="sr-only"> (you)</span>}
            </span>
            <span data-testid="leaderboardrow-school-inline" className="break-words text-xs font-normal text-gray sm:hidden">
              {school}
            </span>
          </span>
        </div>
      </td>

      <td className={cn(cell, "hidden break-words sm:table-cell")}>{school}</td>

      <td className={cn(cell, "text-center leading-tight")}>
        {chessRecord.gamesPlayed === 0 ? (
          <span title="No student-vs-student games yet" className="text-muted">
            <span aria-hidden="true">—</span>
            <span className="sr-only">No games yet</span>
          </span>
        ) : (
          <>
            <span className="block font-bold">{chessScore}</span>
            <span data-testid="leaderboardrow-record" title={record} className="block text-3xs text-gray">
              <span aria-hidden="true">
                {chessRecord.wins}–{chessRecord.draws}–{chessRecord.losses}
              </span>
              <span className="sr-only">{record}</span>
            </span>
          </>
        )}
      </td>

      <td className={cn(cell, "text-center")}>{score}</td>
    </tr>
  );
}
