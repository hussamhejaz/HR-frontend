// src/pages/attendance/AttendanceAdmin.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas } from "qrcode.react";

/*
  AttendanceAdmin.jsx — HR/Admin console for QR tokens (Check-IN & Check-OUT)
  ----------------------------------------------------------------------------
  Backend:
    GET    /api/attendance/qr?siteId=&active=1
    POST   /api/attendance/qr                {
             siteId, label?, expiresAt?, maxUses?,
             geo?: { lat:number, lng:number, radiusMeters:number }   <-- IMPORTANT
           }
    DELETE /api/attendance/qr/:token

  QR content employees scan:
    {"token":"<token>","action":"in"}  or  {"token":"<token>","action":"out"}
*/

const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const QR_API   = `${API_BASE}/attendance/qr`;

/* ------------------------------ auth helpers ------------------------------ */
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  "";

const getIdToken = () => localStorage.getItem("fb_id_token") || "";

const getAuthHeaders = () => {
  const h = { Accept: "application/json" };
  const t = getIdToken();
  const tenantId = getTenantId();
  if (t) h.Authorization = `Bearer ${t}`;
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  return h;
};

async function http(method, url, body) {
  const init = {
    method,
    headers: {
      ...getAuthHeaders(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes("application/json")) {
        const j = JSON.parse(text);
        if (j && (j.error || j.message)) msg = j.error || j.message;
      } else if (text) {
        msg = text;
      }
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON from server");
    }
  }
  throw new Error(`Expected JSON but got '${ct || "unknown"}'. Sample: ${text.slice(0, 200)}`);
}

const api = {
  qr: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") q.append(k, v);
      });
      const url = q.toString() ? `${QR_API}?${q.toString()}` : QR_API;
      return http("GET", url);
    },
    create: (payload) => http("POST", QR_API, payload),
    revoke: (token, siteId) =>
      http("DELETE", `${QR_API}/${encodeURIComponent(token)}${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`),
  },
};

/* --------------------------------- utils --------------------------------- */
const asYMDHM = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.valueOf())) return "";
  const pad = (n) => `${n}`.padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const shortDT = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleString();
};
const qrPayloadString = (token, action) => JSON.stringify({ token, action });

