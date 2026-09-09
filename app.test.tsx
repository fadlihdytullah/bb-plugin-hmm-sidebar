// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PROJECT_DRAG_TYPE = "application/x-bb-collections-project";

const app = await loadPluginApp(() => import("./app"));
const threadList = app.threadLists[0]!;

const listProps = {
  activeThreadId: null,
  activeProjectId: null,
  isCompactViewport: false,
  onNavigate: vi.fn(),
  searchQuery: "",
  Original: () => null,
};

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

function runningThread(id: string, projectId: string): PluginSidebarThread {
  return {
    ...thread(id, projectId),
    indicator: "runtime",
    indicatorLabel: "Running",
    updatedAt: 2,
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("Collections Sidebar app", () => {
  it("registers one replacement list and renders collections above projects", async () => {
    expect(app.threadLists).toHaveLength(1);
    expect(threadList.id).toBe("collections");

    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1"), thread("Personal note", "threads")],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false },
          { id: "threads", name: "Threads", isPersonal: true },
        ],
      },
      rpc: {
        collections_list: () => ({
          collections: [
            { id: "collection-1", name: "Work", position: 0, projectIds: ["project-1"] },
          ],
        }),
      },
    });

    await slot.findByText("Work");
    expect(slot.getByText("Engineering")).toBeTruthy();
    expect(slot.getByText("Build API")).toBeTruthy();
    expect(slot.getByText("Threads")).toBeTruthy();
    expect(slot.queryByRole("button", { name: "Actions for Threads" })).toBeNull();
  });

  it("collapses a collection and preserves BB thread navigation", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({
          collections: [
            { id: "collection-1", name: "Work", position: 0, projectIds: ["project-1"] },
          ],
        }),
      },
    });

    await slot.findByText("Build API");
    fireEvent.click(slot.getByRole("link", { name: "Build API" }));
    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "open",
      threadId: "Build API",
      options: { split: false },
    });

    fireEvent.click(slot.getByRole("button", { name: "Collapse Work" }));
    expect(slot.queryByText("Build API")).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Expand Work" }));
    expect(slot.getByText("Engineering")).toBeTruthy();
    expect(slot.queryByText("Build API")).toBeNull();

    fireEvent.click(
      slot.getByRole("button", { name: "Expand Engineering" }),
    );
    expect(slot.getByText("Build API")).toBeTruthy();
  });

  it("keeps an individual thread action menu above its row", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    await slot.findByText("Build API");
    const trigger = slot.getByRole("button", { name: "Actions for Build API" });
    fireEvent.click(trigger);

    const menu = slot.getByRole("menu", { name: "Actions for Build API" });
    expect(trigger.parentElement?.parentElement?.className).not.toContain(
      "-translate-y-1/2",
    );
    expect(menu.className).toContain("z-[100]");
    expect(menu.className).toContain("bg-popover");
    expect(menu.closest("a")).toBeNull();
  });

  it("uses the project action menu to move a project", async () => {
    const moveProject = vi.fn(() => ({ ok: true as const }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({
          collections: [{ id: "collection-1", name: "Work", position: 0, projectIds: [] }],
        }),
        projects_move: moveProject,
      },
    });

    await slot.findByRole("button", { name: "Actions for Engineering" });
    fireEvent.click(slot.getByRole("button", { name: "Actions for Engineering" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Move to Work" }));
    await waitFor(() =>
      expect(moveProject).toHaveBeenCalledWith({
        projectId: "project-1",
        collectionId: "collection-1",
        position: 0,
      }),
    );
  });

  it("accepts project drags using the advertised data type", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({
          collections: [
            { id: "collection-1", name: "Work", position: 0, projectIds: [] },
          ],
        }),
      },
    });

    await slot.findByText("Work");
    const target = slot.container.querySelector<HTMLElement>(
      '[data-collection-id="collection-1"]',
    );
    expect(target).not.toBeNull();

    const dataTransfer = {
      types: [PROJECT_DRAG_TYPE],
      getData: vi.fn(() => ""),
      dropEffect: "none",
    };
    expect(fireEvent.dragOver(target!, { dataTransfer })).toBe(false);
  });

  it("keeps the Active Chats panel in the combined sidebar", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    const activity = await slot.findByRole("region", {
      name: "Sidebar activity",
    });
    expect(within(activity).getByText("Build API")).toBeTruthy();
    expect(within(activity).getByText("#engineering")).toBeTruthy();
  });

  it("exposes collections as an additive footer disclosure", async () => {
    const disclosure = app.experimentalSidebarFooterItems.find(
      (item) => item.kind === "disclosure",
    );
    expect(disclosure?.kind).toBe("disclosure");
    if (disclosure === undefined || disclosure.kind !== "disclosure") {
      throw new Error("Collections footer disclosure was not registered");
    }
    const slot = renderSlot(
      disclosure,
      { dismiss: vi.fn() },
      {
        sidebarThreads: {
          status: "ready",
          threads: [],
          projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
        },
        rpc: {
          collections_list: () => ({
            collections: [
              { id: "collection-1", name: "Work", position: 0, projectIds: [] },
            ],
          }),
        },
      },
    );

    expect(await slot.findByText("Work")).toBeTruthy();
  });
});
