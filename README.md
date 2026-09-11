# Hmm Sidebar

Groups BB projects into collapsible Collections while keeping the built-in
thread actions, keyboard shortcuts, and split navigation. The primary sidebar
header is a single horizontal action bar: the BB logo stays on the left, while
New thread, Search threads, and More are compact icon buttons. New thread and
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

The installed runtime plugin ID is `bb-plugin-hmm-sidebar`. Reload it after a
local build with:

```sh
bb plugin reload bb-plugin-hmm-sidebar
```

Then select **Hmm Sidebar** under **Settings → Appearance → Sidebar**.
BB allows only one plugin to replace the thread list, so this plugin includes
the **Active Chats Sidebar** activity panel when it is selected. If
`active-chats-sidebar` is selected instead, the Collections folder button is
available in the sidebar footer as an additive disclosure.

Select **Hmm Sidebar actions** under **Settings → Appearance → Navigation** to
use the compact action bar. In **Customize sidebar**, optional host and plugin
actions can be checked or unchecked and the choice is remembered per BB client;
New thread and Search threads remain checked at all times.

Active chats continue to appear automatically while agents are working or
need attention. Pin a chat anywhere in BB—or directly from Activity or
Recents—to keep it in Activity while it is idle.

Collections are plugin-owned state. Create one with the folder-plus button,
drag projects into it, or use a project's action menu. The Collections header
also includes a collapse/expand-all button beside New collection. Collection
names and membership are shared across clients; collapsed state is kept per
client.
Deleting a Collection returns its projects to the flat list and does not delete
the projects or threads. The personal **Threads** project is always kept out of
Collections.

Build and test locally:

```sh
npm run typecheck
npm test
bb plugin build
```
