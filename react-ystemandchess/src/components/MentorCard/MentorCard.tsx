import { useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";
import { StatCard } from "../StatCard";

const mentorCard = cva("flex items-center rounded-lg border", {
  variants: {
    variant: {
      default: "bg-light border-borderLight shadow-sm",
      featured: "bg-soft border-primary shadow-sm",
    },
    size: {
      sm: "gap-2 p-2",
      lg: "gap-4 p-4",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

const avatarClass = cva("rounded-full object-cover", {
  variants: {
    size: {
      sm: "h-10 w-10",
      lg: "h-16 w-16",
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

const specialtyClass = cva("truncate text-gray", {
  variants: {
    size: {
      sm: "text-2xs",
      lg: "text-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const statusDot = cva("absolute bottom-0 right-0 rounded-full ring-2 ring-light", {
  variants: {
    status: {
      available: "bg-primary",
      busy: "bg-red",
    },
    size: {
      sm: "h-2.5 w-2.5",
      lg: "h-3.5 w-3.5",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const statusLabels = {
  available: "Available",
  busy: "Busy",
};

interface MentorCardProps extends VariantProps<typeof mentorCard> {
  avatarSrc: string;
  name: string;
  specialty: string;
  sessionCount: number;
  status?: VariantProps<typeof statusDot>["status"];
  className?: string;
}

export function MentorCard({
  avatarSrc,
  name,
  specialty,
  sessionCount,
  status,
  variant,
  size,
  className,
}: MentorCardProps) {
  const nameId = useId();

  return (
    <article aria-labelledby={nameId} className={cn(mentorCard({ variant, size }), className)}>
      <div className="relative shrink-0">
        <img src={avatarSrc} alt="" aria-hidden="true" className={avatarClass({ size })} />
        {status && (
          <span role="img" aria-label={statusLabels[status]} className={statusDot({ status, size })} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span id={nameId} className={nameClass({ size })}>
          {name}
        </span>
        <span className={specialtyClass({ size })}>{specialty}</span>
      </div>
      <StatCard
        icon="📅"
        value={sessionCount}
        label={sessionCount === 1 ? "Session" : "Sessions"}
        variant={variant === "featured" ? "highlighted" : "default"}
        size={size}
        className="shrink-0"
      />
    </article>
  );
}
