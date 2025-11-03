import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/*
  SalaryRequests.jsx — HR review/approve/reject salary *advance* requests only
  ---------------------------------------------------------------------------
  Backend:
    GET    /api/salary/requests?status=&limit=&type=advance
    GET    /api/salary/requests/:id
    POST   /api/salary/requests/:id/decision    { action: "approve"|"reject"|"cancel", notes? }
    PATCH  /api/salary/requests/:id
    GET    /api/employees
*/

const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const REQ_API = `${API_BASE}/salary/requests`;
const EMP_API = `${API_BASE}/employees`;

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

/* -------------------------- notification helper -------------------------- */
async function notifySalaryAdvance({
  action,         // "approve" | "reject" | "cancel"
  employeeId,
  uid,
  requestId,
  amount,
  currency,
  notes,
}) {
  try {
    const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

    const actionCap =
      action === "approve" ? "Approved" :
      action === "reject"  ? "Rejected" :
      action === "cancel"  ? "Cancelled" : "Updated";

    const title = `Salary advance ${actionCap}`;
    const amt = typeof amount === "number" ? amount.toLocaleString() : amount;
    const tail = notes ? ` Note: ${notes}` : "";
    const body = `Your salary advance request is ${actionCap.toLowerCase()}. Amount: ${amt ?? "—"} ${currency ?? ""}.${tail}`;

    const payload = {
      employeeId: employeeId || undefined,
      uid: uid || undefined,
      title,
      body,
      data: {
        type: "salary_advance.decision",
        requestId: String(requestId || ""),
        action: String(action || ""),
        amount: String(amount ?? ""),
        currency: String(currency ?? ""),
      },
    };

    const r = await fetch(`${API_BASE}/notifications/send`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("notifySalaryAdvance failed", r.status, txt);
    } else {
      r.json().then((j) => console.log("notifySalaryAdvance =>", j)).catch(() => {});
    }
  } catch (e) {
    console.warn("notifySalaryAdvance error:", e);
  }
}

const api = {
  requests: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") q.append(k, v);
      });
      const url = q.toString() ? `${REQ_API}?${q.toString()}` : REQ_API;
      return http("GET", url);
    },
    getOne: (id) => http("GET", `${REQ_API}/${id}`),
    decide: (id, payload) => http("POST", `${REQ_API}/${id}/decision`, payload),
    update: (id, payload) => http("PATCH", `${REQ_API}/${id}`, payload),
  },
  employees: {
    list: () => http("GET", EMP_API),
  },
};

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n ?? "—");
const shortDateTime = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleString();
};

/* ================================= Page ================================= */

