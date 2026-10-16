# Hmm Sidebar

Groups BB projects into collapsible Collections while keeping the built-in
thread actions, keyboard shortcuts, and split navigation. The list starts with
a compact header: the pixel "suikodev" wordmark (the same one the mercury theme
draws above the new-thread composer) on the left, with New thread and Search
threads icon buttons on the right. Search threads opens the Activity palette.
The rest of bb's navigation lives in bb's own navigation rail (bb 0.46+).

Requires bb 0.46 or newer.

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

Threads you have not read yet are listed in an **Unread** section above
Collections; it is hidden when nothing is unread. Rows there are display-only
copies, so bb's numbered thread shortcuts keep pointing at the original rows.

Every thread row uses bb's own thread menu (the **...** button and
right-click), so new bb thread actions such as notification muting appear
without plugin changes. The hover trash button asks bb to confirm the delete.
**New thread in split** is also added to that menu.

Active chats continue to appear automatically while agents are working or
need attention. Pin a chat anywhere in BB—or directly from Activity or
Recents—to keep it in Activity while it is idle. Click anywhere on the **Activity**
header (or its hover chevron) to hide or show the section; the choice is
remembered per BB client.

Press **Cmd+E** to open the floating Activity palette from anywhere in BB.
Search by thread title or project, narrow it with the **All / Unread / Pinned /
Running** filters, switch between **Recent** and **A–Z** order, move through
Currently active, Needs attention, Pinned, and Recents with the arrow keys,
press **Enter** to open a thread, or **Cmd+Enter** to open it in a split. Recents lists the five most
recently active threads, including ones outside any project. Each
row shows a status dot, the thread title, and the project name on the right;
hovering a row swaps the project name for a split button. The
palette is centered horizontally at 15% from the top of BB's main chat
container, and stays a centered dialog on narrow windows instead of becoming a
bottom drawer. The new-thread-in-split dialog behaves the same way.

Run **New thread in split** from BB's command palette
(**Cmd+Shift+P**) to open BB's new-thread composer in a dialog, seeded with the
current project. Submitting starts the thread and opens it in a split in the
same BB window only; other open BB windows are unaffected. Bind a shortcut to it
under **Settings → Keyboard**.

**Hmm Sidebar: Delete current thread** (**Cmd+Shift+Backspace**, shown as
Cmd+Shift+Delete on macOS) opens BB's own delete confirmation for the current
thread, or for the focused pane when a split is open.

**Zen mode current thread** (command palette) opens the current thread, or the focused pane when
a split is open, in a centered dialog over a dark overlay. The header shows the
thread name above a separator; **Esc** or the close button dismisses it.

Collections are plugin-owned state. Create one with the folder-plus button or
drag projects into it. Collection names and membership are shared across
clients; a Collection's collapsed state is kept per client.
Project action menus keep Rename project and Delete project, and Clear threads
removes inactive threads while preserving running, attention, and error threads.
The personal Chats header also provides Clear chats with the same protection. Both clear
dialogs offer Bulk deletions to pick specific threads or chats to delete.
Deleting a Collection returns its projects to the flat list and does not delete
the projects or threads. The personal **Threads** project is always kept out of
Collections.

**Pin project** (and **Unpin project**) in a project's action menu adds it to a
**Pinned** section fixed above Collections, just below the sidebar header, so
the projects in focus right now stay visible while the rest of the list scrolls.
Pinned projects also stay in their usual place. Pins are kept per client.

Rows use a compact density: thread rows are 20px tall, project and Collection
rows 24px, and their hover actions shrink to match. Projects with no threads
show only their header, without a placeholder row. Click a Collection or project
name to expand or collapse it, not just its icon. Each section (Pinned,
Collections, Projects, Chats, Activity) can be hidden or shown by clicking
anywhere on its header; section header actions appear on hover or focus, and
always on touch screens.

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
