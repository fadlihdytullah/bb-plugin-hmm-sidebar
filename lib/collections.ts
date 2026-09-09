import type { Collection } from "../contract";

export function reorderIds(
  currentIds: readonly string[],
  requestedIds: readonly string[],
): string[] {
  const current = new Set(currentIds);
  const requested = requestedIds.filter((id) => current.has(id));
  const requestedSet = new Set(requested);
  return [
    ...requested,
    ...currentIds.filter((id) => !requestedSet.has(id)),
  ];
}

export function collectionProjectIds(
  collection: Collection,
  availableProjectIds: ReadonlySet<string>,
): string[] {
  return collection.projectIds.filter((projectId) =>
    availableProjectIds.has(projectId),
  );
}

export function unassignedProjectIds(
  collections: readonly Collection[],
  projectIds: readonly string[],
): string[] {
  const assigned = new Set(collections.flatMap((collection) => collection.projectIds));
  return projectIds.filter((projectId) => !assigned.has(projectId));
}
