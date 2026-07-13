export function fitText(value: string, maxCharacters: number): string {
  const compactValue = value.trim();
  if (compactValue.length <= maxCharacters) return compactValue;
  return `${compactValue.slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
}
