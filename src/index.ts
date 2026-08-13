import { env } from "./env";
import {
  fetchRecentLibraryChapters,
  triggerLibraryUpdate,
  listLibraryMangas,
  fetchMangaThumbnailBase64,
} from "./suwayomi";
import { notifyNewChapter } from "./ntfy";
import { loadState, saveState } from "./state";
import { healMissingCovers } from "./kavita";

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

async function libraryUpdateTick(): Promise<void> {
  await triggerLibraryUpdate();
  console.log(`[${new Date().toISOString()}] triggered Suwayomi library update`);
}

async function coverHealTick(): Promise<void> {
  if (!env.kavitaUrl) return;
  const mangas = await listLibraryMangas();
  await healMissingCovers(fetchMangaThumbnailBase64, mangas);
}

async function loop(name: string, intervalMinutes: number, fn: () => Promise<void>): Promise<void> {
  const intervalMs = intervalMinutes * 60_000;
  while (true) {
    try {
      await fn();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ${name} failed:`, err);
    }
    await Bun.sleep(intervalMs);
  }
}

async function main(): Promise<void> {
  await primeStateOnFirstRun();

  console.log(
    `manga-notifier started: notify every ${env.pollIntervalMinutes}m, ` +
      `library update every ${env.libraryUpdateIntervalMinutes}m, ` +
      `cover heal every ${env.coverCheckIntervalMinutes}m`,
  );

  await Promise.all([
    loop("notify", env.pollIntervalMinutes, tick),
    loop("library-update", env.libraryUpdateIntervalMinutes, libraryUpdateTick),
    loop("cover-heal", env.coverCheckIntervalMinutes, coverHealTick),
  ]);
}

main();
