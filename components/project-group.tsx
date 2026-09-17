import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  experimental_useSidebarThreadActions,
  useRpc,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ActionMenu } from "@/components/action-menu";
import { NameDialog } from "@/components/name-dialog";
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
import { Icon } from "@/components/ui/icon";
import { ThreadRow } from "@/components/thread-row";
import { rpcContract } from "@/contract";

export const PROJECT_DRAG_TYPE = "application/x-bb-collections-project";
export const COLLECTION_DRAG_TYPE = "application/x-bb-collections-collection";

type ProjectConfirmation = "clear-threads" | "delete-project";

/**
 * `DataTransfer` keeps drag payload values protected until `drop`, but its
 * advertised MIME types remain available while a pointer is over a target.
 */
export function hasDragType(event: DragEvent, type: string): boolean {
  return Array.from(event.dataTransfer.types).includes(type);
}

function projectIdFromDrag(event: DragEvent): string | null {
  const typed = event.dataTransfer.getData(PROJECT_DRAG_TYPE).trim();
  if (typed.length > 0) return typed;
  const fallback = event.dataTransfer.getData("text/plain");
  return fallback.startsWith("project:") ? fallback.slice("project:".length) : null;
}

export function ProjectGroup({
  project,
  threads,
  activeThreadId,
  onNavigate,
  initiallyExpanded = true,
  currentCollectionId,
  projectIndex,
  onMoveProject,
  onError,
  expandedOverride,
}: {
  project: PluginSidebarProject;
  threads: readonly PluginSidebarThread[];
  activeThreadId: string | null;
  onNavigate: () => void;
  initiallyExpanded?: boolean;
  currentCollectionId: string | null;
  projectIndex: number;
  onMoveProject: (
    projectId: string,
    collectionId: string | null,
    position: number,
  ) => Promise<void>;
  onError: (cause: unknown) => void;
  expandedOverride?: boolean;
}) {
  const actions = experimental_useSidebarThreadActions();
  const rpc = useRpc<typeof rpcContract>();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ProjectConfirmation | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  useEffect(() => {
    if (expandedOverride !== undefined) setExpanded(expandedOverride);
  }, [expandedOverride]);
  const visibleThreads = useMemo(
    () => threads.filter((thread) => !thread.isArchived),
    [threads],
  );
  const confirmProjectAction = async () => {
    if (confirmation === null || confirmationBusy) return;

    const action = confirmation;
    setConfirmationBusy(true);
    setConfirmationError(null);
    try {
      if (action === "clear-threads") {
        const { deletedCount } = await rpc.call("projects_clear_threads", {
          projectId: project.id,
        });
        toast.success(
          deletedCount === 0
            ? "No inactive threads to clear"
            : `Cleared ${deletedCount} inactive thread${deletedCount === 1 ? "" : "s"}`,
        );
      } else {
        await rpc.call("projects_delete", { projectId: project.id });
      }
      setConfirmation(null);
    } catch (cause) {
      const description = cause instanceof Error ? cause.message : String(cause);
      setConfirmationError(description);
      toast.error(
        action === "clear-threads" ? "Could not clear threads" : "Could not delete project",
        { description },
      );
    } finally {
      setConfirmationBusy(false);
    }
  };
  const projectItems = useMemo(
    () => [
      {
        id: "rename-project",
        label: "Rename project",
        onSelect: () => setRenameOpen(true),
      },
      {
        id: "clear-threads",
        label: "Clear threads",
        destructive: true,
        onSelect: () => {
          setConfirmationError(null);
          setConfirmation("clear-threads");
        },
      },
      {
        id: "delete-project",
        label: "Delete project",
        destructive: true,
        onSelect: () => {
          setConfirmationError(null);
          setConfirmation("delete-project");
        },
      },
    ],
    [project.id],
  );

  const isClearConfirmation = confirmation === "clear-threads";

  return (
    <li
      className="group/project relative list-none"
      data-project-id={project.id}
      onDragOver={(event) => {
        if (project.isPersonal) return;
        if (hasDragType(event, PROJECT_DRAG_TYPE)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (project.isPersonal) return;
        const draggedProjectId = projectIdFromDrag(event);
        if (!draggedProjectId) return;
        if (draggedProjectId === project.id) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void onMoveProject(
          draggedProjectId,
          currentCollectionId,
          projectIndex,
        ).catch(onError);
      }}
    >
      <div
        draggable={!project.isPersonal}
        className={`flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent/70 ${
          currentCollectionId !== null ? "pl-3" : ""
        }`}
        onDragStart={(event) => {
          if (project.isPersonal) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(PROJECT_DRAG_TYPE, project.id);
          event.dataTransfer.setData("text/plain", `project:${project.id}`);
        }}
      >
        <button
          type="button"
          aria-label={`${expanded ? "Collapse" : "Expand"} ${project.name}`}
          aria-expanded={expanded}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setExpanded((current) => !current)}
        >
          <Icon
            name="ChevronDown"
            className={`size-3.5 transition-transform motion-reduce:transition-none ${
              expanded ? "" : "-rotate-90"
            }`}
            aria-hidden="true"
          />
        </button>
        <span
          className="min-w-0 flex-1 truncate"
          title={project.name}
          data-testid="project-name"
        >
          {project.name}
        </span>
        <button
          type="button"
          aria-label={`New thread in ${project.name}`}
          className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-state-hover hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/project:opacity-100"
          onClick={() => actions.openNewThread({ projectId: project.id, focusPrompt: true })}
        >
          <Icon name="MessageSquarePlus" className="size-3.5" aria-hidden="true" />
        </button>
        {!project.isPersonal ? (
          <ActionMenu label={`Actions for ${project.name}`} items={projectItems}>
            <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
          </ActionMenu>
        ) : null}
      </div>
      {expanded ? (
        <ul className="ml-3 border-l border-border/60 pl-1">
          {visibleThreads.length > 0 ? (
            visibleThreads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                activeThreadId={activeThreadId}
                onNavigate={onNavigate}
              />
            ))
          ) : (
            <li className="list-none px-2 py-1 text-[11px] text-muted-foreground">
              No threads yet
            </li>
          )}
        </ul>
      ) : null}
      <NameDialog
        open={renameOpen}
        title="Rename project"
        initialName={project.name}
        onOpenChange={setRenameOpen}
        onSubmit={async (name) => {
          if (name !== project.name) {
            await rpc.call("projects_rename", { projectId: project.id, name });
          }
        }}
      />
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !confirmationBusy) {
            setConfirmation(null);
            setConfirmationError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isClearConfirmation ? "Clear threads?" : "Delete project?"}</DialogTitle>
            <DialogDescription>
              {isClearConfirmation
                ? "This action cannot be undone. Running threads, threads needing attention, and threads with errors will be kept."
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {confirmationError !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {confirmationError}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={confirmationBusy}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmationBusy}
              onClick={() => void confirmProjectAction()}
            >
              {confirmationBusy
                ? isClearConfirmation
                  ? "Clearing…"
                  : "Deleting…"
                : isClearConfirmation
                  ? "Clear threads"
                  : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
