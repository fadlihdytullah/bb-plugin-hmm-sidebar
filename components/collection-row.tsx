import { useEffect, useRef, useState, type DragEvent } from "react";
import type { Collection } from "@/contract";
import { ActionMenu } from "@/components/action-menu";
import { Icon } from "@/components/ui/icon";
import {
  COLLECTION_DRAG_TYPE,
  hasDragType,
  PROJECT_DRAG_TYPE,
  ProjectGroup,
} from "@/components/project-group";
import type { ProjectGroup as ProjectGroupModel } from "@/lib/sidebar-model";

function dragValue(event: DragEvent, type: string, prefix: string): string | null {
  const value = event.dataTransfer.getData(type).trim();
  if (value.length > 0) return value;
  const fallback = event.dataTransfer.getData("text/plain");
  return fallback.startsWith(prefix) ? fallback.slice(prefix.length) : null;
}

export function CollectionRow({
  collection,
  projects,
  allCollections,
  collectionIndex,
  expanded,
  onToggle,
  activeThreadId,
  onNavigate,
  onRename,
  onDelete,
  onMoveProject,
  onError,
  onMoveCollection,
}: {
  collection: Collection;
  projects: readonly ProjectGroupModel[];
  allCollections: readonly Collection[];
  collectionIndex: number;
  expanded: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  onNavigate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveProject: (
    projectId: string,
    collectionId: string | null,
    position: number,
  ) => Promise<void>;
  onError: (cause: unknown) => void;
  onMoveCollection: (collectionId: string, position: number) => Promise<void>;
}) {
  const [projectsInitiallyExpanded, setProjectsInitiallyExpanded] = useState(expanded);
  const previousExpanded = useRef(expanded);

  useEffect(() => {
    if (previousExpanded.current && !expanded) {
      setProjectsInitiallyExpanded(false);
    }
    previousExpanded.current = expanded;
  }, [expanded]);

  const handleToggle = () => {
    if (expanded) {
      setProjectsInitiallyExpanded(false);
    }
    onToggle();
  };

  return (
    <li
      className="list-none"
      data-collection-id={collection.id}
      onDragOver={(event) => {
        if (
          hasDragType(event, PROJECT_DRAG_TYPE) ||
          hasDragType(event, COLLECTION_DRAG_TYPE)
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        const projectId = dragValue(event, PROJECT_DRAG_TYPE, "project:");
        if (projectId) {
          event.preventDefault();
          event.stopPropagation();
          void onMoveProject(projectId, collection.id, collection.projectIds.length).catch(onError);
          return;
        }
        const draggedCollectionId = dragValue(
          event,
          COLLECTION_DRAG_TYPE,
          "collection:",
        );
        if (draggedCollectionId && draggedCollectionId !== collection.id) {
          event.preventDefault();
          event.stopPropagation();
          void onMoveCollection(draggedCollectionId, collectionIndex).catch(onError);
        }
      }}
    >
      <div
        draggable
        className="group/collection flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent/70"
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(COLLECTION_DRAG_TYPE, collection.id);
          event.dataTransfer.setData("text/plain", `collection:${collection.id}`);
        }}
      >
        <button
          type="button"
          aria-label={`${expanded ? "Collapse" : "Expand"} ${collection.name}`}
          aria-expanded={expanded}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={handleToggle}
        >
          <Icon
            name="ChevronDown"
            className={`size-3.5 transition-transform motion-reduce:transition-none ${
              expanded ? "" : "-rotate-90"
            }`}
            aria-hidden="true"
          />
        </button>
        <Icon name="Folder" className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate" title={collection.name}>
          {collection.name}
        </span>
        <span className="tabular-nums text-[10px] font-normal text-muted-foreground">
          {projects.length}
        </span>
        <ActionMenu
          label={`Actions for ${collection.name}`}
          items={[
            { id: "rename", label: "Rename collection", onSelect: onRename },
            {
              id: "delete",
              label: "Delete collection",
              destructive: true,
              onSelect: onDelete,
            },
          ]}
        >
          <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
        </ActionMenu>
      </div>
      {expanded ? (
        <ul className="space-y-px pl-1">
          {projects.length > 0 ? (
            projects.map((entry, index) => (
              <ProjectGroup
                key={entry.project.id}
                project={entry.project}
                threads={entry.threads}
                activeThreadId={activeThreadId}
                onNavigate={onNavigate}
                initiallyExpanded={projectsInitiallyExpanded}
                currentCollectionId={collection.id}
                collections={allCollections}
                projectIndex={index}
                onMoveProject={onMoveProject}
                onError={onError}
              />
            ))
          ) : (
            <li className="list-none px-8 py-1 text-[11px] text-muted-foreground">
              Drop projects here
            </li>
          )}
        </ul>
      ) : null}
    </li>
  );
}
