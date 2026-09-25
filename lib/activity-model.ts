import type {
  PluginSidebarProject,
  PluginSidebarThread,
  PluginSidebarThreadIndicator,
} from "@get-bb/plugin-sdk/app";
import { RECENTS_LIMIT } from "./recents";

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

export type ActivityStatus = "running" | "unread" | "attention" | "error" | "idle";

export type ActivityStatusDefinition = {
  id: ActivityStatus;
  label: string;
  dotClassName: string;
  matches: (thread: PluginSidebarThread) => boolean;
};

export const ACTIVITY_STATUSES: readonly ActivityStatusDefinition[] = [
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

export const IDLE_STATUS: ActivityStatusDefinition = {
  id: "idle",
  label: "Idle",
  dotClassName: "bg-muted-foreground/50",
  matches: () => false,
};

export type ActivityPaletteGroupId =
  | "needs-attention"
  | "currently-active"
  | "pinned"
  | "recents";

export type ActivityPaletteEntry = {
  thread: PluginSidebarThread;
  project: string;
  status: ActivityStatusDefinition;
};

export type ActivityPaletteGroup = {
  id: ActivityPaletteGroupId;
  label: string;
  icon: "AlertCircle" | "Zap" | "Pin" | "Clock";
  entries: readonly ActivityPaletteEntry[];
};

export function threadTitle(thread: PluginSidebarThread): string {
  return (
    thread.title?.trim() || thread.titleFallback?.trim() || "Untitled thread"
  );
}

export function hasLiveActivity(thread: PluginSidebarThread): boolean {
  return ACTIVITY_KEYS.some((key) => thread.activity[key] > 0);
}

export function projectName(
  thread: PluginSidebarThread,
  projects: readonly PluginSidebarProject[],
): string {
  const project = projects.find((candidate) => candidate.id === thread.projectId);
  return project?.name.trim() || "Threads";
}

export function projectTag(
  thread: PluginSidebarThread,
  projects: readonly PluginSidebarProject[],
): string {
  const project = projects.find((candidate) => candidate.id === thread.projectId);
  if (!project || project.isPersonal) return "#threads";
  return `#${project.name.trim().toLowerCase() || "threads"}`;
}

export function statusForThread(
  thread: PluginSidebarThread,
): ActivityStatusDefinition | null {
  return ACTIVITY_STATUSES.find((status) => status.matches(thread)) ?? null;
}

export function activityTimestamp(thread: PluginSidebarThread): number {
  return Math.max(thread.latestAttentionAt, thread.updatedAt);
}

function compareActivity(
  left: ActivityPaletteEntry,
  right: ActivityPaletteEntry,
): number {
  return (
    activityTimestamp(right.thread) - activityTimestamp(left.thread) ||
    left.thread.id.localeCompare(right.thread.id)
  );
}

export function isNeedsAttention(thread: PluginSidebarThread): boolean {
  return (
    thread.isUnread ||
    thread.hasPendingInteraction ||
    thread.indicator === "waiting-for-input" ||
    thread.indicator === "unread-error"
  );
}

export function isCurrentlyActive(thread: PluginSidebarThread): boolean {
  return RUNNING_INDICATORS.has(thread.indicator) || hasLiveActivity(thread);
}

export function buildActivityPaletteGroups(
  threads: readonly PluginSidebarThread[],
  projects: readonly PluginSidebarProject[],
  recentIds: readonly string[],
  query = "",
): readonly ActivityPaletteGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const candidates = threads
    .filter((thread) => !thread.isArchived)
    .map((thread) => ({
      thread,
      project: projectName(thread, projects),
      status: statusForThread(thread) ?? IDLE_STATUS,
    }))
    .filter(({ thread, project }) => {
      if (normalizedQuery.length === 0) return true;
      return `${threadTitle(thread)} ${project}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });

  const used = new Set<string>();
  const take = (
    predicate: (thread: PluginSidebarThread) => boolean,
    sort = true,
  ): readonly ActivityPaletteEntry[] => {
    const entries = candidates.filter(
      ({ thread }) => !used.has(thread.id) && predicate(thread),
    );
    if (sort) entries.sort(compareActivity);
    entries.forEach(({ thread }) => used.add(thread.id));
    return entries;
  };

  const needsAttention = take(isNeedsAttention);
  const currentlyActive = take(isCurrentlyActive);
  const pinned = take((thread) => thread.isPinned);
  // Threads opened from Activity come first, then the most recently active
  // threads fill the group so it is useful before anything has been opened.
  const remembered = candidates
    .filter(({ thread }) => !used.has(thread.id) && recentIds.includes(thread.id))
    .sort(
      (left, right) =>
        recentIds.indexOf(right.thread.id) - recentIds.indexOf(left.thread.id),
    );
  const recents = [
    ...remembered,
    ...candidates
      .filter(({ thread }) => !used.has(thread.id) && !recentIds.includes(thread.id))
      .sort(compareActivity),
  ].slice(0, RECENTS_LIMIT);

  const groups: ActivityPaletteGroup[] = [
    { id: "needs-attention", label: "Needs attention", icon: "AlertCircle", entries: needsAttention },
    { id: "currently-active", label: "Currently active", icon: "Zap", entries: currentlyActive },
    { id: "pinned", label: "Pinned", icon: "Pin", entries: pinned },
    { id: "recents", label: "Recents", icon: "Clock", entries: recents },
  ];
  return groups.filter(({ entries }) => entries.length > 0);
}
