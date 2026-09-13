// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type {
  ExperimentalSidebarNavigationItem,
  ExperimentalSidebarNavigationProps,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PROJECT_DRAG_TYPE = "application/x-bb-collections-project";

const app = await loadPluginApp(() => import("./app"));
const threadList = app.threadLists[0]!;
const sidebarNavigation = app.experimentalSidebarNavigations[0]!;
const activityPalette = app.appOverlays[0]!;

const navigationItems: readonly ExperimentalSidebarNavigationItem[] = [
  {
    id: "new-thread",
    label: "New thread",
    icon: { kind: "host", name: "new-thread" },
    action: { kind: "new-thread" },
    isDisabled: false,
    shortcut: null,
    experimental_splitProps: {},
  },
  {
    id: "search-threads",
    label: "Search threads",
    icon: { kind: "host", name: "search" },
    action: { kind: "search-threads" },
    isDisabled: false,
    shortcut: null,
    experimental_splitProps: {},
  },
  {
    id: "extensions",
    label: "Extensions",
    icon: { kind: "host", name: "extensions" },
    action: { kind: "open-extensions" },
    isDisabled: false,
    shortcut: null,
    experimental_splitProps: {},
  },
  {
    id: "plugin-guide",
    label: "Plugin Guide",
    icon: { kind: "plugin", pluginId: "docs", icon: "BookOpen" },
    action: { kind: "open-plugin-panel", pluginId: "docs", panelId: "guide" },
    isDisabled: false,
    shortcut: null,
    experimental_splitProps: {},
  },
];

function navigationProps(
  activate = vi.fn(),
): ExperimentalSidebarNavigationProps {
  return {
    items: navigationItems,
    activeItemId: null,
    isCompactViewport: false,
    experimental_activate: activate,
    experimental_Original: () => null,
  };
}

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

