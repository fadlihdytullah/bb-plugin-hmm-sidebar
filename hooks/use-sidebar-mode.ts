import { useSyncExternalStore } from "react";

export type SidebarMode = "chat" | "code";

const STORAGE_KEY = "bb-plugin-hmm-sidebar:mode:v1";

let mode = read();
const listeners = new Set<() => void>();

function read(): SidebarMode {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "chat" ? "chat" : "code";
  } catch {
    return "code";
  }
}

export function setSidebarMode(next: SidebarMode): void {
  if (mode === next) return;
  mode = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Local storage can be unavailable in private browsing or a restricted iframe.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): SidebarMode {
  return mode;
}

export function useSidebarMode(): SidebarMode {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
