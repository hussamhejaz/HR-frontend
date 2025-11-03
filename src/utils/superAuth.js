// src/utils/superAuth.js
import { getFirebaseAuth } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { API_BASE } from "./api";

/** Superadmin email/password login */
export async function superSignIn(email, password) {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}

/** Sign out */
export async function superSignOut() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/** Keep for compatibility for older imports */
export async function getIdToken() {
  const auth = getFirebaseAuth();
  const u = auth.currentUser;
  return u ? await u.getIdToken() : null;
}

/** Quick server-side check that the user has the superadmin claim */
export function getSuperadminSession() {
  return new Promise((resolve) => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub?.();
      if (!user) return resolve({ ok: false, error: "no-user" });
      try {
        const idToken = await user.getIdToken(true);
        const resp = await fetch(`${API_BASE}/superadmin/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!resp.ok) {
          const t = await resp.text();
          return resolve({ ok: false, error: t || `HTTP ${resp.status}` });
        }
        return resolve({ ok: true, idToken });
      } catch (e) {
        return resolve({ ok: false, error: e?.message || "check-failed" });
      }
    });
  });
}

/** Superadmin-only: list tenants */
export async function fetchTenantsSuper(idToken) {
  const r = await fetch(`${API_BASE}/superadmin/tenants`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

/** Superadmin-only: register tenant */
export async function registerTenantSuper(idToken, payload) {
  const r = await fetch(`${API_BASE}/superadmin/tenants/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

/** Optional helper used by some guards */
export async function isSuperadminByTokenOrMe(token) {
  if (!token) return false;
  const r = await fetch(`${API_BASE}/superadmin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok;
}
export async function deleteTenantSuper(idToken, tenantId) {
  const r = await fetch(`${API_BASE}/superadmin/tenants/${encodeURIComponent(tenantId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return true;
}
