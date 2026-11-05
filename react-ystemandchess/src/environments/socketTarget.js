// Splits a service base URL into what socket.io-client needs.
//
// An absolute base (dev: http://localhost:3001) connects to that host on the
// default /socket.io path. A relative base (production, single origin:
// /chessserver) connects to the page's own origin, with the prefix moved into
// the socket.io path; the frontend nginx strips it again before proxying.
export function socketTarget(baseUrl) {
  const url = new URL(baseUrl, window.location.origin);
  const prefix = url.pathname.replace(/\/+$/, '');
  return { url: url.origin, path: `${prefix}/socket.io` };
}
