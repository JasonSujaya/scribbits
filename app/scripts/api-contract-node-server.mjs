// The production server entrypoint is imported by the contract suite, but the
// suite calls app.request directly and must not open a real TCP listener.
export function serve() {
  return { close() {} };
}
