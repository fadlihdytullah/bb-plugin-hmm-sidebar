import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bb-plugin-hmm-sidebar:pinned-projects:v1";

let pinned = read();
const listeners = new Set<() => void>();

function read(): readonly string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function togglePinnedProject(projectId: string): void {
  pinned = pinned.includes(projectId)
    ? pinned.filter((id) => id !== projectId)
    : [...pinned, projectId];
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(pinned));
  } catch {
    // Local storage can be unavailable in private browsing or a restricted iframe.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): readonly string[] {
  return pinned;
}

export function usePinnedProjects(): readonly string[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
