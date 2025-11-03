// src/pages/recruitment/Applicants.jsx
import  { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiUser, FiSearch, FiRefreshCw, FiDownload, FiTrash2,
  FiChevronLeft, FiChevronRight, FiX, FiEdit3, FiFilter
} from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002";

/* -------------------- auth / tenant helpers -------------------- */
const getIdToken = () => localStorage.getItem("fb_id_token") || "";
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  process.env.REACT_APP_TENANT_ID ||
  "";

const authHeaders = () => {
  const h = {};
  const token = getIdToken();
  const tid = getTenantId();
  if (token) h.Authorization = `Bearer ${token}`;
  if (tid) h["X-Tenant-Id"] = tid; // optional; middleware can pick default
  return h;
};

const safeJson = (txt) => { try { return JSON.parse(txt); } catch { return null; } };
const cx = (...c) => c.filter(Boolean).join(" ");
const fmtDateTime = (d) => {
  if (!d) return "—";
  const ms = typeof d === "number" ? d : Date.parse(d);
  if (!ms) return d;
  return new Date(ms).toLocaleString();
};
/* -------------------------------------------------------------- */

/* -------------------- UI helpers -------------------- */
const STATUSES = [
  "Applied", "Shortlisted", "Interviewing", "Offered", "Hired", "Rejected", "Withdrawn"
];

const statusPillClasses = (s) => {
  const k = String(s || "").toLowerCase();
  if (k === "applied")       return "bg-blue-50 text-blue-700 ring-blue-200";
  if (k === "shortlisted")   return "bg-amber-50 text-amber-700 ring-amber-200";
  if (k === "interviewing")  return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  if (k === "offered")       return "bg-cyan-50 text-cyan-700 ring-cyan-200";
  if (k === "hired")         return "bg-green-50 text-green-700 ring-green-200";
  if (k === "rejected")      return "bg-rose-50 text-rose-700 ring-rose-200";
  if (k === "withdrawn")     return "bg-gray-100 text-gray-700 ring-gray-300";
  return "bg-gray-100 text-gray-700 ring-gray-300";
};

function StatusPill({ value }) {
  return (
    <span className={cx(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
      statusPillClasses(value)
    )}>
      {value || "Applied"}
    </span>
  );
}

function IconButton({ title, onClick, children, className, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}
/* ---------------------------------------------------- */

export default function Applicants() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  /* ---------- data state ---------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  /* ---------- ui state ---------- */
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt"); // name | jobTitle | status | createdAt
  const [sortDir, setSortDir] = useState("desc");    // asc | desc

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState(new Set());
  const [drawer, setDrawer] = useState({ open: false, item: null });

  const searchRef = useRef(null);
  const [searchDraft, setSearchDraft] = useState("");
  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setQ(searchDraft), 300);
    return () => clearTimeout(id);
  }, [searchDraft]);

  /* ---------- fetch ---------- */
