// src/pages/LeaveRequests.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

/* -------------------- API & auth helpers -------------------- */
const API_BASE =  "https://hr-backend-npbd.onrender.com";
const API = `${API_BASE}/api/attendance/leave`;

const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  process.env.REACT_APP_TENANT_ID ||
  "";
const getIdToken = () => localStorage.getItem("fb_id_token") || "";
const getAuthHeaders = () => {
  const h = {};
  const t = getIdToken();
  const tenantId = getTenantId();
  if (t) h.Authorization = `Bearer ${t}`;
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  return h;
};
/* ------------------------------------------------------------ */

const STATUS = ["All", "Pending", "Approved", "Rejected"];

const Icon = {
  Chevron:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  Sort:(p)=><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M10 6h10M4 12h16M10 18h10"/></svg>,
  Up:(p)=><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="m18 15-6-6-6 6"/></svg>,
  Down:(p)=><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  Search:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>,
  Calendar:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Eye:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M20 6 9 17l-5-5"/></svg>,
  X:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Trash:(p)=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>,
  Dot:(p)=><svg viewBox="0 0 8 8" width="8" height="8" {...p}><circle cx="4" cy="4" r="4"/></svg>,
  Paperclip:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M21.44 11.05 12 20.5a6 6 0 0 1-8.49-8.49L12 3.5a4 4 0 0 1 5.66 5.66L9.88 17.94a2 2 0 1 1-2.83-2.83L15.07 7.1"/></svg>,
  Image:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 14l4-4 4 4 4-4 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>,
  Pdf:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h3M8 17h3M13 17h3M13 13h3"/></svg>,
  Filter:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/></svg>,
  Download:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
};

