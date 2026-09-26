# Hmm Sidebar

Groups BB projects into collapsible Collections while keeping the built-in
thread actions, keyboard shortcuts, and split navigation. The primary sidebar
header is a single compact action bar: the pixel "suikodev" wordmark (the same
one the mercury theme draws above the new-thread composer) stays on the left,
while New thread, Search threads, and More are compact icon buttons. New thread and
Search threads are always visible and cannot be unchecked; More always opens the
remaining navigation and a compact Customize sidebar menu.

Repository: [fadlihdytullah/bb-plugin-hmm-sidebar](https://github.com/fadlihdytullah/bb-plugin-hmm-sidebar)

Install the plugin from the repository:

```sh
bb plugin install https://github.com/fadlihdytullah/bb-plugin-hmm-sidebar.git
```

For local development, install it from this directory:

```sh
bb plugin install .
```

The installed runtime plugin ID is `hmm-sidebar`. Reload it after a
local build with:

```sh
bb plugin reload hmm-sidebar
```

Then select **Hmm Sidebar** under **Settings → Appearance → Sidebar**.
BB allows only one plugin to replace the thread list, so this plugin includes
the **Active Chats Sidebar** activity panel when it is selected.

Select **Hmm Sidebar actions** under **Settings → Appearance → Navigation** to
use the compact action bar. In **Customize sidebar**, optional host and plugin
actions can be checked or unchecked and the choice is remembered per BB client;
New thread and Search threads remain checked at all times.

Active chats continue to appear automatically while agents are working or
need attention. Pin a chat anywhere in BB—or directly from Activity or
Recents—to keep it in Activity while it is idle. Click the **Activity** header
to hide or show the section; the choice is remembered per BB client.

Press **Cmd+E** to open the floating Activity palette from anywhere in BB.
Search by thread title or project, move through Currently active, Needs
attention, Pinned, and Recents with the arrow keys, press **Enter** to open a
thread, or **Cmd+Enter** to open it in a split. Recents always lists up to five
threads: ones opened from Activity first, then the most recently active. Each
row shows a status dot, the thread title, and a project badge on the right. The
palette is centered horizontally at 15% from the top of BB's main chat
container.

Run **Hmm Sidebar: New thread in split** from BB's command palette
(**Cmd+Shift+P**) to open BB's new-thread composer in a dialog, seeded with the
current project. Submitting starts the thread and opens it in a split in the
same BB window only; other open BB windows are unaffected. Bind a shortcut to it
under **Settings → Keyboard**.

**Hmm Sidebar: Delete current thread** (**Cmd+Shift+Backspace**, shown as
Cmd+Shift+Delete on macOS) opens BB's own delete confirmation for the current
thread, or for the focused pane when a split is open.

Collections are plugin-owned state. Create one with the folder-plus button or
drag projects into it. The Collections header also includes a
collapse/expand-all button beside New collection. Collection names and
membership are shared across clients; collapsed state is kept per client.
Project action menus keep Rename project and Delete project, and Clear threads
removes inactive threads while preserving running, attention, and error threads.
The personal Chats header also provides Clear chats with the same protection. Both clear
dialogs offer Bulk deletions to pick specific threads or chats to delete.
Deleting a Collection returns its projects to the flat list and does not delete
the projects or threads. The personal **Threads** project is always kept out of
Collections.

**Pin project** (and **Unpin project**) in a project's action menu adds it to a
**Pinned** section fixed above Collections, just below the navigation bar, so
the projects in focus right now stay visible while the rest of the list scrolls.
Pinned projects also stay in their usual place. Pins are kept per client.

Rows use a compact density: thread rows are 20px tall, project and Collection
rows 24px, and their hover actions shrink to match. Projects with no threads
show only their header, without a placeholder row. Click a Collection or project
name to expand or collapse it, not just its icon. Section header actions
(Collections, Projects, Chats) appear on hover or focus, and always on touch
screens.

The list stays muted so only what matters stands out: idle threads are dimmed,
while the open thread and threads that are running or need attention (unread,
waiting for input, errors) are shown at full strength. Each project and the
Chats list show up to five threads, and each Collection up to five projects,
with a faded last row and a **Show N more** / **Show less** toggle. Threads (and
projects holding threads) that are open, running, or need attention are never
hidden by the limit.

Build and test locally:

```sh
npm run typecheck
npm test
bb plugin build
```
