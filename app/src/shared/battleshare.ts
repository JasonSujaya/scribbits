export const BATTLE_CLIP_MAXIMUM_BYTES = 8 * 1024 * 1024;
export const BATTLE_SHARE_DATA_MAXIMUM_CHARACTERS = 1024;

export type BattleClipUploadRequest = Readonly<{
  videoDataUrl: string;
}>;

export type BattleClipUploadResponse = Readonly<{
  videoUrl: string;
}>;

export type BattleSharePayload = Readonly<{
  version: 1;
  clipUrl: string;
}>;

const isRedditMediaUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'redd.it' ||
      hostname.endsWith('.redd.it') ||
      hostname === 'redditmedia.com' ||
      hostname.endsWith('.redditmedia.com')
    );
  } catch {
    return false;
  }
};

export const serializeBattleShareData = (clipUrl: string): string | null => {
  if (!isRedditMediaUrl(clipUrl)) return null;
  const serialized = JSON.stringify({ version: 1, clipUrl });
  return serialized.length <= BATTLE_SHARE_DATA_MAXIMUM_CHARACTERS
    ? serialized
    : null;
};

export const parseBattleShareData = (
  serialized: string | undefined
): BattleSharePayload | null => {
  if (!serialized || serialized.length > BATTLE_SHARE_DATA_MAXIMUM_CHARACTERS) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !('version' in value) ||
      !('clipUrl' in value) ||
      value.version !== 1 ||
      typeof value.clipUrl !== 'string' ||
      !isRedditMediaUrl(value.clipUrl)
    ) {
      return null;
    }
    return Object.freeze({ version: 1, clipUrl: value.clipUrl });
  } catch {
    return null;
  }
};

export const parseBattleClipDataUrl = (
  value: unknown
): Readonly<{ dataUrl: string; byteLength: number }> | null => {
  if (typeof value !== 'string') return null;
  const match =
    /^data:video\/(?:webm|mp4)(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/]*={0,2})$/i.exec(
      value
    );
  const encoded = match?.[1];
  if (!encoded) return null;
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((encoded.length * 3) / 4) - padding;
  if (byteLength <= 0 || byteLength > BATTLE_CLIP_MAXIMUM_BYTES) return null;
  return Object.freeze({ dataUrl: value, byteLength });
};
