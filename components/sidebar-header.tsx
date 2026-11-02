import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { setSidebarMode, useSidebarMode } from "@/hooks/use-sidebar-mode";
import { usePortalScopeProps } from "@/lib/portal-scope";

const HOST_HEADER_SLOT = '[data-testid="sidebar-header-slot"]';
const HOST_NEW_THREAD_CSS = `${HOST_HEADER_SLOT} > [data-bb-plugin="navigation"] > button { flex: 0 1 auto; padding-right: 0.75rem; }`;

const MODES = [
  { mode: "chat", label: "Chat threads", icon: "MessageSquare" },
  { mode: "code", label: "Project threads", icon: "Code" },
] as const;

export function SidebarHeader() {
  const activeMode = useSidebarMode();
  const portalScopeProps = usePortalScopeProps();
  const [hostSlot, setHostSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setHostSlot(document.querySelector<HTMLElement>(HOST_HEADER_SLOT));
  }, []);

  const toolbar = (
    <div
      role="toolbar"
      aria-label="Sidebar actions"
      className={`flex shrink-0 items-center gap-1 ${hostSlot !== null ? "ml-auto mr-2.5" : ""}`}
    >
      <div
        role="group"
        aria-label="Sidebar view"
        className="flex items-center gap-px rounded-md bg-sidebar-accent/60 p-px"
      >
        {MODES.map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={activeMode === mode}
            className={`flex size-6 items-center justify-center rounded-[5px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              activeMode === mode
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSidebarMode(mode)}
          >
            <Icon name={icon} className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );

  if (hostSlot !== null) {
    return createPortal(
      <div {...portalScopeProps} style={{ display: "contents" }}>
        <style>{HOST_NEW_THREAD_CSS}</style>
        {toolbar}
      </div>,
      hostSlot,
    );
  }

  return (
    <header
      aria-label="Hmm Sidebar"
      className="flex h-10 shrink-0 items-center justify-end gap-2 px-3"
      data-testid="sidebar-brand"
    >
      {toolbar}
    </header>
  );
}
