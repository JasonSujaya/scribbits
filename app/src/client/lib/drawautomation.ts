export type DrawAutomationPoint = Readonly<{
  x: number;
  y: number;
}>;

export type DrawAutomationStroke = Readonly<{
  color: string;
  size: number;
  points: readonly DrawAutomationPoint[];
}>;

type BrowserLocation = Readonly<{
  hostname: string;
  search: string;
}>;

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

// This mode exists only for local browser-driven asset authoring. Requiring
// both a local host and explicit debug flags prevents it from changing the
// timed player flow in Devvit.
export function isLocalDrawAutomationRequest(location: BrowserLocation): boolean {
  if (!LOCAL_HOSTNAMES.has(location.hostname)) return false;
  const parameters = new URLSearchParams(location.search);
  return parameters.has('debug') && parameters.has('untimed-draw');
}

export function isLocalDrawAutomationMode(
  location: BrowserLocation,
  mockServerEnabled: boolean
): boolean {
  return mockServerEnabled && isLocalDrawAutomationRequest(location);
}
