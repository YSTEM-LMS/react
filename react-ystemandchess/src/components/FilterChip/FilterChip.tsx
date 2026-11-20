import { cva } from "class-variance-authority";
import { cn } from "../../core/utils/cn";

// A pill that turns a filter on or off. It's a real button, so Enter and
// Space work, and aria-pressed tells screen readers whether it's on. It never
// gets wider than its container: a long label ends in "…" (the full label
// stays in the title and for screen readers).
const filterChip = cva(
  "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      active: {
        false: "bg-light border-borderLight text-gray hover:border-primary hover:text-dark",
        true: "bg-primary text-dark border-primary",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

interface FilterChipProps {
  label: string;
  active?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function FilterChip({ label, active = false, onToggle, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={label}
      onClick={onToggle}
      className={cn(filterChip({ active }), className)}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}
