import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

/* ------------------------------- API setup ------------------------------- */
const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const REQ_ROOT = `${API_BASE}/offboarding/resignations`;

const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  "";
const getIdToken = () => localStorage.getItem("fb_id_token") || "";

const authHeaders = () => {
  const h = { Accept: "application/json" };
  const tok = getIdToken();
  const tenantId = getTenantId();
  if (tok) h.Authorization = `Bearer ${tok}`;
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  return h;
};

async function http(method, url, body, json = true) {
  const init = {
    method,
    headers: {
      ...authHeaders(),
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (json ? JSON.stringify(body) : body) : undefined,
  };
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = text ? JSON.parse(text) : null;
      if (j?.error || j?.message) msg = j.error || j.message;
    } catch {}
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

/* --------------------------- notification helper -------------------------- */
async function notifyResignation({
  mode,                 // "status" | "canceled"
  employeeId,
  uid,
  resignationId,
  status,               // for "status"
  lastWorkingDay,
  notes,                // optional manager note
}) {
  try {
    const headers = { ...authHeaders(), "Content-Type": "application/json" };

    let title = "Resignation update";
    let body  = "Your resignation was updated.";
    let type  = "resignation.updated";

    if (mode === "status") {
      title =
        status === "Approved"
          ? "Resignation approved"
          : status === "Rejected"
          ? "Resignation rejected"
          : "Resignation status changed";
      const day = lastWorkingDay ? ` Last day: ${lastWorkingDay}.` : "";
      const tail = notes ? ` Note: ${notes}` : "";
      body = `Your resignation is now “${status}.”${day}${tail}`;
      type = "resignation.status";
    } else if (mode === "canceled") {
      title = "Resignation canceled";
      body = "Your resignation request was canceled.";
      type = "resignation.canceled";
    }

    const payload = {
      employeeId: employeeId || undefined,
      uid: uid || undefined,
      title,
      body,
      data: {
        type,
        resignationId: String(resignationId || ""),
        status: String(status || ""),
        lastWorkingDay: String(lastWorkingDay || ""),
      },
    };

    const r = await fetch(`${API_BASE}/notifications/send`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("notifyResignation failed", r.status, txt);
    } else {
      r.json().then((j) => console.log("notifyResignation =>", j)).catch(() => {});
    }
  } catch (e) {
    console.warn("notifyResignation error:", e);
  }
}

/* ------------------------------- components ------------------------------ */
const Th = ({ children, className = "" }) => (
  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }) => (
  <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
);
const Badge = ({ tone = "gray", children, title }) => {
  const map = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span title={title} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
};
const Btn = ({ children, onClick, primary, danger, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={
      "px-3 py-1.5 rounded-lg border disabled:opacity-50 " +
      (primary ? "bg-black text-white hover:opacity-90 " : "hover:bg-gray-50 ") +
      (danger ? "border-red-600 text-red-700 hover:bg-red-50 " : "")
    }
  >
    {children}
  </button>
);
const Drawer = ({ open, title, onClose, children }) => (
  <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
    <div onClick={onClose} className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
    <aside
      className={`absolute right-0 top-0 h-full w-full sm:w-[720px] bg-white shadow-xl transition-transform ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">✕</button>
      </div>
      <div className="p-5 overflow-y-auto h-[calc(100%-57px)]">{children}</div>
    </aside>
  </div>
);

/* --------------------------------- utils --------------------------------- */
const tone = (s) => {
  if (!s) return "gray";
  const k = String(s).toLowerCase();
  if (["approved", "done", "completed", "ok"].includes(k)) return "green";
  if (["rejected", "blocked", "failed"].includes(k)) return "red";
  if (["in progress", "pending", "handover", "review"].includes(k)) return "amber";
  return "gray";
};
const shortDT = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleString();
};

/* ================================== page ================================== */
export default function Resignations() {
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [canDecide, setCanDecide] = useState(true); // flips to false if API says 403 (then we show /mine)
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [notes, setNotes] = useState("");
  const [deciding, setDeciding] = useState(false);

  const listUrl = (filters = {}) => {
    const qs = new URLSearchParams(filters);
    return qs.toString() ? `${REQ_ROOT}?${qs.toString()}` : REQ_ROOT;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // Try HR/admin list first
      let data = await http("GET", listUrl({ limit: 500 }));
      setRows(Array.isArray(data) ? data : []);
      setCanDecide(true);
    } catch (e) {
      // If forbidden, fallback to /mine (employee view)
      if (/403/.test(e.message)) {
        try {
          const mine = await http("GET", `${REQ_ROOT}/mine`);
          setRows(Array.isArray(mine) ? mine : []);
          setCanDecide(false);
        } catch (ee) {
          setErr(ee.message || "Failed to load");
        }
      } else {
        setErr(e.message || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.employee?.fullName,
        r.employee?.email,
        r.status,
        r.type,
        r.reason,
        r.handoverPlan,
        r.contactPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, q]);

  const openView = async (row) => {
    setOpen(true);
    setNotes("");
    try {
      const full = await http("GET", `${REQ_ROOT}/${row.id}`);
      setCurrent(full);
    } catch (e) {
      setCurrent(row);
      setErr(e.message || "Failed to load resignation");
    }
  };

  const decide = async (status) => {
    if (!current) return;
    setDeciding(true);
    setErr("");
    try {
      await http("PATCH", `${REQ_ROOT}/${current.id}/decision`, {
        status,
        notes: notes || undefined,
      });

      // Refetch the final record (so we have lastWorkingDay, etc.)
      const fresh = await http("GET", `${REQ_ROOT}/${current.id}`);
      setCurrent(fresh);

      // Notify employee about decision (non-blocking)
      const employeeId = fresh?.employee?.id || current?.employee?.id;
      const uid        = fresh?.employee?.uid || current?.employee?.uid;
      await notifyResignation({
        mode: "status",
        employeeId,
        uid,
        resignationId: fresh?.id || current?.id,
        status,
        lastWorkingDay: fresh?.lastWorkingDay || current?.lastWorkingDay,
        notes: notes || "",
      });

      load();
    } catch (e) {
      setErr(e.message || "Failed to submit decision");
    } finally {
      setDeciding(false);
    }
  };

  const cancelMine = async (row) => {
    if (!window.confirm(t("resignations.confirmCancel", "Cancel this resignation?"))) return;
    try {
      await http("PATCH", `${REQ_ROOT}/${row.id}/cancel`, {});

      // Notify the employee (the one canceling) — useful if you also mirror to email/mobile
      const employeeId = row?.employee?.id || row?.employeeId;
      const uid        = row?.employee?.uid || row?.uid;
      notifyResignation({
        mode: "canceled",
        employeeId,
        uid,
        resignationId: row.id,
      });

      load();
    } catch (e) {
      setErr(e.message || "Failed to cancel");
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("resignations.title", "Resignations")}</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
            ↻ {t("common.refresh", "Refresh")}
          </button>
        </div>
      </div>

      {/* Blurb */}
      <p className="text-gray-600">
        {canDecide
          ? t("resignations.introAdmin", "Review, approve or reject employee resignations. Attachments are visible in the drawer.")
          : t("resignations.introMine", "Below are your resignation submissions.")}
      </p>

      {/* Filters */}
      <div className="rounded-xl border p-3 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">{t("resignations.search", "Search")}</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("resignations.searchPh", "Name, email, reason, phone, status…")}
          />
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("resignations.employee", "Employee")}</Th>
              <Th>{t("resignations.type", "Type")}</Th>
              <Th>{t("resignations.lastDay", "Last day")}</Th>
              <Th>{t("resignations.status", "Status")}</Th>
              <Th>{t("resignations.submitted", "Submitted")}</Th>
              <Th className="text-right">{t("resignations.actions", "Actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t("common.loading", "Loading…")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t("resignations.noResults", "No results")}</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <Td>
                    <div className="font-medium">{r.employee?.fullName || r.employee?.email || r.employeeId}</div>
                    {r.employee?.email && <div className="text-xs text-gray-500">{r.employee.email}</div>}
                  </Td>
                  <Td>{r.type || "—"}</Td>
                  <Td>{r.lastWorkingDay || "—"}</Td>
                  <Td><Badge tone={tone(r.status)}>{r.status || "—"}</Badge></Td>
                  <Td>{shortDT(r.createdAt || r.submittedOn)}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <Btn onClick={() => openView(r)}>{t("resignations.view", "View")}</Btn>
                      {canDecide ? (
                        r.status === "Pending" && (
                          <>
                            <Btn primary onClick={() => openView(r)}>{t("resignations.approve", "Approve")}</Btn>
                            <Btn onClick={() => openView(r)}>{t("resignations.reject", "Reject")}</Btn>
                          </>
                        )
                      ) : (
                        r.status === "Pending" && <Btn danger onClick={() => cancelMine(r)}>{t("resignations.cancel", "Cancel")}</Btn>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View / Decide drawer */}
      <Drawer open={open} onClose={() => setOpen(false)} title={t("resignations.details", "Resignation details")}>
        {!current ? (
          <div className="text-sm text-gray-500">{t("common.loading", "Loading…")}</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label={t("resignations.employee", "Employee")} value={
                  <>
                    <div className="font-medium">{current.employee?.fullName || "—"}</div>
                    <div className="text-xs text-gray-500">{current.employee?.email || "—"}</div>
                  </>
                }/>
                <Info label={t("resignations.type", "Type")} value={current.type || "—"} />
                <Info label={t("resignations.lastDay", "Last day")} value={current.lastWorkingDay || "—"} />
                <Info label={t("resignations.noticeDays", "Notice days")} value={current.noticeDays ?? "—"} />
                <Info label={t("resignations.status", "Status")} value={<Badge tone={tone(current.status)}>{current.status}</Badge>} />
                <Info label={t("common.submittedAt", "Submitted")} value={shortDT(current.submittedOn || current.createdAt)} />
              </div>

              <div className="mt-3">
                <div className="text-sm font-medium mb-1">{t("resignations.reason", "Reason / notes")}</div>
                <div className="rounded-lg border p-3 bg-gray-50 whitespace-pre-wrap min-h-[60px]">
                  {current.reason || "—"}
                </div>
              </div>

              {current.handoverPlan && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">{t("resignations.handoverPlan", "Handover plan")}</div>
                  <div className="rounded-lg border p-3 bg-gray-50 whitespace-pre-wrap min-h-[60px]">
                    {current.handoverPlan}
                  </div>
                </div>
              )}

              {Array.isArray(current.attachments) && current.attachments.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">{t("resignations.attachments", "Attachments")}</div>
                  <div className="flex flex-wrap gap-2">
                    {current.attachments.map((f, i) => (
                      <a
                        key={i}
                        href={f.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm"
                      >
                        {f.fileName || `file_${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canDecide ? (
              current.status === "Pending" ? (
                <div className="rounded-2xl border p-4">
                  <label className="block text-sm font-medium mb-1">{t("resignations.notesToEmployee", "Notes to employee (optional)")}</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("resignations.notesPlaceholder", "Add a short note with your decision")}
                  />
                  <div className="flex justify-end gap-2 pt-3">
                    <Btn danger onClick={() => decide("Rejected")} disabled={deciding}>
                      {deciding ? t("common.working", "Working…") : t("resignations.reject", "Reject")}
                    </Btn>
                    <Btn primary onClick={() => decide("Approved")} disabled={deciding}>
                      {deciding ? t("common.working", "Working…") : t("resignations.approve", "Approve")}
                    </Btn>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-4">
                  <div className="text-sm">{t("resignations.alreadyDecided", "This resignation has already been decided.")}</div>
                </div>
              )
            ) : null}
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* small atoms */
function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}
