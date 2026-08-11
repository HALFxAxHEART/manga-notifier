import { env } from "./env";
import { fetchRecentLibraryChapters } from "./suwayomi";
import { notifyNewChapter } from "./ntfy";
import { loadState, saveState } from "./state";

async function tick(): Promise<void> {
  const state = await loadState();
  const chapters = await fetchRecentLibraryChapters();

  const alreadyNotified = new Set(state.notifiedChapterIds);
  const newChapters = chapters
    .filter((c) => c.fetchedAt > state.lastNotifiedFetchedAt && !alreadyNotified.has(c.id))
    .sort((a, b) => a.fetchedAt - b.fetchedAt);

  if (newChapters.length === 0) {
    console.log(`[${new Date().toISOString()}] no new chapters`);
    return;
  }

  console.log(`[${new Date().toISOString()}] ${newChapters.length} new chapter(s), notifying`);

  let maxFetchedAt = state.lastNotifiedFetchedAt;
  const notifiedIds = [...state.notifiedChapterIds];

  for (const chapter of newChapters) {
    await notifyNewChapter(chapter);
    notifiedIds.push(chapter.id);
    maxFetchedAt = Math.max(maxFetchedAt, chapter.fetchedAt);
  }

  await saveState({ lastNotifiedFetchedAt: maxFetchedAt, notifiedChapterIds: notifiedIds });
}

async function primeStateOnFirstRun(): Promise<void> {
  const state = await loadState();
  if (state.lastNotifiedFetchedAt !== 0 || state.notifiedChapterIds.length > 0) return;

  console.log("first run: priming state from existing library without sending notifications");
  const chapters = await fetchRecentLibraryChapters();
  const maxFetchedAt = chapters.reduce((max, c) => Math.max(max, c.fetchedAt), 0);
  await saveState({ lastNotifiedFetchedAt: maxFetchedAt, notifiedChapterIds: chapters.map((c) => c.id) });
}

async function main(): Promise<void> {
  await primeStateOnFirstRun();

  const intervalMs = env.pollIntervalMinutes * 60_000;
  console.log(`manga-notifier started, polling every ${env.pollIntervalMinutes}m`);

  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] tick failed:`, err);
    }
    await Bun.sleep(intervalMs);
  }
}

main();
