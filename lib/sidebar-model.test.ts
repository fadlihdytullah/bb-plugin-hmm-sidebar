import { describe, expect, it } from "vitest";
import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import type { Collection } from "../contract";
import { buildSidebarModel } from "./sidebar-model";
import { reorderIds, unassignedProjectIds } from "./collections";

function thread(id: string, projectId: string): PluginSidebarThread {
  return {
    id,
    projectId,
    title: id,
    titleFallback: null,
    parentThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "codex",
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
    isArchived: false,
    environment: null,
    host: null,
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: 1,
    latestAttentionAt: 1,
  };
}

function project(id: string, name: string, isPersonal = false): PluginSidebarProject {
  return { id, name, isPersonal };
}

function collection(id: string, name: string, projectIds: string[]): Collection {
  return { id, name, position: 0, projectIds };
}

describe("sidebar model", () => {
  it("keeps collections first and protects the personal Threads project", () => {
    const model = buildSidebarModel(
      [collection("c1", "Work", ["p2", "missing"])],
      [project("p1", "Threads", true), project("p2", "App"), project("p3", "Docs")],
      [thread("t1", "p1"), thread("t2", "p2"), thread("t3", "p3")],
    );

    expect(model.collections[0]?.projects.map(({ project: value }) => value.id)).toEqual(["p2"]);
    expect(model.looseProjects.map(({ project: value }) => value.id)).toEqual(["p3"]);
    expect(model.personalProject?.project.id).toBe("p1");
    expect(model.personalProject?.threads.map((value) => value.id)).toEqual(["t1"]);
  });
});

describe("collection ordering helpers", () => {
  it("reorders requested ids while retaining omitted ids", () => {
    expect(reorderIds(["a", "b", "c"], ["c", "a"])).toEqual(["c", "a", "b"]);
  });

  it("finds project ids that are not assigned", () => {
    expect(
      unassignedProjectIds(
        [collection("c1", "Work", ["p1"])],
        ["p1", "p2", "p3"],
      ),
    ).toEqual(["p2", "p3"]);
  });
});
