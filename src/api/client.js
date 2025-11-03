import { isTokenExpired } from "../utils/jwt";

// Broadcast a global event so React can navigate even outside hooks
function emitAuthExpired(reason = "expired") {
  window.dispatchEvent(new CustomEvent("auth:expired", { detail: { reason } }));
}

function getBase() {
  return (
    import.meta?.env?.VITE_API_BASE ||
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