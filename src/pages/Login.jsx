// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "../firebase";
import { FiLock, FiMail, FiUser, FiAlertTriangle, FiX } from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002/api";

const Login = () => {
  const auth = getFirebaseAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);
  const navigate = useNavigate();

  async function fetchMe(idToken) {
    const r = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!r.ok) throw new Error((await r.text()) || `Failed to load profile (HTTP ${r.status})`);
    return r.json();
  }

  function pickTenantIdFromMe(me) {
    const defaultTid = me?.profile?.defaultTenantId;
    if (defaultTid) return String(defaultTid);
    const memberships = me?.memberships;
    if (memberships && typeof memberships === "object") {
      const ids = Object.keys(memberships);
      if (ids.length) return String(ids[0]);
    }
    const tenantsObj = me?.tenants;
    if (tenantsObj && typeof tenantsObj === "object") {
      const ids = Object.keys(tenantsObj);
      if (ids.length) return String(ids[0]);
    }
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cred  = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("fb_id_token", token);

      const me       = await fetchMe(token);
      const tenantId = pickTenantIdFromMe(me);
      if (!tenantId) {
        setError("Your account isn’t assigned to any tenant yet. Please contact your administrator.");
        return;
      }

      localStorage.setItem("currentTenantId", tenantId);
      navigate("/dashboard/overview");
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  const handleContactAdmin = () => {
    window.location.href = "mailto:hr@example.com";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-center">
          <FiUser className="mx-auto text-4xl text-white mb-2" />
          <h1 className="text-white text-2xl font-semibold">HR Management</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Fancy error box */}
          {error && (
            <div
              className="relative rounded-xl border border-red-200 bg-red-50/70 p-4 pr-10"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <FiAlertTriangle className="text-red-600 text-xl" aria-hidden="true" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-red-800">We couldn’t sign you in</div>
                  <div className="mt-1 text-red-700 leading-relaxed whitespace-pre-line">
                    {error}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-1 text-red-600/80 hover:text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                title="Dismiss"
              >
                <FiX />
              </button>
            </div>
          )}

          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email address"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don’t have an account?{" "}
            <button
              type="button"
              onClick={handleContactAdmin}
              className="text-indigo-600 hover:underline focus:outline-none"
            >
              Contact Admin
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
