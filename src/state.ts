import { env } from "./env";

type NotifierState = {
  lastNotifiedFetchedAt: number;
  notifiedChapterIds: number[];
};

const MAX_TRACKED_IDS = 300;

function emptyState(): NotifierState {
  return { lastNotifiedFetchedAt: 0, notifiedChapterIds: [] };
}

export async function loadState(): Promise<NotifierState> {
  const file = Bun.file(env.stateFilePath);
  if (!(await file.exists())) return emptyState();
  return (await file.json()) as NotifierState;
}

export async function saveState(state: NotifierState): Promise<void> {
  const trimmed: NotifierState = {
    lastNotifiedFetchedAt: state.lastNotifiedFetchedAt,
    notifiedChapterIds: state.notifiedChapterIds.slice(-MAX_TRACKED_IDS),
  };
  await Bun.write(env.stateFilePath, JSON.stringify(trimmed, null, 2));
}

export type { NotifierState };
