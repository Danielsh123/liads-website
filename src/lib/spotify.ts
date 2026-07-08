/**
 * Parse a pasted Spotify link (episode/show/playlist page URL, or an <iframe
 * src="…"> copied from Spotify's embed code) into a normalized embed URL.
 * Shared by the Admin Studio's paste-and-detect field and FeedItemPodcast.
 */
export type SpotifyKind = "episode" | "show" | "playlist";

export type SpotifyParseResult =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "valid"; kind: SpotifyKind; id: string; embedSrc: string };

export function parseSpotifyUrl(raw: string | undefined | null): SpotifyParseResult {
  if (!raw || !raw.trim()) return { status: "none" };
  let s = raw.trim();
  const iframeMatch = s.match(/src=["']([^"']+)["']/);
  if (iframeMatch) s = iframeMatch[1];
  const urlMatch = s.match(/open\.spotify\.com\/(?:embed\/)?(episode|show|playlist)\/([A-Za-z0-9]+)/);
  if (!urlMatch) return { status: "invalid" };
  const kind = urlMatch[1] as SpotifyKind;
  const id = urlMatch[2];
  return { status: "valid", kind, id, embedSrc: `https://open.spotify.com/embed/${kind}/${id}` };
}
