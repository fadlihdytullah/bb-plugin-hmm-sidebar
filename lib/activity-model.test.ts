import { describe, expect, it } from "vitest";
import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { buildActivityPaletteGroups } from "./activity-model";

function thread(
  id: string,
  projectId: string,
  overrides: Partial<PluginSidebarThread> = {},
): PluginSidebarThread {
  return {
    id,
    projectId,
    title: id,
    titleFallback: null,
    displayTitle: id,
    parentThreadId: null,
    lifecycleOwnerThreadId: null,
    sourceThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "codex",
    status: "idle",
    runtimeStatus: "idle",
    queuedWork: "none",
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    pinnedAt: null,
    pinSortKey: null,
    isArchived: false,
    archivedAt: null,
    href: "",
    isHidden: false,
    environment: null,
    host: null,
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: 1,
    latestAttentionAt: 1,
    ...overrides,
  };
}

const projects: readonly PluginSidebarProject[] = [
  { id: "engineering", name: "Engineering", isPersonal: false, href: "", settingsHref: "" },
  { id: "personal", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
];

describe("activity palette model", () => {
  it("prioritizes groups and does not duplicate threads", () => {
    const groups = buildActivityPaletteGroups(
      [
        thread("attention", "engineering", {
          hasPendingInteraction: true,
          isPinned: true,
        }),
        thread("running", "engineering", { indicator: "runtime" }),
        thread("pinned", "engineering", { isPinned: true }),
        thread("recent", "personal"),
        thread("archived", "engineering", { isArchived: true }),
      ],
      projects,
      ["recent"],
    );

    expect(groups.map(({ label }) => label)).toEqual([
      "Needs attention",
      "Currently active",
      "Pinned",
      "Recents",
    ]);
    expect(groups.flatMap(({ entries }) => entries.map(({ thread: value }) => value.id))).toEqual([
      "attention",
      "running",
      "pinned",
      "recent",
    ]);
  });

  it("searches titles and project names while excluding archived threads", () => {
    const groups = buildActivityPaletteGroups(
      [
        thread("Deploy API", "engineering", { isPinned: true }),
        thread("Personal note", "personal"),
        thread("Archived API", "engineering", { isArchived: true }),
      ],
      projects,
      [],
      "engineering",
    );

    expect(groups.flatMap(({ entries }) => entries.map(({ thread: value }) => value.id))).toEqual([
      "Deploy API",
    ]);
  });
});
