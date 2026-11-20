import { cn } from "../../core/utils/cn";

type SortDirection = "asc" | "desc" | "none";

// aria-sort words for each direction.
const ariaSort = {
  asc: "ascending",
  desc: "descending",
  none: "none",
} as const;

const arrow = {
  asc: "▲",
  desc: "▼",
  none: "",
};

interface SortHeaderProps {
  label: string;
  direction?: SortDirection;
  onSort?: () => void;
  // Goes on the header cell, e.g. a background or text alignment.
  className?: string;
}

// A sortable column header: the <th> carries aria-sort (screen readers only
// read it on header cells) and wraps a button that changes the sort.
export function SortHeader({ label, direction = "none", onSort, className }: SortHeaderProps) {
  return (
    <th scope="col" aria-sort={ariaSort[direction]} className={cn("px-2.5 py-3 text-left font-extrabold", className)}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark"
      >
        <span>{label}</span>
        {direction !== "none" && (
          <span data-testid="sortheader-arrow" aria-hidden="true" className="text-xs leading-none">
            {arrow[direction]}
          </span>
        )}
      </button>
    </th>
  );
}
