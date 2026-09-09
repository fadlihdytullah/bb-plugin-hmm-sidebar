import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server";

const hosts: Array<ReturnType<typeof createFakePluginHost>> = [];
const updateProject = vi.fn(async () => ({ ok: true }));
const deleteProject = vi.fn(async () => ({ ok: true }));

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
});
