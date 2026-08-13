import { env } from "./env";

export type LibraryChapter = {
  id: number;
  name: string;
  chapterNumber: number;
  fetchedAt: number;
  isDownloaded: boolean;
  manga: {
    id: number;
    title: string;
  };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const RECENT_CHAPTERS_QUERY = `
  query RecentlyFetchedChapters($first: Int!) {
    chapters(
      filter: { inLibrary: { equalTo: true }, isDownloaded: { equalTo: true } }
      order: [{ by: FETCHED_AT, byType: DESC }]
      first: $first
    ) {
      nodes {
        id
        name
        chapterNumber
        fetchedAt
        isDownloaded
        manga { id title }
      }
    }
  }
`;

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.suwayomiUsername}:${env.suwayomiPassword}`).toString("base64")}`;
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${env.suwayomiUrl}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Suwayomi request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(`Suwayomi GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!body.data) throw new Error("Suwayomi GraphQL response missing data");

  return body.data;
}

export async function fetchRecentLibraryChapters(first = 50): Promise<LibraryChapter[]> {
  const data = await graphql<{ chapters: { nodes: LibraryChapter[] } }>(RECENT_CHAPTERS_QUERY, { first });
  return data.chapters.nodes;
}

export async function triggerLibraryUpdate(): Promise<void> {
  await graphql("mutation { updateLibrary(input: {}) { clientMutationId } }");
}

export async function listLibraryMangas(): Promise<{ id: number; title: string }[]> {
  const data = await graphql<{ mangas: { nodes: { id: number; title: string }[] } }>(
    "query { mangas(filter: { inLibrary: { equalTo: true } }) { nodes { id title } } }",
  );
  return data.mangas.nodes;
}

export async function fetchMangaThumbnailBase64(mangaId: number): Promise<{ base64: string } | null> {
  const response = await fetch(`${env.suwayomiUrl}/api/v1/manga/${mangaId}/thumbnail`, {
    headers: { Authorization: authHeader() },
  });
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  return { base64: Buffer.from(buffer).toString("base64") };
}
