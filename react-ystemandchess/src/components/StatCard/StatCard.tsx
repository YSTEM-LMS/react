import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

const statCard = cva("flex gap-2 rounded-lg", {
  variants: {
    variant: {
      default: "bg-light border border-borderLight shadow-sm",
      highlighted: "bg-soft border border-primary/20",
      dark: "bg-dark",
    },
    size: {
      sm: "p-2",
      lg: "p-4",
    },
    layout: {
      vertical: "flex-col items-center text-center",
      horizontal: "flex-row items-center",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
    layout: "vertical",
  },
});

const valueClass = cva("font-bold leading-none", {
  variants: {
    variant: {
      default: "text-dark",
      highlighted: "text-primary",
      dark: "text-light",
    },
    size: {
      sm: "text-sm",
      lg: "text-2xl",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

const labelClass = cva("", {
  variants: {
    variant: {
      default: "text-gray",
      highlighted: "text-gray",
      dark: "text-light",
    },
    size: {
      sm: "text-3xs",
      lg: "text-2xs",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

interface StatCardProps extends VariantProps<typeof statCard> {
  icon: string;
  value: string | number;
  label: string;
  className?: string;
}

export function StatCard({ icon, value, label, variant, size, layout, className }: StatCardProps) {
  return (
    <div className={cn(statCard({ variant, size, layout }), className)}>
      <span aria-hidden="true">{icon}</span>
      <div className="flex flex-col">
        <span className={valueClass({ variant, size })}>{value}</span>
        <span className={labelClass({ variant, size })}>{label}</span>
      </div>
    </div>
  );
}
