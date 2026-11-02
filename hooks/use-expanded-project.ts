import { useSyncExternalStore } from "react";

let expandedProjectId: string | null = null;
const listeners = new Set<() => void>();

export function setExpandedProject(projectId: string | null): void {
  if (expandedProjectId === projectId) return;
  expandedProjectId = projectId;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): string | null {
  return expandedProjectId;
}

export function useExpandedProject(): string | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
