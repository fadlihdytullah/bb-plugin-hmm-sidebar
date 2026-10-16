import { createPortal } from "react-dom";
import {
  experimental_useSidebarThreads,
  useSidebarSplitLayout,
} from "@get-bb/plugin-sdk/app";
import { threadTitle } from "@/lib/activity-model";
import {
  clearCheckLater,
  useActiveThreadId,
  useCheckLaterIds,
} from "@/lib/check-later";
import { Wordmark } from "@/components/wordmark";
import { usePortalScopeProps } from "@/lib/portal-scope";

const GLASS: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
};

function Cover({
  threadId,
  title,
  style,
}: {
  threadId: string;
  title: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      data-testid="check-later-cover"
      aria-label={`Uncover ${title}`}
      onClick={() => clearCheckLater(threadId)}
      style={{ ...style, ...GLASS }}
      className="absolute z-[49] flex cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center focus-visible:outline-none"
    >
      <Wordmark word="check me" />
      <span className="max-w-full truncate text-sm text-muted-foreground">
        {title}
      </span>
    </button>
  );
}

export function CheckLaterOverlay() {
  const { threads } = experimental_useSidebarThreads();
  const split = useSidebarSplitLayout();
  const activeThreadId = useActiveThreadId();
  const marked = useCheckLaterIds();
  const portalScopeProps = usePortalScopeProps();
  const container =
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>('main[data-sidebar="inset"]');

  if (container === null || marked.length === 0) return null;

  const titleOf = (threadId: string) => {
    const thread = threads.find((candidate) => candidate.id === threadId);
    return thread ? threadTitle(thread) : "";
  };

  const covers =
    split !== null
      ? split.panes.flatMap((pane) =>
          pane.threadId !== null && marked.includes(pane.threadId)
            ? [
                {
                  key: pane.paneId,
                  threadId: pane.threadId,
                  style: {
                    left: `${pane.rect.x * 100}%`,
                    top: `${pane.rect.y * 100}%`,
                    width: `${pane.rect.width * 100}%`,
                    height: `${pane.rect.height * 100}%`,
                  },
                },
              ]
            : [],
        )
      : activeThreadId !== null && marked.includes(activeThreadId)
        ? [
            {
              key: activeThreadId,
              threadId: activeThreadId,
              style: { inset: 0 },
            },
          ]
        : [];

  if (covers.length === 0) return null;

  return createPortal(
    <div {...portalScopeProps} style={{ display: "contents" }}>
      {covers.map(({ key, threadId, style }) => (
        <Cover
          key={key}
          threadId={threadId}
          title={titleOf(threadId)}
          style={style}
        />
      ))}
    </div>,
    container,
  );
}
