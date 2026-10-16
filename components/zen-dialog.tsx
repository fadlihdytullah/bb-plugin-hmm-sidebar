import { useEffect, useState } from "react";
import {
  experimental_useSidebarThreads,
  ThreadChat,
  useSidebarSplitLayout,
} from "@get-bb/plugin-sdk/app";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import { threadTitle } from "@/lib/activity-model";
import { OPEN_ZEN_EVENT } from "@/lib/zen-event";

export function ZenDialog() {
  const { threads } = experimental_useSidebarThreads();
  const split = useSidebarSplitLayout();
  const focusedThreadId =
    split?.panes.find((pane) => pane.isFocused)?.threadId ?? null;
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = split ? focusedThreadId : (event as CustomEvent<string>).detail;
      if (id) setThreadId(id);
    };
    window.addEventListener(OPEN_ZEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ZEN_EVENT, onOpen);
  }, [split, focusedThreadId]);

  const thread = threads.find((candidate) => candidate.id === threadId);

  return (
    <CompactViewportOverrideProvider isCompactViewport={false}>
      <Dialog
        open={threadId !== null}
        onOpenChange={(next) => {
          if (!next) setThreadId(null);
        }}
      >
        <DialogContent
          data-testid="zen-dialog"
          hideCloseButton
          overlayClassName="bg-black/90"
          className="h-[88vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
        >
          <div className="flex h-11 items-center border-b border-border px-4">
            <DialogTitle className="truncate text-sm font-medium">
              {thread ? threadTitle(thread) : "Zen"}
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className="ml-auto flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <Icon name="X" className="size-3.5" aria-hidden="true" />
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            Focused view of the selected thread.
          </DialogDescription>
          {threadId !== null ? (
            <ThreadChat threadId={threadId} variant="full" className="min-h-0" />
          ) : null}
        </DialogContent>
      </Dialog>
    </CompactViewportOverrideProvider>
  );
}
