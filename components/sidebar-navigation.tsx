import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type {
  ExperimentalSidebarNavigationItem,
  ExperimentalSidebarNavigationProps,
} from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// Same pixel wordmark as the mercury theme's new-thread composer
// (bb-mercury-theme/theme-suikodev.css).
const SUIKODEV_WORDMARK_PATH =
  "M0 120h480v120h-480zM0 240h120v120h-120zM0 360h480v120h-480zM360 480h120v120h-120zM0 600h480v120h-480zM600 120h120v120h-120zM960 120h120v120h-120zM600 240h120v120h-120zM960 240h120v120h-120zM600 360h120v120h-120zM960 360h120v120h-120zM600 480h120v120h-120zM960 480h120v120h-120zM600 600h480v120h-480zM1200 0h120v120h-120zM1200 240h120v120h-120zM1200 360h120v120h-120zM1200 480h120v120h-120zM1200 600h120v120h-120zM1440 0h120v120h-120zM1440 120h120v120h-120zM1800 120h120v120h-120zM1440 240h120v120h-120zM1680 240h120v120h-120zM1440 360h240v120h-240zM1440 480h120v120h-120zM1680 480h120v120h-120zM1440 600h120v120h-120zM1800 600h120v120h-120zM2040 120h480v120h-480zM2040 240h120v120h-120zM2400 240h120v120h-120zM2040 360h120v120h-120zM2400 360h120v120h-120zM2040 480h120v120h-120zM2400 480h120v120h-120zM2040 600h480v120h-480zM3000 0h120v120h-120zM2640 120h480v120h-480zM2640 240h120v120h-120zM3000 240h120v120h-120zM2640 360h120v120h-120zM3000 360h120v120h-120zM2640 480h120v120h-120zM3000 480h120v120h-120zM2640 600h480v120h-480zM3240 120h480v120h-480zM3240 240h120v120h-120zM3600 240h120v120h-120zM3240 360h480v120h-480zM3240 480h120v120h-120zM3240 600h480v120h-480zM3840 120h120v120h-120zM4200 120h120v120h-120zM3840 240h120v120h-120zM4200 240h120v120h-120zM3840 360h120v120h-120zM4200 360h120v120h-120zM3840 480h120v120h-120zM4200 480h120v120h-120zM3960 600h240v120h-240z";

const HIDDEN_ITEMS_STORAGE_KEY = "hmm-sidebar.navigation.hidden-items";

