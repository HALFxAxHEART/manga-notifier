import { env } from "./env";

type KavitaSeries = {
  id: number;
  name: string;
  coverImage: string | null;
};

async function login(): Promise<{ token: string; apiKey: string } | null> {
  if (!env.kavitaUrl || !env.kavitaUsername || !env.kavitaPassword) return null;

  const response = await fetch(`${env.kavitaUrl}/api/Account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.kavitaUsername, password: env.kavitaPassword }),
  });
  if (!response.ok) throw new Error(`Kavita login failed: ${response.status}`);
  const body = (await response.json()) as { token: string; apiKey: string };
  return { token: body.token, apiKey: body.apiKey };
}

async function listSeries(token: string): Promise<KavitaSeries[]> {
  const response = await fetch(`${env.kavitaUrl}/api/Series/v2?PageNumber=1&PageSize=500`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ statements: [], combination: 0, sortOptions: null, limitTo: 0 }),
  });
  if (!response.ok) throw new Error(`Kavita series list failed: ${response.status}`);
  return (await response.json()) as KavitaSeries[];
}

async function coverExists(seriesId: number, apiKey: string): Promise<boolean> {
  const response = await fetch(`${env.kavitaUrl}/api/image/series-cover?seriesId=${seriesId}&apiKey=${apiKey}`);
  return response.ok;
}

async function uploadCover(token: string, seriesId: number, base64Image: string): Promise<void> {
  const response = await fetch(`${env.kavitaUrl}/api/upload/series`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: seriesId, url: base64Image, lockCover: true }),
  });
  if (!response.ok) throw new Error(`Kavita cover upload failed for series ${seriesId}: ${response.status}`);
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[’'‘]/g, "'").trim();
}

export async function healMissingCovers(
  getMangaThumbnail: (mangaId: number) => Promise<{ base64: string } | null>,
  suwayomiMangas: { id: number; title: string }[],
): Promise<void> {
  const auth = await login();
  if (!auth) {
    console.log("[cover-heal] Kavita not configured, skipping");
    return;
  }

  const series = await listSeries(auth.token);
  const byTitle = new Map(suwayomiMangas.map((m) => [normalizeTitle(m.title), m.id]));

  let fixed = 0;
  let missingMatch = 0;

  for (const s of series) {
    const exists = await coverExists(s.id, auth.apiKey);
    if (exists) continue;

    const mangaId = byTitle.get(normalizeTitle(s.name));
    if (mangaId === undefined) {
      missingMatch++;
      console.log(`[cover-heal] no Suwayomi match for Kavita series "${s.name}", skipping`);
      continue;
    }

    const thumb = await getMangaThumbnail(mangaId);
    if (!thumb) continue;

    await uploadCover(auth.token, s.id, thumb.base64);
    fixed++;
    console.log(`[cover-heal] re-uploaded cover for "${s.name}" (series ${s.id})`);
  }

  console.log(`[cover-heal] checked ${series.length} series, fixed ${fixed}, ${missingMatch} unmatched`);
}
