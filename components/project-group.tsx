import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  experimental_useSidebarThreadActions,
  useRpc,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ActionMenu } from "@/components/action-menu";
import { BulkThreadPicker } from "@/components/bulk-thread-picker";
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
import { ThreadList } from "@/components/thread-row";
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
  const [bulkDelete, setBulkDelete] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (expandedOverride !== undefined) setExpanded(expandedOverride);
  }, [expandedOverride]);
  const visibleThreads = useMemo(
    () => threads.filter((thread) => !thread.isArchived),
    [threads],
  );
  const selectedThreadCount = visibleThreads.filter((thread) =>
    selectedThreadIds.has(thread.id),
  ).length;
  const confirmProjectAction = async () => {
    if (confirmation === null || confirmationBusy) return;

    const action = confirmation;
    setConfirmationBusy(true);
    setConfirmationError(null);
    try {
      if (action === "clear-threads") {
        const { deletedCount } = await rpc.call(
          "projects_clear_threads",
          bulkDelete
            ? {
                projectId: project.id,
                threadIds: visibleThreads
                  .filter((thread) => selectedThreadIds.has(thread.id))
                  .map((thread) => thread.id),
              }
            : { projectId: project.id },
        );
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
          setBulkDelete(false);
          setSelectedThreadIds(new Set());
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
        className={`flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground ${
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
        {/* Pointer shortcut for the toggle button, which stays the keyboard target. */}
        <span
          className="min-w-0 flex-1 cursor-pointer select-none truncate"
          title={project.name}
          data-testid="project-name"
          onClick={() => setExpanded((current) => !current)}
        >
          {project.name}
        </span>
        <button
          type="button"
          aria-label={`New thread in ${project.name}`}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-state-hover hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/project:opacity-100"
          onClick={() => actions.openNewThread({ projectId: project.id, focusPrompt: true })}
        >
          <Icon name="MessageSquarePlus" className="size-3.5" aria-hidden="true" />
        </button>
        {!project.isPersonal ? (
          <ActionMenu
            label={`Actions for ${project.name}`}
            items={projectItems}
            triggerClassName="size-5"
          >
            <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
          </ActionMenu>
        ) : null}
      </div>
      {expanded && visibleThreads.length > 0 ? (
        <ThreadList
          threads={visibleThreads}
          activeThreadId={activeThreadId}
          onNavigate={onNavigate}
          className={`border-l border-border/60 pl-1 ${
            currentCollectionId !== null ? "ml-3.5" : "ml-2"
          }`}
        />
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
          {isClearConfirmation ? (
            <BulkThreadPicker
              enabled={bulkDelete}
              onEnabledChange={setBulkDelete}
              threads={visibleThreads}
              selectedIds={selectedThreadIds}
              onSelectedIdsChange={setSelectedThreadIds}
              disabled={confirmationBusy}
              listLabel="Threads to delete"
              emptyLabel="No threads to delete"
            />
          ) : null}
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
              disabled={
                confirmationBusy ||
                (isClearConfirmation && bulkDelete && selectedThreadCount === 0)
              }
              onClick={() => void confirmProjectAction()}
            >
              {confirmationBusy
                ? isClearConfirmation
                  ? "Clearing…"
                  : "Deleting…"
                : isClearConfirmation
                  ? bulkDelete
                    ? `Delete ${selectedThreadCount} selected`
                    : "Clear threads"
                  : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
