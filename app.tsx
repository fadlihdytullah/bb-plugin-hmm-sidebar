import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  definePluginApp,
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreads,
  useBbContext,
  useRpc,
  type PluginThreadListProps,
  type ExperimentalSidebarFooterDisclosureProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/action-menu";
import { ActivityPanel } from "@/components/activity-panel";
import { ActivityPalette } from "@/components/activity-palette";
import { NameDialog } from "@/components/name-dialog";
import { CollectionRow } from "@/components/collection-row";
import {
  hasDragType,
  PROJECT_DRAG_TYPE,
  ProjectGroup,
} from "@/components/project-group";
import { BulkThreadPicker } from "@/components/bulk-thread-picker";
import { ThreadRow } from "@/components/thread-row";
import { CompactSidebarNavigation } from "@/components/sidebar-navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCollapsedCollections } from "@/hooks/use-collapsed-collections";
import { useCollections } from "@/hooks/use-collections";
import { buildSidebarModel, threadTitle } from "@/lib/sidebar-model";
import { rpcContract, type Collection } from "@/contract";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type ProjectSort = "name-asc" | "name-desc";
type ProjectFilter = "all" | "with-chats" | "without-chats";
type ChatSort = "recent" | "oldest" | "name-asc";
type ChatFilter = "all" | "unread" | "pinned";

function SidebarHeader({
  onCreateCollection,
  onRefresh,
}: {
  onCreateCollection: () => void;
  onRefresh: () => void;
}) {
  const items: readonly ActionMenuItem[] = [
    {
      id: "create-collection",
      label: "Create collection",
      onSelect: onCreateCollection,
    },
    {
      id: "refresh-sidebar",
      label: "Refresh sidebar",
      onSelect: onRefresh,
    },
  ];

  return (
    <header
      aria-label="Hmm Sidebar"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 py-3"
      data-testid="sidebar-brand"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          role="img"
          aria-label="BB"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"
        >
          <span className="select-none text-[13px] font-semibold leading-none tracking-[-0.12em]">
            bb
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold leading-5 text-foreground">
            Hmm Sidebar
          </h1>
          <p className="truncate text-[10px] leading-4 text-muted-foreground">
            Collections &amp; chats
          </p>
        </div>
      </div>
      <ActionMenu
        label="Hmm Sidebar options"
        items={items}
        triggerClassName="opacity-100"
      >
        <Icon name="MoreHorizontal" className="size-4" aria-hidden="true" />
      </ActionMenu>
    </header>
  );
}

