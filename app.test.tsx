// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { setExpandedProject } from "@/hooks/use-expanded-project";
import { setSidebarMode } from "@/hooks/use-sidebar-mode";
import type {
  PluginCommandRegistration,
  PluginSidebarThread,
  PluginThreadActionEntry,
} from "@get-bb/plugin-sdk/app";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PROJECT_DRAG_TYPE = "application/x-bb-collections-project";

const app = await loadPluginApp(() => import("./app"));
const threadList = app.threadLists[0]!;
const activityPalette = app.appOverlays[0]!;
const splitThreadComposer = app.appOverlays[1]!;

function threadActionEntry(
  id: string,
  run: () => Promise<void> = async () => {},
  overrides: Partial<PluginThreadActionEntry["action"]> = {},
): PluginThreadActionEntry {
  return {
    key: `bb--core/${id}`,
    pluginId: "bb--core",
    group: "4_lifecycle",
    action: { label: id, icon: "Trash2", run, ...overrides },
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
  setExpandedProject(null);
  setSidebarMode("code");
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("Hmm Sidebar app", () => {
  it("registers an app-wide Activity palette", () => {
    expect(app.appOverlays).toHaveLength(5);
    expect(activityPalette.id).toBe("activity-palette");
  });

  it("deletes the current thread through bb's confirmation via Mod+Shift+Backspace", async () => {
    const { commandPaletteActions } = app as unknown as {
      commandPaletteActions: PluginCommandRegistration[];
    };
    const command = commandPaletteActions.find(
      (entry) => entry.id === "delete-current-thread",
    )!;
    expect(command.defaultShortcut).toMatchObject({ key: "Backspace", mod: true, shift: true });
    const context = { projectId: null, openPanel: () => false };
    expect(command.isAvailable?.({ ...context, threadId: null })).toBe(false);

    const run = vi.fn(async () => {});
    renderSlot(app.appOverlays[2]!, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("thread-1", "project-1")],
        projects: [],
      },
      threadActions: () => [threadActionEntry("delete", run, { variant: "destructive" })],
    });
    command.run({ ...context, threadId: "thread-1" });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  });

  it.each([
    { focused: "thread-2", runs: 1 },
    { focused: null, runs: 0 },
  ])("deletes only the focused split pane's thread ($focused)", async ({ focused, runs }) => {
    const { commandPaletteActions } = app as unknown as {
      commandPaletteActions: PluginCommandRegistration[];
    };
    const command = commandPaletteActions.find(
      (entry) => entry.id === "delete-current-thread",
    )!;
    const rect = { x: 0, y: 0, width: 0.5, height: 1 };
    const deleted: string[] = [];
    renderSlot(app.appOverlays[2]!, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("thread-1", "project-1"), thread("thread-2", "project-1")],
        projects: [],
      },
      threadActions: (target) => [
        threadActionEntry("delete", async () => {
          deleted.push(target.id);
        }),
      ],
      sidebarSplitLayout: {
        panes: [
          { paneId: "a", rect, threadId: "thread-1", isFocused: false },
          { paneId: "b", rect, threadId: focused, isFocused: true },
        ],
      },
    });

    command.run({ projectId: null, openPanel: () => false, threadId: "thread-1" });
    await waitFor(() => expect(deleted).toHaveLength(runs));
    expect(deleted).toEqual(runs === 0 ? [] : ["thread-2"]);
  });

  it("deletes the row's own thread even while a split pane is focused", async () => {
    const rect = { x: 0, y: 0, width: 0.5, height: 1 };
    const deleted: string[] = [];
    renderSlot(app.appOverlays[2]!, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("thread-1", "project-1"), thread("thread-2", "project-1")],
        projects: [],
      },
      threadActions: (target) => [
        threadActionEntry("delete", async () => {
          deleted.push(target.id);
        }),
      ],
      sidebarSplitLayout: {
        panes: [
          { paneId: "a", rect, threadId: "thread-1", isFocused: false },
          { paneId: "b", rect, threadId: "thread-2", isFocused: true },
        ],
      },
    });

    window.dispatchEvent(
      new CustomEvent("hmm-sidebar:delete-thread", { detail: "thread-1" }),
    );
    await waitFor(() => expect(deleted).toEqual(["thread-1"]));
  });

  it.each([
    { known: true, opens: 1 },
    { known: false, opens: 0 },
  ])(
    "opens the spawned thread in a split once the sidebar knows it ($known)",
    async ({ known, opens }) => {
      const slot = renderSlot(splitThreadComposer, {}, {
        context: { projectId: "project-1" },
        sidebarThreads: {
          status: "ready",
          threads: known ? [thread("thread-new", "project-1")] : [],
          projects: [],
        },
        rpc: {
          threads_spawn: () => ({ threadId: "thread-new" }),
        },
      });

      window.dispatchEvent(new CustomEvent("hmm-sidebar:new-thread-split"));
      const composer = await slot.findByTestId("bb-new-thread-composer");
      expect(composer.dataset.defaultProjectId).toBe("project-1");
      fireEvent.click(slot.getByTestId("bb-new-thread-composer-submit"));

      await waitFor(() =>
        expect(slot.queryByTestId("bb-new-thread-composer")).toBeNull(),
      );
      expect(slot.inspection.rpcCalls[0]?.method).toBe("threads_spawn");
      expect(
        slot.inspection.navigateCalls.filter((call) => call.method === "toThread"),
      ).toEqual(
        opens === 0
          ? []
          : [{ method: "toThread", threadId: "thread-new", options: { split: true } }],
      );
    },
  );

  it("positions Activity at the top center of the chat container", async () => {
    const chatContainer = document.createElement("main");
    chatContainer.dataset.sidebar = "inset";
    document.body.append(chatContainer);

    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
    });

    expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeNull();

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    await waitFor(() =>
      expect(chatContainer.querySelector('[data-testid="activity-palette"]')).toBeTruthy(),
    );
    expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeTruthy();
    const paletteElement = chatContainer.querySelector<HTMLElement>(
      '[data-testid="activity-palette"]',
    );
    expect(paletteElement?.className).toContain("!top-[15%]");
    expect(paletteElement?.className).toContain("!translate-y-0");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(chatContainer.querySelector("[data-bb-plugin-root]")).toBeNull(),
    );

    slot.unmount();
    chatContainer.remove();
  });

  it("falls back to an in-list view toggle without bb's header row", async () => {
    const slot = renderSlot(threadList, listProps, {
      rpc: { collections_list: () => ({ collections: [] }) },
    });
    const header = await slot.findByTestId("sidebar-brand");
    const actions = within(header).getByLabelText("Sidebar actions");

    expect(app.contentScripts).toHaveLength(0);
    expect(within(header).queryByRole("img", { name: "suikodev" })).toBeNull();
    expect(within(actions).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Chat threads",
      "Project threads",
    ]);
  });

  it("portals the view toggle next to bb's New thread button", async () => {
    const hostSlot = document.createElement("div");
    hostSlot.dataset.testid = "sidebar-header-slot";
    document.body.append(hostSlot);

    const slot = renderSlot(threadList, listProps, {
      rpc: { collections_list: () => ({ collections: [] }) },
    });
    const toggle = await within(hostSlot).findByRole("button", { name: "Chat threads" });

    expect(slot.queryByTestId("sidebar-brand")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    slot.unmount();
    hostSlot.remove();
  });

  it("filters threads in the current view by title or project", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          thread("Build API", "project-1"),
          thread("Write docs", "project-2"),
          thread("API chat", "threads"),
        ],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" },
          { id: "project-2", name: "Handbook", isPersonal: false, href: "", settingsHref: "" },
          { id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
        ],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const filter = await slot.findByRole("searchbox", { name: "Filter threads" });
    fireEvent.change(filter, { target: { value: "api" } });
    const results = () => within(slot.getByRole("list", { name: "Filtered threads" }));
    expect(results().getByText("Build API")).toBeTruthy();
    expect(results().queryByText("API chat")).toBeNull();
    expect(slot.queryByText("Collections")).toBeNull();

    fireEvent.change(filter, { target: { value: "handbook" } });
    expect(results().getByText("Write docs")).toBeTruthy();

    fireEvent.change(filter, { target: { value: "missing" } });
    expect(slot.getByRole("status").textContent).toBe("No threads match this filter");

    fireEvent.keyDown(filter, { key: "Escape" });
    expect(slot.getByText("Collections")).toBeTruthy();
  });

  it("registers no sidebar navigation slot", () => {
    expect(Object.keys(app)).not.toContain("experimentalSidebarNavigations");
  });

  it("registers New thread in split as a thread menu action", () => {
    const action = app.threadActions.find((entry) => entry.id === "new-thread-split")!;
    const requests = vi.fn();
    window.addEventListener("hmm-sidebar:new-thread-split", requests);
    const item = action.item({
      thread: {} as never,
      data: undefined,
      sdk: {} as never,
      navigate: {} as never,
    })!;
    expect(item.label).toBe("New thread in split");
    void item.run({ requestRename: () => {} });
    expect(requests).toHaveBeenCalledTimes(1);
    window.removeEventListener("hmm-sidebar:new-thread-split", requests);
  });

  it("lists threads that need the user above collections", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Fresh reply", "project-1"), isUnread: true },
          { ...thread("Waiting reply", "project-1"), indicator: "waiting-for-input" as const },
          thread("Read thread", "project-1"),
        ],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const needsYou = await slot.findByRole("list", { name: "Needs you" });
    expect(within(needsYou).getByText("Fresh reply")).toBeTruthy();
    expect(within(needsYou).getByText("Waiting reply")).toBeTruthy();
    expect(within(needsYou).queryByText("Read thread")).toBeNull();
    expect(
      needsYou.querySelector("[data-sidebar-thread-shortcut-target]"),
    ).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Collapse threads that need you" }));
    expect(slot.queryByRole("list", { name: "Needs you" })).toBeNull();
  });

  it("hides Needs you when nothing needs the user", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Read thread", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    await slot.findByText("Engineering");
    expect(slot.queryByRole("list", { name: "Needs you" })).toBeNull();
  });

  it("limits collection projects to five, keeping projects with highlighted threads", async () => {
    const ids = [1, 2, 3, 4, 5, 6, 7].map((n) => `p${n}`);
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Running", "p7")],
        projects: ids.map((id) => ({ id, name: `Project ${id}`, isPersonal: false, href: "", settingsHref: "" })),
      },
      rpc: {
        collections_list: () => ({
          collections: [{ id: "c1", name: "Work", position: 0, projectIds: ids }],
        }),
      },
    });

    await slot.findByText("Work");
    const names = () => slot.getAllByTestId("project-name").map((node) => node.textContent);
    expect(names()).toEqual(["Project p1", "Project p2", "Project p3", "Project p4", "Project p5", "Project p7"]);

    fireEvent.click(slot.getByRole("button", { name: "Show 1 more" }));
    expect(names()).toHaveLength(7);
    fireEvent.click(slot.getByRole("button", { name: "Show less" }));
    expect(names()).toHaveLength(6);
  });

  it("registers one replacement list and renders collections above projects", async () => {
    expect(app.threadLists).toHaveLength(1);
    expect(threadList.id).toBe("collections");

    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Build API" }, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1"), thread("Personal note", "threads")],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" },
          { id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
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
    expect(slot.queryByText("Personal note")).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Chat threads" }));
    expect(slot.queryByText("Work")).toBeNull();
    expect(
      within(slot.getByRole("list", { name: "Chats" })).getByText("Personal note"),
    ).toBeTruthy();
    expect(slot.queryByRole("button", { name: "Actions for Threads" })).toBeNull();
  });

  it("mutes idle threads and highlights active or attention threads", async () => {
    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Current" }, {
      sidebarThreads: {
        status: "ready",
        threads: [
          thread("Idle", "threads"),
          thread("Current", "threads"),
          { ...thread("Waiting", "threads"), hasPendingInteraction: true },
          runningThread("Running", "threads"),
        ],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const chats = await slot.findByRole("list", { name: "Chats" });
    const link = (name: string) => within(chats).getByText(name).closest("a")!.className;
    expect(link("Idle")).toContain("text-muted-foreground");
    expect(link("Current")).toContain("text-sidebar-accent-foreground");
    expect(link("Waiting")).not.toContain("text-muted-foreground");
    expect(link("Running")).not.toContain("text-muted-foreground");
  });

  it("shimmers only running threads that are not waiting on the user", async () => {
    setSidebarMode("chat");
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          thread("Idle", "threads"),
          runningThread("Running", "threads"),
          { ...runningThread("Blocked", "threads"), hasPendingInteraction: true },
          {
            ...thread("Agents", "threads"),
            activity: { ...thread("Agents", "threads").activity, backgroundAgents: 1 },
          },
        ],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const chats = await slot.findByRole("list", { name: "Chats" });
    const shimmers = (name: string) =>
      within(chats).getByText(name).classList.contains("hmm-title-shimmer");
    expect(shimmers("Idle")).toBe(false);
    expect(shimmers("Running")).toBe(true);
    expect(shimmers("Blocked")).toBe(false);
    expect(shimmers("Agents")).toBe(true);
  });

  it("limits chats to five with a toggle, keeping highlighted threads visible", async () => {
    setSidebarMode("chat");
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ ...thread(`Chat ${n}`, "threads"), updatedAt: 10 - n })),
          { ...runningThread("Running chat", "threads"), updatedAt: 0 },
        ],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const chats = await slot.findByRole("list", { name: "Chats" });
    const titles = () => within(chats).getAllByRole("link").map((node) => node.textContent);
    expect(titles()).toEqual(["Chat 1", "Chat 2", "Chat 3", "Chat 4", "Chat 5", "Running chat"]);

    fireEvent.click(slot.getByRole("button", { name: "Show 2 more" }));
    expect(titles()).toHaveLength(8);

    fireEvent.click(slot.getByRole("button", { name: "Show less" }));
    expect(titles()).toHaveLength(6);
  });

  it("collapses, sorts and filters the flat chats list", async () => {
    setSidebarMode("chat");
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Older chat", "threads"), updatedAt: 1 },
          { ...thread("Newer chat", "threads"), updatedAt: 5, isUnread: true },
        ],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    await slot.findByRole("list", { name: "Chats" });
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
    setSidebarMode("chat");
    const clearChats = vi.fn(() => ({ deletedCount: 2, preservedCount: 1 }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Personal note", "threads")],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
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

  it("bulk deletes only the selected personal chats", async () => {
    setSidebarMode("chat");
    const clearChats = vi.fn(() => ({ deletedCount: 1, preservedCount: 0 }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Note A", "threads"), thread("Note B", "threads")],
        projects: [{ id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
        chats_clear: clearChats,
      },
    });

    await slot.findByText("Note A");
    fireEvent.click(slot.getByRole("button", { name: "Clear chats" }));
    const dialog = await slot.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Bulk deletions" }));
    const list = within(dialog).getByRole("list", { name: "Chats to delete" });
    const submit = within(dialog).getByRole("button", { name: "Delete 0 selected" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Select all/ }));
    fireEvent.click(within(list).getByRole("checkbox", { name: "Note A" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete 1 selected" }));
    await waitFor(() =>
      expect(clearChats).toHaveBeenCalledWith({ threadIds: ["Note B"] }),
    );
  });

  it("groups only loose non-personal projects under the Projects header", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [
          { id: "z-project", name: "Zulu", isPersonal: false, href: "", settingsHref: "" },
          { id: "a-project", name: "Alpha", isPersonal: false, href: "", settingsHref: "" },
          { id: "personal", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
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

  it("toggles a project when its name is clicked", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Project chat", "alpha")],
        projects: [{ id: "alpha", name: "Alpha", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    const projects = await slot.findByRole("list", { name: "Projects" });
    expect(within(projects).queryByText("Project chat")).toBeNull();
    fireEvent.click(within(projects).getByText("Alpha"));
    expect(within(projects).getByText("Project chat")).toBeTruthy();
    fireEvent.click(within(projects).getByText("Alpha"));
    expect(within(projects).queryByText("Project chat")).toBeNull();
    expect(slot.getByRole("button", { name: "Expand Alpha" })).toBeTruthy();
  });

  it("follows the open thread into its sidebar view", async () => {
    const data = {
      sidebarThreads: {
        status: "ready" as const,
        threads: [thread("Build API", "project-1"), thread("Personal note", "threads")],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" },
          { id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
        ],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    };
    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Personal note" }, data);

    await slot.findByRole("list", { name: "Chats" });
    expect(slot.getByRole("button", { name: "Chat threads" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(slot.getByRole("button", { name: "Project threads" }));
    expect(slot.queryByRole("list", { name: "Chats" })).toBeNull();
  });

  it("keeps only one project expanded at a time", async () => {
    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Alpha chat" }, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Alpha chat", "alpha"), thread("Beta chat", "beta")],
        projects: [
          { id: "alpha", name: "Alpha", isPersonal: false, href: "", settingsHref: "" },
          { id: "beta", name: "Beta", isPersonal: false, href: "", settingsHref: "" },
        ],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    await slot.findByText("Alpha chat");
    expect(slot.queryByText("Beta chat")).toBeNull();
    fireEvent.click(slot.getByRole("button", { name: "Expand Beta" }));
    expect(slot.getByText("Beta chat")).toBeTruthy();
    expect(slot.queryByText("Alpha chat")).toBeNull();
  });

  it("sorts and filters the untitled project group", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Active project chat", "with-chat")],
        projects: [
          { id: "with-chat", name: "With chat", isPersonal: false, href: "", settingsHref: "" },
          { id: "without-chat", name: "Without chat", isPersonal: false, href: "", settingsHref: "" },
        ],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    await slot.findByText("With chat");
    expect(slot.queryByText("Projects")).toBeNull();

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
    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Build API" }, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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
    expect(slot.inspection.navigateCalls).toContainEqual({
      method: "toThread",
      threadId: "Build API",
      options: { split: false },
    });

    fireEvent.click(slot.getByRole("button", { name: "Collapse Work" }));
    expect(slot.queryByText("Build API")).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Expand Work" }));
    expect(slot.getByText("Engineering")).toBeTruthy();
    expect(slot.getByText("Build API")).toBeTruthy();
  });

  it("collapses and expands all collections from the Collections header", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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
    fireEvent.click(slot.getByRole("button", { name: "Collapse all collections" }));
    expect(slot.queryByText("Work")).toBeNull();
    expect(slot.queryByRole("list", { name: "Collections" })).toBeNull();

    fireEvent.click(slot.getByRole("button", { name: "Show all collections" }));
    expect(slot.getByText("Work")).toBeTruthy();
    expect(slot.getByText("Engineering")).toBeTruthy();
  });

  it("shows bb's own thread menu on each row and requests delete itself", async () => {
    const pin = vi.fn(async () => {});
    const slot = renderSlot(threadList, { ...listProps, activeThreadId: "Build API" }, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
      threadActions: () => [
        threadActionEntry("pin", pin, { label: "Pin thread", icon: "Pin" }),
        threadActionEntry("mute", async () => {}, { label: "Mute notifications", icon: "BellOff" }),
      ],
    });

    await slot.findByText("Build API");
    const deleteRequests = vi.fn();
    window.addEventListener("hmm-sidebar:delete-thread", deleteRequests);
    const deleteButton = slot.getByRole("button", { name: "Delete Build API" });
    expect(deleteButton.className).toContain("group-hover/thread:opacity-100");
    fireEvent.click(deleteButton);
    expect(deleteRequests).toHaveBeenCalledTimes(1);
    expect((deleteRequests.mock.calls[0]![0] as CustomEvent<string>).detail).toBe("Build API");
    window.removeEventListener("hmm-sidebar:delete-thread", deleteRequests);

    fireEvent.click(slot.getByRole("button", { name: "Actions for Build API" }));
    expect(await slot.findByRole("menuitem", { name: /Mute notifications/ })).toBeTruthy();
    fireEvent.click(slot.getByRole("menuitem", { name: /Pin thread/ }));
    await waitFor(() => expect(pin).toHaveBeenCalledTimes(1));
  });

  it("keeps only pin, rename, clear, and delete in the project action menu", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
      },
    });

    await slot.findByRole("button", { name: "Actions for Engineering" });
    fireEvent.click(slot.getByRole("button", { name: "Actions for Engineering" }));
    expect(within(slot.getByRole("menu", { name: "Actions for Engineering" })).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Pin project",
      "Rename project",
      "Clear threads",
      "Delete project",
    ]);
    expect(slot.queryByRole("menuitem", { name: /Move to|Remove from collection/ })).toBeNull();

    fireEvent.click(slot.getByRole("menuitem", { name: "Pin project" }));
    const pinned = await slot.findByRole("list", { name: "Pinned projects" });
    expect(within(pinned).getByText("Engineering")).toBeTruthy();
  });

  it("bulk deletes only the selected project threads", async () => {
    const clearThreads = vi.fn(() => ({ deletedCount: 1, preservedCount: 0 }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [thread("Task A", "project-1"), thread("Task B", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: {
        collections_list: () => ({ collections: [] }),
        projects_clear_threads: clearThreads,
      },
    });

    fireEvent.click(await slot.findByRole("button", { name: "Actions for Engineering" }));
    fireEvent.click(slot.getByRole("menuitem", { name: "Clear threads" }));
    const dialog = await slot.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Bulk deletions" }));
    const list = within(dialog).getByRole("list", { name: "Threads to delete" });
    const submit = within(dialog).getByRole("button", { name: "Delete 0 selected" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(list).getByRole("checkbox", { name: "Task B" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete 1 selected" }));
    await waitFor(() =>
      expect(clearThreads).toHaveBeenCalledWith({
        projectId: "project-1",
        threadIds: ["Task B"],
      }),
    );
  });

  it("renames, clears, and deletes a project from its action menu", async () => {
    const renameProject = vi.fn(() => ({ ok: true as const }));
    const clearThreads = vi.fn(() => ({ deletedCount: 2, preservedCount: 1 }));
    const deleteProject = vi.fn(() => ({ deleted: true as const }));
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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

  it("removes the Activity panel and keeps running threads out of Needs you", async () => {
    const slot = renderSlot(threadList, listProps, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
      rpc: { collections_list: () => ({ collections: [] }) },
    });

    await slot.findByText("Engineering");
    expect(slot.queryByRole("region", { name: "Sidebar activity" })).toBeNull();
    expect(slot.queryByRole("list", { name: "Needs you" })).toBeNull();
  });
  it("opens Activity with Cmd+E and searches by title or project", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1"), thread("Personal note", "threads")],
        projects: [
          { id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" },
          { id: "threads", name: "Threads", isPersonal: true, href: "", settingsHref: "" },
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
    expect(slot.inspection.navigateCalls).toContainEqual({
      method: "toThread",
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
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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

    expect(slot.inspection.navigateCalls).toContainEqual({
      method: "toThread",
      threadId: "Build API",
      options: { split: true },
    });
  });

  it("opens an Activity row in a split from its hover button", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    fireEvent.click(within(palette).getByRole("button", { name: "Open Build API in split" }));

    expect(slot.inspection.navigateCalls).toContainEqual({
      method: "toThread",
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
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
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

  it("opens Activity from the sidebar Search request", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [runningThread("Build API", "project-1")],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
    });

    window.dispatchEvent(new CustomEvent("hmm-sidebar:open-activity-palette"));
    expect(await slot.findByTestId("activity-palette")).toBeTruthy();
  });

  it("filters Activity by unread, pinned, and running", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Unread note", "project-1"), isUnread: true },
          runningThread("Build API", "project-1"),
          { ...thread("Pinned note", "project-1"), isPinned: true },
        ],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    expect(within(palette).getAllByRole("option")).toHaveLength(3);

    fireEvent.click(within(palette).getByRole("button", { name: "Unread" }));
    expect(within(palette).getAllByRole("option")).toHaveLength(1);
    expect(within(palette).getByRole("option", { name: /Unread note/ })).toBeTruthy();

    fireEvent.click(within(palette).getByRole("button", { name: "Running" }));
    expect(within(palette).getByRole("option", { name: /Build API/ })).toBeTruthy();
    expect(within(palette).getAllByRole("option")).toHaveLength(1);

    fireEvent.click(within(palette).getByRole("button", { name: "Pinned" }));
    expect(within(palette).getByRole("option", { name: /Pinned note/ })).toBeTruthy();
    expect(within(palette).getAllByRole("option")).toHaveLength(1);
  });

  it("sorts Activity by name when asked", async () => {
    const slot = renderSlot(activityPalette, {}, {
      sidebarThreads: {
        status: "ready",
        threads: [
          { ...thread("Zulu", "project-1"), isUnread: true, latestAttentionAt: 9 },
          { ...thread("Alpha", "project-1"), isUnread: true, latestAttentionAt: 1 },
        ],
        projects: [{ id: "project-1", name: "Engineering", isPersonal: false, href: "", settingsHref: "" }],
      },
    });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    const palette = await slot.findByTestId("activity-palette");
    const titles = () =>
      within(palette)
        .getAllByRole("option")
        .map((option) => option.getAttribute("aria-label")?.split(",")[0]);
    expect(titles()).toEqual(["Zulu", "Alpha"]);

    fireEvent.click(within(palette).getByRole("button", { name: "Sort by name" }));
    expect(titles()).toEqual(["Alpha", "Zulu"]);
  });
});
