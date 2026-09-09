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

/**
 * Electron's renderer does not implement `window.prompt`, so every rename in
 * this plugin goes through this dialog instead of a native prompt.
 */
export function NameDialog({
  open,
  title,
  description,
  initialName,
  submitLabel = "Save",
  placeholder,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  initialName: string;
  submitLabel?: string;
  placeholder?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setBusy(false);
      setError(null);
    }
  }, [initialName, open]);

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
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-medium" htmlFor="name-dialog-input">
            Name
            <Input
              id="name-dialog-input"
              value={name}
              maxLength={120}
              autoFocus
              placeholder={placeholder}
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
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
