import {
  experimental_ThreadActionsContextMenu as ThreadActionsContextMenu,
  experimental_ThreadActionsMenu as ThreadActionsMenu,
  experimental_useSidebarThreadSplit,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { ShowMoreButton, useShowMore } from "@/components/show-more";
import { Icon } from "@/components/ui/icon";
import { useThreadCommands } from "@/hooks/use-thread-commands";
import { isCurrentlyActive, isNeedsAttention } from "@/lib/activity-model";
import { threadTitle } from "@/lib/sidebar-model";
import { requestThreadDelete } from "@/lib/thread-delete";
import { toThreadActionTarget } from "@/lib/thread-target";
import { cn } from "@/lib/utils";

function indicatorClass(thread: PluginSidebarThread): string {
  switch (thread.indicator) {
    case "unread-error":
      return "bg-destructive";
    case "waiting-for-input":
      return "bg-amber-500";
    case "working-draft":
    case "workflow":
    case "background-agent":
    case "background-command":
    case "plan-mode":
    case "goal":
    case "runtime":
      return "animate-pulse bg-emerald-500";
    case "unread-success":
      return "bg-primary";
    case "draft":
      return "bg-muted-foreground/60";
    case "none":
    default:
      return thread.isUnread ? "bg-primary" : "bg-muted-foreground/30";
  }
}

/** Rows stay muted unless the thread is running or waiting on the user. */
export function isThreadHighlighted(thread: PluginSidebarThread): boolean {
  return isNeedsAttention(thread) || isCurrentlyActive(thread);
}

/**
 * Shows the first few threads with a fade and a toggle for the rest. The fade
 * targets the last row's link rather than masking the list, since a mask would
 * clip row action menus.
 */
export function ThreadList({
  threads,
  activeThreadId,
  onNavigate,
  label,
  className,
  shortcutTargets = true,
}: {
  threads: readonly PluginSidebarThread[];
  activeThreadId: string | null;
  onNavigate: () => void;
  label?: string;
  className?: string;
  shortcutTargets?: boolean;
}) {
  const { shown, hiddenCount, expanded, canToggle, toggle } = useShowMore(
    threads,
    (thread) => thread.id === activeThreadId || isThreadHighlighted(thread),
  );

  return (
    <div className={className}>
      <ul
        aria-label={label}
        className={`space-y-px ${
          hiddenCount > 0
            ? "[&>li:last-child>a:not(:hover)]:opacity-40"
            : ""
        }`}
      >
        {shown.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            activeThreadId={activeThreadId}
            onNavigate={onNavigate}
            shortcutTarget={shortcutTargets}
          />
        ))}
      </ul>
      {canToggle ? (
        <ShowMoreButton expanded={expanded} hiddenCount={hiddenCount} onToggle={toggle} />
      ) : null}
    </div>
  );
}

export function ThreadRow({
  thread,
  activeThreadId,
  onNavigate,
  shortcutTarget = true,
}: {
  thread: PluginSidebarThread;
  activeThreadId: string | null;
  onNavigate: () => void;
  shortcutTarget?: boolean;
}) {
  const commands = useThreadCommands();
  const { splitProps } = experimental_useSidebarThreadSplit(thread.id);
  const title = threadTitle(thread);
  const target = toThreadActionTarget(thread);
  const isActive = thread.id === activeThreadId;
  const isHighlighted = isThreadHighlighted(thread);

  return (
    <li className="group/thread relative list-none">
      <ThreadActionsContextMenu thread={target}>
        <a
          {...splitProps}
          data-sidebar-thread-shortcut-target={shortcutTarget ? "" : undefined}
          data-sidebar-thread-id={thread.id}
          href={thread.href.length > 0 ? thread.href : "#"}
          aria-current={isActive ? "page" : undefined}
          aria-label={`${title}${thread.indicatorLabel ? `, ${thread.indicatorLabel}` : ""}`}
          className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-0.5 pr-12 text-xs transition-colors motion-reduce:transition-none ${
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : isHighlighted
                ? "text-sidebar-foreground hover:bg-sidebar-accent/70"
                : "text-muted-foreground/30 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
          }`}
          onClick={(event) => {
            event.preventDefault();
            commands.open(thread.id, { split: false });
            onNavigate();
          }}
        >
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full ${indicatorClass(thread)}`}
          />
          <span className="min-w-0 flex-1 truncate font-normal leading-4">
            {title}
          </span>
          {thread.isUnread ? (
            <span className="sr-only">Unread</span>
          ) : null}
        </a>
      </ThreadActionsContextMenu>
      <div className="pointer-events-auto absolute bottom-0 right-1 top-0 flex items-center">
        <button
          type="button"
          aria-label={`Delete ${title}`}
          className="pointer-events-none flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/thread:pointer-events-auto group-hover/thread:opacity-100 group-focus-within/thread:pointer-events-auto group-focus-within/thread:opacity-100 motion-reduce:transition-none"
          onClick={(event) => {
            event.preventDefault();
            requestThreadDelete(thread.id);
          }}
        >
          <Icon name="Trash2" className="size-3.5" aria-hidden="true" />
        </button>
        <ThreadActionsMenu
          thread={target}
          side="bottom"
          align="end"
          trigger={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Actions for ${title}`}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-state-hover hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/thread:opacity-100 group-focus-within/thread:opacity-100 aria-expanded:bg-state-active aria-expanded:text-foreground aria-expanded:opacity-100",
                props.className,
              )}
            >
              <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
            </button>
          )}
        />
      </div>
    </li>
  );
}
