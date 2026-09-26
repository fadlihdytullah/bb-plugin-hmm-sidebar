Hmm Sidebar adds a calm, compact project organizer to BB's left sidebar. Its
primary header is a single compact action bar: the pixel "suikodev" wordmark
stays on the left, while New thread, Search threads, and More are icon-only
actions. New thread and
Search threads are always visible and cannot be unchecked. More remains available
even when every optional action is hidden, and contains Customize sidebar plus
the selected extra navigation. Collections stay at the top, while projects that
have not been filed remain in the same flat list shape as BB's native sidebar.

Create, rename, reorder, collapse, and delete Collections without changing BB
projects themselves. The Collections header includes a collapse/expand-all
button beside New collection, while each Collection can still be toggled
individually. Drag a project onto a Collection to move it. Project action menus
keep Rename project and Delete project, plus Clear threads for removing
inactive threads while preserving running, attention, and error threads.
The personal Chats header also provides Clear chats with the same protection. Both clear
dialogs offer Bulk deletions to pick specific threads or chats to delete.
Deleting a Collection simply returns its projects to the ungrouped list. The
personal Threads project is protected and remains outside every Collection.
Pin project in a project's action menu adds it to a Pinned section that stays
fixed above Collections, just below the navigation bar, for the projects in
focus right now. Pinned projects also stay in their usual place.

Thread rows continue to use BB's own navigation and actions: unread state,
pinning, rename, archive, delete confirmation, keyboard shortcuts, and split
view gestures. Rows use a compact density so more threads fit on screen, and
empty projects show only their header. The list stays muted: idle threads are
dimmed, while the open thread and threads that are running or need attention
stand out. Projects and Chats show up to five threads and Collections up to five
projects, with a faded **Show N more** toggle that never hides anything open,
running, or needing attention. Clicking a Collection or project name toggles it,
and section header actions appear on hover. Collection data is stored in the plugin's namespaced SQLite
database and updates are broadcast to other open clients.

The sidebar also keeps the Active Chats activity panel visible. Working chats
appear automatically, while pinned chats remain visible after becoming idle.
BB's native pin state is respected and can be toggled from Activity or Recents.
The Activity section can be collapsed from its header, and the choice persists.
The same Activity view is available as a floating palette with **Cmd+E**;
search matches thread titles and project names, arrow keys move through the
results, **Enter** opens the selected thread, and **Cmd+Enter** opens a split.
Recents always lists up to five threads, and each row shows a status dot, the
title, and a project badge.
The palette is centered horizontally at 15% from the top of BB's main chat
container.

**Hmm Sidebar: New thread in split** in the command palette (**Cmd+Shift+P**)
opens BB's full new-thread composer in a dialog and opens the started thread in
a split, only in the window that ran the command. **Hmm Sidebar: Delete current
thread** (**Cmd+Shift+Backspace**) opens BB's delete confirmation for the
current thread or the focused split pane.

Because BB's thread-list replacement slot is exclusive, selecting Hmm Sidebar uses
one composed list.

Repository: [fadlihdytullah/bb-plugin-hmm-sidebar](https://github.com/fadlihdytullah/bb-plugin-hmm-sidebar)