export default function SalaryRequests() {
  const { t } = useTranslation();

  const [filters, setFilters] = useState({
    q: "",
    status: "Pending",
    limit: "100",
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [empMap, setEmpMap] = useState({});

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [drawerError, setDrawerError] = useState("");
  const [notes, setNotes] = useState("");
  const [deciding, setDeciding] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const list = await api.employees.list();
      const map = {};
      (Array.isArray(list) ? list : []).forEach((e) => (map[e.id] = e));
      setEmpMap(map);
    } catch (e) {
      console.warn("Failed to load employees:", e?.message || e);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Force server to return *only* advance requests
      const params = { type: "advance" };
      if (filters.status) params.status = filters.status;
      if (filters.limit) params.limit = filters.limit;

      let data = await api.requests.list(params);
      data = Array.isArray(data) ? data : [];

      if (filters.q) {
        const term = String(filters.q).toLowerCase();
        data = data.filter((r) => {
          const emp = empMap[r.employeeId] || {};
          const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
          const bucket = [name, emp.email, r.reason, (r.tags || []).join(" "), r.currency]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return bucket.includes(term);
        });
      }

      setRows(data);
    } catch (e) {
      setError(e.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filters, empMap]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openDrawer = async (row) => {
    setCurrent(null);
    setOpen(true);
    setDrawerError("");
    setNotes("");
    try {
      const full = await api.requests.getOne(row.id);
      setCurrent(full);
    } catch (e) {
      setDrawerError(e.message || "Failed to load request");
    }
  };

  const decide = async (action) => {
    if (!current) return;
    setDeciding(true);
    setDrawerError("");
    try {
      // 1) Submit decision
      await api.requests.decide(current.id, { action, notes: notes || undefined });

      // 2) Refetch the canonical record
      const fresh = await api.requests.getOne(current.id);
      setCurrent(fresh);

      // 3) Notify employee (non-blocking)
      const emp = empMap[fresh.employeeId] || empMap[current.employeeId] || {};
      await notifySalaryAdvance({
        action,                                   // approve | reject | cancel
        employeeId: fresh.employeeId || emp.id,
        uid: emp.uid,
        requestId: fresh.id || current.id,
        amount: fresh.amount,
        currency: fresh.currency,
        notes: notes || "",
      });

      // 4) Refresh table
      fetchRows();
    } catch (e) {
      setDrawerError(e.message || "Failed to submit decision");
    } finally {
      setDeciding(false);
    }
  };

  const employeeLabel = useCallback(
    (id) => {
      const e = empMap[id] || {};
      const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
      return name || e.email || id || "—";
    },
    [empMap]
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("menu.salaryRequests", "Salary requests")}</h1>
      </div>

      <Toolbar filters={filters} setFilters={setFilters} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("employees.employee", "Employee")}</Th>
              <Th>{t("requests.type", "Type")}</Th>
              <Th>{t("employees.salary", "Amount")}</Th>
              <Th>{t("history.payFrequency", "Repay (mo)")}</Th>
              <Th>{t("history.effectiveFrom", "Expected date")}</Th>
              <Th>{t("common.status", "Status")}</Th>
              <Th>{t("common.createdAt", "Submitted")}</Th>
              <Th className="text-right">{t("common.actions", "Actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {t("common.noResults", "No results")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const emp = employeeLabel(r.employeeId);
                const when = r.expectedDate || "—"; // month no longer used

                return (
                  <tr key={r.id} className="border-t">
                    <Td className="font-medium">{emp}</Td>
                    <Td><TypePill /></Td>
                    <Td>
                      <span className="whitespace-nowrap">
                        {fmt(r.amount)} {r.currency || ""}
                      </span>
                    </Td>
                    <Td>{r.repaymentMonths ?? "—"}</Td>
                    <Td>{when}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>{shortDateTime(r.createdAt)}</Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {r.status === "Pending" && (
                          <>
                            <IconButton
                              title={t("actions.reject", "Reject")}
                              onClick={() => {
                                setCurrent(r);
                                setOpen(true);
                                setNotes("");
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24">
                                <path
                                  fill="currentColor"
                                  d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                />
                              </svg>
                            </IconButton>
                            <IconButton
                              title={t("actions.approve", "Approve")}
                              onClick={() => {
                                setCurrent(r);
                                setOpen(true);
                                setNotes("");
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24">
                                <path
                                  fill="currentColor"
                                  d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                />
                              </svg>
                            </IconButton>
                          </>
                        )}
                        <IconButton title={t("common.view", "View")} onClick={() => openDrawer(r)}>
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"
                            />
                          </svg>
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Drawer open={open} title={t("requests.details", "Request details")} onClose={() => setOpen(false)}>
        {!current ? (
          <div className="text-sm text-gray-500">{t("common.loading", "Loading...")}</div>
        ) : (
          <div className="space-y-5">
            {drawerError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
                {drawerError}
              </div>
            )}

            <RequestSummary req={current} employee={empMap[current.employeeId]} />

            <div className="rounded-2xl border p-4">
              <label className="block text-sm font-medium mb-1">
                {t("requests.notesToEmployee", "Notes to employee (optional)")}
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("requests.notesPlaceholder", "Add a short note with your decision")}
              />
              <div className="flex justify-end gap-2 pt-3">
                {current.status === "Pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => decide("reject")}
                      disabled={deciding}
                      className="px-4 py-2 rounded-xl border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deciding ? t("common.working", "Working...") : t("actions.reject", "Reject")}
                    </button>
                    <button
                      type="button"
                      onClick={() => decide("approve")}
                      disabled={deciding}
                      className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {deciding ? t("common.working", "Working...") : t("actions.approve", "Approve")}
                    </button>
                  </>
                ) : (
                  <StatusBadge status={current.status} />
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ============================== Components ============================== */

function Toolbar({ filters, setFilters }) {
  const { t } = useTranslation();
  const set = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">{t("common.search", "Search")}</label>
          <input
            type="text"
            value={filters.q}
            onChange={set("q")}
            placeholder={t("requests.searchPlaceholder", "Name, email, reason, tag...")}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("common.status", "Status")}</label>
          <select className="w-full border rounded-lg px-3 py-2" value={filters.status} onChange={set("status")}>
            <option value="">{t("common.all", "All")}</option>
            <option value="Pending">{t("status.pending", "Pending")}</option>
            <option value="Approved">{t("status.approved", "Approved")}</option>
            <option value="Rejected">{t("status.rejected", "Rejected")}</option>
            <option value="Cancelled">{t("status.cancelled", "Cancelled")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("common.limit", "Limit")}</label>
          <input
            type="number"
            min="1"
            value={filters.limit}
            onChange={set("limit")}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}

function RequestSummary({ req, employee }) {
  const { t } = useTranslation();
  const name = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

  return (
    <div className="rounded-2xl border p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Info label={t("employees.employee", "Employee")} value={name || employee?.email || req.employeeId} />
        <Info label={t("requests.type", "Type")} value={<TypePill />} />
        <Info label={t("common.status", "Status")} value={<StatusBadge status={req.status} />} />
        <Info label={t("employees.salary", "Amount")} value={`${fmt(req.amount)} ${req.currency || ""}`} />
        <Info label={t("history.effectiveFrom", "Expected date")} value={req.expectedDate || "—"} />
        <Info label={t("history.payFrequency", "Repay (mo)")} value={req.repaymentMonths ?? "—"} />
        <Info label={t("common.createdAt", "Submitted")} value={shortDateTime(req.createdAt)} />
        <Info label={t("common.updatedAt", "Updated")} value={shortDateTime(req.updatedAt)} />
        <Info
          label={t("requests.tags", "Tags")}
          value={
            (req.tags || []).length ? (
              <div className="flex flex-wrap gap-2">
                {req.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-gray-100">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium mb-1">{t("requests.reason", "Reason / notes")}</div>
        <div className="rounded-lg border p-3 bg-gray-50 whitespace-pre-wrap min-h-[60px]">
          {req.reason || "—"}
        </div>
      </div>

      {req.decision && (
        <div className="mt-4 text-sm text-gray-700">
          <div className="font-medium mb-1">{t("requests.lastDecision", "Last decision")}</div>
          <div className="rounded-lg border p-3 bg-gray-50">
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-medium">{t("requests.action", "Action")}:</span>{" "}
                {req.decision.action}
              </div>
              <div>
                <span className="font-medium">{t("history.when", "When")}:</span>{" "}
                {shortDateTime(req.decision.at)}
              </div>
              <div>
                <span className="font-medium">{t("history.by", "By")}:</span>{" "}
                {req.decision.by?.email || req.decision.by?.uid || "—"}
              </div>
            </div>
            {req.decision.notes && (
              <div className="mt-2">
                <span className="font-medium">{t("requests.notes", "Notes")}:</span>{" "}
                {req.decision.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Rejected"
      ? "bg-red-100 text-red-700"
      : status === "Cancelled"
      ? "bg-gray-100 text-gray-600"
      : "bg-yellow-100 text-yellow-800";
  const dot =
    status === "Approved"
      ? "bg-green-600"
      : status === "Rejected"
      ? "bg-red-600"
      : status === "Cancelled"
      ? "bg-gray-400"
      : "bg-yellow-600";
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function TypePill() {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gray-100">
      Advance
    </span>
  );
}

function Drawer({ open, title, children, onClose }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[640px] bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto h-[calc(100%-57px)]">{children}</div>
      </aside>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-2 rounded-lg border hover:bg-gray-50"
      aria-label={title}
    >
      {children}
    </button>
  );
}
