// src/pages/attendance/AttendanceOverview.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const ATT_API_RANGE = `${API_BASE}/attendance/range`;  // ← correct "listRange" route
const ATT_API_FALLBACK = `${API_BASE}/attendance`;     // ← optional fallback
const EMP_API  = `${API_BASE}/employees`;

/* ------------------------------ auth helpers ------------------------------ */
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  "";

const getIdToken = () => localStorage.getItem("fb_id_token") || "";

const getAuthHeaders = () => {
  const h = { Accept: "application/json" };
  const tok = getIdToken();
  const tenantId = getTenantId();
  if (tok) h.Authorization = `Bearer ${tok}`;
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
  attendance: {
    list: async ({ from, to, employeeId } = {}) => {
      const q = new URLSearchParams();
      if (from) q.append("from", from);
      if (to) q.append("to", to);
      if (employeeId) q.append("employeeId", employeeId);

      // Try /attendance/range first (matches routes/attendance.js → att.listRange)
      try {
        const url = `${ATT_API_RANGE}?${q.toString()}`;
        return await http("GET", url);
      } catch (e) {
        // If not available (e.g., 404), fall back to /attendance
        if (/404/.test(String(e.message))) {
          const url = `${ATT_API_FALLBACK}?${q.toString()}`;
          return await http("GET", url);
        }
        throw e;
      }
    },
  },
  employees: {
    list: () => http("GET", EMP_API),
  },
};

/* --------------------------------- utils --------------------------------- */
const pad = (n) => `${n}`.padStart(2, "0");
const ymd = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const shortTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
const shortDate = (s) => s || "—";
const hoursBetween = (a, b) => {
  if (!a || !b) return null;
  const s = new Date(a).valueOf();
  const e = new Date(b).valueOf();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  const h = (e - s) / 36e5;
  return Math.round(h * 100) / 100;
};
const nameOf = (e) => `${e?.firstName || ""} ${e?.lastName || ""}`.trim();

/* --------------------------------- icons --------------------------------- */
const IconUser = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>
  </svg>
);
const IconCalendar = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2Zm12 8H5v8h14Z"/>
  </svg>
);

