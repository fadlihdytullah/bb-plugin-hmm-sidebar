import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const COLLAPSED_LIMIT = 5;

/**
 * Keeps the first few items plus any `keep` matches past the limit, so
 * collapsing never hides something that needs the user.
 */
export function useShowMore<T>(items: readonly T[], keep: (item: T) => boolean) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded
    ? items
    : items.filter((item, index) => index < COLLAPSED_LIMIT || keep(item));
  const hiddenCount = items.length - shown.length;
  return {
    shown,
    hiddenCount,
    expanded,
    canToggle: items.length > COLLAPSED_LIMIT && (expanded || hiddenCount > 0),
    toggle: () => setExpanded((current) => !current),
  };
}

export function ShowMoreButton({
  expanded,
  hiddenCount,
  onToggle,
  className = "",
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      className={`flex w-full items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground/50 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none ${className}`}
      onClick={onToggle}
    >
      <Icon
        name="ChevronDown"
        className={`size-3 transition-transform motion-reduce:transition-none ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
      {expanded ? "Show less" : `Show ${hiddenCount} more`}
    </button>
  );
}
