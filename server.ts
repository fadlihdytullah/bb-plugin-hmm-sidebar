import { randomUUID } from "node:crypto";
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { rpcContract, type Collection } from "./contract";

export { rpcContract } from "./contract";
export type { Collection } from "./contract";

const COLLECTIONS_CHANGED = "collections-changed";

interface CollectionRow {
  id: string;
  name: string;
  position: number;
}

interface CollectionProjectRow {
  collection_id: string;
  project_id: string;
  position: number;
}

type ThreadRow = Awaited<ReturnType<BbPluginApi["sdk"]["threads"]["list"]>>[number];

const THREAD_PAGE_SIZE = 500;

function hasActiveThreadWork(thread: ThreadRow): boolean {
  const activity = thread.activity;
  return (
    thread.status !== "idle" ||
    thread.runtime.displayStatus !== "idle" ||
    thread.hasPendingInteraction ||
    thread.queuedWork !== "none" ||
    activity.activeBackgroundAgentCount > 0 ||
    activity.activeBackgroundCommandCount > 0 ||
    activity.activeGoalCount > 0 ||
    activity.activePlanModeCount > 0 ||
    activity.activeWorkflowCount > 0
  );
}

function threadDepth(thread: ThreadRow, byId: ReadonlyMap<string, ThreadRow>): number {
  let depth = 0;
  let parentId = thread.parentThreadId;
  const seen = new Set([thread.id]);
  while (parentId !== null && !seen.has(parentId)) {
    seen.add(parentId);
    depth += 1;
    parentId = byId.get(parentId)?.parentThreadId ?? null;
  }
  return depth;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function assertCollectionName(name: string): string {
  const normalized = normalizeName(name);
  if (normalized.length === 0) {
    throw new Error("Collection name cannot be empty");
  }
  if (normalized.length > 120) {
    throw new Error("Collection name cannot exceed 120 characters");
  }
  return normalized;
}

export default async function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, [
    `CREATE TABLE IF NOT EXISTS collections (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       position INTEGER NOT NULL
     )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS collections_name_unique
       ON collections (lower(name))`,
    `CREATE TABLE IF NOT EXISTS collection_projects (
       collection_id TEXT NOT NULL,
       project_id TEXT NOT NULL UNIQUE,
       position INTEGER NOT NULL,
       PRIMARY KEY (collection_id, project_id),
       FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
     )`,
    `CREATE INDEX IF NOT EXISTS collection_projects_order
       ON collection_projects (collection_id, position)`,
  ]);
  db.pragma("foreign_keys = ON");

  const readCollections = (): Collection[] => {
    const rows = db
      .prepare(
        "SELECT id, name, position FROM collections ORDER BY position ASC, id ASC",
      )
      .all() as CollectionRow[];
    const projectRows = db
      .prepare(
        "SELECT collection_id, project_id, position FROM collection_projects ORDER BY collection_id, position ASC, project_id ASC",
      )
      .all() as CollectionProjectRow[];
    const projectIdsByCollection = new Map<string, string[]>();
    for (const row of projectRows) {
      const projectIds = projectIdsByCollection.get(row.collection_id) ?? [];
      projectIds.push(row.project_id);
      projectIdsByCollection.set(row.collection_id, projectIds);
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      projectIds: projectIdsByCollection.get(row.id) ?? [],
    }));
  };

  const collectionById = (collectionId: string): Collection => {
    const collection = readCollections().find((candidate) => candidate.id === collectionId);
    if (collection === undefined) {
      throw new Error("Collection not found");
    }
    return collection;
  };

  const assertUniqueName = (name: string, exceptId?: string): void => {
    const existing = db
      .prepare(
        "SELECT id FROM collections WHERE lower(name) = lower(?) AND (? IS NULL OR id <> ?)",
      )
      .get(name, exceptId ?? null, exceptId ?? null) as { id: string } | undefined;
    if (existing !== undefined) {
      throw new Error("A collection with that name already exists");
    }
  };

  const projectById = async (projectId: string) => {
    const projects = await bb.sdk.projects.list({ includePersonal: true });
    const project = projects.find((candidate) => candidate.id === projectId);
    if (project === undefined) {
      throw new Error("Project not found");
    }
    return project;
  };

  const assertAssignableProject = async (projectId: string): Promise<void> => {
    const project = await projectById(projectId);
    if (project.kind === "personal") {
      throw new Error("The Threads project cannot be placed in a collection");
    }
  };

  const publishChanged = (): void => {
    bb.realtime.publish(COLLECTIONS_CHANGED, { at: Date.now() });
  };

  const createCollection = (rawName: string): Collection => {
    const name = assertCollectionName(rawName);
    assertUniqueName(name);
    const maxPosition = db
      .prepare("SELECT MAX(position) AS position FROM collections")
      .get() as { position: number | null };
    const collection: Collection = {
      id: randomUUID(),
      name,
      position: (maxPosition.position ?? -1) + 1,
      projectIds: [],
    };
    db.prepare("INSERT INTO collections (id, name, position) VALUES (?, ?, ?)").run(
      collection.id,
      collection.name,
      collection.position,
    );
    publishChanged();
    return collection;
  };

  const renameCollection = (collectionId: string, rawName: string): Collection => {
    const name = assertCollectionName(rawName);
    collectionById(collectionId);
    assertUniqueName(name, collectionId);
    db.prepare("UPDATE collections SET name = ? WHERE id = ?").run(name, collectionId);
    publishChanged();
    return collectionById(collectionId);
  };

  const deleteCollection = (collectionId: string): boolean => {
    collectionById(collectionId);
    const result = db.prepare("DELETE FROM collections WHERE id = ?").run(collectionId);
    if (result.changes === 0) {
      return false;
    }
    const remaining = readCollections();
    const reorder = db.transaction(() => {
      remaining.forEach((collection, index) => {
        db.prepare("UPDATE collections SET position = ? WHERE id = ?").run(index, collection.id);
      });
    });
    reorder();
    publishChanged();
    return true;
  };

  const reorderCollections = (collectionIds: readonly string[]): void => {
    const existing = readCollections();
    const existingIds = new Set(existing.map((collection) => collection.id));
    const requested = collectionIds.filter((id) => existingIds.has(id));
    const requestedIds = new Set(requested);
    const ordered = [
      ...requested,
      ...existing.filter((collection) => !requestedIds.has(collection.id)).map((collection) => collection.id),
    ];
    const reorder = db.transaction(() => {
      ordered.forEach((id, index) => {
        db.prepare("UPDATE collections SET position = ? WHERE id = ?").run(index, id);
      });
    });
    reorder();
    publishChanged();
  };

  const moveProject = async (
    projectId: string,
    targetCollectionId: string | null,
    requestedPosition: number,
  ): Promise<void> => {
    await assertAssignableProject(projectId);
    if (targetCollectionId !== null) {
      collectionById(targetCollectionId);
    }
    const move = db.transaction(() => {
      db.prepare("DELETE FROM collection_projects WHERE project_id = ?").run(projectId);
      if (targetCollectionId === null) {
        return;
      }
      const targetProjects = db
        .prepare(
          "SELECT project_id FROM collection_projects WHERE collection_id = ? ORDER BY position ASC, project_id ASC",
        )
        .all(targetCollectionId) as Array<{ project_id: string }>;
      const position = Math.min(requestedPosition, targetProjects.length);
      targetProjects.splice(position, 0, { project_id: projectId });
      targetProjects.forEach((row, index) => {
        db.prepare(
          "INSERT INTO collection_projects (collection_id, project_id, position) VALUES (?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET collection_id = excluded.collection_id, position = excluded.position",
        ).run(targetCollectionId, row.project_id, index);
      });
    });
    move();
    publishChanged();
  };

  const reorderProjects = async (
    collectionId: string,
    projectIds: readonly string[],
  ): Promise<void> => {
    collectionById(collectionId);
    for (const projectId of projectIds) {
      await assertAssignableProject(projectId);
    }
    const current = db
      .prepare(
        "SELECT project_id FROM collection_projects WHERE collection_id = ? ORDER BY position ASC, project_id ASC",
      )
      .all(collectionId) as Array<{ project_id: string }>;
    const currentIds = new Set(current.map((row) => row.project_id));
    const requested = projectIds.filter((id) => currentIds.has(id));
    const requestedIds = new Set(requested);
    const ordered = [
      ...requested,
      ...current.filter((row) => !requestedIds.has(row.project_id)).map((row) => row.project_id),
    ];
    const reorder = db.transaction(() => {
      ordered.forEach((id, index) => {
        db.prepare(
          "UPDATE collection_projects SET position = ? WHERE collection_id = ? AND project_id = ?",
        ).run(index, collectionId, id);
      });
    });
    reorder();
    publishChanged();
  };

  const clearProjectThreads = async (
    projectId: string,
  ): Promise<{ deletedCount: number; preservedCount: number }> => {
    await projectById(projectId);

    const rows: ThreadRow[] = [];
    for (const archived of [false, true]) {
      for (let offset = 0; ; offset += THREAD_PAGE_SIZE) {
        const page = await bb.sdk.threads.list({
          archived,
          includeHidden: false,
          limit: THREAD_PAGE_SIZE,
          offset,
          projectId,
        });
        rows.push(...page);
        if (page.length < THREAD_PAGE_SIZE) break;
      }
    }

    const uniqueRows = [...new Map(rows.map((thread) => [thread.id, thread])).values()];
    const byId = new Map(uniqueRows.map((thread) => [thread.id, thread]));
    const candidates = uniqueRows
      .filter((thread) => !hasActiveThreadWork(thread))
      .sort(
        (left, right) =>
          threadDepth(right, byId) - threadDepth(left, byId) ||
          left.id.localeCompare(right.id),
    );

    let deletedCount = 0;
    let preservedCount = uniqueRows.length - candidates.length;
    for (const candidate of candidates) {
      let current: Awaited<ReturnType<BbPluginApi["sdk"]["threads"]["get"]>>;
      try {
        current = await bb.sdk.threads.get({ threadId: candidate.id });
      } catch (cause) {
        preservedCount += 1;
        bb.log.debug(`clear threads lookup skipped for ${candidate.id}: ${String(cause)}`);
        continue;
      }
      if (
        current.deletedAt !== null ||
        current.projectId !== projectId ||
        current.visibility !== "visible" ||
        current.status !== "idle" ||
        current.runtime.displayStatus !== "idle" ||
        current.activeBackgroundAgentCount > 0 ||
        current.queuedMessageCount > 0
      ) {
        preservedCount += 1;
        continue;
      }
      let pendingInteractions: Awaited<
        ReturnType<typeof bb.sdk.threads.interactions.list>
      >;
      try {
        pendingInteractions = await bb.sdk.threads.interactions.list({
          threadId: candidate.id,
        });
      } catch (cause) {
        preservedCount += 1;
        bb.log.debug(`clear threads attention lookup skipped for ${candidate.id}: ${String(cause)}`);
        continue;
      }
      if (pendingInteractions.length > 0) {
        preservedCount += 1;
        continue;
      }
      try {
        await bb.sdk.threads.delete({
          threadId: candidate.id,
          childThreadsConfirmed: false,
        });
        deletedCount += 1;
      } catch (cause) {
        preservedCount += 1;
        bb.log.debug(`clear threads deletion skipped for ${candidate.id}: ${String(cause)}`);
      }
    }

    return { deletedCount, preservedCount };
  };

  const clearPersonalThreads = async (): Promise<{
    deletedCount: number;
    preservedCount: number;
  }> => {
    const projects = await bb.sdk.projects.list({ includePersonal: true });
    const personalProject = projects.find((project) => project.kind === "personal");
    if (personalProject === undefined) {
      throw new Error("The Threads project was not found");
    }
    return clearProjectThreads(personalProject.id);
  };

  bb.rpc.register(rpcContract, {
    collections_list: () => ({ collections: readCollections() }),
    collections_create: ({ name }) => createCollection(name),
    collections_rename: ({ collectionId, name }) => renameCollection(collectionId, name),
    collections_delete: ({ collectionId }) => ({ deleted: deleteCollection(collectionId) }),
    collections_reorder: ({ collectionIds }) => {
      reorderCollections(collectionIds);
      return { ok: true as const };
    },
    projects_move: async ({ projectId, collectionId, position }) => {
      await moveProject(projectId, collectionId, position);
      return { ok: true as const };
    },
    projects_rename: async ({ projectId, name }) => {
      await assertAssignableProject(projectId);
      await bb.sdk.projects.update({ projectId, name });
      return { ok: true as const };
    },
    projects_delete: async ({ projectId }) => {
      await assertAssignableProject(projectId);
      await bb.sdk.projects.delete({ projectId });
      db.prepare("DELETE FROM collection_projects WHERE project_id = ?").run(projectId);
      publishChanged();
      return { deleted: true as const };
    },
    projects_clear_threads: ({ projectId }) => clearProjectThreads(projectId),
    chats_clear: () => clearPersonalThreads(),
    projects_reorder: async ({ collectionId, projectIds }) => {
      await reorderProjects(collectionId, projectIds);
      return { ok: true as const };
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
