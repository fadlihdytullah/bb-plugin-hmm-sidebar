import { useMemo } from "react";
import {
  experimental_useSidebarThreadActions,
  type PluginSidebarProject,
  type PluginSidebarThread,
  type PluginSidebarThreadIndicator,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { forgetRecent, rememberRecent, useRecents } from "@/hooks/use-recents";
import { Icon } from "@/components/ui/icon";

const ACTIVITY_KEYS = [
  "workflows",
  "backgroundAgents",
  "backgroundCommands",
  "planMode",
  "goals",
] as const;

const RUNNING_INDICATORS = new Set<PluginSidebarThreadIndicator>([
  "background-agent",
  "background-command",
  "goal",
  "plan-mode",
  "runtime",
  "workflow",
]);

type ActivityStatus = "running" | "unread" | "attention" | "error" | "idle";

type ActivityStatusDefinition = {
  id: ActivityStatus;
  label: string;
  dotClassName: string;
  matches: (thread: PluginSidebarThread) => boolean;
};

const ACTIVITY_STATUSES: readonly ActivityStatusDefinition[] = [
  {
    id: "error",
    label: "Error",
    dotClassName: "bg-destructive",
    matches: (thread) => thread.indicator === "unread-error",
  },
  {
    id: "attention",
    label: "Needs attention",
    dotClassName: "bg-amber-500",
    matches: (thread) =>
      thread.hasPendingInteraction || thread.indicator === "waiting-for-input",
  },
  {
    id: "running",
    label: "Running",
    dotClassName: "animate-pulse bg-emerald-500",
    matches: (thread) =>
      RUNNING_INDICATORS.has(thread.indicator) || hasLiveActivity(thread),
  },
  {
    id: "unread",
    label: "Unread",
    dotClassName: "bg-primary",
    matches: (thread) => thread.isUnread,
  },
];

const IDLE_STATUS: ActivityStatusDefinition = {
  id: "idle",
  label: "Idle",
  dotClassName: "bg-muted-foreground/50",
  matches: () => false,
};

function threadTitle(thread: PluginSidebarThread): string {
  return (
    thread.title?.trim() || thread.titleFallback?.trim() || "Untitled thread"
  );
}

function hasLiveActivity(thread: PluginSidebarThread): boolean {
  return ACTIVITY_KEYS.some((key) => thread.activity[key] > 0);
}

function projectTag(
  thread: PluginSidebarThread,
  projects: readonly PluginSidebarProject[],
): string {
  const project = projects.find((candidate) => candidate.id === thread.projectId);
  if (!project || project.isPersonal) return "#threads";
  return `#${project.name.trim().toLowerCase() || "threads"}`;
}

function statusForThread(
  thread: PluginSidebarThread,
): ActivityStatusDefinition | null {
  return ACTIVITY_STATUSES.find((status) => status.matches(thread)) ?? null;
}

function activityTimestamp(thread: PluginSidebarThread): number {
  return Math.max(thread.latestAttentionAt, thread.updatedAt);
}

function ActivityDot({
  status,
}: {
  status: ActivityStatusDefinition;
}) {
  return (
    <span
      aria-hidden="true"
      title={status.label}
      className="flex size-4 shrink-0 items-center justify-center"
    >
      <span className={`size-1.5 rounded-full ${status.dotClassName}`} />
    </span>
  );
}

function ActivityRow({
  thread,
  project,
  status,
  activeThreadId,
  compact,
  pinned = false,
  onTogglePin,
  onForget,
  onNavigate,
  actions,
}: {
  thread: PluginSidebarThread;
  project: string;
  status: ActivityStatusDefinition;
  activeThreadId: string | null;
  compact?: boolean;
  pinned?: boolean;
  onTogglePin?: (threadId: string, pinned: boolean) => void;
  onForget?: (threadId: string) => void;
  onNavigate: () => void;
  actions: ReturnType<typeof experimental_useSidebarThreadActions>;
}) {
  const title = threadTitle(thread);
  const isCurrent = thread.id === activeThreadId;

  return (
    <li className="group/activity relative list-none">
      <a
        data-activity-thread-id={thread.id}
        data-activity-status={status.id}
        data-active={isCurrent ? "true" : undefined}
        href="#"
        title={compact ? `${title} — ${project}` : undefined}
        aria-current={isCurrent ? "page" : undefined}
        aria-label={`${title}, ${project}, ${status.label}`}
        className={`flex min-w-0 items-start gap-1.5 rounded-md pl-2 transition-colors motion-reduce:transition-none ${
          compact ? "py-1" : "py-1.5"
        } ${onForget && onTogglePin ? "pr-14" : onForget || onTogglePin ? "pr-8" : "pr-2"} ${
          isCurrent
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/70"
        }`}
        onClick={(event) => {
          event.preventDefault();
          actions.open(thread.id, { split: false });
          rememberRecent(thread.id);
          onNavigate();
        }}
      >
        <ActivityDot status={status} />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-medium leading-4 ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            {title}
          </span>
          <span
            className={`block truncate leading-3 text-muted-foreground ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {project}
          </span>
        </span>
        <span className="sr-only">{status.label}</span>
      </a>
      {onTogglePin ? (
        <button
          type="button"
          aria-label={`${pinned ? "Unpin" : "Pin"} ${title} in Activity`}
          aria-pressed={pinned}
          title={`${pinned ? "Unpin from" : "Pin in"} Activity`}
          onClick={() => onTogglePin(thread.id, pinned)}
          className={`absolute ${onForget ? "right-7" : "right-1"} top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-state-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none ${
            pinned
              ? "opacity-100"
              : "pointer-events-none opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover/activity:pointer-events-auto group-hover/activity:opacity-100"
          }`}
        >
          <Icon name={pinned ? "PinOff" : "Pin"} className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {onForget ? (
        <button
          type="button"
          aria-label={`Remove ${title} from Recents`}
          onClick={() => onForget(thread.id)}
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-sidebar-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover/activity:pointer-events-auto group-hover/activity:opacity-100 motion-reduce:transition-none"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-2"
          >
            <path d="M1 1 7 7M7 1 1 7" />
          </svg>
        </button>
      ) : null}
    </li>
  );
}

export function ActivityPanel({
  threads,
  projects,
  activeThreadId,
  onNavigate,
}: {
  threads: readonly PluginSidebarThread[];
  projects: readonly PluginSidebarProject[];
  activeThreadId: string | null;
  onNavigate: () => void;
}) {
  const actions = experimental_useSidebarThreadActions();
  const recentIds = useRecents();

  const parkedIds = useMemo(() => {
    const recent = new Set(recentIds);
    return new Set(
      threads
        .filter(
          (thread) =>
            recent.has(thread.id) &&
            !thread.isPinned &&
            statusForThread(thread) === null,
        )
        .map((thread) => thread.id),
    );
  }, [recentIds, threads]);

  const recentThreads = useMemo(
    () =>
      recentIds
        .map((id) => threads.find((thread) => thread.id === id))
        .filter(
          (thread): thread is PluginSidebarThread =>
            thread !== undefined &&
            !thread.isArchived &&
            parkedIds.has(thread.id),
        ),
    [parkedIds, recentIds, threads],
  );

  const activityThreads = useMemo(
    () => {
      const candidates = threads.filter(
        (thread) => !thread.isArchived && !parkedIds.has(thread.id),
      );
      const active = candidates
        .map((thread) => ({ thread, status: statusForThread(thread) }))
        .filter(
          (entry): entry is {
            thread: PluginSidebarThread;
            status: ActivityStatusDefinition;
          } => entry.status !== null,
        )
        // Pinning never changes the established order of working agents.
        .sort(
          (left, right) =>
            activityTimestamp(right.thread) - activityTimestamp(left.thread) ||
            left.thread.id.localeCompare(right.thread.id),
        );
      const activeIds = new Set(active.map(({ thread }) => thread.id));
      const pinnedIdle = candidates
        .filter((thread) => thread.isPinned && !activeIds.has(thread.id))
        .sort(
          (left, right) =>
            activityTimestamp(right) - activityTimestamp(left) ||
            left.id.localeCompare(right.id),
        )
        .map((thread) => ({ thread, status: IDLE_STATUS }));
      return [...active, ...pinnedIdle];
    },
    [parkedIds, threads],
  );

  const togglePin = (threadId: string, pinned: boolean): void => {
    void actions.setPinned(threadId, !pinned).catch((cause: unknown) => {
      toast.error("Could not update pin", {
        description: cause instanceof Error ? cause.message : String(cause),
      });
    });
  };

  return (
    <section
      aria-label="Sidebar activity"
      className="sticky bottom-0 z-10 shrink-0 border-t border-border/70 bg-sidebar px-2 pb-2 pt-3"
    >
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Activity
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {activityThreads.length}
        </span>
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg border border-border/70 bg-sidebar-accent/20 p-1">
        {activityThreads.length > 0 ? (
          <ul className="space-y-0.5">
            {activityThreads.map(({ thread, status }) => (
              <ActivityRow
                key={thread.id}
                thread={thread}
                project={projectTag(thread, projects)}
                status={status}
                activeThreadId={activeThreadId}
                actions={actions}
                pinned={thread.isPinned}
                onTogglePin={togglePin}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        ) : (
          <p className="px-2 py-1.5 text-[10px] leading-4 text-muted-foreground">
            Nothing needs you right now.
          </p>
        )}
      </div>
      {recentThreads.length > 0 ? (
        <div className="mt-1.5 px-1 opacity-70">
          <span className="block px-2 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Recents
          </span>
          <ul className="space-y-px">
            {recentThreads.map((thread) => (
              <ActivityRow
                key={thread.id}
                thread={thread}
                project={projectTag(thread, projects)}
                status={statusForThread(thread) ?? IDLE_STATUS}
                activeThreadId={activeThreadId}
                actions={actions}
                compact
                pinned={false}
                onTogglePin={togglePin}
                onForget={forgetRecent}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
