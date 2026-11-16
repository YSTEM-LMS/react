import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

const gameResultCard = cva("flex items-center rounded-lg border", {
  variants: {
    result: {
      win: "bg-soft border-primary/20",
      loss: "bg-redLight border-red/20",
      draw: "bg-light border-borderLight",
    },
    size: {
      sm: "gap-2 p-2",
      lg: "gap-4 p-4",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const avatarClass = cva("shrink-0 rounded-full", {
  variants: {
    size: {
      sm: "h-10 w-10 text-sm",
      lg: "h-16 w-16 text-lg",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const nameClass = cva("truncate font-bold text-dark", {
  variants: {
    size: {
      sm: "text-sm",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const resultLabelClass = cva("shrink-0 whitespace-nowrap text-3xs font-bold uppercase tracking-wide", {
  variants: {
    result: {
      win: "text-primary",
      loss: "text-red",
      draw: "text-muted",
    },
  },
});

const timeClass = cva("truncate text-gray", {
  variants: {
    size: {
      sm: "text-3xs",
      lg: "text-2xs",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

// Same token colors as StatCard: dark value, gray label.
const recordValueClass = cva("font-bold leading-none text-dark", {
  variants: {
    size: {
      sm: "text-sm",
      lg: "text-2xl",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const recordLabelClass = cva("text-gray", {
  variants: {
    size: {
      sm: "text-3xs",
      lg: "text-2xs",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const reviewButtonClass = cva("btn-toolbar flex-none border border-primary font-bold text-dark", {
  variants: {
    size: {
      sm: "px-2 py-1 text-2xs",
      lg: "px-4 py-2 text-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const resultText = {
  win: { label: "Won", icon: "🏆", sentence: "Won against" },
  loss: { label: "Lost", icon: "✖", sentence: "Lost to" },
  draw: { label: "Draw", icon: "🤝", sentence: "Drew with" },
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Recent games read as "5 min ago" or "Yesterday". Games a week old or more show a
// short date like "Nov 3", with the year added when it is not this year.
// Returns "" when the date can't be read.
function formatPlayedAt(playedAt: string, now: Date = new Date()): string {
  const played = new Date(playedAt);
  if (Number.isNaN(played.getTime())) return "";

  const elapsed = now.getTime() - played.getTime();
  if (elapsed >= 0 && elapsed < 7 * DAY) {
    if (elapsed < MINUTE) return "Just now";
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
    if (elapsed < DAY) {
      const hours = Math.floor(elapsed / HOUR);
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    const days = Math.floor(elapsed / DAY);
    return days === 1 ? "Yesterday" : `${days} days ago`;
  }

  return played.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(played.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

// "Ada Lovelace" -> "AL", "magnus" -> "M".
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

type GameResult = NonNullable<VariantProps<typeof gameResultCard>["result"]>;

interface GameResultCardProps {
  result: GameResult;
  opponent: {
    name: string;
    avatarSrc?: string;
  };
  // Same shape as ChessRecord in LeaderboardModal.
  record: {
    wins: number;
    draws: number;
    losses: number;
  };
  // ISO 8601 date string. The card formats it.
  playedAt: string;
  size?: VariantProps<typeof gameResultCard>["size"];
  // The Review button only shows when this is passed.
  onReview?: () => void;
  className?: string;
}

export function GameResultCard({
  result,
  opponent,
  record,
  playedAt,
  size,
  onReview,
  className,
}: GameResultCardProps) {
  const text = resultText[result];
  const played = formatPlayedAt(playedAt);
  const recordItems = [
    { key: "W", name: "wins", value: record.wins },
    { key: "D", name: "draws", value: record.draws },
    { key: "L", name: "losses", value: record.losses },
  ];

  const label =
    `${text.sentence} ${opponent.name}` +
    (played ? `, ${played.toLowerCase()}` : "") +
    `. Record: ${plural(record.wins, "win")}, ${plural(record.draws, "draw")}, ` +
    `${record.losses} ${record.losses === 1 ? "loss" : "losses"}.`;

  return (
    <article aria-label={label} className={cn(gameResultCard({ result, size }), className)}>
      {opponent.avatarSrc ? (
        <img
          src={opponent.avatarSrc}
          alt=""
          aria-hidden="true"
          className={cn(avatarClass({ size }), "object-cover")}
        />
      ) : (
        <span
          data-testid="gameresult-initials"
          aria-hidden="true"
          className={cn(
            avatarClass({ size }),
            "flex items-center justify-center bg-secondary font-bold text-dark"
          )}
        >
          {getInitials(opponent.name)}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <span className={nameClass({ size })}>{opponent.name}</span>
        <span className="flex min-w-0 items-center gap-1">
          <span aria-hidden="true" className={resultLabelClass({ result })}>
            {text.icon} {text.label}
          </span>
          {played && (
            <time dateTime={playedAt} className={timeClass({ size })}>
              {played}
            </time>
          )}
        </span>
      </div>

      {/* The W-D-L record. Screen readers hear the full words instead of the letters. */}
      <div data-testid="gameresult-record" className="flex shrink-0 items-center gap-2">
        {recordItems.map((item) => (
          <span key={item.key} className="flex flex-col items-center">
            <span className={recordValueClass({ size })}>{item.value}</span>
            <span aria-hidden="true" className={recordLabelClass({ size })}>
              {item.key}
            </span>
            <span className="sr-only">{item.name}</span>
          </span>
        ))}
      </div>

      {onReview && (
        <button
          type="button"
          onClick={onReview}
          aria-label={`Review game against ${opponent.name}`}
          className={reviewButtonClass({ size })}
        >
          Review
        </button>
      )}
    </article>
  );
}
