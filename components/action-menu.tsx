import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ActionMenu({
  label,
  items,
  children,
}: {
  label: string;
  items: readonly ActionMenuItem[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${open ? "z-[100]" : ""}`}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-state-hover hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 data-[state=open]:bg-state-active data-[state=open]:text-foreground data-[state=open]:opacity-100"
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((current) => !current)}
      >
        {children ?? <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-8 z-[100] min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center rounded px-2 py-1.5 text-left text-xs outline-none hover:bg-state-hover focus-visible:bg-state-hover disabled:pointer-events-none disabled:opacity-50",
                item.destructive && "text-destructive hover:text-destructive",
              )}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
