import { useSyncExternalStore } from "react";
import { enqueueRecent, RECENTS_LIMIT } from "../lib/recents";

const STORAGE_KEY = "bb-plugin-active-chats-sidebar.recents";

let recents = read();
const listeners = new Set<() => void>();

function read(): readonly string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string")
      .slice(-RECENTS_LIMIT);
  } catch {
    return [];
  }
}

function commit(next: readonly string[]): void {
  if (next === recents) return;
  recents = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage failures should not make opening a thread fail.
  }
  for (const listener of listeners) listener();
}

export function rememberRecent(threadId: string): void {
  commit(enqueueRecent(recents, threadId));
}

export function forgetRecent(threadId: string): void {
  if (!recents.includes(threadId)) return;
  commit(recents.filter((id) => id !== threadId));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): readonly string[] {
  return recents;
}

export function useRecents(): readonly string[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
