export const DELETE_THREAD_EVENT = "hmm-sidebar:delete-thread";
export const DELETE_CURRENT_THREAD_EVENT = "hmm-sidebar:delete-current-thread";

export function requestThreadDelete(threadId: string): void {
  window.dispatchEvent(new CustomEvent<string>(DELETE_THREAD_EVENT, { detail: threadId }));
}
