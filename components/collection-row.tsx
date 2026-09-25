import { useEffect, useRef, useState, type DragEvent } from "react";
import type { Collection } from "@/contract";
import { ActionMenu } from "@/components/action-menu";
import { ShowMoreButton, useShowMore } from "@/components/show-more";
import { isThreadHighlighted } from "@/components/thread-row";
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

  const {
    shown: shownProjects,
    hiddenCount,
    expanded: showAllProjects,
    canToggle,
    toggle: toggleProjects,
  } = useShowMore(projects, (entry) =>
    entry.threads.some(
      (thread) =>
        !thread.isArchived &&
        (thread.id === activeThreadId || isThreadHighlighted(thread)),
    ),
  );

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
        className="group/collection flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/70"
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
          <Icon name="Folder" className="size-3.5" aria-hidden="true" />
        </button>
        {/* Pointer shortcut for the toggle button, which stays the keyboard target. */}
        <span
          className="min-w-0 flex-1 cursor-pointer select-none truncate"
          title={collection.name}
          onClick={handleToggle}
        >
          {collection.name}
        </span>
        <span className="tabular-nums text-[10px] font-normal text-muted-foreground">
          {projects.length}
        </span>
        <ActionMenu
          label={`Actions for ${collection.name}`}
          triggerClassName="size-5"
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
        <ul
          className={`space-y-px pl-1 ${
            hiddenCount > 0
              ? "[&>li:last-child>div:first-child:not(:hover)]:opacity-40"
              : ""
          }`}
        >
          {projects.length > 0 ? (
            shownProjects.map((entry) => (
              <ProjectGroup
                key={entry.project.id}
                project={entry.project}
                threads={entry.threads}
                activeThreadId={activeThreadId}
                onNavigate={onNavigate}
                initiallyExpanded={projectsInitiallyExpanded}
                currentCollectionId={collection.id}
                projectIndex={projects.indexOf(entry)}
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
      {expanded && canToggle ? (
        <ShowMoreButton
          expanded={showAllProjects}
          hiddenCount={hiddenCount}
          onToggle={toggleProjects}
          className="pl-3"
        />
      ) : null}
    </li>
  );
}
