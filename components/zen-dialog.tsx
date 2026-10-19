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
import { Wordmark } from "@/components/wordmark";
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
      const id = split
        ? focusedThreadId
        : (event as CustomEvent<string>).detail;
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
          overlayClassName="bg-black/25 backdrop-blur-[24px] backdrop-saturate-[1.4]"
          className="bottom-32 top-auto h-[80vh] max-w-4xl translate-y-0 gap-0 p-0"
        >
          <div className="pointer-events-none absolute top-full left-1/2 mt-6 -translate-x-1/2">
            <Wordmark word="zen" className="h-11" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-full h-2 rounded-t-lg border border-b-0 border-border bg-card/70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 bottom-full mb-2 h-2 rounded-t-lg border border-b-0 border-border bg-card/40"
          />
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[inherit]">
            <div className="grid h-8 grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-center gap-2 border-b border-border px-3">
              <span aria-hidden="true" />
              <DialogTitle className="truncate text-center text-xs font-medium text-muted-foreground">
                {thread ? threadTitle(thread) : "Zen"}
              </DialogTitle>
              <DialogClose
                aria-label="Close"
                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <Icon name="X" className="size-3" aria-hidden="true" />
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              Focused view of the selected thread.
            </DialogDescription>
            {threadId !== null ? (
              <ThreadChat
                threadId={threadId}
                variant="full"
                className="min-h-0"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </CompactViewportOverrideProvider>
  );
}
