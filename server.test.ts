import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import plugin from "./server";

const hosts: Array<ReturnType<typeof createFakePluginHost>> = [];
const updateProject = vi.fn(async () => ({ ok: true }));
const deleteProject = vi.fn(async () => ({ ok: true }));
const spawnThread = vi.fn(async () => ({ id: "thread-new" }));

type ThreadRow = Awaited<ReturnType<BbPluginApi["sdk"]["threads"]["list"]>>[number];

function threadRow(id: string, overrides: Partial<ThreadRow> = {}): ThreadRow {
  return {
    id,
    projectId: "project-1",
    title: id,
    titleFallback: null,
    parentThreadId: null,
    sectionId: null,
    sourceThreadId: null,
    originKind: null,
    originPluginId: null,
    providerId: "codex",
    hasPendingInteraction: false,
    activity: {
      activeBackgroundAgentCount: 0,
      activeBackgroundCommandCount: 0,
      activeGoalCount: 0,
      activePlanModeCount: 0,
      activeWorkflowCount: 0,
    },
    archivedAt: null,
    createdAt: 1,
    deletedAt: null,
    environmentId: null,
    environmentName: null,
    environmentBranchName: null,
    environmentHostId: null,
    environmentWorkspaceDisplayKind: "other",
    latestAttentionAt: 1,
    lastReadAt: 1,
    pinSortKey: null,
    pinnedAt: null,
    queuedWork: "none",
    runtime: {
      displayStatus: "idle",
      hostReconnectGraceExpiresAt: null,
    },
    status: "idle",
    updatedAt: 1,
    visibility: "visible",
    ...overrides,
  } as ThreadRow;
}

async function startHost() {
  const host = createFakePluginHost({
    pluginId: "hmm-sidebar",
    sdk: {
      projects: {
        list: async () => [
          { id: "project-1", kind: "standard" },
          { id: "project-2", kind: "standard" },
          { id: "threads", kind: "personal" },
        ],
        update: updateProject,
        delete: deleteProject,
      },
      threads: {
        spawn: spawnThread,
      },
    },
  });
  hosts.push(host);
  await plugin(host.bb);
  return host;
}

afterEach(async () => {
  await Promise.all(hosts.splice(0).map((host) => host.harness.lifecycle.dispose()));
  vi.clearAllMocks();
});

