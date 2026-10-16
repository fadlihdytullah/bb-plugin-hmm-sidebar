import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bb-plugin-hmm-sidebar:check-later:v1";

let marked = read();
let activeThreadId: string | null = null;
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

function emit(): void {
  for (const listener of listeners) listener();
}

function write(next: readonly string[]): void {
  marked = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(marked));
  } catch {
    // Local storage can be unavailable in private browsing or a restricted iframe.
  }
  emit();
}

export function markCheckLater(threadId: string): void {
  if (!marked.includes(threadId)) write([...marked, threadId]);
}

export function clearCheckLater(threadId: string): void {
  if (marked.includes(threadId)) write(marked.filter((id) => id !== threadId));
}

export function setActiveThreadId(threadId: string | null): void {
  if (activeThreadId === threadId) return;
  activeThreadId = threadId;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCheckLaterIds(): readonly string[] {
  return useSyncExternalStore(subscribe, () => marked, () => marked);
}

export function useActiveThreadId(): string | null {
  return useSyncExternalStore(subscribe, () => activeThreadId, () => activeThreadId);
}