describe("Hmm Sidebar app", () => {
  it("registers an app-wide Activity palette", () => {
    expect(app.appOverlays).toHaveLength(1);
    expect(activityPalette.id).toBe("activity-palette");
  });

  it("centers Activity inside the chat container", async () => {
    const chatContainer = document.createElement("main");
    chatContainer.dataset.sidebar = "inset";
    document.body.append(chatContainer);

    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
    });

    expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeNull();

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    await waitFor(() =>
      expect(chatContainer.querySelector('[data-testid="activity-palette"]')).toBeTruthy(),
    );
    expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeNull(),
    );

    slot.unmount();
    chatContainer.remove();
  });

  it("keeps the logo and fixed actions in one official navigation header", async () => {
    const activate = vi.fn();
    const slot = renderSlot(sidebarNavigation, navigationProps(activate));
    const header = await slot.findByTestId("sidebar-brand");
    const actions = within(header).getByLabelText("Sidebar actions");

    expect(app.contentScripts).toHaveLength(0);
    expect(app.experimentalSidebarNavigations).toHaveLength(1);
    expect(within(header).getByRole("img", { name: "BB" })).toBeTruthy();
    expect(within(actions).getAllByRole("button")).toHaveLength(3);

    fireEvent.click(within(actions).getByRole("button", { name: "New thread" }));
    fireEvent.click(
      within(actions).getByRole("button", { name: "Search threads" }),
    );
    expect(activate).toHaveBeenNthCalledWith(1, "new-thread", {
      openInSplit: false,
    });
    expect(activate).toHaveBeenNthCalledWith(2, "search-threads", {
      openInSplit: false,
    });
  });

  it("keeps More usable after unchecking and checking every optional action", async () => {
    const slot = renderSlot(sidebarNavigation, navigationProps());
    const more = await slot.findByRole("button", {
      name: "More sidebar navigation",
    });

    fireEvent.pointerDown(more, { button: 0, ctrlKey: false });
    const extensions = await slot.findByRole("menuitem", {
      name: "Extensions",
    });
    expect(extensions).toBeTruthy();
    expect(document.body.style.pointerEvents).not.toBe("none");
    expect(more.closest("header")?.contains(extensions)).toBe(true);
    fireEvent.click(slot.getByRole("menuitem", { name: "Customize sidebar" }));

    const newThread = await slot.findByRole("menuitemcheckbox", {
      name: "New thread",
    });
    const searchThreads = slot.getByRole("menuitemcheckbox", {
      name: "Search threads",
    });
    expect(newThread.getAttribute("aria-checked")).toBe("true");
    expect(newThread.getAttribute("aria-disabled")).toBe("true");
    expect(searchThreads.getAttribute("aria-checked")).toBe("true");
    expect(searchThreads.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(slot.getByRole("button", { name: "Uncheck all" }));
    expect(
      slot
        .getByRole("menuitemcheckbox", { name: "Extensions" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    fireEvent.click(slot.getByRole("button", { name: "Check all" }));
    expect(
      slot
        .getByRole("menuitemcheckbox", { name: "Extensions" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(slot.getByRole("menuitem", { name: "Done" }));
    await waitFor(() =>
      expect(more.getAttribute("aria-expanded")).toBe("false"),
    );

    fireEvent.pointerDown(more, { button: 0, ctrlKey: false });
    expect(await slot.findByRole("menuitem", { name: "Plugin Guide" })).toBeTruthy();
  });

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
    expect(slot.getByText("Chats")).toBeTruthy();
    expect(
      within(slot.getByRole("list", { name: "Chats" })).getByText("Personal note"),
    ).toBeTruthy();
    expect(slot.queryByRole("button", { name: "Actions for Threads" })).toBeNull();
  });

  it("collapses, sorts and filters the flat chats list", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Older chat", "threads"), updatedAt: 1 },
          { ...thread("Newer chat", "threads"), updatedAt: 5, isUnread: true },
        ],
        projects: [{ id: "threads", name: "Threads", isPersonal: true }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    await slot.findByText("Newer chat");
    const titles = () =>
      within(slot.getByRole("list", { name: "Chats" }))
        .getAllByRole("link")
        .map((node) => node.textContent?.replace(/Unread$/, ""));
    expect(titles()).toEqual(["Newer chat", "Older chat"]);

    fireEvent.click(slot.getByRole("button", { name: "Sort and filter chats" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Sort by oldest" }));
    expect(titles()).toEqual(["Older chat", "Newer chat"]);

    fireEvent.click(slot.getByRole("button", { name: "Sort and filter chats" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Only unread chats" }));
    expect(titles()).toEqual(["Newer chat"]);

    fireEvent.click(slot.getByRole("button", { name: "Collapse all chats" }));
    expect(slot.queryByRole("list", { name: "Chats" })).toBeNull();
    expect(slot.getByRole("button", { name: "Show all chats" })).toBeTruthy();
  });

  it("confirms before clearing personal chats", async () => {
    const clearChats = vi.fn(() => ({ deletedCount: 2, preservedCount: 1 }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Personal note", "threads")],
        projects: [{ id: "threads", name: "Threads", isPersonal: true }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
        chats_clear: clearChats,
      },
    });

    await slot.findByText("Personal note");
    fireEvent.click(slot.getByRole("button", { name: "Clear chats" }));
    const dialog = await slot.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Clear chats?" })).toBeTruthy();
    expect(within(dialog).getByText(/Running chats, chats needing attention/)).toBeTruthy();
    expect(clearChats).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Clear chats" }));
    await waitFor(() => expect(clearChats).toHaveBeenCalledWith({}));
  });

  it("groups only loose non-personal projects under the Projects header", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [
          { id: "z-project", name: "Zulu", isPersonal: false },
          { id: "a-project", name: "Alpha", isPersonal: false },
          { id: "personal", name: "Threads", isPersonal: true },
        ],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    expect(await slot.findByText("No collections yet")).toBeTruthy();
    const projects = slot.getByRole("list", { name: "Projects" });
    expect(
      within(projects)
        .getAllByTestId("project-name")
        .map((node) => node.textContent),
    ).toEqual(["Alpha", "Zulu"]);
    expect(within(projects).queryByText("Threads")).toBeNull();
  });

  it("collapses all loose projects and filters the project group", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Active project chat", "with-chat")],
        projects: [
          { id: "with-chat", name: "With chat", isPersonal: false },
          { id: "without-chat", name: "Without chat", isPersonal: false },
        ],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    await slot.findByText("Active project chat");
    fireEvent.click(slot.getByRole("button", { name: "Collapse all projects" }));
    expect(slot.queryByText("Active project chat")).toBeNull();
    expect(slot.getByRole("button", { name: "Show all projects" })).toBeTruthy();

    fireEvent.click(slot.getByRole("button", { name: "Sort and filter projects" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Only projects with chats" }));
    expect(slot.getByText("With chat")).toBeTruthy();
    expect(slot.queryByText("Without chat")).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Sort and filter projects" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Show all projects" }));
    fireEvent.click(slot.getByRole("button", { name: "Sort and filter projects" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Sort Z to A" }));
    expect(
      within(slot.getByRole("list", { name: "Projects" }))
        .getAllByTestId("project-name")
        .map((node) => node.textContent),
    ).toEqual(["Without chat", "With chat"]);
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

  it("collapses and expands all collections from the Collections header", async () => {
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
    fireEvent.click(slot.getByRole("button", { name: "Collapse all collections" }));
    expect(slot.queryByText("Build API")).toBeNull();
    expect(slot.getByRole("button", { name: "Show all collections" })).toBeTruthy();

    fireEvent.click(slot.getByRole("button", { name: "Show all collections" }));
    expect(slot.getByText("Engineering")).toBeTruthy();
    expect(slot.queryByText("Build API")).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Expand Engineering" }));
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
    const deleteButton = slot.getByRole("button", { name: "Delete Build API" });
    expect(deleteButton.className).toContain("group-hover/thread:opacity-100");
    fireEvent.click(deleteButton);
    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "requestDelete",
      threadId: "Build API",
    });

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

  it("keeps only rename, clear, and delete in the project action menu", async () => {
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

    await slot.findByRole("button", { name: "Actions for Engineering" });
    fireEvent.click(slot.getByRole("button", { name: "Actions for Engineering" }));
    expect(within(slot.getByRole("menu", { name: "Actions for Engineering" })).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Rename project",
      "Clear threads",
      "Delete project",
    ]);
    expect(slot.queryByRole("menuitem", { name: /Move to|Remove from collection/ })).toBeNull();
  });

  it("renames, clears, and deletes a project from its action menu", async () => {
    const renameProject = vi.fn(() => ({ ok: true as const }));
    const clearThreads = vi.fn(() => ({ deletedCount: 2, preservedCount: 1 }));
    const deleteProject = vi.fn(() => ({ deleted: true as const }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
        projects_rename: renameProject,
        projects_clear_threads: clearThreads,
        projects_delete: deleteProject,
      },
    });

    const trigger = await slot.findByRole("button", { name: "Actions for Engineering" });
    fireEvent.click(trigger);
    fireEvent.click(slot.getByRole("menuitem", { name: "Rename project" }));
    const nameInput = await slot.findByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Platform" } });
    fireEvent.click(slot.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(renameProject).toHaveBeenCalledWith({
        projectId: "project-1",
        name: "Platform",
      }),
    );

    fireEvent.click(trigger);
    fireEvent.click(slot.getByRole("menuitem", { name: "Clear threads" }));
    const clearDialog = await slot.findByRole("dialog");
    expect(within(clearDialog).getByRole("heading", { name: "Clear threads?" })).toBeTruthy();
    expect(within(clearDialog).getByText(/Running threads, threads needing attention/)).toBeTruthy();
    expect(clearThreads).not.toHaveBeenCalled();
    fireEvent.click(within(clearDialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(slot.queryByRole("dialog")).toBeNull());

    fireEvent.click(trigger);
    fireEvent.click(slot.getByRole("menuitem", { name: "Clear threads" }));
    const reopenedClearDialog = await slot.findByRole("dialog");
    fireEvent.click(within(reopenedClearDialog).getByRole("button", { name: "Clear threads" }));
    await waitFor(() =>
      expect(clearThreads).toHaveBeenCalledWith({ projectId: "project-1" }),
    );

    fireEvent.click(trigger);
    fireEvent.click(slot.getByRole("menuitem", { name: "Delete project" }));
    const deleteDialog = await slot.findByRole("dialog");
    expect(within(deleteDialog).getByRole("heading", { name: "Delete project?" })).toBeTruthy();
    expect(within(deleteDialog).getByText("This action cannot be undone.")).toBeTruthy();
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete project" }));
    await waitFor(() =>
      expect(deleteProject).toHaveBeenCalledWith({ projectId: "project-1" }),
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

  it("does not remove a loose project when its drag is released in place", async () => {
    const moveProject = vi.fn(() => ({ ok: true as const }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
        projects_move: moveProject,
      },
    });

    await slot.findByText("Engineering");
    const project = slot.container.querySelector<HTMLElement>(
      '[data-project-id="project-1"]',
    );
    expect(project).not.toBeNull();
    const dataTransfer = {
      types: [PROJECT_DRAG_TYPE, "text/plain"],
      getData: vi.fn((type: string) =>
        type === PROJECT_DRAG_TYPE ? "project-1" : "project:project-1",
      ),
      dropEffect: "move",
    };

    fireEvent.drop(project!, { dataTransfer });
    expect(moveProject).not.toHaveBeenCalled();
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

  it("keeps a pinned idle chat in Activity and allows unpinning it", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [{ ...thread("Idle chat", "project-1"), isPinned: true }],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    const activity = await slot.findByRole("region", { name: "Sidebar activity" });
    expect(within(activity).getByText("Idle chat")).toBeTruthy();
    expect(within(activity).getByText("1")).toBeTruthy();
    fireEvent.click(
      within(activity).getByRole("button", { name: "Unpin Idle chat in Activity" }),
    );
    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "setPinned",
      threadId: "Idle chat",
      pinned: false,
    });
  });

  it("lets a working chat be pinned without changing its active behavior", async () => {
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

    const activity = await slot.findByRole("region", { name: "Sidebar activity" });
    fireEvent.click(
      within(activity).getByRole("button", { name: "Pin Build API in Activity" }),
    );
    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "setPinned",
      threadId: "Build API",
      pinned: true,
    });
    expect(within(activity).getByText("Build API")).toBeTruthy();
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

  it("opens Activity with Cmd+E and searches by title or project", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1"), thread("Personal note", "threads")],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false },
          { id: "threads", name: "Threads", isPersonal: true },
        ],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    const input = within(palette).getByRole("combobox", { name: "Search Activity" });
    fireEvent.change(input, { target: { value: "engineering" } });

    expect(within(palette).getByRole("option", { name: /Build API, Engineering/ })).toBeTruthy();
    expect(within(palette).queryByRole("option", { name: /Personal note/ })).toBeNull();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "open",
      threadId: "Build API",
      options: { split: false },
    });
  });

  it("navigates Activity with arrows and opens Cmd+Enter in a split", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Needs review", "project-1"), hasPendingInteraction: true },
          runningThread("Build API", "project-1"),
        ],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    const input = within(palette).getByRole("combobox", { name: "Search Activity" });
    const options = within(palette).getAllByRole("option");
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    expect(slot.inspection.sidebarActionCalls).toContainEqual({
      method: "open",
      threadId: "Build API",
      options: { split: true },
    });
  });

  it("keeps Activity sections distinct and closes with Escape", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Needs review", "project-1"), isUnread: true },
          runningThread("Build API", "project-1"),
          { ...thread("Pinned note", "project-1"), isPinned: true },
        ],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false }],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    expect(within(palette).getByRole("group", { name: "Needs attention" })).toBeTruthy();
    expect(within(palette).getByRole("group", { name: "Currently active" })).toBeTruthy();
    expect(within(palette).getByRole("group", { name: "Pinned" })).toBeTruthy();
    expect(within(palette).getAllByRole("option")).toHaveLength(3);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(slot.queryByTestId("activity-palette")).toBeNull());
  });
});