/* ---------- attachments helpers ---------- */
function normalizeAttachments(att) {
  if (!att) return [];
  if (Array.isArray(att)) return att.filter(Boolean);
  if (typeof att === "object") return Object.values(att).filter(Boolean);
  return [];
}
function buildDownloadUrl(a) {
  if (a.downloadUrl) return a.downloadUrl;
  if (a.downloadURL) return a.downloadURL;
  if (a.url) return a.url;
  const bucket = a.bucket;
  const path = a.path;
  const token = a.token || a.downloadToken || a.download_token;
  if (bucket && path && token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  }
  if (a.base64) {
    const ct = a.contentType || a.mimeType || "application/octet-stream";
    return `data:${ct};base64,${a.base64}`;
  }
  return "";
}
function isImageAtt(a) {
  const ct = String(a.contentType || a.mimeType || "");
  if (ct) return ct.startsWith("image/");
  const name = String(a.fileName || a.name || "");
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(name);
}
function isPdfAtt(a) {
  const ct = String(a.contentType || a.mimeType || "");
  if (ct) return /pdf/i.test(ct);
  const name = String(a.fileName || a.name || "");
  return /\.pdf$/i.test(name);
}
function humanBytes(n = 0) {
  const kb = n/1024, mb = kb/1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(1)} KB`;
  return `${n} B`;
}

/* ---------- bidi-safe date helpers ---------- */
const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === "number") return new Date(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date(s);
};
const fmtISO = (v) => {
  const d = parseDate(v);
  if (!d || Number.isNaN(+d)) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const DateCell = ({ value, title }) => {
  const iso = fmtISO(value);
  return (
    <time
      dateTime={iso}
      dir="ltr"
      className="font-mono tabular-nums text-sm"
      style={{ unicodeBidi: "isolate" }}
      title={title || iso}
    >
      {iso}
    </time>
  );
};

const Chip = ({ tone = "gray", children }) => {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-amber-100 text-amber-800 border border-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    rose: "bg-rose-100 text-rose-800 border border-rose-200",
    blue: "bg-blue-100 text-blue-800 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
};
const statusTone = (s) => s === "Approved" ? "emerald" : s === "Rejected" ? "rose" : "amber";

/* helpers */
const getEmpName = (r) => r?.employee?.fullName || r?.employee?.name || r?.employee || "";

/* =================== NOTIFICATION HELPER =================== */
async function notifyDecision({ employeeId, uid, status, leaveId }) {
  const url = `${API_BASE}/api/notifications/send`;
  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

  const payload = {
    employeeId: employeeId || undefined,
    uid: uid || undefined,
    title: "Leave request update",
    body:
      status === "Approved"
        ? "Your leave request has been approved."
        : status === "Rejected"
        ? "Your leave request has been rejected."
        : `Your leave request status changed to ${status}.`,
    data: {
      type: "leave_status_change",
      leaveId: String(leaveId || ""),
      status: String(status || ""),
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    console.warn("notifyDecision failed", r.status, txt);
    throw new Error(`notify failed: ${r.status}`);
  }
  const json = await r.json().catch(() => ({}));
  console.log("notifyDecision =>", json);
  return json;
}

/* =========================== PAGE =========================== */
export default function LeaveRequests() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const tx = (key, en, ar) => (i18n.exists(key) ? t(key) : isRTL ? ar ?? en : en);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [paid, setPaid] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // sorting
  const [sort, setSort] = useState({ key: "from", dir: "desc" });

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const dfmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "2-digit", day: "2-digit" }),
    [i18n.language]
  );
  const tfmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    [i18n.language]
  );
  const d = (x) => (x ? dfmt.format(new Date(x)) : "—");
  const dt = (x) => (x ? tfmt.format(new Date(x)) : "—");

  const flash = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3000); };

  const fetchRows = useCallback(async ({ tab, q, from, to, type, paid }) => {
    setLoading(true);
    try {
      const url = new URL(API);
      if (tab && tab !== "All") url.searchParams.set("status", tab);
      if (q) url.searchParams.set("q", q);
      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);
      if (type) url.searchParams.set("type", type);
      if (paid) url.searchParams.set("paid", paid === "Paid" ? "1" : "0");
      const r = await fetch(url.toString(), { headers: getAuthHeaders() });
      const data = r.ok ? await r.json() : [];
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
      setPage(1);
      setOpenId(null);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows({ tab, q, from, to, type, paid });
  }, [fetchRows, from, paid, q, tab, to, type]);

  // KPIs with improved design
  const kpi = useMemo(() => ({
    p: rows.filter(r => r.status === "Pending").length,
    a: rows.filter(r => r.status === "Approved").length,
    r: rows.filter(r => r.status === "Rejected").length,
    t: rows.length
  }), [rows]);

  // filter + sort
  const filtered = useMemo(() => {
    let xs = rows.slice();
    if (tab !== "All") xs = xs.filter(r => r.status === tab);
    if (q) {
      const term = q.trim().toLowerCase();
      xs = xs.filter(r => {
        const emp = getEmpName(r);
        return [
          emp, r.type, r.status, r.notes, r.reason, r.department, r.teamName
        ].filter(Boolean).join(" ").toLowerCase().includes(term);
      });
    }
    if (type) xs = xs.filter(r => String(r.type || "") === type);
    if (paid) xs = xs.filter(r => (paid === "Paid" ? r.paid !== false : r.paid === false));
    if (from) xs = xs.filter(r => new Date(r.from) >= new Date(from));
    if (to) xs = xs.filter(r => new Date(r.to) <= new Date(to));

    const dirMul = sort.dir === "asc" ? 1 : -1;
    xs.sort((a,b) => {
      const k = sort.key;
      if (k === "from" || k === "to" || k === "createdAt") {
        return (new Date(a[k] ?? 0) - new Date(b[k] ?? 0)) * dirMul;
      }
      if (k === "days") {
        const va = Number(a.days ?? 0), vb = Number(b.days ?? 0);
        return (va - vb) * dirMul;
      }
      if (k === "employee") {
        return getEmpName(a).localeCompare(getEmpName(b)) * dirMul;
      }
      const va = (a[k] ?? "").toString();
      const vb = (b[k] ?? "").toString();
      return va.localeCompare(vb) * dirMul;
    });

    return xs;
  }, [rows, tab, q, type, paid, from, to, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page-1)*pageSize, page*pageSize);

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(pageRows.map(r => r.id)) : new Set());
  };
  const toggleOne = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const updateStatus = async (ids, status) => {
    const setIds = Array.isArray(ids) ? ids : [ids];
    const before = rows;
    setRows(xs => xs.map(x => setIds.includes(x.id) ? { ...x, status } : x));

    try {
      await Promise.all(setIds.map(async (id) => {
        let resp = await fetch(`${API}/${id}/decision`, {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type":"application/json" },
          body: JSON.stringify({ status })
        });
        if (!resp.ok) {
          resp = await fetch(`${API}/${id}`, {
            method: "PATCH",
            headers: { ...getAuthHeaders(), "Content-Type":"application/json" },
            body: JSON.stringify({ status })
          });
        }
        if (!resp.ok) throw new Error();

        const row = before.find(r => r.id === id) || rows.find(r => r.id === id);
        const employeeId = row?.employeeId || row?.employee?.id || row?.employee_id || row?.employee?.employeeId;
        const uid = row?.employee?.uid || row?.uid || row?.employeeUid;

        try {
          await notifyDecision({ employeeId, uid, status, leaveId: id });
        } catch (e) {
          console.warn("notifyDecision error:", e);
        }
      }));

      flash("ok", status === "Approved" ? t("approved","Approved") : t("rejected","Rejected"));
      setSelected(new Set());
    } catch {
      setRows(before);
      flash("err", t("timeTracking.errorStatus", "Failed to update status."));
    }
  };

  // const removeOne = async (id) => {
  //   const before = rows;
  //   setRows(xs => xs.filter(x => x.id !== id));
  //   try {
  //     const r = await fetch(`${API}/${id}`, { method:"DELETE", headers:getAuthHeaders() });
  //     if (r.status !== 204) throw new Error();
  //     flash("ok", t("actions.delete","Delete") + " ✓");
  //     if (openId === id) setOpenId(null);
  //   } catch {
  //     setRows(before);
  //     flash("err", t("timeTracking.errorDeleting","Failed to delete entry."));
  //   }
  // };

  const SortBtn = ({ col }) => {
    const active = sort.key === col;
    const dirIcon = sort.dir === "asc" ? <Icon.Up/> : <Icon.Down/>;
    return (
      <button
        onClick={() => setSort(s => s.key === col ? ({ key: col, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key: col, dir: "asc" }))}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        title="Sort"
      >
        {active ? dirIcon : <Icon.Sort />}
      </button>
    );
  };

  const exportData = () => {
    const headers = ["Employee", "Type", "From", "To", "Days", "Paid", "Status", "Department", "Team"];
    const csv = [
      headers.join(","),
      ...filtered.map(row => [
        `"${getEmpName(row)}"`,
        `"${row.type || ""}"`,
        `"${fmtISO(row.from)}"`,
        `"${fmtISO(row.to)}"`,
        row.days || 0,
        row.paid === false ? "No" : "Yes",
        `"${row.status || "Pending"}"`,
        `"${row.department || ""}"`,
        `"${row.teamName || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tx("menu.leave","Leave Requests","طلبات الإجازة")}
            </h1>
            <p className="mt-2 text-gray-600">
              {tx("manageLeaveRequests","Manage and review employee leave requests","إدارة ومراجعة طلبات إجازة الموظفين")}
            </p>
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Icon.Download className="w-4 h-4" />
            {t("export","Export")}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI 
          label={t("timeTracking.statuses.Pending","Pending")} 
          value={kpi.p} 
          total={kpi.t}
          tone="amber"
        />
        <KPI 
          label={t("timeTracking.statuses.Approved","Approved")} 
          value={kpi.a} 
          total={kpi.t}
          tone="emerald"
        />
        <KPI 
          label={t("timeTracking.statuses.Rejected","Rejected")} 
          value={kpi.r} 
          total={kpi.t}
          tone="rose"
        />
        <KPI 
          label={t("total","Total")} 
          value={kpi.t} 
          tone="blue"
        />
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs + Filters Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-50 p-1">
              {STATUS.map(s => (
                <button
                  key={s}
                  onClick={() => setTab(s)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    tab===s 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Search + Filter Toggle */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 lg:flex-none">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <Icon.Search/>
                </span>
                <input
                  value={q} 
                  onChange={(e)=>setQ(e.target.value)}
                  placeholder={tx("search","Search employees, types...","ابحث في الموظفين، الأنواع...")}
                  className={`w-full lg:w-80 rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-colors ${isRTL?"text-right":""}`}
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  showFilters 
                    ? "border-blue-200 bg-blue-50 text-blue-700" 
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon.Filter className="w-4 h-4" />
                {t("filters","Filters")}
                {(type || paid || from || to) && (
                  <span className="flex h-2 w-2">
                    <span className="absolute animate-ping rounded-full bg-blue-400 opacity-75 h-2 w-2"></span>
                    <span className="relative rounded-full bg-blue-500 h-2 w-2"></span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("leaveRequests.type","Type")}
                  </label>
                  <select
                    value={type} 
                    onChange={(e)=>setType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option value="">{t("allTypes","All types")}</option>
                    <option>Annual</option>
                    <option>Sick</option>
                    <option>Unpaid</option>
                    <option>Emergency</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Paid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("leaveRequests.paid","Paid")}
                  </label>
                  <select
                    value={paid} 
                    onChange={(e)=>setPaid(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option value="">{t("all","All")}</option>
                    <option>Paid</option>
                    <option>Unpaid</option>
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.from","From")}
                  </label>
                  <div className="relative">
                    <Icon.Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="date" 
                      value={from} 
                      onChange={(e)=>setFrom(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-colors"
                    />
                  </div>
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.to","To")}
                  </label>
                  <div className="relative">
                    <Icon.Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="date" 
                      value={to} 
                      onChange={(e)=>setTo(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(type || paid || from || to) && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setType("");
                      setPaid("");
                      setFrom("");
                      setTo("");
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {t("clearFilters","Clear filters")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                {selected.size} {t("selected","selected")} {t("requests","requests")}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={()=>updateStatus([...selected],"Approved")}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  <Icon.Check className="w-4 h-4" />
                  {t("actions.approve","Approve")}
                </button>
                <button 
                  onClick={()=>updateStatus([...selected],"Rejected")}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
                >
                  <Icon.X className="w-4 h-4" />
                  {t("actions.reject","Reject")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={pageRows.length>0 && pageRows.every(r=>selected.has(r.id))}
                      onChange={(e)=>toggleAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t("table.employee","Employee")}
                      <SortBtn col="employee"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t("leaveRequests.type","Type")}
                      <SortBtn col="type"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t("timeTracking.from","From")}
                      <SortBtn col="from"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t("timeTracking.to","To")}
                      <SortBtn col="to"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {t("leaveRequests.days","Days")}
                      <SortBtn col="days"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t("table.status","Status")}
                      <SortBtn col="status"/>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("table.actions","Actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  [...Array(8)].map((_,i)=>(
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-4"/></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full"/>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-24"/>
                            <div className="h-3 bg-gray-200 rounded w-32"/>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"/></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"/></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"/></td>
                      <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-12"/></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16"/></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <div className="h-8 bg-gray-200 rounded w-16"/>
                          <div className="h-8 bg-gray-200 rounded w-16"/>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="text-gray-500">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Icon.Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="text-lg font-medium text-gray-900 mb-2">
                          {t("messages.noMatches","No results found")}
                        </div>
                        <p className="text-gray-600 max-w-sm mx-auto">
                          {t("messages.tryAdjustingFilters","Try adjusting your search or filters to find what you're looking for.")}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.flatMap((r) => {
                    const emp = getEmpName(r);
                    const atts = normalizeAttachments(r.attachments);
                    const attCount = r.attachmentsCount ?? atts.length ?? 0;

                    return [
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={()=>toggleOne(r.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-medium text-sm">
                              {String(emp).slice(0,1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{emp || "—"}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                <span>{r.department || r.employee?.department || "—"}</span>
                                {r.teamName && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>{r.teamName}</span>
                                  </>
                                )}
                                {attCount > 0 && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="inline-flex items-center gap-1 text-blue-600">
                                      <Icon.Paperclip className="w-3 h-3"/>
                                      {attCount}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{r.type || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <DateCell value={r.from} />
                        </td>
                        <td className="px-6 py-4">
                          <DateCell value={r.to} />
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="text-sm text-gray-900 font-medium">
                            {r.days ?? "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Chip tone={statusTone(r.status)}>
                            {r.status || "Pending"}
                          </Chip>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionBtn
                              onClick={()=>setOpenId(id => id===r.id?null:r.id)}
                              tone="gray"
                            >
                              <Icon.Eye className="w-4 h-4"/>
                              {openId===r.id ? t("actions.hide","Hide") : t("actions.view","View")}
                            </ActionBtn>
                            <ActionBtn
                              onClick={()=>updateStatus(r.id,"Approved")}
                              tone="emerald"
                            >
                              <Icon.Check className="w-4 h-4"/>
                              {t("actions.approve","Approve")}
                            </ActionBtn>
                            <ActionBtn
                              onClick={()=>updateStatus(r.id,"Rejected")}
                              tone="rose"
                            >
                              <Icon.X className="w-4 h-4"/>
                              {t("actions.reject","Reject")}
                            </ActionBtn>
                          </div>
                        </td>
                      </tr>,

                      openId === r.id && (
                        <tr key={`${r.id}-details`} className="bg-blue-50/30">
                          <td colSpan={8} className="px-6 pb-6 pt-4">
                            <DetailsInline
                              data={r}
                              t={t}
                              d={d}
                              dt={dt}
                            />
                          </td>
                        </tr>
                      )
                    ].filter(Boolean);
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="text-sm text-gray-700">
                {t("showing","Showing")} <span className="font-medium">{(page-1)*pageSize+1}</span> {t("to","to")} <span className="font-medium">{Math.min(page*pageSize, filtered.length)}</span> {t("of","of")} <span className="font-medium">{filtered.length}</span> {t("results","results")}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page<=1} 
                  onClick={()=>setPage(p=>Math.max(1,p-1))}
                  className={`flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-colors ${
                    page<=1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {isRTL ? '›' : '‹'} {t("previous","Previous")}
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                </div>
                <button 
                  disabled={page>=totalPages} 
                  onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
                  className={`flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition-colors ${
                    page>=totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {t("next","Next")} {isRTL ? '‹' : '›'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 ${isRTL ? "left-6" : "right-6"} z-50 animate-in slide-in-from-bottom-8`}>
          <div className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 backdrop-blur-sm transition-all ${
            toast.type === "err" 
              ? "bg-rose-50 text-rose-800 ring-rose-200" 
              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === "err" ? (
                <Icon.X className="w-4 h-4" />
              ) : (
                <Icon.Check className="w-4 h-4" />
              )}
              {toast.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------ Components ------------------------ */
function KPI({ label, value, total, tone = "gray" }) {
  const toneMap = {
    gray: "from-gray-100 to-gray-200 text-gray-700",
    amber: "from-amber-100 to-amber-200 text-amber-700",
    emerald: "from-emerald-100 to-emerald-200 text-emerald-700",
    rose: "from-rose-100 to-rose-200 text-rose-700",
    blue: "from-blue-100 to-blue-200 text-blue-700",
  };

  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={`bg-gradient-to-br rounded-2xl p-5 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium opacity-80">{label}</div>
        {total > 0 && (
          <div className="text-xs opacity-70">{percentage}%</div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full bg-current transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, tone = "gray" }) {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200";
  const toneMap = {
    gray: "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 hover:ring-gray-400",
    emerald: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    rose: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm",
    blue: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm",
  };
  
  return (
    <button onClick={onClick} className={`${base} ${toneMap[tone]}`}>
      {children}
    </button>
  );
}

/* ---------- Inline details ---------- */
function DetailsInline({ data, t, d, dt }) {
  const Row = ({ label, value }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="md:col-span-2 text-sm text-gray-900 break-words">{value ?? "—"}</div>
    </div>
  );

  const steps = [
    { label: t("submitted","Submitted"), at: data.createdAt, tone:"gray" },
    ...(data.status === "Approved" || data.status === "Rejected"
      ? [{ label: data.status, at: data.updatedAt || data.decidedAt || data.createdAt, tone: data.status === "Approved" ? "emerald" : "rose" }]
      : []),
  ];

  const atts = normalizeAttachments(data.attachments);
  const hasAtts = atts.length > 0;

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
            {t("leaveRequests.request","Request Details")}
          </h4>
          <div className="space-y-1">
            <Row label={t("leaveRequests.type","Type")} value={data.type} />
            <Row label={t("leaveRequests.paid","Paid")} value={data.paid === false ? t("no","No") : t("yes","Yes")} />
            <Row label={t("leaveRequests.halfStart","Half day (start)")} value={data.halfDayStart ? t("yes","Yes") : t("no","No")} />
            <Row label={t("leaveRequests.halfEnd","Half day (end)")} value={data.halfDayEnd ? t("yes","Yes") : t("no","No")} />
            <Row label={t("timeTracking.from","From")} value={<DateCell value={data.from} />} />
            <Row label={t("timeTracking.to","To")} value={<DateCell value={data.to} />} />
            <Row label={t("leaveRequests.days","Days")} value={data.days ?? "—"} />
            <Row label={t("leaveRequests.reason","Reason / notes")} value={data.reason || data.notes || "—"} />
            <Row label={t("leaveRequests.destination","Destination")} value={data.destination || "—"} />
            <Row label={t("leaveRequests.contactWhileAway","Contact while away")} value={data.contact || data.contactWhileAway || "—"} />
            {data.decisionNotes && <Row label={t("leaveRequests.decisionNotes","Decision notes")} value={data.decisionNotes} />}
          </div>
        </section>

        <section>
          <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
            {t("table.employee","Employee Information")}
          </h4>
          <div className="space-y-1">
            <Row label={t("name","Name")} value={getEmpName(data)} />
            <Row label={t("departments.name","Department")} value={data.department || data.employee?.department || "—"} />
            <Row label={t("teams.name","Team")} value={data.teamName || data.employee?.teamName || "—"} />
            <Row label={t("email","Email")} value={data.employee?.email || "—"} />
            <Row label={t("createdAt","Submitted at")} value={<span dir="ltr" style={{ unicodeBidi:"isolate" }}>{dt(data.createdAt)}</span>} />
            <Row label={t("updatedAt","Updated at")} value={<span dir="ltr" style={{ unicodeBidi:"isolate" }}>{dt(data.updatedAt)}</span>} />
            <Row label={t("id","Request ID")} value={<code className="text-xs bg-gray-100 px-2 py-1 rounded">{data.id}</code>} />
          </div>
        </section>
      </div>

      {/* Timeline */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50/50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
          {t("timeline","Request Timeline")}
        </h4>
        <ol className="relative ml-3 space-y-6">
          {steps.map((s, i) => (
            <li key={i} className="relative pl-8">
              <span className={`absolute left-0 top-1.5 flex h-3 w-3 items-center justify-center ${
                s.tone==="emerald" ? "bg-emerald-500" : s.tone==="rose" ? "bg-rose-500" : "bg-gray-400"
              } rounded-full ring-4 ring-white`}>
                <Icon.Dot className="text-white" />
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm font-medium text-gray-900">{s.label}</div>
                <div className="text-xs text-gray-500 font-mono" dir="ltr" style={{ unicodeBidi:"isolate" }}>
                  {dt(s.at)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Attachments */}
      {hasAtts && (
        <section className="mt-8">
          <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon.Paperclip className="w-5 h-5"/> 
            {t("attachments","Attachments")} 
            <span className="text-sm font-normal text-gray-500">({atts.length})</span>
          </h4>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {atts.map((a, i) => {
              const url = buildDownloadUrl(a);
              const isImg = isImageAtt(a);
              const isPdf = isPdfAtt(a);
              return (
                <li key={i} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-gray-100 bg-gray-50 flex items-center justify-center">
                      {isImg && url ? (
                        <img
                          src={url}
                          alt={a.fileName || a.name || "image"}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : isPdf ? (
                        <div className="flex h-full w-full items-center justify-center text-red-500">
                          <Icon.Pdf className="w-8 h-8"/>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Icon.Paperclip className="w-6 h-6"/>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900 mb-1">
                        {a.fileName || a.name || t("file","File")}
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>{a.contentType || a.mimeType || "application/octet-stream"}</div>
                        <div>{humanBytes(a.size)}</div>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          referrerPolicy="no-referrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                          {t("actions.openInNewTab","Open")}
                          <Icon.ExternalLink className="w-3 h-3"/>
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// Add missing ExternalLink icon
Icon.ExternalLink = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>;