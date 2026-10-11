import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useThreadCommands } from "@/hooks/use-thread-commands";
import { OPEN_ACTIVITY_PALETTE_EVENT } from "@/lib/palette-event";

const SUIKODEV_WORDMARK_PATH =
  "M0 120h480v120h-480zM0 240h120v120h-120zM0 360h480v120h-480zM360 480h120v120h-120zM0 600h480v120h-480zM600 120h120v120h-120zM960 120h120v120h-120zM600 240h120v120h-120zM960 240h120v120h-120zM600 360h120v120h-120zM960 360h120v120h-120zM600 480h120v120h-120zM960 480h120v120h-120zM600 600h480v120h-480zM1200 0h120v120h-120zM1200 240h120v120h-120zM1200 360h120v120h-120zM1200 480h120v120h-120zM1200 600h120v120h-120zM1440 0h120v120h-120zM1440 120h120v120h-120zM1800 120h120v120h-120zM1440 240h120v120h-120zM1680 240h120v120h-120zM1440 360h240v120h-240zM1440 480h120v120h-120zM1680 480h120v120h-120zM1440 600h120v120h-120zM1800 600h120v120h-120zM2040 120h480v120h-480zM2040 240h120v120h-120zM2400 240h120v120h-120zM2040 360h120v120h-120zM2400 360h120v120h-120zM2040 480h120v120h-120zM2400 480h120v120h-120zM2040 600h480v120h-480zM3000 0h120v120h-120zM2640 120h480v120h-480zM2640 240h120v120h-120zM3000 240h120v120h-120zM2640 360h120v120h-120zM3000 360h120v120h-120zM2640 480h120v120h-120zM3000 480h120v120h-120zM2640 600h480v120h-480zM3240 120h480v120h-480zM3240 240h120v120h-120zM3600 240h120v120h-120zM3240 360h480v120h-480zM3240 480h120v120h-120zM3240 600h480v120h-480zM3840 120h120v120h-120zM4200 120h120v120h-120zM3840 240h120v120h-120zM4200 240h120v120h-120zM3840 360h120v120h-120zM4200 360h120v120h-120zM3840 480h120v120h-120zM4200 480h120v120h-120zM3960 600h240v120h-240z";

export function SidebarHeader() {
  const commands = useThreadCommands();

  return (
    <header
      aria-label="Hmm Sidebar"
      className="flex h-10 shrink-0 items-center justify-between px-3"
      data-testid="sidebar-brand"
    >
      <div className="flex items-center">
        <svg
          role="img"
          aria-label="suikodev"
          className="h-3.5 w-auto shrink-0 text-foreground"
          viewBox="0 0 4320 720"
          shapeRendering="crispEdges"
        >
          <path fill="currentColor" d={SUIKODEV_WORDMARK_PATH} />
        </svg>
        <h1 className="sr-only">Hmm Sidebar</h1>
      </div>
      <div
        role="toolbar"
        aria-label="Sidebar actions"
        className="flex items-center gap-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground"
          aria-label="New thread"
          onClick={() => commands.openNewThread({ focusPrompt: true })}
        >
          <Icon name="MessageSquarePlus" className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground"
          aria-label="Search threads"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ACTIVITY_PALETTE_EVENT))}
        >
          <Icon name="Search" className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
