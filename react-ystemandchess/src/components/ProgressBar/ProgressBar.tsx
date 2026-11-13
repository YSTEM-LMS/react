import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

// The default track is a primary tint rather than bg-soft, because index.css gives
// .bg-soft the chess-piece background pattern.
const track = cva("flex-1 overflow-hidden rounded-full", {
  variants: {
    variant: {
      default: "bg-primary/20",
      accent: "bg-accent/20",
      muted: "bg-borderLight",
    },
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-4",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

const fill = cva(
  "h-full rounded-full transition-width duration-500 ease-out motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "bg-primary",
        accent: "bg-accent",
        muted: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const labelClass = cva("shrink-0 font-bold text-dark", {
  variants: {
    size: {
      sm: "text-3xs",
      md: "text-2xs",
      lg: "text-sm",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

// Keeps the value between 0 and 100. Anything that isn't a finite number counts as 0.
const clamp = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

interface ProgressBarProps extends VariantProps<typeof track> {
  value: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  variant,
  size,
  showLabel = false,
  label = "Progress",
  className,
}: ProgressBarProps) {
  const percent = clamp(value);
  const percentText = `${Math.round(percent)}%`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={percentText}
      className={cn("flex w-full items-center gap-2", className)}
    >
      <div data-testid="progressbar-track" className={track({ variant, size })}>
        {/* Width comes from the value, so it is set inline and animated by transition-width. */}
        <div
          data-testid="progressbar-fill"
          className={fill({ variant })}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className={labelClass({ size })} aria-hidden="true">
          {percentText}
        </span>
      )}
    </div>
  );
}
