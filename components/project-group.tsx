import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  experimental_useSidebarThreadActions,
  useRpc,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { ActionMenu } from "@/components/action-menu";
import { Icon } from "@/components/ui/icon";
import type { Collection } from "@/contract";
import { ThreadRow } from "@/components/thread-row";
import { rpcContract } from "@/contract";

export const PROJECT_DRAG_TYPE = "application/x-bb-collections-project";
export const COLLECTION_DRAG_TYPE = "application/x-bb-collections-collection";

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
  collections,
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
  collections: readonly Collection[];
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
  useEffect(() => {
    if (expandedOverride !== undefined) setExpanded(expandedOverride);
  }, [expandedOverride]);
  const visibleThreads = useMemo(
    () => threads.filter((thread) => !thread.isArchived),
    [threads],
  );
  const moveItems = useMemo(() => {
    const items = collections
      .filter((collection) => collection.id !== currentCollectionId)
      .map((collection) => ({
        id: `move-${collection.id}`,
        label: `Move to ${collection.name}`,
        onSelect: () => {
          void onMoveProject(project.id, collection.id, collection.projectIds.length).catch(onError);
        },
      }));
    if (currentCollectionId !== null) {
      items.push({
        id: "remove-from-collection",
        label: "Remove from collection",
        onSelect: () => {
          void onMoveProject(project.id, null, 0).catch(onError);
        },
      });
    }
    return items;
  }, [collections, currentCollectionId, onError, onMoveProject, project.id]);

  const projectItems = useMemo(
    () => [
      {
        id: "rename-project",
        label: "Rename project",
        onSelect: () => {
          const name = window.prompt("Rename project", project.name)?.trim();
          if (!name || name === project.name) return;
          void rpc
            .call("projects_rename", { projectId: project.id, name })
            .catch(onError);
        },
      },
      ...moveItems,
      {
        id: "delete-project",
        label: "Delete project",
        destructive: true,
        onSelect: () => {
          if (!window.confirm(`Delete ${project.name}? This cannot be undone.`)) return;
          void rpc.call("projects_delete", { projectId: project.id }).catch(onError);
        },
      },
    ],
    [moveItems, onError, project.id, project.name, rpc],
  );

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
        <Icon name="Folder" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
    </li>
  );
}
