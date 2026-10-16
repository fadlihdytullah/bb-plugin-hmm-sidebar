import { useEffect, useState } from "react";
import {
  experimental_NewThreadComposer as NewThreadComposer,
  experimental_useSidebarThreads,
  useBbContext,
  useRpc,
  type NewThreadRequest,
} from "@get-bb/plugin-sdk/app";
import { useThreadCommands } from "@/hooks/use-thread-commands";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import { rpcContract } from "@/contract";

export const OPEN_SPLIT_COMPOSER_EVENT = "hmm-sidebar:new-thread-split";

/**
 * bb has no "new thread in split" API, so this composes the thread in a
 * dialog, spawns it through the backend, and opens it in a split.
 *
 * The open stays in this window: `actions.open` is client-local (the backend's
 * `threads.open` reaches every bb window), but it ignores ids the sidebar has
 * not received yet, so it waits for the new thread to arrive.
 */
export function SplitThreadComposer() {
  const { projectId } = useBbContext();
  const rpc = useRpc<typeof rpcContract>();
  const { threads } = experimental_useSidebarThreads();
  const actions = useThreadCommands();
  const [open, setOpen] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingThreadId === null) return;
    if (!threads.some((thread) => thread.id === pendingThreadId)) return;
    setPendingThreadId(null);
    actions.open(pendingThreadId, { split: true });
  }, [actions, pendingThreadId, threads]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SPLIT_COMPOSER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SPLIT_COMPOSER_EVENT, onOpen);
  }, []);

  const submit = async (request: NewThreadRequest) => {
    try {
      const { threadId } = await rpc.call("threads_spawn", { request });
      setOpen(false);
      setPendingThreadId(threadId);
    } catch (cause) {
      toast.error("Could not start thread", {
        description: cause instanceof Error ? cause.message : String(cause),
      });
      // Rethrow so the composer keeps the draft.
      throw cause;
    }
  };

  return (
    // Bottom sheets sit off-screen in a narrow window; always centre like cmd+k.
    <CompactViewportOverrideProvider isCompactViewport={false}>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="split-thread-composer"
        hideCloseButton
        className="max-w-2xl gap-0 overflow-hidden p-0"
      >
        <div className="flex h-11 items-center border-b border-border px-4">
          <DialogTitle className="truncate text-sm font-medium">
            New thread in split
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="ml-auto flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <Icon name="X" className="size-3.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Start a thread and open it beside the current one.
        </DialogDescription>
        <div className="p-4">
          <NewThreadComposer
            defaultProjectId={projectId ?? undefined}
            onSubmit={submit}
            focusRequest={open ? 1 : 0}
            draftKey="hmm-sidebar-split-draft"
            className="w-full [&_.ProseMirror]:max-h-[min(18rem,35vh)] [&_.ProseMirror]:overflow-y-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
    </CompactViewportOverrideProvider>
  );
}