/* ================================== page ================================== */
export default function AttendanceAdmin() {
  const { t } = useTranslation();

  // filters / list
  const [siteId, setSiteId] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [q, setQ] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create form (with geo-fence)
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    label: "",
    siteId: "",
    expiresAt: "",
    maxUses: "",
    geoEnabled: false,
    geoLat: "",
    geoLng: "",
    geoRadiusM: "100",
  });

  // QR Preview modal
  const [qrPreview, setQrPreview] = useState(null); // created token object
  const [qrTab, setQrTab] = useState("in");         // "in" | "out"

  // revoke busy
  const [qrWorking, setQrWorking] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (siteId) params.siteId = siteId;
      if (activeOnly) params.active = "1";
      const data = await api.qr.list(params);
      let list = Array.isArray(data) ? data : [];
      if (q) {
        const term = q.toLowerCase();
        list = list.filter((r) =>
          [r.label, r.siteId, r.token].filter(Boolean).join(" ").toLowerCase().includes(term)
        );
      }
      setRows(list);
    } catch (e) {
      setError(e.message || "Failed to load QR tokens");
    } finally {
      setLoading(false);
    }
  }, [siteId, activeOnly, q]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const createToken = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const payload = {
        siteId: form.siteId || siteId || "default",
        label: form.label || null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
      };

      // ✅ send exactly what backend expects
      if (form.geoEnabled && form.geoLat && form.geoLng && form.geoRadiusM) {
        payload.geo = {
          lat: Number(form.geoLat),
          lng: Number(form.geoLng),
          radiusMeters: Math.max(10, Number(form.geoRadiusM) || 0),
        };
      }

      const created = await api.qr.create(payload);
      // Show the exact server response (which includes token + geo)
      setQrPreview(created);
      setQrTab("in");

      // reset form
      setForm({
        label: "",
        siteId: "",
        expiresAt: "",
        maxUses: "",
        geoEnabled: false,
        geoLat: "",
        geoLng: "",
        geoRadiusM: "100",
      });

      fetchRows();
    } catch (e) {
      setError(e.message || "Failed to create QR token");
    } finally {
      setCreating(false);
    }
  };

  const revokeQr = async (token) => {
    setQrWorking(true);
    setError("");
    try {
      await api.qr.revoke(token, siteId || undefined);
      fetchRows();
    } catch (e) {
      setError(e.message || "Failed to revoke token");
    } finally {
      setQrWorking(false);
    }
  };

  const openQrPreview = (q) => { setQrPreview(q); setQrTab("in"); };
  const closeQrPreview = () => setQrPreview(null);

  const activeCanvasId = qrTab === "in" ? "qr-canvas-in" : "qr-canvas-out";
  const qrTitle =
    (qrPreview?.label || t("attendance.qrCode", "QR Code")) +
    ` — ${qrTab === "in" ? t("attendance.checkIn", "Check-In") : t("attendance.checkOut", "Check-Out")}`;

  const printQr = () => {
    if (!qrPreview) return;
    const canvas = document.getElementById(activeCanvasId);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "print", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>${qrTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; }
            .wrap { display:flex; flex-direction:column; align-items:center; gap:16px; }
            .meta { text-align:center; }
            img { width: 320px; height: 320px; }
            .pill { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:#f3f4f6; font-size:12px; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 300);">
          <div class="wrap">
            <img src="${dataUrl}" alt="QR Code" />
            <div class="meta">
              <h2 style="margin:4px 0">${qrTitle}</h2>
              <div>${qrPreview?.siteId ? `Site: ${qrPreview.siteId}` : ""}</div>
              <div class="pill">${qrPreview?.token}</div>
              ${qrPreview?.expiresAt ? `<div>Expires: ${new Date(qrPreview.expiresAt).toLocaleString()}</div>` : ""}
              ${
                qrPreview?.geo
                  ? `<div>Geo-fence: ${qrPreview.geo.radiusMeters}m @ ${Number(qrPreview.geo.lat).toFixed(6)}, ${Number(qrPreview.geo.lng).toFixed(6)}</div>`
                  : ""
              }
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
  };

  const downloadQr = () => {
    const canvas = document.getElementById(activeCanvasId);
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `QR_${qrPreview?.siteId || "site"}_${qrTab}.png`;
    a.click();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((s) => ({ ...s, geoLat: latitude.toFixed(6), geoLng: longitude.toFixed(6) }));
      },
      (err) => alert(err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const filteredSites = useMemo(() => {
    const set = new Set(rows.map((r) => r.siteId).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">
          {t("attendance.qrAdmin", "Attendance QR Admin")}
        </h1>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">{t("common.search", "Search")}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder={t("attendance.searchTokens", "Label, site, token…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("attendance.site", "Site")}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder={t("attendance.sitePlaceholder", "e.g. HQ-Lobby")}
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              list="siteIdOptions"
            />
            <datalist id="siteIdOptions">
              {filteredSites.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              {t("attendance.activeOnly", "Active only")}
            </label>
          </div>

          <div className="flex items-end">
            <button onClick={fetchRows} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
              {t("common.refresh", "Refresh")}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Create new QR */}
      <div className="rounded-2xl border p-4 mb-6">
        <div className="font-semibold mb-3">{t("attendance.createNewQr", "Create new QR token")}</div>

        <form onSubmit={createToken} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("attendance.label", "Label")}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder={t("attendance.exLabel", "Entrance A (morning)")}
              value={form.label}
              onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("attendance.site", "Site")}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder={t("attendance.sitePlaceholder", "e.g. HQ-Lobby")}
              value={form.siteId}
              onChange={(e) => setForm((s) => ({ ...s, siteId: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("attendance.siteHint", "Blank = use current filter or 'default'")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("attendance.expiresAt", "Expires at")}</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2"
              value={form.expiresAt}
              onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value }))}
              min={asYMDHM(new Date())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("attendance.maxUses", "Max uses")}</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded-lg px-3 py-2"
              value={form.maxUses}
              onChange={(e) => setForm((s) => ({ ...s, maxUses: e.target.value }))}
              placeholder={t("attendance.unlimited", "Unlimited")}
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.geoEnabled}
                onChange={(e) => setForm((s) => ({ ...s, geoEnabled: e.target.checked }))}
              />
              {t("attendance.enableGeofence", "Enable geo-fence")}
            </label>
          </div>

          {/* Geo-fence controls */}
          {form.geoEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{t("attendance.latitude", "Latitude")}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="24.7136"
                  value={form.geoLat}
                  onChange={(e) => setForm((s) => ({ ...s, geoLat: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("attendance.longitude", "Longitude")}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="46.6753"
                  value={form.geoLng}
                  onChange={(e) => setForm((s) => ({ ...s, geoLng: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("attendance.radiusM", "Radius (meters)")}</label>
                <input
                  type="number"
                  min="10"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.geoRadiusM}
                  onChange={(e) => setForm((s) => ({ ...s, geoRadiusM: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                >
                  {t("attendance.useMyLocation", "Use my location")}
                </button>
                <span className="text-xs text-gray-500">
                  {t("attendance.geoHint", "Employees must be inside this circle to scan")}
                </span>
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              {creating ? t("common.creating", "Creating…") : t("actions.create", "Create")}
            </button>
          </div>
        </form>
      </div>

      {/* Tokens table */}
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("attendance.label", "Label")}</Th>
              <Th>{t("attendance.site", "Site")}</Th>
              <Th>{t("attendance.token", "Token")}</Th>
              <Th>{t("attendance.expiresAt", "Expires at")}</Th>
              <Th>{t("attendance.uses", "Uses")}</Th>
              <Th>{t("attendance.geofence", "Geo-fence")}</Th>
              <Th className="text-right">{t("common.actions", "Actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t("common.noResults", "No results")}
                </td>
              </tr>
            ) : (
              rows.map((q) => {
                const expired = q.expiresAt && Date.now() > Date.parse(q.expiresAt);
                const gf = q.geo; // 👈 stored by backend as `geo`
                return (
                  <tr key={q.token} className="border-t">
                    <Td className="font-medium">{q.label || "—"}</Td>
                    <Td>{q.siteId || "—"}</Td>
                    <Td className="break-all">
                      <code className="bg-gray-50 px-2 py-1 rounded">{q.token}</code>
                    </Td>
                    <Td>
                      {q.expiresAt ? (
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${expired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-red-600" : "bg-green-600"}`} />
                          {shortDT(q.expiresAt)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100">{t("attendance.unlimited", "Unlimited")}</span>
                      )}
                    </Td>
                    <Td>
                      {typeof q.uses === "number" ? (
                        <span className="whitespace-nowrap">{q.uses}{q.maxUses ? ` / ${q.maxUses}` : ""}</span>
                      ) : "—"}
                    </Td>
                    <Td>
                      {gf ? (
                        <span className="text-xs">
                          {gf.radiusMeters}m @ {Number(gf.lat).toFixed(4)},{Number(gf.lng).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <IconButton title={t("attendance.viewQr", "View QR")} onClick={() => openQrPreview(q)}>
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M3 3h8v8H3V3m2 2v4h4V5H5m6-2h10v10H11V3m2 2v6h6V5h-6M3 13h10v8H3v-8m2 2v4h6v-4H5m12-2h4v2h-4v-2z"/>
                          </svg>
                        </IconButton>
                        <CopyButton title={t("attendance.copyToken", "Copy token")} text={q.token} />
                        {!expired && (
                          <IconButton title={t("attendance.revoke", "Revoke")} onClick={() => revokeQr(q.token)} disabled={qrWorking}>
                            <svg width="18" height="18" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M7 6h10v2H7v12H5V8H3V6h4m4 4h2v8h-2v-8Z"/>
                            </svg>
                          </IconButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QR Preview Modal (IN / OUT tabs) */}
      {qrPreview && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeQrPreview} />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg">{qrPreview?.label || t("attendance.qrCode", "QR Code")}</div>
                <button onClick={closeQrPreview} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">✕</button>
              </div>

              {/* Tabs */}
              <div className="mb-4">
                <div className="inline-flex rounded-xl border overflow-hidden">
                  <button className={`px-4 py-2 text-sm ${qrTab === "in" ? "bg-black text-white" : "bg-white"}`} onClick={() => setQrTab("in")}>
                    {t("attendance.checkIn", "Check-In")}
                  </button>
                  <button className={`px-4 py-2 text-sm ${qrTab === "out" ? "bg-black text-white" : "bg-white"}`} onClick={() => setQrTab("out")}>
                    {t("attendance.checkOut", "Check-Out")}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <QRCodeCanvas
                  id="qr-canvas-in"
                  value={qrPayloadString(qrPreview.token, "in")}
                  size={qrTab === "in" ? 280 : 0}
                  includeMargin
                  level="M"
                  style={{ display: qrTab === "in" ? "block" : "none" }}
                />
                <QRCodeCanvas
                  id="qr-canvas-out"
                  value={qrPayloadString(qrPreview.token, "out")}
                  size={qrTab === "out" ? 280 : 0}
                  includeMargin
                  level="M"
                  style={{ display: qrTab === "out" ? "block" : "none" }}
                />

                <div className="text-center text-sm text-gray-700">
                  {qrPreview?.siteId && (
                    <div className="mb-1">
                      <span className="px-2 py-1 rounded-full bg-gray-100">{qrPreview.siteId}</span>
                    </div>
                  )}
                  <div className="break-all">{qrPreview?.token}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {qrTab === "in" ? t("attendance.checkIn", "Check-In") : t("attendance.checkOut", "Check-Out")}
                    {qrPreview?.expiresAt ? ` • ${t("attendance.expiresAt", "Expires")}: ${new Date(qrPreview.expiresAt).toLocaleString()}` : ""}
                    {qrPreview?.geo ? (
                      <>
                        {" • "}
                        {t("attendance.geofence", "Geo-fence")}: {qrPreview.geo.radiusMeters}m @{" "}
                        {Number(qrPreview.geo.lat).toFixed(4)},{Number(qrPreview.geo.lng).toFixed(4)}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={printQr} className="px-4 py-2 rounded-xl bg-black text-white">{t("actions.print", "Print")}</button>
                  <button onClick={downloadQr} className="px-4 py-2 rounded-xl border hover:bg-gray-50">{t("actions.download", "Download")}</button>
                </div>

                <div className="w-full mt-3">
                  <div className="text-xs text-gray-500 mb-1">{t("attendance.qrContent", "QR payload (for scanner)")}</div>
                  <code className="block w-full text-xs bg-gray-50 rounded-lg p-2 break-all">
                    {qrPayloadString(qrPreview.token, qrTab)}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- atoms ------------------------------- */
function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
function IconButton({ title, onClick, children, disabled }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50" aria-label={title}>
      {children}
    </button>
  );
}
function CopyButton({ title, text }) {
  const [ok, setOk] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch {}
  };
  return (
    <button type="button" title={title} onClick={onCopy} className="p-2 rounded-lg border hover:bg-gray-50" aria-label={title}>
      {ok ? (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,21H8V7H19M19,3H8A2,2 0 0,0 6,5V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V5A2,2 0 0,0 19,3M5,7H3V19A2,2 0 0,0 5,21H17V19H5V7Z"/>
        </svg>
      )}
    </button>
  );
}