/* ================================== page ================================== */
export default function AttendanceOverview() {
  const { t } = useTranslation();

  // employees
  const [employees, setEmployees] = useState([]);
  const [empMap, setEmpMap] = useState({});

  // filters
  const today = ymd();
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    employeeId: "",
  });

  // data / ui state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSet = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));
  const onClearFilters = () => setFilters({ from: today, to: today, employeeId: "" });

  const quickRanges = useMemo(() => {
    const now = new Date();
    const todayStr = ymd(now);
    const y = ymd(addDays(now, -1));
    const last7from = ymd(addDays(now, -6));
    return [
      { k: "last7", label: t("attendance.last7", "Last 7 days"), from: last7from, to: todayStr },
      { k: "yesterday", label: t("attendance.yesterday", "Yesterday"), from: y, to: y },
      { k: "today", label: t("attendance.today", "Today"), from: todayStr, to: todayStr },
    ];
  }, [t]);

  const fetchEmployees = useCallback(async () => {
    try {
      const list = await api.employees.list();
      const arr = Array.isArray(list) ? list : [];
      const map = {};
      arr.forEach((e) => (map[e.id] = e));
      setEmployees(arr);
      setEmpMap(map);
    } catch (e) {
      console.warn("employees list failed:", e?.message || e);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.attendance.list({
        from: filters.from,
        to: filters.to,
        employeeId: filters.employeeId || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const exportCsv = () => {
    const header = [
      "Date",
      "Employee",
      "Check-in",
      "Check-out",
      "Hours",
      "Site (in)",
      "Site (out)",
      "Notes (in)",
      "Notes (out)",
      "Email",
    ];
    const lines = [header.join(",")];

    rows.forEach((r) => {
      const e = empMap[r.employeeId] || {};
      const line = [
        r.date || "",
        nameOf(e) || e.email || r.employeeId,
        r.checkInAt || "",
        r.checkOutAt || "",
        hoursBetween(r.checkInAt, r.checkOutAt) ?? "",
        r.checkInSiteId || "",
        r.checkOutSiteId || "",
        (r.checkInNote || "").replaceAll(",", ";"),
        (r.checkOutNote || "").replaceAll(",", ";"),
        e.email || "",
      ];
      lines.push(line.map((x) => `"${(x ?? "").toString().replaceAll(`"`, `""`)}"`).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${filters.from}_${filters.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">{t("attendance.records", "Attendance Records")}</h1>
        <div className="flex gap-2">
          <button onClick={fetchRows} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
            {t("common.refresh", "Refresh")}
          </button>
          <button onClick={exportCsv} className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">
            {t("common.exportCsv", "Export CSV")}
          </button>
        </div>
      </div>

      {/* Filters card */}
      <div className="rounded-3xl border bg-white/70 backdrop-blur p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {quickRanges.map((q) => (
              <button
                key={q.k}
                type="button"
                onClick={() => setFilters((s) => ({ ...s, from: q.from, to: q.to }))}
                className="px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClearFilters} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm" type="button">
              {t("common.clear", "Clear")}
            </button>
            <button onClick={fetchRows} className="px-3 py-1.5 rounded-xl bg-black text-white text-sm hover:opacity-90" type="button">
              {t("common.apply", "Apply")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block group">
            <span className="text-xs font-medium text-gray-600 mb-1 block">{t("employees.employee", "Employee")}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconUser /></span>
              <select
                className="w-full border rounded-2xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={filters.employeeId}
                onChange={onSet("employeeId")}
              >
                <option value="">{t("common.all", "All")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {nameOf(e) || e.email}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block group">
            <span className="text-xs font-medium text-gray-600 mb-1 block">{t("common.to", "To")}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconCalendar /></span>
              <input
                type="date"
                className="w-full border rounded-2xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={filters.to}
                onChange={onSet("to")}
              />
            </div>
          </label>

          <label className="block group">
            <span className="text-xs font-medium text-gray-600 mb-1 block">{t("common.from", "From")}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><IconCalendar /></span>
              <input
                type="date"
                className="w-full border rounded-2xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={filters.from}
                onChange={onSet("from")}
              />
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 mb-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("employees.employee", "Employee")}</Th>
              <Th>{t("common.date", "Date")}</Th>
              <Th>{t("attendance.checkIn", "Check-in")}</Th>
              <Th>{t("attendance.checkOut", "Check-out")}</Th>
              <Th>{t("attendance.hours", "Hours")}</Th>
              <Th>{t("attendance.sites", "Sites")}</Th>
              <Th>{t("attendance.notes", "Notes")}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t("common.loading", "Loading...")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">{t("common.noResults", "No results")}</td></tr>
            ) : (
              rows.map((r) => {
                const e = empMap[r.employeeId] || {};
                const h = hoursBetween(r.checkInAt, r.checkOutAt);
                return (
                  <tr key={r.id || `${r.employeeId}-${r.date}`} className="border-t">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar seed={e.email || r.employeeId} />
                        <div>
                          <div className="font-medium">{nameOf(e) || e.email || r.employeeId}</div>
                          {e.email && <div className="text-xs text-gray-500">{e.email}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium">{shortDate(r.date)}</div>
                      <div className="text-[11px] text-gray-500">
                        {r.date ? new Date(r.date).toLocaleDateString(undefined, { weekday: "short" }) : "—"}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium">{shortTime(r.checkInAt)}</div>
                      <div className="text-[11px] text-gray-500">
                        {(r.checkInSource || "—")}{r.checkInSiteId ? ` · ${r.checkInSiteId}` : ""}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium">{shortTime(r.checkOutAt)}</div>
                      <div className="text-[11px] text-gray-500">
                        {(r.checkOutSource || "—")}{r.checkOutSiteId ? ` · ${r.checkOutSiteId}` : ""}
                      </div>
                    </Td>
                    <Td>
                      {h != null ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100">
                          {h.toFixed(2)}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {r.checkInSiteId && <Pill label={`IN · ${r.checkInSiteId}`} />}
                        {r.checkOutSiteId && <Pill label={`OUT · ${r.checkOutSiteId}`} />}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700">
                        {r.checkInNote && <div>IN: {r.checkInNote}</div>}
                        {r.checkOutNote && <div>OUT: {r.checkOutNote}</div>}
                        {!r.checkInNote && !r.checkOutNote && "—"}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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
function Pill({ label }) {
  return <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100">{label}</span>;
}
function Avatar({ seed }) {
  const initials =
    (seed || "U")
      .split("@")[0]
      .split(/[.\-_ ]/g)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 grid place-items-center text-xs font-semibold">
      {initials}
    </div>
  );
}
