import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import type { Collection } from "../contract";

export interface ProjectGroup {
  project: PluginSidebarProject;
  threads: readonly PluginSidebarThread[];
}

export interface CollectionGroup {
  collection: Collection;
  projects: readonly ProjectGroup[];
}

export interface SidebarModel {
  collections: readonly CollectionGroup[];
  looseProjects: readonly ProjectGroup[];
  personalProject: ProjectGroup | null;
}

function projectGroup(
  project: PluginSidebarProject,
  threadsByProject: ReadonlyMap<string, readonly PluginSidebarThread[]>,
): ProjectGroup {
  return { project, threads: threadsByProject.get(project.id) ?? [] };
}

export function buildSidebarModel(
  collections: readonly Collection[],
  projects: readonly PluginSidebarProject[],
  threads: readonly PluginSidebarThread[],
): SidebarModel {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const threadsByProject = new Map<string, PluginSidebarThread[]>();
  for (const thread of threads) {
    const projectThreads = threadsByProject.get(thread.projectId) ?? [];
    projectThreads.push(thread);
    threadsByProject.set(thread.projectId, projectThreads);
  }
  const assignedProjectIds = new Set<string>();

  const collectionGroups = collections.map((collection) => {
    const collectionProjects = collection.projectIds
      .map((id) => projectById.get(id))
      .filter(
        (project): project is PluginSidebarProject =>
          project !== undefined && !project.isPersonal,
      )
      .map((project) => {
        assignedProjectIds.add(project.id);
        return projectGroup(project, threadsByProject);
      });
    return { collection, projects: collectionProjects };
  });

  const looseProjects = projects
    .filter(
      (project) => !project.isPersonal && !assignedProjectIds.has(project.id),
    )
    .map((project) => projectGroup(project, threadsByProject));
  const personalProject =
    projects.find((project) => project.isPersonal) ?? null;

  return {
    collections: collectionGroups,
    looseProjects,
    personalProject: personalProject
      ? projectGroup(personalProject, threadsByProject)
      : null,
  };
}

export function threadTitle(thread: PluginSidebarThread): string {
  return thread.title?.trim() || thread.titleFallback?.trim() || "Untitled thread";
}

export function projectThreadGroups(
  threads: readonly PluginSidebarThread[],
): ReadonlyMap<string, readonly PluginSidebarThread[]> {
  const groups = new Map<string, PluginSidebarThread[]>();
  for (const thread of threads) {
    const group = groups.get(thread.projectId) ?? [];
    group.push(thread);
    groups.set(thread.projectId, group);
  }
  return groups;
}
