/** Formats a Reddit username for display while tolerating older empty records. */
export function formatRedditUsername(
  username: string | null | undefined
): string | null {
  const trimmedUsername = username?.trim();
  if (!trimmedUsername) return null;

  const usernameWithoutPrefix = trimmedUsername.replace(/^u\//i, '').trim();
  return usernameWithoutPrefix ? `u/${usernameWithoutPrefix}` : null;
}
