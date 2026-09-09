import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  definePluginApp,
  experimental_useSidebarThreads,
  useBbContext,
  type PluginThreadListProps,
  type ExperimentalSidebarFooterDisclosureProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ActivityPanel } from "@/components/activity-panel";
import { CollectionDialog } from "@/components/collection-dialog";
import { CollectionRow } from "@/components/collection-row";
import {
  hasDragType,
  PROJECT_DRAG_TYPE,
  ProjectGroup,
} from "@/components/project-group";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCollapsedCollections } from "@/hooks/use-collapsed-collections";
import { useCollections } from "@/hooks/use-collections";
import { buildSidebarModel } from "@/lib/sidebar-model";
import type { Collection } from "@/contract";

function projectIdFromDrag(event: DragEvent): string | null {
  const typed = event.dataTransfer.getData(PROJECT_DRAG_TYPE).trim();
  if (typed.length > 0) return typed;
  const fallback = event.dataTransfer.getData("text/plain");
  return fallback.startsWith("project:") ? fallback.slice("project:".length) : null;
}

function reportError(cause: unknown): void {
  toast.error("Could not update collections", {
    description: cause instanceof Error ? cause.message : String(cause),
  });
}

type CollectionsViewProps = Pick<
  PluginThreadListProps,
  "activeThreadId" | "onNavigate"
> & {
  includeActivity?: boolean;
};

