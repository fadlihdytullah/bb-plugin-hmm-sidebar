Hmm Sidebar adds a calm, compact project organizer to BB's left sidebar. Its
primary header is a single horizontal action bar: the BB logo stays on the left,
while New thread, Search threads, and More are icon-only actions. New thread and
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
The personal Chats header also provides Clear chats with the same protection.
Deleting a Collection simply returns its projects to the ungrouped list. The
personal Threads project is protected and remains outside every Collection.

Thread rows continue to use BB's own navigation and actions: unread state,
pinning, rename, archive, delete confirmation, keyboard shortcuts, and split
view gestures. Collection data is stored in the plugin's namespaced SQLite
database and updates are broadcast to other open clients.

The sidebar also keeps the Active Chats activity panel visible. Working chats
appear automatically, while pinned chats remain visible after becoming idle.
BB's native pin state is respected and can be toggled from Activity or Recents.
The same Activity view is available as a floating palette with **Cmd+E**;
search matches thread titles and project names, arrow keys move through the
results, **Enter** opens the selected thread, and **Cmd+Enter** opens a split.
The palette is centered within BB's main chat container.
Because BB's thread-list replacement slot is exclusive, selecting Hmm Sidebar uses
one composed list; selecting Active Chats Sidebar keeps its list and exposes
Collections through the footer disclosure.

Repository: [fadlihdytullah/bb-plugin-hmm-sidebar](https://github.com/fadlihdytullah/bb-plugin-hmm-sidebar)
