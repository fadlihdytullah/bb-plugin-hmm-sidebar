import { useCallback, useState } from "react";

const STORAGE_KEY = "bb-plugin-hmm-sidebar:collapsed:v1";
const LEGACY_STORAGE_KEY = "bb-hmm-sidebar:collapsed:v1";

function parseCollapsed(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return null;
  }
}

function readCollapsed(): Set<string> {
  try {
    const storage = window.localStorage;
    const current = parseCollapsed(storage.getItem(STORAGE_KEY));
    if (current !== null) return current;

    const legacy = parseCollapsed(storage.getItem(LEGACY_STORAGE_KEY));
    if (legacy === null) return new Set();

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify([...legacy]));
    } catch {
      // Storage failures should not prevent using the migrated state in memory.
    }
    return legacy;
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