function readHiddenItemIds(): string[] {
  try {
    const stored = window.localStorage.getItem(HIDDEN_ITEMS_STORAGE_KEY);
    if (stored === null) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function itemIcon(
  item: ExperimentalSidebarNavigationItem,
): "MessageSquarePlus" | "Search" | "Toolbox" | "Puzzle" {
  if (item.action.kind === "new-thread") return "MessageSquarePlus";
  if (item.action.kind === "search-threads") return "Search";
  if (item.action.kind === "open-extensions") return "Toolbox";
  return "Puzzle";
}

function MenuIcon({ item }: { item: ExperimentalSidebarNavigationItem }) {
  return <Icon name={itemIcon(item)} className="size-4" aria-hidden="true" />;
}

const menuItemClassName =
  "flex min-h-8 w-full select-none items-center gap-2 rounded px-2 text-xs text-popover-foreground outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-state-hover";

export function CompactSidebarNavigation({
  items,
  activeItemId,
  experimental_activate: activate,
}: ExperimentalSidebarNavigationProps) {
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [hiddenItemIds, setHiddenItemIds] = useState(readHiddenItemIds);
  const openInSplitRef = useRef(false);

  const newThread = items.find((item) => item.action.kind === "new-thread");
  const searchThreads = items.find(
    (item) => item.action.kind === "search-threads",
  );
  const secondaryItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.action.kind !== "new-thread" &&
          item.action.kind !== "search-threads",
      ),
    [items],
  );
  const availableSecondaryIds = useMemo(
    () => new Set(secondaryItems.map((item) => item.id)),
    [secondaryItems],
  );
  const hiddenIds = useMemo(
    () => new Set(hiddenItemIds.filter((id) => availableSecondaryIds.has(id))),
    [availableSecondaryIds, hiddenItemIds],
  );
  const visibleSecondaryItems = secondaryItems.filter(
    (item) => !hiddenIds.has(item.id),
  );

  useEffect(() => {
    window.localStorage.setItem(
      HIDDEN_ITEMS_STORAGE_KEY,
      JSON.stringify([...hiddenIds]),
    );
  }, [hiddenIds]);

  const activateItem = (item: ExperimentalSidebarNavigationItem) => {
    activate(item.id, { openInSplit: openInSplitRef.current });
    openInSplitRef.current = false;
    setOpen(false);
  };

  const rememberSplitIntent = (
    event: PointerEvent<HTMLElement>,
    item: ExperimentalSidebarNavigationItem,
  ) => {
    openInSplitRef.current = event.metaKey || event.ctrlKey;
    item.experimental_splitProps.onPointerDown?.(event);
  };

  const toggleSecondaryItem = (id: string, checked: boolean) => {
    setHiddenItemIds((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else next.add(id);
      return [...next];
    });
  };

  return (
    <header
      aria-label="Hmm Sidebar"
      className="flex h-10 shrink-0 items-center justify-between px-3"
      data-testid="sidebar-brand"
    >
      <div className="flex items-center">
        <svg
          role="img"
          aria-label="suikodev"
          className="h-3.5 w-auto shrink-0 text-foreground"
          viewBox="0 0 4320 720"
          shapeRendering="crispEdges"
        >
          <path fill="currentColor" d={SUIKODEV_WORDMARK_PATH} />
        </svg>
        <h1 className="sr-only">Hmm Sidebar</h1>
      </div>

      <div
        role="toolbar"
        aria-label="Sidebar actions"
        className="flex items-center gap-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 rounded-md text-muted-foreground",
            activeItemId === newThread?.id &&
              "bg-state-active text-foreground",
          )}
          aria-label="New thread"
          disabled={newThread?.isDisabled ?? true}
          {...newThread?.experimental_splitProps}
          onClick={() => {
            if (newThread !== undefined) {
              activate(newThread.id, { openInSplit: false });
            }
          }}
        >
          <Icon name="MessageSquarePlus" className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground"
          aria-label="Search threads"
          disabled={searchThreads?.isDisabled ?? true}
          onClick={() => {
            if (searchThreads !== undefined) {
              activate(searchThreads.id, { openInSplit: false });
            }
          }}
        >
          <Icon name="Search" className="size-4" aria-hidden="true" />
        </Button>

        <DropdownMenu.Root
          modal={false}
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setCustomizing(false);
          }}
        >
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground data-[state=open]:bg-state-active data-[state=open]:text-foreground"
              aria-label="More sidebar navigation"
            >
              <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            side="bottom"
            sideOffset={6}
            className="z-[110] min-w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
              {customizing ? (
                <>
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <span className="text-xs font-semibold">Customize sidebar</span>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:underline"
                      onClick={() =>
                        setHiddenItemIds(
                          hiddenIds.size === 0
                            ? secondaryItems.map((item) => item.id)
                            : [],
                        )
                      }
                    >
                      {hiddenIds.size === 0 ? "Uncheck all" : "Check all"}
                    </button>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  {[newThread, searchThreads]
                    .filter(
                      (item): item is ExperimentalSidebarNavigationItem =>
                        item !== undefined,
                    )
                    .map((item) => (
                      <DropdownMenu.CheckboxItem
                        key={item.id}
                        checked
                        disabled
                        className={menuItemClassName}
                        onSelect={(event) => event.preventDefault()}
                      >
                        <MenuIcon item={item} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <Icon name="Check" className="size-3.5" aria-hidden="true" />
                      </DropdownMenu.CheckboxItem>
                    ))}
                  {secondaryItems.map((item) => {
                    const checked = !hiddenIds.has(item.id);
                    return (
                      <DropdownMenu.CheckboxItem
                        key={item.id}
                        checked={checked}
                        disabled={item.isDisabled}
                        className={menuItemClassName}
                        onCheckedChange={(nextChecked) =>
                          toggleSecondaryItem(item.id, nextChecked === true)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        <MenuIcon item={item} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {checked ? (
                          <Icon name="Check" className="size-3.5" aria-hidden="true" />
                        ) : null}
                      </DropdownMenu.CheckboxItem>
                    );
                  })}
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className={menuItemClassName}
                    onSelect={() => {
                      setCustomizing(false);
                      setOpen(false);
                    }}
                  >
                    Done
                  </DropdownMenu.Item>
                </>
              ) : (
                <>
                  {visibleSecondaryItems.length > 0 ? (
                    visibleSecondaryItems.map((item) => (
                      <DropdownMenu.Item
                        key={item.id}
                        disabled={item.isDisabled}
                        className={menuItemClassName}
                        onPointerDown={(event) => rememberSplitIntent(event, item)}
                        onSelect={() => activateItem(item)}
                      >
                        <MenuIcon item={item} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </DropdownMenu.Item>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No additional actions selected
                    </div>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className={menuItemClassName}
                    onSelect={(event) => {
                      event.preventDefault();
                      setCustomizing(true);
                    }}
                  >
                    <Icon name="SlidersHorizontal" className="size-4" aria-hidden="true" />
                    Customize sidebar
                  </DropdownMenu.Item>
                </>
              )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
