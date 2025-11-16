// src/utils/api.js
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

// Broadcast a global event so React can navigate even outside hooks
function emitAuthExpired(reason = "expired") {
  window.dispatchEvent(new CustomEvent("auth:expired", { detail: { reason } }));
}

function getBase() {
  // Use process.env for Create React App compatibility
  return (
    process.env.REACT_APP_API_BASE ||
    "https://hr-backend-npbd.onrender.com"
  );
}

function getTenantId() {
  return (
    localStorage.getItem("currentTenantId") ||
    localStorage.getItem("tenantId") ||
    localStorage.getItem("tenant_id") ||
    ""
  );
}

function getIdToken() {
  return localStorage.getItem("fb_id_token") || "";
}

function setIdToken(tok) {
  if (tok) localStorage.setItem("fb_id_token", tok);
}

export async function api(path, options = {}) {
  const base = getBase();
  let token = getIdToken();
  const tenantId = getTenantId();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
  };

  // If we know it's expired, don't even try—go refresh/redirect
  if (token && isTokenExpired(token)) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      emitAuthExpired("expired");
      // short-circuit with a fake 401 Response so callers can handle if needed
      return new Response(JSON.stringify({ error: "Token expired" }), { status: 401 });
    }
    token = getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (res.status !== 401) return res;

  // Read error body (best effort)
  let err = {};
  try { err = await res.clone().json(); } catch {}

  // Try one silent refresh if possible
  const refreshed = await tryRefreshToken();
  if (refreshed) {
    const newToken = getIdToken();
    return fetch(`${base}${path}`, {
      credentials: "include",
      ...options,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
    });
  }

  // No refresh → broadcast & let UI navigate
  emitAuthExpired(err?.error || "unauthorized");
  return res;
}

/** Optional: if Firebase Web SDK is present, refresh the ID token. */
async function tryRefreshToken() {
  try {
    const auth = window?.firebase?.auth?.();
    if (auth?.currentUser) {
      const fresh = await auth.currentUser.getIdToken(true);
      setIdToken(fresh);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Export the base URL for other components to use
export const API_BASE = getBase();