function CollectionsSidebar({
  activeThreadId,
  onNavigate,
  includeActivity = true,
}: CollectionsViewProps) {
  const { status, threads, projects } = experimental_useSidebarThreads();
  const collectionsState = useCollections();
  const { isCollapsed, setAll, toggle } = useCollapsedCollections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [looseDropActive, setLooseDropActive] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [projectSort, setProjectSort] = useState<ProjectSort>("name-asc");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [chatSort, setChatSort] = useState<ChatSort>("recent");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const threadActions = experimental_useSidebarThreadActions();
  const rpc = useRpc<typeof rpcContract>();
  const [clearChatsOpen, setClearChatsOpen] = useState(false);
  const [clearChatsBusy, setClearChatsBusy] = useState(false);
  const [clearChatsError, setClearChatsError] = useState<string | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<ReadonlySet<string>>(new Set());

  const model = useMemo(
    () => buildSidebarModel(collectionsState.collections, projects, threads),
    [collectionsState.collections, projects, threads],
  );
  const collectionIds = useMemo(
    () => model.collections.map(({ collection }) => collection.id),
    [model.collections],
  );
  const allCollectionsCollapsed =
    collectionIds.length > 0 && collectionIds.every(isCollapsed);

  const visibleLooseProjects = useMemo(() => {
    const filtered = model.looseProjects.filter((entry) => {
      const hasChats = entry.threads.some((thread) => !thread.isArchived);
      if (projectFilter === "with-chats") return hasChats;
      if (projectFilter === "without-chats") return !hasChats;
      return true;
    });
    return [...filtered].sort((left, right) => {
      const order = left.project.name.localeCompare(right.project.name, undefined, {
        sensitivity: "base",
      });
      return projectSort === "name-asc" ? order : -order;
    });
  }, [model.looseProjects, projectFilter, projectSort]);

  const visibleChats = useMemo(() => {
    const chats = (model.personalProject?.threads ?? []).filter((thread) => {
      if (thread.isArchived) return false;
      if (chatFilter === "unread") return thread.isUnread;
      if (chatFilter === "pinned") return thread.isPinned;
      return true;
    });
    return [...chats].sort((left, right) => {
      if (chatSort === "name-asc") {
        return threadTitle(left).localeCompare(threadTitle(right), undefined, {
          sensitivity: "base",
        });
      }
      return chatSort === "recent"
        ? right.updatedAt - left.updatedAt
        : left.updatedAt - right.updatedAt;
    });
  }, [chatFilter, chatSort, model.personalProject]);

  const bulkChats = useMemo(
    () => (model.personalProject?.threads ?? []).filter((thread) => !thread.isArchived),
    [model.personalProject],
  );
  const selectedBulkChats = bulkChats.filter((thread) => selectedChatIds.has(thread.id));

  const chatViewItems = useMemo<readonly ActionMenuItem[]>(
    () => [
      {
        id: "chat-sort-recent",
        label: "Sort by newest",
        disabled: chatSort === "recent",
        onSelect: () => setChatSort("recent"),
      },
      {
        id: "chat-sort-oldest",
        label: "Sort by oldest",
        disabled: chatSort === "oldest",
        onSelect: () => setChatSort("oldest"),
      },
      {
        id: "chat-sort-name-asc",
        label: "Sort A to Z",
        disabled: chatSort === "name-asc",
        onSelect: () => setChatSort("name-asc"),
      },
      {
        id: "chat-filter-all",
        label: "Show all chats",
        disabled: chatFilter === "all",
        onSelect: () => setChatFilter("all"),
      },
      {
        id: "chat-filter-unread",
        label: "Only unread chats",
        disabled: chatFilter === "unread",
        onSelect: () => setChatFilter("unread"),
      },
      {
        id: "chat-filter-pinned",
        label: "Only pinned chats",
        disabled: chatFilter === "pinned",
        onSelect: () => setChatFilter("pinned"),
      },
    ],
    [chatFilter, chatSort],
  );

  const projectViewItems = useMemo<readonly ActionMenuItem[]>(
    () => [
      {
        id: "sort-name-asc",
        label: "Sort A to Z",
        disabled: projectSort === "name-asc",
        onSelect: () => setProjectSort("name-asc"),
      },
      {
        id: "sort-name-desc",
        label: "Sort Z to A",
        disabled: projectSort === "name-desc",
        onSelect: () => setProjectSort("name-desc"),
      },
      {
        id: "filter-all",
        label: "Show all projects",
        disabled: projectFilter === "all",
        onSelect: () => setProjectFilter("all"),
      },
      {
        id: "filter-with-chats",
        label: "Only projects with chats",
        disabled: projectFilter === "with-chats",
        onSelect: () => setProjectFilter("with-chats"),
      },
      {
        id: "filter-without-chats",
        label: "Only projects without chats",
        disabled: projectFilter === "without-chats",
        onSelect: () => setProjectFilter("without-chats"),
      },
    ],
    [projectFilter, projectSort],
  );

  const clearChats = async () => {
    if (clearChatsBusy) return;
    setClearChatsBusy(true);
    setClearChatsError(null);
    try {
      const { deletedCount } = await rpc.call(
        "chats_clear",
        bulkDelete ? { threadIds: selectedBulkChats.map((thread) => thread.id) } : {},
      );
      toast.success(
        deletedCount === 0
          ? "No inactive chats to clear"
          : `Cleared ${deletedCount} inactive chat${deletedCount === 1 ? "" : "s"}`,
      );
      setClearChatsOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setClearChatsError(message);
      toast.error("Could not clear chats", { description: message });
    } finally {
      setClearChatsBusy(false);
    }
  };

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
      const sourceCollectionId =
        collectionsState.collections.find((collection) =>
          collection.projectIds.includes(projectId),
        )?.id ?? null;
      if (sourceCollectionId === null && collectionId === null) return;

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
      {!includeActivity ? (
        <SidebarHeader
          onCreateCollection={openCreate}
          onRefresh={() => void collectionsState.refresh()}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-3">
      <div className="mb-1 flex items-center justify-between px-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Collections
        </span>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={
              allCollectionsCollapsed
                ? "Show all collections"
                : "Collapse all collections"
            }
            onClick={() => setAll(collectionIds, !allCollectionsCollapsed)}
          >
            <Icon
              name="ChevronDown"
              className={`size-4 transition-transform motion-reduce:transition-none ${
                allCollectionsCollapsed ? "" : "rotate-180"
              }`}
              aria-hidden="true"
            />
          </Button>
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

          {model.collections.length === 0 ? (
            <div className="mx-1.5 rounded-md border border-dashed border-border/70 px-3 py-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                No collections yet
              </p>
              <button
                type="button"
                className="mt-1 text-[11px] font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={openCreate}
              >
                Create your first collection
              </button>
            </div>
          ) : null}

          <div
            className={`mt-3 border-t border-border/60 pt-2 ${
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
            <div className="group mb-1 flex items-center justify-between px-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Projects
              </span>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  aria-label={projectsExpanded ? "Collapse all projects" : "Show all projects"}
                  onClick={() => setProjectsExpanded((current) => !current)}
                >
                  <Icon
                    name="ChevronDown"
                    className={`size-4 transition-transform motion-reduce:transition-none ${
                      projectsExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </Button>
                <ActionMenu
                  label="Sort and filter projects"
                  items={projectViewItems}
                  triggerClassName="opacity-100"
                >
                  <Icon name="SlidersHorizontal" className="size-4" aria-hidden="true" />
                </ActionMenu>
              </div>
            </div>

            {visibleLooseProjects.length > 0 ? (
              <ul className="space-y-px" aria-label="Projects">
                {visibleLooseProjects.map((entry, index) => (
                  <ProjectGroup
                    key={entry.project.id}
                    project={entry.project}
                    threads={entry.threads}
                    activeThreadId={activeThreadId}
                    onNavigate={onNavigate}
                    currentCollectionId={null}
                    projectIndex={index}
                    onMoveProject={moveProject}
                    onError={reportError}
                    expandedOverride={projectsExpanded}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                {model.looseProjects.length === 0
                  ? "No ungrouped projects"
                  : "No projects match this filter"}
              </p>
            )}
          </div>

          {model.personalProject !== null ? (
            <div className="mt-3 border-t border-border/60 pt-2">
              <div className="mb-1 flex items-center justify-between px-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Chats
                </span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    aria-label={chatsExpanded ? "Collapse all chats" : "Show all chats"}
                    onClick={() => setChatsExpanded((current) => !current)}
                  >
                    <Icon
                      name="ChevronDown"
                      className={`size-4 transition-transform motion-reduce:transition-none ${
                        chatsExpanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    aria-label="New chat"
                    onClick={() =>
                      threadActions.openNewThread({
                        projectId: model.personalProject!.project.id,
                        focusPrompt: true,
                      })
                    }
                  >
                    <Icon name="MessageSquarePlus" className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label="Clear chats"
                    onClick={() => {
                      setClearChatsError(null);
                      setBulkDelete(false);
                      setSelectedChatIds(new Set());
                      setClearChatsOpen(true);
                    }}
                  >
                    <Icon name="Trash2" className="size-4" aria-hidden="true" />
                  </Button>
                  <ActionMenu
                    label="Sort and filter chats"
                    items={chatViewItems}
                    triggerClassName="opacity-100"
                  >
                    <Icon name="SlidersHorizontal" className="size-4" aria-hidden="true" />
                  </ActionMenu>
                </div>
              </div>

              {chatsExpanded ? (
                visibleChats.length > 0 ? (
                  <ul className="space-y-px" aria-label="Chats">
                    {visibleChats.map((thread) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        activeThreadId={activeThreadId}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-1 text-[11px] text-muted-foreground">
                    {chatFilter === "all" ? "No chats yet" : "No chats match this filter"}
                  </p>
                )
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {status === "ready" && !collectionsState.isLoading && model.collections.length === 0 && model.looseProjects.length === 0 && model.personalProject === null ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">
          No projects yet. Create a collection when you are ready to organize them.
        </p>
      ) : null}

      <NameDialog
        open={dialogOpen}
        title={editingCollection === null ? "New collection" : "Rename collection"}
        description={
          editingCollection === null
            ? "Group related BB projects together in the sidebar."
            : "Choose a name for this collection. Projects and threads stay unchanged."
        }
        initialName={editingCollection?.name ?? ""}
        submitLabel={editingCollection === null ? "Create" : "Save"}
        placeholder="e.g. Work projects"
        onOpenChange={setDialogOpen}
        onSubmit={submitCollection}
      />
      <Dialog
        open={clearChatsOpen}
        onOpenChange={(open) => {
          if (!open && !clearChatsBusy) {
            setClearChatsOpen(false);
            setClearChatsError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear chats?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Running chats, chats needing attention, and chats with errors will be kept.
            </DialogDescription>
          </DialogHeader>
          <BulkThreadPicker
            enabled={bulkDelete}
            onEnabledChange={setBulkDelete}
            threads={bulkChats}
            selectedIds={selectedChatIds}
            onSelectedIdsChange={setSelectedChatIds}
            disabled={clearChatsBusy}
            listLabel="Chats to delete"
            emptyLabel="No chats to delete"
          />
          {clearChatsError !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {clearChatsError}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={clearChatsBusy}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={clearChatsBusy || (bulkDelete && selectedBulkChats.length === 0)}
              onClick={() => void clearChats()}
            >
              {clearChatsBusy
                ? "Clearing…"
                : bulkDelete
                  ? `Delete ${selectedBulkChats.length} selected`
                  : "Clear chats"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  app.slots.experimental_appOverlay({
    id: "activity-palette",
    component: ActivityPalette,
  });
  app.slots.experimental_sidebarNavigation({
    id: "compact-actions",
    title: "Hmm Sidebar actions",
    description:
      "Keep New thread and Search threads visible, with remaining navigation inside More.",
    component: CompactSidebarNavigation,
  });
  app.slots.experimental_threadList({
    id: "collections",
    title: "Hmm Sidebar",
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
