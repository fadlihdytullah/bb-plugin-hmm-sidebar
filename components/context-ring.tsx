import { useEffect, useState } from "react";
import { useSdk } from "@get-bb/plugin-sdk/app";

interface Usage {
  used: number;
  total: number;
}

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function compact(tokens: number): string {
  if (tokens >= 1_000_000) return `${+(tokens / 1_000_000).toFixed(1)}m`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return String(tokens);
}

export function ContextRing({ threadId }: { threadId: string }) {
  const sdk = useSdk();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      sdk.threads
        .context({ threadId, signal: controller.signal })
        .then(({ usage: next }) =>
          setUsage(next ? { used: next.usedTokens, total: next.modelContextWindow } : null),
        )
        .catch((error) => console.warn("zen context usage failed", error));
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [sdk, threadId]);

  const known = usage !== null && usage.total > 0;
  const ratio = known ? Math.min(1, usage.used / usage.total) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <span className="group/ctx absolute bottom-2.5 right-3 z-50 inline-flex size-8 items-center justify-center">
      <svg
        viewBox="0 0 20 20"
        className="size-5 -rotate-90 text-muted-foreground"
        role="img"
        aria-label={`Context ${percent}% used`}
      >
        <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-56 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md group-hover/ctx:block"
      >
        <span className="flex items-center justify-between">
          <span>Estimated context</span>
          <span className="tabular-nums">{known ? `${percent}% used` : "unavailable"}</span>
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${percent}%` }} />
        </span>
        <span className="mt-2 flex items-center justify-between text-muted-foreground">
          <span className="tabular-nums">
            {known ? `${compact(usage.used)} / ${compact(usage.total)} tokens` : "no data yet"}
          </span>
          <span className="tabular-nums">{known ? `${100 - percent}% left` : ""}</span>
        </span>
      </span>
    </span>
  );
}
