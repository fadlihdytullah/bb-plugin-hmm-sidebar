import { useState } from "react";
import {
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreadSplit,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ActionMenu } from "@/components/action-menu";
import { NameDialog } from "@/components/name-dialog";
import { Icon } from "@/components/ui/icon";
import { threadTitle } from "@/lib/sidebar-model";

function indicatorClass(thread: PluginSidebarThread): string {
  switch (thread.indicator) {
    case "unread-error":
      return "bg-destructive";
    case "waiting-for-input":
      return "bg-amber-500";
    case "working-draft":
    case "workflow":
    case "background-agent":
    case "background-command":
    case "plan-mode":
    case "goal":
    case "runtime":
      return "animate-pulse bg-emerald-500";
    case "unread-success":
      return "bg-primary";
    case "draft":
      return "bg-muted-foreground/60";
    case "none":
    default:
      return thread.isUnread ? "bg-primary" : "bg-muted-foreground/30";
  }
}

export function ThreadRow({
  thread,
  activeThreadId,
  onNavigate,
}: {
  thread: PluginSidebarThread;
  activeThreadId: string | null;
  onNavigate: () => void;
}) {
  const actions = experimental_useSidebarThreadActions();
  const { splitProps } = experimental_useSidebarThreadSplit(thread.id);
  const [renameOpen, setRenameOpen] = useState(false);
  const title = threadTitle(thread);
  const isActive = thread.id === activeThreadId;

  const reportError = (cause: unknown) => {
    toast.error("Could not update thread", {
      description: cause instanceof Error ? cause.message : String(cause),
    });
  };

  return (
    <li className="group/thread relative list-none">
      <a
        {...splitProps}
        data-sidebar-thread-shortcut-target=""
        data-sidebar-thread-id={thread.id}
        href="#"
        aria-current={isActive ? "page" : undefined}
        aria-label={`${title}${thread.indicatorLabel ? `, ${thread.indicatorLabel}` : ""}`}
        className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-0.5 pr-12 text-xs transition-colors motion-reduce:transition-none ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/70"
        }`}
        onClick={(event) => {
          event.preventDefault();
          actions.open(thread.id, { split: false });
          onNavigate();
        }}
      >
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${indicatorClass(thread)}`}
        />
        <span className="min-w-0 flex-1 truncate font-medium leading-4">
          {title}
        </span>
        {thread.isUnread ? (
          <span className="sr-only">Unread</span>
        ) : null}
      </a>
      <div className="pointer-events-auto absolute bottom-0 right-1 top-0 flex items-center">
        <button
          type="button"
          aria-label={`Delete ${title}`}
          className="pointer-events-none flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/thread:pointer-events-auto group-hover/thread:opacity-100 group-focus-within/thread:pointer-events-auto group-focus-within/thread:opacity-100 motion-reduce:transition-none"
          onClick={(event) => {
            event.preventDefault();
            actions.requestDelete(thread.id);
          }}
        >
          <Icon name="Trash2" className="size-3.5" aria-hidden="true" />
        </button>
        <ActionMenu
          label={`Actions for ${title}`}
          triggerClassName="size-5 group-hover/thread:opacity-100 group-focus-within/thread:opacity-100"
          items={[
            {
              id: "pin",
              label: thread.isPinned ? "Unpin thread" : "Pin thread",
              onSelect: () => {
                void actions.setPinned(thread.id, !thread.isPinned).catch(reportError);
              },
            },
            {
              id: "read",
              label: thread.isUnread ? "Mark as read" : "Mark as unread",
              onSelect: () => {
                void actions.setRead(thread.id, thread.isUnread).catch(reportError);
              },
            },
            {
              id: "rename",
              label: "Rename thread",
              onSelect: () => setRenameOpen(true),
            },
            {
              id: "archive",
              label: "Archive thread",
              onSelect: () => actions.archive(thread.id),
            },
            {
              id: "delete",
              label: "Delete thread",
              destructive: true,
              onSelect: () => actions.requestDelete(thread.id),
            },
          ]}
        >
          <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
        </ActionMenu>
      </div>
      <NameDialog
        open={renameOpen}
        title="Rename thread"
        initialName={title}
        onOpenChange={setRenameOpen}
        onSubmit={async (nextTitle) => {
          if (nextTitle !== title) await actions.rename(thread.id, nextTitle);
        }}
      />
    </li>
  );
}