function CollectionsSidebar({
  activeThreadId,
  onNavigate,
  includeActivity = true,
}: CollectionsViewProps) {
  const { status, threads, projects } = experimental_useSidebarThreads();
  const collectionsState = useCollections();
  const { isCollapsed, toggle } = useCollapsedCollections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [looseDropActive, setLooseDropActive] = useState(false);

  const model = useMemo(
    () => buildSidebarModel(collectionsState.collections, projects, threads),
    [collectionsState.collections, projects, threads],
  );

  const openCreate = useCallback(() => {
    setEditingCollection(null);
    setDialogOpen(true);
  }, []);

  const openRename = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setDialogOpen(true);
  }, []);

  const moveProject = useCallback(
    async (projectId: string, collectionId: string | null, position: number) => {
      await collectionsState.moveProject(projectId, collectionId, position);
      toast.success(
        collectionId === null ? "Project removed from collection" : "Project moved",
      );
    },
    [collectionsState],
  );

  const moveCollection = useCallback(
    async (collectionId: string, position: number) => {
      const ids = model.collections
        .map(({ collection }) => collection.id)
        .filter((id) => id !== collectionId);
      ids.splice(Math.min(position, ids.length), 0, collectionId);
      await collectionsState.reorderCollections(ids);
    },
    [collectionsState, model.collections],
  );

  const deleteCollection = useCallback(
    (collection: Collection) => {
      if (
        !window.confirm(
          `Delete ${collection.name}? Its projects will stay in BB and return to the flat list.`,
        )
      ) {
        return;
      }
      void collectionsState.remove(collection.id).then(
        () => toast.success("Collection deleted"),
        reportError,
      );
    },
    [collectionsState],
  );

  const submitCollection = useCallback(
    async (name: string) => {
      try {
        if (editingCollection === null) {
          await collectionsState.create(name);
          toast.success("Collection created");
        } else {
          await collectionsState.rename(editingCollection.id, name);
          toast.success("Collection renamed");
        }
      } catch (cause) {
        reportError(cause);
        throw cause;
      }
    },
    [collectionsState, editingCollection],
  );

  const handleLooseDrop = useCallback(
    (event: DragEvent) => {
      const projectId = projectIdFromDrag(event);
      if (!projectId) return;
      event.preventDefault();
      event.stopPropagation();
      setLooseDropActive(false);
      void moveProject(projectId, null, 0).catch(reportError);
    },
    [moveProject],
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragEnd={() => setLooseDropActive(false)}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
      <div className="mb-1 flex items-center justify-between px-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Collections
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label="Create collection"
          onClick={openCreate}
        >
          <Icon name="FolderPlus" className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {collectionsState.error !== null ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-destructive">
          <span>{collectionsState.error}</span>
          <button
            type="button"
            className="shrink-0 underline underline-offset-2"
            onClick={() => void collectionsState.refresh()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {collectionsState.isLoading ? (
        <div role="status" className="space-y-1 px-2 py-2">
          <div className="h-7 animate-pulse rounded bg-sidebar-accent/60" />
          <div className="h-7 animate-pulse rounded bg-sidebar-accent/40" />
        </div>
      ) : null}

      {status === "error" ? (
        <p role="alert" className="px-2 py-2 text-xs text-destructive">
          BB could not load the project list.
        </p>
      ) : null}

      {status === "ready" && !collectionsState.isLoading ? (
        <>
          <ul className="space-y-px" aria-label="Collections">
            {model.collections.map(({ collection, projects: collectionProjects }, index) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                projects={collectionProjects}
                allCollections={collectionsState.collections}
                collectionIndex={index}
                expanded={!isCollapsed(collection.id)}
                onToggle={() => toggle(collection.id)}
                activeThreadId={activeThreadId}
                onNavigate={onNavigate}
                onRename={() => openRename(collection)}
                onDelete={() => deleteCollection(collection)}
                onMoveProject={moveProject}
                onError={reportError}
                onMoveCollection={moveCollection}
              />
            ))}
          </ul>

          <div
            className={`mt-2 border-t border-border/60 pt-2 ${
              looseDropActive ? "rounded-md bg-sidebar-accent/50" : ""
            }`}
            data-loose-projects-drop-target=""
            onDragEnter={(event) => {
              if (hasDragType(event, PROJECT_DRAG_TYPE)) setLooseDropActive(true);
            }}
            onDragOver={(event) => {
              if (hasDragType(event, PROJECT_DRAG_TYPE)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setLooseDropActive(false);
            }}
            onDrop={handleLooseDrop}
          >
            {model.looseProjects.length > 0 ? (
              <ul className="space-y-px" aria-label="Other projects">
                {model.looseProjects.map((entry, index) => (
                  <ProjectGroup
                    key={entry.project.id}
                    project={entry.project}
                    threads={entry.threads}
                    activeThreadId={activeThreadId}
                    onNavigate={onNavigate}
                    currentCollectionId={null}
                    collections={collectionsState.collections}
                    projectIndex={index}
                    onMoveProject={moveProject}
                    onError={reportError}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                No projects outside a collection
              </p>
            )}
          </div>

          {model.personalProject !== null ? (
            <div className="mt-1 border-t border-border/40 pt-1">
              <ul aria-label="Threads project">
                <ProjectGroup
                  project={model.personalProject.project}
                  threads={model.personalProject.threads}
                  activeThreadId={activeThreadId}
                  onNavigate={onNavigate}
                  currentCollectionId={null}
                  collections={[]}
                  projectIndex={0}
                  onMoveProject={moveProject}
                  onError={reportError}
                />
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {status === "ready" && !collectionsState.isLoading && model.collections.length === 0 && model.looseProjects.length === 0 && model.personalProject === null ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">
          No projects yet. Create a collection when you are ready to organize them.
        </p>
      ) : null}

      <CollectionDialog
        open={dialogOpen}
        collection={editingCollection}
        onOpenChange={setDialogOpen}
        onSubmit={submitCollection}
      />
      </div>

      {includeActivity && status === "ready" ? (
        <ActivityPanel
          threads={threads}
          projects={projects}
          activeThreadId={activeThreadId}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}

function CollectionsThreadList(props: PluginThreadListProps) {
  return <CollectionsSidebar {...props} />;
}

function CollectionsDisclosure({
  dismiss,
}: ExperimentalSidebarFooterDisclosureProps) {
  const { threadId } = useBbContext();

  return (
    <CollectionsSidebar
      activeThreadId={threadId}
      onNavigate={dismiss}
      includeActivity={false}
    />
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "collections",
    title: "Collections sidebar",
    description:
      "Group BB projects into collapsible collections and keep active chats visible.",
    component: CollectionsThreadList,
  });
  app.experimental_sidebarFooter.register({
    kind: "disclosure",
    id: "collections",
    label: "Collections",
    icon: "Folder",
    component: CollectionsDisclosure,
  });
});
