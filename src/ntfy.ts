import { env } from "./env";
import type { LibraryChapter } from "./suwayomi";

export async function notifyNewChapter(chapter: LibraryChapter): Promise<void> {
  const response = await fetch(`${env.ntfyBaseUrl}/${env.ntfyTopic}`, {
    method: "POST",
    headers: {
      Title: chapter.manga.title,
      Tags: "book",
      Click: `${env.readerBaseUrl}/manga/${chapter.manga.id}`,
    },
    body: `New chapter: ${chapter.name}`,
  });

  if (!response.ok) {
    throw new Error(`ntfy request failed: ${response.status} ${await response.text()}`);
  }
}
