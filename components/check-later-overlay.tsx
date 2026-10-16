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
import { usePortalScopeProps } from "@/lib/portal-scope";

const GLYPHS: Record<string, readonly string[]> = {
  c: ["01110", "10001", "10000", "10001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001"],
  e: ["01110", "10001", "11111", "10000", "01110"],
  k: ["10010", "10100", "11000", "10100", "10010"],
  m: ["10001", "11011", "10101", "10001", "10001"],
};

const GLASS: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
};

const WORD = "check me";
const CELL = 4;

function Wordmark() {
  const cells: { x: number; y: number }[] = [];
  let cursor = 0;
  for (const char of WORD) {
    const glyph = GLYPHS[char];
    if (glyph === undefined) {
      cursor += 3;
      continue;
    }
    glyph.forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === "1") cells.push({ x: cursor + x, y });
      });
    });
    cursor += 6;
  }
  const width = (cursor - 1) * CELL;
  return (
    <svg
      viewBox={`0 0 ${width} ${5 * CELL}`}
      className="h-12 w-auto text-white/25"
      fill="currentColor"
      aria-label="check me"
      role="img"
    >
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x * CELL}
          y={y * CELL}
          width={CELL}
          height={CELL}
        />
      ))}
    </svg>
  );
}

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
      className="absolute z-40 flex cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center focus-visible:outline-none"
    >
      <Wordmark />
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
        ? [{ key: activeThreadId, threadId: activeThreadId, style: { inset: 0 } }]
        : [];

  if (covers.length === 0) return null;

  return createPortal(
    <div {...portalScopeProps} style={{ display: "contents" }}>
      {covers.map(({ key, threadId, style }) => (
        <Cover key={key} threadId={threadId} title={titleOf(threadId)} style={style} />
      ))}
    </div>,
    container,
  );
}
