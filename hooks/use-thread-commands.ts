import { useMemo } from "react";
import { useBbNavigate, useRpc } from "@get-bb/plugin-sdk/app";
import { rpcContract } from "@/contract";

export interface ThreadCommands {
  open(threadId: string, options?: { split?: boolean }): void;
  openNewThread(options?: { projectId?: string; focusPrompt?: boolean }): void;
  setPinned(threadId: string, pinned: boolean): Promise<void>;
}

export function useThreadCommands(): ThreadCommands {
  const navigate = useBbNavigate();
  const rpc = useRpc<typeof rpcContract>();
  return useMemo<ThreadCommands>(
    () => ({
      open: (threadId, options) => navigate.toThread(threadId, options),
      openNewThread: (options) => navigate.toCompose(options),
      setPinned: async (threadId, pinned) => {
        await rpc.call("threads_set_pinned", { threadId, pinned });
      },
    }),
    [navigate, rpc],
  );
}
