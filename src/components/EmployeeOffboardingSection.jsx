// src/components/EmployeeOffboardingSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCalendar,
  FiChevronRight,
  FiClipboard,
  FiEdit2,
  FiLoader,
  FiTrash2,
  FiX,
  FiUserCheck,
  FiRefreshCw,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

const defaultAPI =
   "https://hr-backend-npbd.onrender.com";

/* ----------------- fallback auth/tenant helpers (used if parent doesn't pass) ----------------- */
const fallbackGetTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  process.env.REACT_APP_TENANT_ID ||
  "";

const fallbackGetIdToken = () => localStorage.getItem("fb_id_token") || "";

const fallbackGetAuthHeaders = () => {
  const headers = {};
  const token = fallbackGetIdToken();
  const tenantId = fallbackGetTenantId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};
/* ------------------------------------------------------------------------------------------------ */

const Badge = ({ color = "gray", children }) => {
  const map = {
    green: "bg-green-100 text-green-700 ring-green-200",
    yellow: "bg-yellow-100 text-yellow-700 ring-yellow-200",
    red: "bg-red-100 text-red-700 ring-red-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${map[color] || map.gray}`}>
      {children}
    </span>
  );
};

const statusColor = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "active") return "yellow";
  if (v === "completed") return "green";
  if (v === "canceled") return "red";
  return "gray";
};

const Field = ({ label, value, icon }) => (
  <div className="space-y-1">
    <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1">
      {icon} {label}
    </div>
    <div className="text-gray-900">{value || "—"}</div>
  </div>
);

/* strict fetch that surfaces server errors instead of silently returning [] */
const strictFetch = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const raw = await res.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json ?? raw;
};

