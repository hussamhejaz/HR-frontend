// src/components/AuthWatcher.jsx
import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "../firebase";
import { tokenExpiresAtMs, isTokenExpired } from "../utils/jwt";

export default function AuthWatcher({ marginMs = 15000 }) {
  const auth = getFirebaseAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const tRef = useRef(null);

  const toLogin = useCallback(
    (reason = "expired") => {
      try { localStorage.removeItem("fb_id_token"); } catch {}
      const q = new URLSearchParams({ reason, from: loc.pathname }).toString();
      navigate(`/login?${q}`, { replace: true });
    },
    [navigate, loc.pathname]
  );

  const schedule = useCallback(
    (token) => {
      if (!token) return;
      if (isTokenExpired(token, marginMs)) {
        toLogin("expired");
        return;
      }
      const when = tokenExpiresAtMs(token) - Date.now() - marginMs;
      clearTimeout(tRef.current);
      tRef.current = setTimeout(() => toLogin("expired"), Math.max(0, when));
    },
    [marginMs, toLogin]
  );

  useEffect(() => {
    const unsub1 = onAuthStateChanged(auth, (user) => {
      if (!user) {
        clearTimeout(tRef.current);
        toLogin("signedout");
      }
    });

    const unsub2 = onIdTokenChanged(auth, async (user) => {
      clearTimeout(tRef.current);
      if (!user) return; // onAuthStateChanged will handle redirect
      try {
        const token = await user.getIdToken(); // Firebase auto-refresh
        localStorage.setItem("fb_id_token", token);
        schedule(token);
      } catch {
        toLogin("refresh-failed");
      }
    });

    return () => {
      clearTimeout(tRef.current);
      unsub1();
      unsub2();
    };
  }, [auth, schedule, toLogin]);

  return null;
}
