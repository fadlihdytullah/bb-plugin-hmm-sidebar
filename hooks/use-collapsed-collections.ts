import { useCallback, useState } from "react";

const STORAGE_KEY = "bb-hmm-sidebar:collapsed:v1";

function readCollapsed(): Set<string> {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return new Set();
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function persistCollapsed(collapsed: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Local storage can be unavailable in private browsing or a restricted iframe.
  }
}

export function useCollapsedCollections() {
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);

  const toggle = useCallback((collectionId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      persistCollapsed(next);
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (collectionId: string): boolean => collapsed.has(collectionId),
    [collapsed],
  );

  return { isCollapsed, toggle };
}
