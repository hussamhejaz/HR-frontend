export function parseJwt(token) {
  try {
    const base = token.split(".")[1];
    const json = atob(base.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function tokenExpiresAtMs(token) {
  const p = parseJwt(token);
  return p?.exp ? p.exp * 1000 : 0;
}

export function isTokenExpired(token, skewMs = 5000) {
  const exp = tokenExpiresAtMs(token);
  return !exp || Date.now() >= exp - skewMs;
}
