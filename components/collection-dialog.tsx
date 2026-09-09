import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Collection } from "@/contract";

export function CollectionDialog({
  open,
  collection,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  collection: Collection | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(collection?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = collection !== null;

  useEffect(() => {
    if (open) {
      setName(collection?.name ?? "");
      setBusy(false);
      setError(null);
    }
  }, [collection, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length === 0 || busy) return;
    setBusy(true);
    try {
      await onSubmit(nextName);
      onOpenChange(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Rename collection" : "New collection"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Choose a name for this collection. Projects and threads stay unchanged."
              : "Group related BB projects together in the sidebar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-medium" htmlFor="collection-name">
            Name
            <Input
              id="collection-name"
              value={name}
              maxLength={120}
              autoFocus
              placeholder="e.g. Work projects"
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          {error !== null ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={busy || name.trim().length === 0}>
              {busy ? "Saving…" : isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