const load = useCallback(async () => {
     setLoading(true);
     setErr("");
     setMsg("");
     try {
       if (!getIdToken()) {
         throw new Error(t("errors.authRequired", "You must be signed in to view applicants."));
       }
       const res = await fetch(`${API_BASE}/api/recruitment/applicants`, {
         headers: { ...authHeaders(), Accept: "application/json" },
       });
       const txt = await res.text();
       const data = txt ? safeJson(txt) : null;
       if (!res.ok) {
         const serverMsg = data?.error || data?.message || txt || `HTTP ${res.status}`;
         throw new Error(serverMsg);
       }
       setRows(Array.isArray(data) ? data : []);
     } catch (e) {
       const m = String(e?.message || "");
       let friendly = m;
       if (/No tenant membership/i.test(m)) {
         friendly = t("errors.noMembership", "Your account is not a member of any tenant.");
       } else if (/Missing bearer token|Token expired|Invalid token|Unauthenticated|401/i.test(m)) {
         friendly = t("errors.authRequired", "You must be signed in to view applicants.");
       } else if (/403|Forbidden/i.test(m)) {
         friendly = t("errors.forbidden", "You don’t have permission to view applicants.");
       } else if (!m) {
         friendly = t("errors.loadApplicants", "Failed to load applicants.");
       }
       setErr(friendly);
     } finally {
       setLoading(false);
     }
     }, [t]);

  useEffect(() => {
  load();
  }, [load]);

  /* ---------- compute ---------- */
  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows;

    if (statusFilter) {
      list = list.filter(r => (r.status || "Applied") === statusFilter);
    }

    if (term) {
      list = list.filter((r) =>
        [r.firstName, r.lastName, r.email, r.phone, r.jobTitle, r.status, r.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    const by = sortBy;
    const dirMul = sortDir === "asc" ? 1 : -1;

    list = [...list].sort((a, b) => {
      const A =
        by === "name"
          ? `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()
          : by === "jobTitle"
          ? String(a.jobTitle || "").toLowerCase()
          : by === "status"
          ? String(a.status || "").toLowerCase()
          : a.createdAt
          ? Date.parse(a.createdAt) || a.createdAt
          : 0;
      const B =
        by === "name"
          ? `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase()
          : by === "jobTitle"
          ? String(b.jobTitle || "").toLowerCase()
          : by === "status"
          ? String(b.status || "").toLowerCase()
          : b.createdAt
          ? Date.parse(b.createdAt) || b.createdAt
          : 0;

      if (A < B) return -1 * dirMul;
      if (A > B) return  1 * dirMul;
      return 0;
    });

    return list;
  }, [rows, q, statusFilter, sortBy, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageClamped = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    // when filters/sorting change, keep us in range
    setPage(1);
  }, [q, statusFilter, sortBy, sortDir, pageSize]);

  const pageRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, pageClamped, pageSize]);

  /* ---------- operations ---------- */
  const toggleSelectAllPage = () => {
    const ids = new Set(selected);
    const allSelected = pageRows.every(r => ids.has(r.id));
    if (allSelected) {
      pageRows.forEach(r => ids.delete(r.id));
    } else {
      pageRows.forEach(r => ids.add(r.id));
    }
    setSelected(ids);
  };
  const toggleRow = (id) => {
    const ids = new Set(selected);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    setSelected(ids);
  };

  const changeStatus = async (id, status) => {
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/recruitment/applicants/${id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const txt = await res.text();
      const data = txt ? safeJson(txt) : null;
      if (!res.ok) throw new Error(data?.error || txt || `HTTP ${res.status}`);

      setRows((list) => list.map(r => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)));
      setMsg(t("messages.updated", "Updated."));
    } catch (e) {
      setErr(t("errors.updateFailed", "Failed to update status."));
    }
  };

  const bulkChangeStatus = async (status) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => changeStatus(id, status)));
    setSelected(new Set());
  };

  const removeOne = async (id) => {
    if (!window.confirm(t("confirm.deleteApplicant", "Delete this applicant?"))) return;
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/recruitment/applicants/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setRows((list) => list.filter(r => r.id !== id));
      setSelected((ids) => {
        const n = new Set(ids); n.delete(id); return n;
      });
      setMsg(t("messages.deleted", "Deleted."));
    } catch (e) {
      setErr(t("errors.deleteFailed", "Failed to delete applicant."));
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(t("confirm.deleteSelected", "Delete selected applicants?"))) return;
    await Promise.all(ids.map((id) => removeOne(id)));
    setSelected(new Set());
  };

  const exportCSV = () => {
    const cols = ["id","firstName","lastName","email","phone","jobTitle","status","source","createdAt"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.join(",")];
    filteredSorted.forEach((r) => {
      lines.push(cols.map((c) => esc(r[c])).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applicants.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- rendering ---------- */
  return (
    <div dir={dir} className="p-6 space-y-4">
      {/* Header / Controls */}
      <div className={cx("flex flex-col gap-3 md:flex-row md:items-center md:justify-between")}>
        <h1 className="text-2xl font-bold">{t("menu.applicants")}</h1>

        <div className={cx("flex flex-col gap-2 md:flex-row md:items-center", isRTL ? "md:flex-row-reverse" : "")}>
          {/* Search */}
          <div className="relative w-full md:w-80">
            <span className={cx("pointer-events-none absolute inset-y-0 flex items-center text-gray-400", isRTL ? "right-3" : "left-3")}><FiSearch /></span>
            <input
              ref={searchRef}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              dir={isRTL ? "rtl" : "ltr"}
              className={cx(
                "w-full rounded-lg border border-gray-300 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500",
                isRTL ? "pr-10 pl-3" : "pl-10 pr-3"
              )}
              placeholder={t("filters.searchPlaceholder", "Search name, email or job…")}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("filters.allStatuses", "All statuses")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="createdAt">{t("sort.submitted", "Submitted")}</option>
              <option value="name">{t("allEmployeesTable.name")}</option>
              <option value="jobTitle">{t("menu.jobs")}</option>
              <option value="status">{t("status") || "Status"}</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="desc">{t("sort.desc", "Desc")}</option>
              <option value="asc">{t("sort.asc", "Asc")}</option>
            </select>
          </div>

          {/* Actions */}
          <div className={cx("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <IconButton title={t("actions.refresh", "Refresh")} onClick={load}>
              <FiRefreshCw /> {t("actions.refresh", "Refresh")}
            </IconButton>
            <IconButton title={t("actions.exportCSV", "Export CSV")} onClick={exportCSV}>
              <FiDownload /> {t("actions.exportCSV", "Export CSV")}
            </IconButton>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            {t("bulk.selected", "{{count}} selected", { count: selected.size })}
          </div>
          <div className="flex items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) bulkChangeStatus(v);
                e.target.value = "";
              }}
              className="rounded-lg border border-amber-200 bg-white py-2 px-3 text-sm"
            >
              <option value="">{t("bulk.changeStatus", "Change status…")}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <IconButton title={t("actions.delete", "Delete")} onClick={bulkDelete} className="border-amber-300">
              <FiTrash2 /> {t("actions.delete", "Delete")}
            </IconButton>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow">
        <table className={cx("min-w-full text-sm", isRTL ? "text-right" : "text-left")}>
          <thead className="bg-gray-50 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every(r => selected.has(r.id))}
                  onChange={toggleSelectAllPage}
                />
              </th>
              <th className="px-4 py-3">{t("allEmployeesTable.name")}</th>
              <th className="px-4 py-3">{t("menu.jobs")}</th>
              <th className="px-4 py-3">{t("fields.email")}</th>
              <th className="px-4 py-3">{t("status") || "Status"}</th>
              
              <th className="px-4 py-3">{t("table.actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : err ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-red-700">{err}</td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-gray-600">
                  {q || statusFilter
                    ? t("messages.noResults", "No results match your filters.")
                    : t("messages.noApplicants", "No applicants yet.")}
                </td>
              </tr>
            ) : (
              pageRows.map((a) => {
                const name = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name || "—";
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleRow(a.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex items-center gap-2"
                        onClick={() => setDrawer({ open: true, item: a })}
                        title={t("actions.viewDetails", "View details")}
                      >
                        <FiUser className="text-gray-400" />
                        <span className="font-medium text-gray-900">{name}</span>
                      </button>
                      {a.phone && <div className="text-xs text-gray-500" dir="ltr">{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3">{a.jobTitle || "—"}</td>
                    <td className="px-4 py-3" dir="ltr">{a.email || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={a.status || "Applied"} />
                    </td>
                   
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) changeStatus(a.id, v);
                            e.target.value = "";
                          }}
                          className="rounded-lg border border-gray-300 bg-white py-1.5 px-2 text-xs"
                          title={t("actions.changeStatus", "Change status")}
                        >
                          <option value="">{t("actions.changeStatus", "Change status")}</option>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                          className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                          onClick={() => setDrawer({ open: true, item: a })}
                          title={t("actions.viewEdit", "View / Edit")}
                        >
                          <FiEdit3 />
                        </button>
                        <button
                          className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-rose-50 text-rose-600 border-rose-200"
                          onClick={() => removeOne(a.id)}
                          title={t("actions.delete", "Delete")}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={cx("flex items-center justify-between text-sm", isRTL ? "flex-row-reverse" : "")}>
        <div className="text-gray-600">
          {t("pagination.showing", "Showing")}{" "}
          <strong>
            {total === 0 ? 0 : (pageClamped - 1) * pageSize + 1} – {Math.min(pageClamped * pageSize, total)}
          </strong>{" "}
          {t("pagination.of", "of")} <strong>{total}</strong>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white py-1.5 px-2"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            className="rounded-lg border px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={pageClamped <= 1}
            title={t("pagination.prev", "Previous")}
          >
            <FiChevronLeft />
          </button>
          <span className="min-w-[4rem] text-center">{pageClamped} / {totalPages}</span>
          <button
            className="rounded-lg border px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={pageClamped >= totalPages}
            title={t("pagination.next", "Next")}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Inline messages */}
      {(msg || err) && (
        <div
          className={cx(
            "rounded-lg border p-3 text-sm",
            msg ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {msg || err}
        </div>
      )}

      {/* Details drawer */}
      {drawer.open && drawer.item && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer({ open: false, item: null })} />
          <div
            dir={dir}
            className={cx(
              "absolute top-0 h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto",
              isRTL ? "left-0 rounded-r-2xl" : "right-0 rounded-l-2xl"
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("actions.viewDetails", "View details")}</h2>
              <button
                className="rounded-full p-2 hover:bg-gray-100"
                onClick={() => setDrawer({ open: false, item: null })}
              >
                <FiX />
              </button>
            </div>

            <DetailRow label={t("allEmployeesTable.name")}>
              {`${drawer.item.firstName || ""} ${drawer.item.lastName || ""}`.trim() || drawer.item.name || "—"}
            </DetailRow>
            <DetailRow label={t("menu.jobs")}>{drawer.item.jobTitle || "—"}</DetailRow>
            <DetailRow label={t("fields.email")} dir="ltr">{drawer.item.email || "—"}</DetailRow>
            <DetailRow label={t("fields.phone")} dir="ltr">{drawer.item.phone || "—"}</DetailRow>
            <DetailRow label={t("status")}><StatusPill value={drawer.item.status || "Applied"} /></DetailRow>
            <DetailRow label={t("source", "Source")}>{drawer.item.source || "—"}</DetailRow>
            <DetailRow label={t("createdAt")}>{fmtDateTime(drawer.item.createdAt)}</DetailRow>
            <DetailRow label={t("updatedAt", "Updated")}>{fmtDateTime(drawer.item.updatedAt)}</DetailRow>
            {drawer.item.cvLink && (
              <DetailRow label={t("apply.fields.cvLink", "CV link")}>
                <a className="text-indigo-600 underline" href={drawer.item.cvLink} target="_blank" rel="noreferrer">
                  {drawer.item.cvLink}
                </a>
              </DetailRow>
            )}
            {drawer.item.notes && (
              <DetailRow label={t("apply.fields.notes", "Notes")}>
                <div className="whitespace-pre-wrap">{drawer.item.notes}</div>
              </DetailRow>
            )}

            <div className="mt-6 flex items-center gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  changeStatus(drawer.item.id, v);
                  setDrawer((d) => ({ ...d, item: { ...d.item, status: v } }));
                  e.target.value = "";
                }}
                className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm"
              >
                <option value="">{t("actions.changeStatus", "Change status…")}</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                className="rounded-lg border px-3 py-2 text-sm hover:bg-rose-50 text-rose-600 border-rose-200"
                onClick={() => { removeOne(drawer.item.id); setDrawer({ open: false, item: null }); }}
              >
                <FiTrash2 className="inline -mt-[2px]" /> {t("actions.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children, dir }) {
  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-gray-900" dir={dir}>{children}</div>
    </div>
  );
}