describe("Hmm Sidebar backend", () => {
  it("persists collections, membership, and ordering", async () => {
    const host = await startHost();
    const first = (await host.harness.behavior.callRpc("collections_create", {
      name: "Work",
    })) as { id: string };
    const second = (await host.harness.behavior.callRpc("collections_create", {
      name: "Personal projects",
    })) as { id: string };

    await host.harness.behavior.callRpc("projects_move", {
      projectId: "project-1",
      collectionId: first.id,
      position: 0,
    });
    await host.harness.behavior.callRpc("collections_reorder", {
      collectionIds: [second.id, first.id],
    });

    const result = (await host.harness.behavior.callRpc("collections_list", {})) as {
      collections: Array<{ id: string; name: string; projectIds: string[] }>;
    };
    expect(result.collections.map((collection) => collection.name)).toEqual([
      "Personal projects",
      "Work",
    ]);
    expect(result.collections.find((collection) => collection.id === first.id)?.projectIds).toEqual([
      "project-1",
    ]);
    expect(host.harness.inspection.realtimeSignals.at(-1)?.channel).toBe(
      "collections-changed",
    );
  });

  it("spawns a thread from a sanitized composer request", async () => {
    const host = await startHost();
    const result = await host.harness.behavior.callRpc("threads_spawn", {
      request: {
        projectId: "project-1",
        providerId: "codex",
        model: "gpt-5",
        reasoningLevel: "medium",
        permissionMode: "auto",
        environment: { type: "project-default" },
        input: [{ type: "text", text: "hello", mentions: [] }],
        parentThreadId: "ignored",
      },
    });

    expect(result).toEqual({ threadId: "thread-new" });
    expect(spawnThread).toHaveBeenCalledWith(
      expect.not.objectContaining({ parentThreadId: expect.anything() }),
    );
  });

  it("rejects duplicate names and the personal Threads project", async () => {
    const host = await startHost();
    const collection = (await host.harness.behavior.callRpc("collections_create", {
      name: "Work",
    })) as { id: string };

    await expect(
      host.harness.behavior.callRpc("collections_create", { name: " work " }),
    ).rejects.toThrow("already exists");
    await expect(
      host.harness.behavior.callRpc("projects_move", {
        projectId: "threads",
        collectionId: collection.id,
        position: 0,
      }),
    ).rejects.toThrow("Threads project");
  });

  it("returns projects to the flat list when a collection is deleted", async () => {
    const host = await startHost();
    const collection = (await host.harness.behavior.callRpc("collections_create", {
      name: "Work",
    })) as { id: string };
    await host.harness.behavior.callRpc("projects_move", {
      projectId: "project-2",
      collectionId: collection.id,
      position: 0,
    });
    await host.harness.behavior.callRpc("collections_delete", {
      collectionId: collection.id,
    });
    const result = (await host.harness.behavior.callRpc("collections_list", {})) as {
      collections: unknown[];
    };
    expect(result.collections).toEqual([]);
  });

  it("renames and deletes standard projects through the BB SDK", async () => {
    const host = await startHost();
    const collection = (await host.harness.behavior.callRpc("collections_create", {
      name: "Work",
    })) as { id: string };
    await host.harness.behavior.callRpc("projects_move", {
      projectId: "project-1",
      collectionId: collection.id,
      position: 0,
    });

    await host.harness.behavior.callRpc("projects_rename", {
      projectId: "project-1",
      name: "Platform",
    });
    await host.harness.behavior.callRpc("projects_delete", {
      projectId: "project-1",
    });

    expect(updateProject).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Platform",
    });
    expect(deleteProject).toHaveBeenCalledWith({ projectId: "project-1" });
    const result = (await host.harness.behavior.callRpc("collections_list", {})) as {
      collections: Array<{ projectIds: string[] }>;
    };
    expect(result.collections[0]?.projectIds).toEqual([]);
  });

  it("clears inactive threads while preserving live, attention, and error threads", async () => {
    const rows = new Map<string, ThreadRow>([
      ["idle", threadRow("idle")],
      ["archived", threadRow("archived", { archivedAt: 1 })],
      ["running", threadRow("running", { status: "active" })],
      ["attention", threadRow("attention", { hasPendingInteraction: true })],
      ["error", threadRow("error", { status: "error" })],
      [
        "activity",
        threadRow("activity", {
          activity: {
            activeBackgroundAgentCount: 1,
            activeBackgroundCommandCount: 0,
            activeGoalCount: 0,
            activePlanModeCount: 0,
            activeWorkflowCount: 0,
          },
        }),
      ],
      ["queued", threadRow("queued", { queuedWork: "waiting" })],
      ["parent", threadRow("parent")],
      ["child", threadRow("child", { parentThreadId: "parent" })],
      ["protected-parent", threadRow("protected-parent")],
      [
        "protected-child",
        threadRow("protected-child", {
          parentThreadId: "protected-parent",
          status: "error",
        }),
      ],
    ]);
    const deleteThread = vi.fn(async ({
      threadId,
      childThreadsConfirmed,
    }: {
      threadId: string;
      childThreadsConfirmed: boolean;
    }) => {
      if (!childThreadsConfirmed && [...rows.values()].some((row) => row.parentThreadId === threadId)) {
        throw new Error("Thread has children");
      }
      rows.delete(threadId);
      return { ok: true as const };
    });
    const listThreads = vi.fn(async ({
      archived,
    }: {
      archived?: boolean;
    } = {}) =>
      [...rows.values()].filter((row) => (row.archivedAt !== null) === archived),
    );
    const getThread = vi.fn(async ({ threadId }: { threadId: string }) => {
      const row = rows.get(threadId);
      if (row === undefined) throw new Error("Thread not found");
      return row;
    });
    const host = createFakePluginHost({
      pluginId: "hmm-sidebar",
      sdk: {
        projects: {
          list: async () => [
            { id: "project-1", kind: "standard" },
            { id: "threads", kind: "personal" },
          ],
          update: updateProject,
          delete: deleteProject,
        },
        threads: {
          list: listThreads,
          get: getThread,
          interactions: {
            list: async () => [],
          },
          delete: deleteThread,
        },
      },
    });
    hosts.push(host);
    await plugin(host.bb);

    const scoped = await host.harness.behavior.callRpc("projects_clear_threads", {
      projectId: "project-1",
      threadIds: ["running"],
    });
    expect(scoped).toEqual({ deletedCount: 0, preservedCount: 1 });
    expect(rows.has("running")).toBe(true);

    const result = (await host.harness.behavior.callRpc("projects_clear_threads", {
      projectId: "project-1",
    })) as { deletedCount: number; preservedCount: number };

    expect(result).toEqual({ deletedCount: 4, preservedCount: 7 });
    expect([...rows.keys()]).toEqual([
      "running",
      "attention",
      "error",
      "activity",
      "queued",
      "protected-parent",
      "protected-child",
    ]);
    expect(deleteThread).toHaveBeenCalledTimes(5);
    expect(deleteThread).toHaveBeenCalledWith(
      expect.objectContaining({ childThreadsConfirmed: false }),
    );
    expect(deleteThread.mock.calls.map(([args]) => args.threadId)).toContain("child");
    expect(deleteThread.mock.calls.map(([args]) => args.threadId)).toContain("parent");
    expect(deleteThread.mock.calls.map(([args]) => args.threadId)).toContain(
      "protected-parent",
    );
  });

  it("clears personal chats through the dedicated RPC", async () => {
    const rows = new Map<string, ThreadRow>([
      ["personal-idle", threadRow("personal-idle", { projectId: "threads" })],
      [
        "personal-running",
        threadRow("personal-running", { projectId: "threads", status: "active" }),
      ],
    ]);
    const deleteThread = vi.fn(async ({ threadId }: { threadId: string }) => {
      rows.delete(threadId);
      return { ok: true as const };
    });
    const listThreads = vi.fn(async ({
      projectId,
      archived,
    }: {
      projectId?: string;
      archived?: boolean;
    } = {}) =>
      [...rows.values()].filter(
        (row) => row.projectId === projectId && (row.archivedAt !== null) === archived,
      ),
    );
    const host = createFakePluginHost({
      pluginId: "hmm-sidebar",
      sdk: {
        projects: {
          list: async () => [{ id: "threads", kind: "personal" }],
          update: updateProject,
          delete: deleteProject,
        },
        threads: {
          list: listThreads,
          get: async ({ threadId }: { threadId: string }) => {
            const row = rows.get(threadId);
            if (row === undefined) throw new Error("Thread not found");
            return row;
          },
          interactions: { list: async () => [] },
          delete: deleteThread,
        },
      },
    });
    hosts.push(host);
    await plugin(host.bb);

    const scoped = await host.harness.behavior.callRpc("chats_clear", {
      threadIds: ["personal-running"],
    });
    expect(scoped).toEqual({ deletedCount: 0, preservedCount: 1 });
    expect(deleteThread).not.toHaveBeenCalled();

    const result = await host.harness.behavior.callRpc("chats_clear", {});

    expect(result).toEqual({ deletedCount: 1, preservedCount: 1 });
    expect(deleteThread).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "personal-idle" }),
    );
    expect(listThreads).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "threads" }),
    );
    expect(rows.has("personal-running")).toBe(true);
  });
});
