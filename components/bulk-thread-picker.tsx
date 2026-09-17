import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Checkbox } from "@/components/ui/checkbox";
import { threadTitle } from "@/lib/sidebar-model";

export function BulkThreadPicker({
  enabled,
  onEnabledChange,
  threads,
  selectedIds,
  onSelectedIdsChange,
  disabled,
  listLabel,
  emptyLabel,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  threads: readonly PluginSidebarThread[];
  selectedIds: ReadonlySet<string>;
  onSelectedIdsChange: (ids: ReadonlySet<string>) => void;
  disabled: boolean;
  listLabel: string;
  emptyLabel: string;
}) {
  const selectedCount = threads.filter((thread) => selectedIds.has(thread.id)).length;
  const toggle = (threadId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(threadId);
    else next.delete(threadId);
    onSelectedIdsChange(next);
  };

  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
        />
        Bulk deletions
      </label>
      {enabled ? (
        threads.length > 0 ? (
          <div className="rounded-md border border-border/60">
            <label className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-sm font-medium">
              <Checkbox
                checked={
                  selectedCount === threads.length
                    ? true
                    : selectedCount > 0
                      ? "indeterminate"
                      : false
                }
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onSelectedIdsChange(
                    new Set(checked === true ? threads.map((thread) => thread.id) : []),
                  )
                }
              />
              Select all ({selectedCount}/{threads.length})
            </label>
            <ul aria-label={listLabel} className="max-h-64 overflow-y-auto py-1">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <label className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <Checkbox
                      checked={selectedIds.has(thread.id)}
                      disabled={disabled}
                      onCheckedChange={(checked) => toggle(thread.id, checked === true)}
                    />
                    <span className="truncate">{threadTitle(thread)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )
      ) : null}
    </>
  );
}
