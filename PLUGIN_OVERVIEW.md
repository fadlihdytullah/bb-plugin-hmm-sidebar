Hmm Sidebar adds a calm, compact project organizer to BB's left sidebar. The
Chat/Code view toggle sits inline with BB's New thread button, with a filter box
below for narrowing threads by title or project. Threads that need you sit in
their own section above Collections, and projects that have not been filed remain in the
same flat list shape as BB's native sidebar.

Create, rename, reorder, collapse, and delete Collections without changing BB
projects themselves. Each Collection can be toggled individually, and every
titled section (Pinned, Collections, Chats) can be hidden or shown by clicking
its header. Drag a project onto a Collection to move it. Project action menus
keep Rename project and Delete project, plus Clear threads for removing
inactive threads while preserving running, attention, and error threads.
The personal Chats header also provides Clear chats with the same protection. Both clear
dialogs offer Bulk deletions to pick specific threads or chats to delete.
Deleting a Collection simply returns its projects to the ungrouped list. The
personal Threads project is protected and remains outside every Collection.
Pin project in a project's action menu adds it to a Pinned section that stays
fixed above Collections, just below the sidebar header, for the projects in
focus right now. Pinned projects also stay in their usual place.

Thread rows continue to use BB's own navigation and actions: unread state,
BB's own thread menu (pin, rename, archive, notification muting, and any action
BB adds later), delete confirmation, keyboard shortcuts, and split view
gestures. A header toggle separates project threads from non-project chats. Rows use a
loose layout like BB's default list, and
empty projects show only their header. The list stays muted: idle threads are
dimmed, while the open thread and threads that are running or need attention
stand out, and running thread titles shimmer. Projects and Chats show up to five threads and Collections up to five
projects, with a faded **Show N more** toggle that never hides anything open,
running, or needing attention. Clicking a Collection or project name toggles it,
and section header actions appear on hover. Collection data is stored in the plugin's namespaced SQLite
database and updates are broadcast to other open clients.

The Activity view is available as a floating palette with **Cmd+E**;
search matches thread titles and project names, All / Unread / Pinned / Running
filters and a Recent or A–Z order narrow the results, arrow keys move through the
results, **Enter** opens the selected thread, and **Cmd+Enter** opens a split.
Recents lists the five most recently active threads, and each row shows a status dot, the
title, and the project name, which a split button replaces on hover.
The palette is centered horizontally at 15% from the top of BB's main chat
container, and stays a centered dialog on narrow windows instead of becoming a
bottom drawer. The new-thread-in-split dialog behaves the same way.

**New thread in split** in the command palette (**Cmd+Shift+P**)
opens BB's full new-thread composer in a dialog and opens the started thread in
a split, only in the window that ran the command. **Delete current thread** (**Cmd+Shift+Backspace**) opens BB's delete confirmation for the
current thread or the focused split pane.

**Zen mode current thread** in the command palette (**Cmd+Shift+Enter**) opens the current thread, or the focused split
pane, in a bottom-placed dialog over a blurred glass overlay, stacked with two card layers and a
pixel "zen" wordmark below, with the thread name centered in a compact header and Esc or a dimmed
close button on the right to dismiss. A context ring beside the permission label shows estimated
context usage, with used and left tokens on hover.

**Check me later** in the command palette covers the current thread, or the focused split pane,
with a blurred glass overlay showing a pixel "check me" wordmark (incognito-style pixel font) and the thread title. Clicking
the cover reveals the thread again. Covers only show on thread routes, so Settings and other pages stay usable.

The plugin also restyles BB's pane side gutters: the dotted background is removed and the zebra stripes fill the whole gutter. Stripes show only on panes at least 768px wide, so narrow split panes stay clean.

Because BB's thread-list replacement slot is exclusive, selecting Hmm Sidebar uses
one composed list.

Repository: [fadlihdytullah/bb-plugin-hmm-sidebar](https://github.com/fadlihdytullah/bb-plugin-hmm-sidebar)
