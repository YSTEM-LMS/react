import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

// Ranks 1-3 are medals: a filled circle with a ring in the same color, and a
// crown on first place. Every other rank is a plain number.
const rankBadge = cva(
  "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none",
  {
    variants: {
      tier: {
        gold: "bg-accent text-dark ring-2 ring-accent ring-offset-2 ring-offset-light",
        silver: "bg-muted text-light ring-2 ring-muted ring-offset-2 ring-offset-light",
        bronze: "bg-light text-gray ring-2 ring-gray ring-offset-2 ring-offset-light",
        plain: "text-dark",
      },
      size: {
        sm: "h-6 min-w-6 text-xs",
        lg: "h-10 min-w-10 text-base",
      },
    },
    defaultVariants: {
      tier: "plain",
      size: "sm",
    },
  }
);

// The crown sits on top of the gold circle.
const crownClass = cva("pointer-events-none absolute left-1/2 -translate-x-1/2 leading-none", {
  variants: {
    size: {
      sm: "-top-3.5 text-xs",
      lg: "-top-5 text-lg",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

type RankTier = NonNullable<VariantProps<typeof rankBadge>["tier"]>;

const tierFor = (rank: number): RankTier => {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "plain";
};

interface RankBadgeProps {
  rank: number;
  size?: VariantProps<typeof rankBadge>["size"];
  // Ranks 1-3 show as medals unless this is false. The leaderboard turns it
  // off when it isn't sorted by score, high to low: rank is the row's place in
  // the current sort, so 1st by name isn't a medal.
  medal?: boolean;
  className?: string;
}

export function RankBadge({ rank, size, medal = true, className }: RankBadgeProps) {
  const tier = medal ? tierFor(rank) : "plain";

  return (
    <span
      role="img"
      aria-label={`Rank ${rank}`}
      data-tier={tier}
      className={cn(rankBadge({ tier, size }), className)}
    >
      {tier === "gold" && (
        <span data-testid="rankbadge-crown" aria-hidden="true" className={crownClass({ size })}>
          👑
        </span>
      )}
      {rank}
    </span>
  );
}