export default function EmployeeOffboardingSection({
  employeeId,
  apiBase = defaultAPI,
  getAuthHeaders, // optional; if not provided, fallbacks will be used
}) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  const [error, setError] = useState(null);

  // Edit modal state
  const [editing, setEditing] = useState(null); // record object
  const [saving, setSaving] = useState(false);

  // Cancel modal state
  const [canceling, setCanceling] = useState(null); // record object
  const [cancelAlsoRevert, setCancelAlsoRevert] = useState(true);
  const [working, setWorking] = useState(false);

  const headers = useMemo(
    () => (typeof getAuthHeaders === "function" ? getAuthHeaders() : fallbackGetAuthHeaders()),
    [getAuthHeaders]
  );

  const fetchRecords = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await strictFetch(
        `${apiBase}/api/offboarding?employeeId=${encodeURIComponent(employeeId)}`,
        { headers }
      );
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = /401|403|unauth|tenant|token/i.test(String(e?.message || ""))
        ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
        : (e?.message || t("offboarding.section.loadError", "Failed to load offboarding records"));
      setError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, apiBase]); // re-run when employee or base changes

  const latest = useMemo(() => {
    if (!records.length) return null;
    // FIX: sort by date value (ISO string → Date), not Number()
    return [...records].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
  }, [records]);

  const hasRecord = !!latest;

  const onSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        reason: editing.reason,
        lastDay: editing.lastDay,
        handoverTo: editing.handoverTo,
        noticeServed: editing.noticeServed,
        checklist: editing.checklist || {},
        notes: editing.notes || "",
        status: editing.status || "Active",
      };
      await strictFetch(`${apiBase}/api/offboarding/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      setEditing(null);
      await fetchRecords();
    } catch (e) {
      console.error(e);
      alert(t("offboarding.section.updateFailed", "Failed to update offboarding record"));
    } finally {
      setSaving(false);
    }
  };

  const onCancelOffboarding = async () => {
    if (!canceling) return;
    setWorking(true);
    try {
      // 1) mark record as canceled
      await strictFetch(`${apiBase}/api/offboarding/${canceling.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "Canceled" }),
      });

      // 2) optionally revert employee status/endDate
      if (cancelAlsoRevert) {
        try {
          await strictFetch(`${apiBase}/api/employees/${employeeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ status: "Active", endDate: "" }),
          });
        } catch {}
      }

      setCanceling(null);
      await fetchRecords();
    } catch (e) {
      console.error(e);
      alert(t("offboarding.section.cancelFailed", "Failed to cancel offboarding"));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div dir={dir} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className={`mb-4 flex items-center ${isRTL ? "justify-end" : "justify-between"}`}>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <FiClipboard className="text-gray-500" />
          <h3 className="text-lg font-semibold">{t("offboarding.section.title")}</h3>
        </div>
        <button
          type="button"
          onClick={fetchRecords}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          {t("refresh", "Refresh")}
        </button>
        {hasRecord && (
          <div className={isRTL ? "ml-auto" : "ml-2"}>
            <Badge color={statusColor(latest.status)}>
              {t(`offboarding.section.status.${String(latest.status || "Active").toLowerCase()}`)}
            </Badge>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <FiLoader className="animate-spin" /> {t("loading")}…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
      )}

      {!loading && !error && !hasRecord && (
        <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <FiUserCheck className="text-green-600" />
          <div>
            <div className="font-medium">{t("offboarding.section.noneTitle")}</div>
            <div className="text-sm text-gray-600">{t("offboarding.section.noneDesc")}</div>
          </div>
        </div>
      )}

      {!loading && !error && hasRecord && (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
            <Field
              label={t("offboarding.form.reason")}
              value={latest.reason}
              icon={<FiAlertTriangle className="text-gray-400" />}
            />
            <Field
              label={t("offboarding.form.lastDay")}
              value={latest.lastDay}
              icon={<FiCalendar className="text-gray-400" />}
            />
            <Field label={t("offboarding.form.handoverTo")} value={latest.handoverTo} />
            <Field
              label={t("offboarding.form.noticeServed")}
              value={latest.noticeServed ? t("offboarding.form.yes") : t("offboarding.form.no")}
            />
            <Field label={t("offboarding.form.notes")} value={latest.notes} />
          </div>

          <div className={`mt-4 text-sm text-gray-700 ${isRTL ? "text-right" : ""}`}>
            <div className="font-medium mb-1">{t("offboarding.form.checklistTitle")}</div>
            <ul className={`list-disc ${isRTL ? "mr-5" : "ml-5"}`}>
              {[
                ["assetsReturned", t("offboarding.form.assetsReturned")],
                ["emailDisabled", t("offboarding.form.emailDisabled")],
                ["accessRevoked", t("offboarding.form.accessRevoked")],
                ["payrollCleared", t("offboarding.form.payrollCleared")],
                ["exitInterviewDone", t("offboarding.form.exitInterviewDone")],
              ].map(([k, label]) => (
                <li key={k} className={latest?.checklist?.[k] ? "text-gray-800" : "text-gray-400 line-through"}>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className={`mt-6 flex items-center gap-2 ${isRTL ? "justify-start flex-row-reverse" : "justify-end"}`}>
            <button
              onClick={() => setEditing(latest)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FiEdit2 /> {t("offboarding.section.edit")}
            </button>
            <button
              onClick={() => setCanceling(latest)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
            >
              <FiTrash2 /> {t("offboarding.section.cancel")}
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{t("offboarding.section.editTitle")}</h4>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setEditing(null)}>
                <FiX />
              </button>
            </div>

            <div className={`grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-4 ${isRTL ? "text-right" : ""}`}>
              <div className="space-y-1">
                <label className="text-sm text-gray-700">{t("offboarding.form.reason")}</label>
                <select
                  value={editing.reason || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, reason: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option>{t("offboarding.form.reasons.endOfContract")}</option>
                  <option>{t("offboarding.form.reasons.resignation")}</option>
                  <option>{t("offboarding.form.reasons.termination")}</option>
                  <option>{t("offboarding.form.reasons.retirement")}</option>
                  <option>{t("offboarding.form.reasons.other")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">{t("offboarding.form.lastDay")}</label>
                <input
                  type="date"
                  value={editing.lastDay || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, lastDay: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">{t("offboarding.form.handoverTo")}</label>
                <input
                  value={editing.handoverTo || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, handoverTo: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">{t("offboarding.form.noticeServed")}</label>
                <select
                  value={editing.noticeServed ? "yes" : "no"}
                  onChange={(e) => setEditing((s) => ({ ...s, noticeServed: e.target.value === "yes" }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="yes">{t("offboarding.form.yes")}</option>
                  <option value="no">{t("offboarding.form.no")}</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm text-gray-700">{t("offboarding.form.notes")}</label>
                <input
                  value={editing.notes || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">{t("offboarding.section.statusLabel")}</label>
                <select
                  value={editing.status || "Active"}
                  onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Active">{t("offboarding.section.status.active")}</option>
                  <option value="Completed">{t("offboarding.section.status.completed")}</option>
                  <option value="Canceled">{t("offboarding.section.status.canceled")}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" onClick={() => setEditing(null)}>
                {t("actions.close")}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={onSaveEdit}
                disabled={saving}
              >
                {saving && <FiLoader className="animate-spin" />} {t("offboarding.section.save")}
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {canceling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCanceling(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="mt-0.5 text-red-600" />
              <div>
                <h4 className="text-lg font-semibold">{t("offboarding.section.cancelTitle")}</h4>
                <p className="text-sm text-gray-600">{t("offboarding.section.cancelDesc")}</p>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cancelAlsoRevert}
                onChange={(e) => setCancelAlsoRevert(e.target.checked)}
              />
              {t("offboarding.section.cancelRevert")}
            </label>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" onClick={() => setCanceling(null)}>
                {t("actions.close")}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={onCancelOffboarding}
                disabled={working}
              >
                {working && <FiLoader className="animate-spin" />} {t("offboarding.section.confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
