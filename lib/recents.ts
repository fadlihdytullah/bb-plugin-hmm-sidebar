/** How many recently opened threads the Activity panel keeps. */
export const RECENTS_LIMIT = 5;

export function enqueueRecent(
  ids: readonly string[],
  id: string,
  limit = RECENTS_LIMIT,
): readonly string[] {
  if (ids.includes(id)) return ids;
  return [...ids, id].slice(-limit);
}
