import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  experimental_useSidebarThreads,
  useBbContext,
} from "@get-bb/plugin-sdk/app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useThreadCommands } from "@/hooks/use-thread-commands";
import { rememberRecent } from "@/hooks/use-recents";
import { usePortalScopeProps } from "@/lib/portal-scope";
import {
  ACTIVITY_PALETTE_FILTERS,
  buildActivityPaletteGroups,
  threadTitle,
  type ActivityPaletteEntry,
  type ActivityPaletteFilter,
  type ActivityPaletteSort,
} from "@/lib/activity-model";
import { OPEN_ACTIVITY_PALETTE_EVENT } from "@/lib/palette-event";

function ActivityPaletteRow({
  entry,
  selected,
  onSelect,
  onOpen,
}: {
  entry: ActivityPaletteEntry;
  selected: boolean;
  onSelect: () => void;
  onOpen: (threadId: string, split: boolean) => void;
}) {
  const title = threadTitle(entry.thread);

  return (
    <div role="presentation" className="group/row relative">
      <button
        id={`activity-palette-option-${entry.thread.id}`}
        type="button"
        role="option"
        aria-selected={selected}
        aria-label={`${title}, ${entry.project}, ${entry.status.label}`}
        className={`flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-left text-foreground transition-colors motion-reduce:transition-none ${
          selected ? "bg-state-active" : "hover:bg-state-hover"
        }`}
        onMouseEnter={onSelect}
        onClick={() => onOpen(entry.thread.id, false)}
      >
        <span
          aria-hidden="true"
          title={entry.status.label}
          className="flex size-3 shrink-0 items-center justify-center"
        >
          <span className={`size-1.5 rounded-full ${entry.status.dotClassName}`} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-5">
          {title}
        </span>
        <span className="max-w-[35%] shrink-0 truncate text-xs text-muted-foreground transition-opacity group-hover/row:opacity-0 group-focus-within/row:opacity-0 motion-reduce:transition-none">
          {entry.project}
        </span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Open ${title} in split`}
        title="Open in split (⌘↵)"
        className="pointer-events-none absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-state-hover hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/row:pointer-events-auto group-hover/row:opacity-100 motion-reduce:transition-none"
        onClick={() => onOpen(entry.thread.id, true)}
      >
        <Icon name="Columns2" className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ActivityPalette() {
  const { threadId: activeThreadId } = useBbContext();
  const { status, threads, projects } = experimental_useSidebarThreads();
  const actions = useThreadCommands();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityPaletteFilter>("all");
  const [sort, setSort] = useState<ActivityPaletteSort>("recent");
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const setPortalHostRef = useCallback(
    (node: HTMLDivElement | null) => setPortalHost(node),
    [],
  );
  const chatContainer =
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>('main[data-sidebar="inset"]');
  const portalScopeProps = usePortalScopeProps();

  const groups = useMemo(
    () => buildActivityPaletteGroups(threads, projects, query, { filter, sort }),
    [filter, projects, query, sort, threads],
  );
  const visibleEntries = useMemo(
    () => groups.flatMap((group) => group.entries),
    [groups],
  );
  const visibleIds = useMemo(
    () => new Set(visibleEntries.map(({ thread }) => thread.id)),
    [visibleEntries],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "e"
      ) {
        event.preventDefault();
        setOpen((current) => {
          const next = !current;
          if (next) {
            setQuery("");
            setSelectedId(activeThreadId);
          }
          return next;
        });
      }
    };

    const onOpenRequest = () => {
      setQuery("");
      setSelectedId(activeThreadId);
      setOpen(true);
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_ACTIVITY_PALETTE_EVENT, onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_ACTIVITY_PALETTE_EVENT, onOpenRequest);
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (!open) return;
    setSelectedId((current) => {
      if (current !== null && visibleIds.has(current)) return current;
      if (activeThreadId !== null && visibleIds.has(activeThreadId)) {
        return activeThreadId;
      }
      return visibleEntries[0]?.thread.id ?? null;
    });
  }, [activeThreadId, open, visibleEntries, visibleIds]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (visibleEntries.length === 0) return;
      const index = visibleEntries.findIndex(
        ({ thread }) => thread.id === selectedId,
      );
      const nextIndex =
        index < 0
          ? direction === 1
            ? 0
            : visibleEntries.length - 1
          : (index + direction + visibleEntries.length) % visibleEntries.length;
      setSelectedId(visibleEntries[nextIndex]!.thread.id);
    },
    [selectedId, visibleEntries],
  );

  const openSelected = useCallback(
    (threadId: string, split: boolean) => {
      if (!visibleIds.has(threadId)) return;
      actions.open(threadId, { split });
      rememberRecent(threadId);
      setOpen(false);
    },
    [actions, visibleIds],
  );

  const isChatScoped = chatContainer !== null && portalHost !== null;
  const palette =
    chatContainer !== null && portalHost === null ? null : (
      // Bottom sheets sit off-screen in a narrow window; always centre like cmd+k.
      <CompactViewportOverrideProvider isCompactViewport={false}>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="activity-palette"
        className={`max-w-lg gap-0 overflow-hidden p-0 ${
          isChatScoped ? "!absolute !top-[15%] !translate-y-0" : ""
        }`}
        hideCloseButton
        overlayClassName={isChatScoped ? "!absolute" : undefined}
        portalContainer={isChatScoped ? portalHost : null}
        onEscapeKeyDown={() => setOpen(false)}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Activity palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and open active BB threads.
        </DialogDescription>
        <div className="flex h-11 items-center gap-2 border-b border-border px-3">
          <Icon name="Search" className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (selectedId !== null) openSelected(selectedId, event.metaKey);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            aria-label="Search Activity"
            aria-controls="activity-palette-results"
            aria-activedescendant={
              selectedId !== null
                ? `activity-palette-option-${selectedId}`
                : undefined
            }
            role="combobox"
            aria-expanded="true"
            placeholder="Search Activity by title or project"
            className="h-full border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1 py-0.5 text-[10px] leading-none text-muted-foreground sm:inline-block">
            esc
          </kbd>
        </div>
        <div
          role="toolbar"
          aria-label="Filter and sort Activity"
          className="flex items-center gap-1 border-b border-border px-2 py-1.5"
        >
          {ACTIVITY_PALETTE_FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              tabIndex={-1}
              aria-pressed={filter === entry.id}
              className={`rounded-md px-2 py-0.5 text-[11px] transition-colors motion-reduce:transition-none ${
                filter === entry.id
                  ? "bg-state-active text-foreground"
                  : "text-muted-foreground hover:bg-state-hover hover:text-foreground"
              }`}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Sort by ${sort === "recent" ? "name" : "recent"}`}
            className="ml-auto rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground motion-reduce:transition-none"
            onClick={() => setSort((current) => (current === "recent" ? "name" : "recent"))}
          >
            {sort === "recent" ? "Recent" : "A–Z"}
          </button>
        </div>
        <div
          id="activity-palette-results"
          role="listbox"
          aria-label="Activity results"
          className="max-h-[min(60vh,24rem)] overflow-y-auto p-1.5"
        >
          {status === "loading" ? (
            <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading Activity…
            </p>
          ) : status === "error" ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">
              BB could not load Activity.
            </p>
          ) : groups.length === 0 ? (
            <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query.trim().length > 0
                ? "No Activity items match your search."
                : filter !== "all"
                  ? "No Activity items match this filter."
                  : "Nothing needs you right now."}
            </p>
          ) : (
            groups.map((group) => {
              const headingId = `activity-palette-group-${group.id}`;
              return (
                <div
                  key={group.id}
                  role="group"
                  aria-labelledby={headingId}
                  className="not-first:mt-1.5"
                >
                  <div
                    id={headingId}
                    className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground"
                  >
                    <Icon name={group.icon} className="size-3" aria-hidden="true" />
                    {group.label}
                    <span aria-hidden="true" className="ml-auto tabular-nums opacity-60">
                      {group.entries.length}
                    </span>
                  </div>
                  {group.entries.map((entry) => (
                    <ActivityPaletteRow
                      key={entry.thread.id}
                      entry={entry}
                      selected={entry.thread.id === selectedId}
                      onSelect={() => setSelectedId(entry.thread.id)}
                      onOpen={openSelected}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
        <div className="flex h-8 items-center justify-end gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
          {[
            ["↑↓", "Navigate"],
            ["↵", "Open"],
            ["⌘↵", "Split"],
          ].map(([keys, label]) => (
            <span key={label} className="flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-sans leading-4">{keys}</kbd>
              {label}
            </span>
          ))}
        </div>
      </DialogContent>
      </Dialog>
      </CompactViewportOverrideProvider>
    );

  if (chatContainer === null) return palette;
  if (!open) return null;

  return createPortal(
    <div {...portalScopeProps} style={{ display: "contents" }}>
      <div
        ref={setPortalHostRef}
        className="absolute inset-0 z-50"
      >
        {palette}
      </div>
    </div>,
    chatContainer,
  );
}
