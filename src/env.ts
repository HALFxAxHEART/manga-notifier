function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const env = {
  suwayomiUrl: required("SUWAYOMI_URL").replace(/\/$/, ""),
  suwayomiUsername: required("SUWAYOMI_USERNAME"),
  suwayomiPassword: required("SUWAYOMI_PASSWORD"),
  ntfyTopic: required("NTFY_TOPIC"),
  ntfyBaseUrl: process.env.NTFY_BASE_URL?.replace(/\/$/, "") ?? "https://ntfy.sh",
  readerBaseUrl: (process.env.READER_BASE_URL ?? "https://manga.stapulasolutions.com").replace(/\/$/, ""),
  pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES ?? "15"),
  stateFilePath: process.env.STATE_FILE_PATH ?? "/data/state.json",
  libraryUpdateIntervalMinutes: Number(process.env.LIBRARY_UPDATE_INTERVAL_MINUTES ?? "60"),
  kavitaUrl: process.env.KAVITA_URL?.replace(/\/$/, ""),
  kavitaUsername: process.env.KAVITA_USERNAME,
  kavitaPassword: process.env.KAVITA_PASSWORD,
  coverCheckIntervalMinutes: Number(process.env.COVER_CHECK_INTERVAL_MINUTES ?? "60"),
};
