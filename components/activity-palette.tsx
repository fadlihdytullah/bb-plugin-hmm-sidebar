import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreads,
  useBbContext,
} from "@get-bb/plugin-sdk/app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { rememberRecent, useRecents } from "@/hooks/use-recents";
import { usePortalScopeProps } from "@/lib/portal-scope";
import {
  buildActivityPaletteGroups,
  threadTitle,
  type ActivityPaletteEntry,
} from "@/lib/activity-model";

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
    <button
      id={`activity-palette-option-${entry.thread.id}`}
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${title}, ${entry.project}, ${entry.status.label}`}
      className={`flex w-full min-w-0 items-start gap-3 rounded-md px-3 py-2 text-left transition-colors motion-reduce:transition-none ${
        selected
          ? "bg-state-active text-foreground"
          : "text-foreground hover:bg-state-hover"
      }`}
      onMouseEnter={onSelect}
      onClick={() => onOpen(entry.thread.id, false)}
    >
      <span
        aria-hidden="true"
        className="mt-1 flex size-4 shrink-0 items-center justify-center"
      >
        <span className={`size-1.5 rounded-full ${entry.status.dotClassName}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-5">
          {title}
        </span>
        <span className="block truncate text-xs leading-4 text-muted-foreground">
          #{entry.project.toLowerCase()}
        </span>
      </span>
      <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
        {entry.status.label}
      </span>
    </button>
  );
}

export function ActivityPalette() {
  const { threadId: activeThreadId } = useBbContext();
  const { status, threads, projects } = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const recentIds = useRecents();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    () => buildActivityPaletteGroups(threads, projects, recentIds, query),
    [projects, query, recentIds, threads],
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

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="activity-palette"
        className={`max-w-xl gap-0 overflow-hidden p-0 ${
          isChatScoped ? "!absolute" : ""
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
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
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
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ⌘E
          </kbd>
        </div>
        <div
          id="activity-palette-results"
          role="listbox"
          aria-label="Activity results"
          className="max-h-[min(60vh,28rem)] overflow-y-auto p-2"
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
                  className="not-first:mt-2"
                >
                  <div
                    id={headingId}
                    className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    <Icon name={group.icon} className="size-3" aria-hidden="true" />
                    {group.label}
                    <span aria-hidden="true" className="ml-auto tabular-nums font-normal">
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
        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>⌘↵ Split</span>
        </div>
      </DialogContent>
      </Dialog>
    );

  if (chatContainer === null) return palette;

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
