# Hmm Sidebar

Groups BB projects into collapsible Collections while keeping the built-in
thread actions, keyboard shortcuts, and split navigation.

Install the plugin from this directory:

```sh
bb plugin install .
```

Then select **Hmm Sidebar** under **Settings → Appearance → Sidebar**.
BB allows only one plugin to replace the thread list, so this plugin includes
the **Active Chats Sidebar** activity panel when it is selected. If
`active-chats-sidebar` is selected instead, the Collections folder button is
available in the sidebar footer as an additive disclosure.

Active chats continue to appear automatically while agents are working or
need attention. Pin a chat anywhere in BB—or directly from Activity or
Recents—to keep it in Activity while it is idle.

Collections are plugin-owned state. Create one with the folder-plus button,
drag projects into it, or use a project's action menu. Collection names and
membership are shared across clients; collapsed state is kept per client.
Deleting a Collection returns its projects to the flat list and does not delete
the projects or threads. The personal **Threads** project is always kept out of
Collections.

Build and test locally:

```sh
npm run typecheck
npm test
bb plugin build
```
