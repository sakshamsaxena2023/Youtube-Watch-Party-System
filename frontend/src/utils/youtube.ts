/**
 * Parses and extracts YouTube 11-character Video ID from any URL format or bare ID.
 */
export function extractVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  try {
    const validUrlStr = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(validUrlStr);
    const host = url.hostname.replace(/^www\.|^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      if (/^[\w-]{11}$/.test(id)) return id;
    }

    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        if (v && /^[\w-]{11}$/.test(v)) return v;
      }
      const m = url.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/);
      if (m && m[2]) return m[2];

      const vParam = url.searchParams.get('v');
      if (vParam && /^[\w-]{11}$/.test(vParam)) return vParam;
    }
  } catch (e) {
    // Not a valid URL object
  }

  // Bare 11-character ID check
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex fallback for any embedded 11-character ID in URL
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}
