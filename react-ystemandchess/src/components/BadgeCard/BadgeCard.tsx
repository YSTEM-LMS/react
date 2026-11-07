import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

const badgeCard = cva(
  "flex flex-col items-center justify-center gap-1 rounded-xl border bg-light border-borderLight px-1 py-2 text-center",
  {
    variants: {
      state: {
        earned: "opacity-100",
        locked: "opacity-55",
      },
    },
    defaultVariants: {
      state: "earned",
    },
  }
);

const badgeIcon = cva("text-lg leading-none", {
  variants: {
    state: {
      earned: "",
      locked: "grayscale",
    },
  },
  defaultVariants: {
    state: "earned",
  },
});

// Badge icons from the API are image paths (e.g. /img/badges/streak_5.svg);
// anything else (like an emoji) is rendered as text.
const isImagePath = (icon: string) => /^(\/|https?:)|\.(svg|png|jpe?g|webp)$/i.test(icon);

interface BadgeCardProps extends VariantProps<typeof badgeCard> {
  icon: string;
  label: string;
  className?: string;
}

export function BadgeCard({ icon, label, state, className }: BadgeCardProps) {
  return (
    <div className={cn(badgeCard({ state }), className)}>
      {isImagePath(icon) ? (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className={cn(badgeIcon({ state }), "h-[1em] w-[1em] object-contain")}
        />
      ) : (
        <span className={badgeIcon({ state })} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="text-3xs text-dark">{label}</span>
    </div>
  );
}
