import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRealtimeConnectionState, useRpc } from "@get-bb/plugin-sdk/app";
import type { Collection } from "../contract";
import type { rpcContract } from "../contract";

const COLLECTIONS_CHANGED = "collections-changed";

export interface CollectionsState {
  collections: readonly Collection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<Collection>;
  rename: (collectionId: string, name: string) => Promise<Collection>;
  remove: (collectionId: string) => Promise<void>;
  reorderCollections: (collectionIds: readonly string[]) => Promise<void>;
  moveProject: (
    projectId: string,
    collectionId: string | null,
    position: number,
  ) => Promise<void>;
  reorderProjects: (
    collectionId: string,
    projectIds: readonly string[],
  ) => Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useCollections(): CollectionsState {
  const rpc = useRpc<typeof rpcContract>();
  const connectionState = useRealtimeConnectionState();
  const [collections, setCollections] = useState<readonly Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await rpc.call("collections_list", {});
      setCollections(result.collections);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtime(COLLECTIONS_CHANGED, () => {
    void refresh();
  });

  useEffect(() => {
    if (connectionState === "connected") {
      void refresh();
    }
  }, [connectionState, refresh]);

  const create = useCallback(
    async (name: string): Promise<Collection> => {
      const collection = await rpc.call("collections_create", { name });
      await refresh();
      return collection;
    },
    [refresh, rpc],
  );

  const rename = useCallback(
    async (collectionId: string, name: string): Promise<Collection> => {
      const collection = await rpc.call("collections_rename", {
        collectionId,
        name,
      });
      await refresh();
      return collection;
    },
    [refresh, rpc],
  );

  const remove = useCallback(
    async (collectionId: string): Promise<void> => {
      await rpc.call("collections_delete", { collectionId });
      await refresh();
    },
    [refresh, rpc],
  );

  const reorderCollections = useCallback(
    async (collectionIds: readonly string[]): Promise<void> => {
      await rpc.call("collections_reorder", { collectionIds: [...collectionIds] });
      await refresh();
    },
    [refresh, rpc],
  );

  const moveProject = useCallback(
    async (
      projectId: string,
      collectionId: string | null,
      position: number,
    ): Promise<void> => {
      await rpc.call("projects_move", { projectId, collectionId, position });
      await refresh();
    },
    [refresh, rpc],
  );

  const reorderProjects = useCallback(
    async (collectionId: string, projectIds: readonly string[]): Promise<void> => {
      await rpc.call("projects_reorder", {
        collectionId,
        projectIds: [...projectIds],
      });
      await refresh();
    },
    [refresh, rpc],
  );

  return {
    collections,
    isLoading,
    error,
    refresh,
    create,
    rename,
    remove,
    reorderCollections,
    moveProject,
    reorderProjects,
  };
}
