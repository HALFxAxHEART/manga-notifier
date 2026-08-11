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

export async function fetchRecentLibraryChapters(first = 50): Promise<LibraryChapter[]> {
  const auth = Buffer.from(`${env.suwayomiUsername}:${env.suwayomiPassword}`).toString("base64");

  const response = await fetch(`${env.suwayomiUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      query: RECENT_CHAPTERS_QUERY,
      variables: { first },
    }),
  });

  if (!response.ok) {
    throw new Error(`Suwayomi request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as GraphQLResponse<{ chapters: { nodes: LibraryChapter[] } }>;
  if (body.errors?.length) {
    throw new Error(`Suwayomi GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!body.data) throw new Error("Suwayomi GraphQL response missing data");

  return body.data.chapters.nodes;
}
