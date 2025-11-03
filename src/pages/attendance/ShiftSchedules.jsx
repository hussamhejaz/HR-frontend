// src/pages/attendance/ShiftSchedules.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiClock, FiCalendar, FiEdit2, FiTrash2, FiRefreshCw } from "react-icons/fi";

/* -------------------- API & auth helpers -------------------- */
const API_BASE = "https://hr-backend-npbd.onrender.com";
const API = `${API_BASE}/api/attendance/shifts`;

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

/* =================== NOTIFICATION HELPER (NEW) =================== */
/**
 * Sends a push to the employee assigned to a shift.
 * mode: 'created' | 'updated' | 'deleted'
 */
async function notifyShift({ employeeId, shiftId, date, startTime, endTime, mode }) {
  if (!employeeId) return;

  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

  let title = "Shift update";
  let body = "";
  if (mode === "created") title = "New shift assigned";
  if (mode === "updated") title = "Shift updated";
  if (mode === "deleted") title = "Shift canceled";

  const prettyTime =
    startTime && endTime ? `${startTime}–${endTime}` : (startTime || endTime || "");

  if (mode === "created") {
    body = `You have a new shift on ${date}${prettyTime ? `, ${prettyTime}` : ""}.`;
  } else if (mode === "updated") {
    body = `Your shift on ${date}${prettyTime ? `, ${prettyTime}` : ""} was updated.`;
  } else {
    body = `Your shift on ${date}${prettyTime ? `, ${prettyTime}` : ""} was canceled.`;
  }

  const payload = {
    employeeId,
    title,
    body,
    data: {
      type: `shift.${mode}`,
      shiftId: String(shiftId || ""),
      date: String(date || ""),
      startTime: String(startTime || ""),
      endTime: String(endTime || ""),
    },
  };

  try {
    const r = await fetch(`${API_BASE}/api/notifications/send`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("notifyShift failed", r.status, txt);
    } else {
      const json = await r.json().catch(() => ({}));
      console.log("notifyShift =>", json);
    }
  } catch (e) {
    console.warn("notifyShift error:", e);
  }
}

export default function ShiftSchedules() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  // Shifts
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Employees (for select)
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empErr, setEmpErr] = useState("");

  // Role awareness
  const [isElevated, setIsElevated] = useState(false); // true if GET / returns 200, else fallback to /mine

  // UI
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(null); // null | {mode:'create'|'edit', data?}
  const [confirm, setConfirm] = useState(null); // { id, label, row? }

  const dfmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [i18n.language]
  );

  // Fetch employees (auth headers)
  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    setEmpErr("");
    try {
      const headers = { ...getAuthHeaders() };
      const tryUrls = [
        `${API_BASE}/api/employees?limit=500`,
        `${API_BASE}/api/tenants/${getTenantId()}/employees?limit=500`,
      ];

      let list = null;
      for (const url of tryUrls) {
        // eslint-disable-next-line no-await-in-loop
        const r = await fetch(url, { headers });
        if (r.ok) {
          const raw = await r.json();
          const arr = Array.isArray(raw)
            ? raw
            : Object.entries(raw || {}).map(([id, e]) => ({ id, ...e }));
          list = (arr || [])
            .map((e) => ({
              id: e.id || "",
              uid: e.uid || "",
              firstName: e.firstName || "",
              lastName: e.lastName || "",
              email: e.email || "",
              fullName:
                `${e.firstName || ""} ${e.lastName || ""}`.trim() ||
                e.fullName ||
                e.name ||
                e.email ||
                "—",
              department: e.department || "",
              teamName: e.teamName || "",
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
          break;
        } else if (r.status === 401) {
          setEmpErr(t("auth.unauthorized", "Unauthorized. Please sign in."));
          break;
        } else if (r.status === 403) {
          setEmpErr(t("errors.forbidden", "You don't have permission to view employees."));
          break;
        }
      }
      setEmployees(list || []);
    } catch {
      setEmployees([]);
      setEmpErr(t("errors.loadEmployees", "Failed to load employee list."));
    } finally {
      setEmpLoading(false);
    }
  }, [t]);

  // Load shifts (try elevated, else /mine)
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const headers = { ...getAuthHeaders() };
      let r = await fetch(API, { headers });

      if (r.status === 403) {
        setIsElevated(false);
        r = await fetch(`${API}/mine`, { headers });
      } else if (r.ok) {
        setIsElevated(true);
      }

      if (r.status === 401) {
        setErr(t("auth.unauthorized", "Unauthorized. Please sign in."));
        setRows([]);
        return;
      }

      if (!r.ok) throw new Error("HTTP " + r.status);

      const data = await r.json();
      const xs = (Array.isArray(data) ? data : []).map((x) => ({
        ...x,
        employeeName: x.employee?.fullName || x.employeeName || "",
        employeeId: x.employee?.id || x.employeeId || "",
        shiftText:
          (x.startTime && x.endTime) ? `${x.startTime}–${x.endTime}` : "",
      }));

      xs.sort(
        (a, b) =>
          String(a.employeeName || "").localeCompare(String(b.employeeName || "")) ||
          String(a.date || "").localeCompare(String(b.date || "")) ||
          String(a.startTime || "").localeCompare(String(b.startTime || ""))
      );

      setRows(xs);
    } catch {
      setErr(t("shiftSchedules.errorLoading", "Failed to load shifts."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRows();
    fetchEmployees();
  }, [fetchRows, fetchEmployees]);

  const empLabel = (e) =>
    e?.fullName ||
    [e?.firstName, e?.lastName].filter(Boolean).join(" ") ||
    e?.name ||
    e?.email ||
    (e?.id ? `#${e.id}` : "");

  const nameById = useMemo(() => {
    const m = {};
    employees.forEach((e) => {
      if (e?.id != null) m[String(e.id)] = empLabel(e);
    });
    return m;
  }, [employees]);

  const upsert = async (payload, id) => {
    try {
      setSaving(true);
      const r = await fetch(id ? `${API}/${id}` : API, {
        method: id ? "PUT" : "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.status === 401) throw new Error(t("auth.unauthorized", "Unauthorized. Please sign in."));
      if (r.status === 403) throw new Error(t("errors.forbidden", "You don't have permission to perform this action."));

      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        const details = Array.isArray(j?.conflicts)
          ? "\n" +
            j.conflicts
              .map((c) => `• ${c.date} ${c.startTime}–${c.endTime}`)
              .join("\n")
          : "";
        throw new Error((j?.error || t("shiftSchedules.overlap", "Shift overlaps existing shift(s).")) + details);
      }

      if (!r.ok) throw new Error(t("shiftSchedules.errorSaving", "Failed to save shift."));

      // read back the saved row if API returns it, otherwise compose from payload
      let saved = {};
      try {
        saved = await r.json();
      } catch {
        saved = {};
      }
      const shiftId = saved?.id || id || "";
      const employeeId = saved?.employeeId || payload.employeeId;
      const date = saved?.date || payload.date;
      const startTime = saved?.startTime || payload.startTime;
      const endTime = saved?.endTime || payload.endTime;
      const published = typeof saved?.published === "boolean" ? saved?.published : Boolean(payload.published);

      setOpenModal(null);
      await fetchRows();
      setBanner({
        type: "success",
        text:
          (id ? t("actions.save", "Save changes") : t("shiftSchedules.created", "Shift created")) +
          " ✓",
      });
      setTimeout(() => setBanner(null), 2000);

      // 🔔 Notify the employee ONLY if the shift is visible/published
      if (published) {
        notifyShift({
          employeeId,
          shiftId,
          date,
          startTime,
          endTime,
          mode: id ? "updated" : "created",
        });
      }
    } catch (e) {
      setBanner({ type: "error", text: e.message || t("shiftSchedules.errorSaving", "Failed to save shift.") });
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id) => {
    // find row for notification context before we optimistically remove
    const row = rows.find((x) => x.id === id);

    const prev = rows;
    setRows((xs) => xs.filter((x) => x.id !== id));
    try {
      const r = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      if (r.status === 401) throw new Error(t("auth.unauthorized", "Unauthorized. Please sign in."));
      if (r.status === 403) throw new Error(t("errors.forbidden", "You don't have permission to delete shifts."));
      if (r.status !== 204) throw new Error("HTTP " + r.status);
      setBanner({ type: "success", text: t("actions.delete", "Delete") + " ✓" });
      setTimeout(() => setBanner(null), 2000);

      // 🔔 Notify on deletion (no published check—deleting removes it)
      if (row?.employeeId) {
        notifyShift({
          employeeId: row.employeeId,
          shiftId: id,
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          mode: "deleted",
        });
      }
    } catch (e) {
      setRows(prev);
      setBanner({ type: "error", text: e.message || t("shiftSchedules.errorDeleting", "Failed to delete shift.") });
    }
  };

  return (
    <div dir={dir} className="p-6 font-sans">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FiClock size={22} />
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isRTL ? "text-right" : ""}`}>
              {t("menu.shifts", "Shift Schedules")}
            </h1>
          </div>

          <div className={`flex gap-2 ${isRTL ? "md:mr-auto" : "md:ml-auto"}`}>
            <button
              onClick={fetchRows}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              <FiRefreshCw />
              {t("actions.refresh", "Refresh")}
            </button>
            <button
              onClick={() => setOpenModal({ mode: "create" })}
              disabled={!isElevated}
              title={!isElevated ? t("errors.forbidden", "You don't have permission to create shifts.") : ""}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              + {t("shiftSchedules.new", "New Shift")}
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm shadow ${
            banner.type === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-green-200 bg-green-50 text-green-700"
          } ${isRTL ? "text-right" : ""}`}
        >
          {banner.text}
        </div>
      )}
      {err && <p className={`mb-4 text-sm text-red-600 ${isRTL ? "text-right" : ""}`}>{err}</p>}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
            </colgroup>

            <thead
              className={`sticky top-0 z-10 bg-gray-50/80 backdrop-blur text-[0.8rem] font-semibold text-gray-700 ${
                isRTL ? "text-right" : "text-left"
              }`}
            >
              <tr>
                <th className="px-6 py-4">{t("table.employee", "Employee")}</th>
                <th className="px-6 py-4">{t("holidayCalendar.date", "Date")}</th>
                <th className="px-6 py-4">{t("shiftSchedules.shift", "Shift")}</th>
                <th className="px-6 py-4">{t("shiftSchedules.location", "Location")}</th>
                <th className={`px-6 py-4 ${isRTL ? "text-left" : "text-right"}`}>
                  {t("table.actions", "Actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`s-${i}`} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-56 rounded bg-gray-200" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-6 py-5">
                      <div className={`ml-auto h-8 w-24 rounded bg-gray-200 ${isRTL ? "mr-auto ml-0" : ""}`} />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className={`px-6 py-12 text-gray-500 ${isRTL ? "text-right" : "text-center"}`}
                  >
                    {t("messages.noMatches", "No results match your filters.")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const displayName =
                    r.employeeName ||
                    nameById[String(r.employeeId ?? "")] ||
                    (r.employeeId ? `#${r.employeeId}` : t("n/a", "N/A"));

                  const dateText = r.date ? dfmt.format(new Date(r.date)) : t("n/a", "N/A");

                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-indigo-50/50">
                      {/* Employee */}
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{displayName}</span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-900 ring-1 ring-gray-200">
                          <FiCalendar className="h-4 w-4 text-red-500" />
                          {dateText}
                        </span>
                      </td>

                      {/* Shift pill */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-900 ring-1 ring-gray-200">
                          <FiClock className="h-4 w-4 text-indigo-600" />
                          {r.shiftText || "—"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">{r.location || "—"}</td>

                      {/* Actions */}
                      <td className={`px-6 py-4 ${isRTL ? "text-left" : "text-right"}`}>
                        <div className={`inline-flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <button
                            onClick={() => setOpenModal({ mode: "edit", data: r })}
                            disabled={!isElevated}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                          >
                            <FiEdit2 />
                            {t("actions.edit", "Edit")}
                          </button>
                          <button
                            onClick={() =>
                              setConfirm({
                                id: r.id,
                                label: `${displayName} • ${dateText} • ${r.shiftText || ""}`,
                                row: r,
                              })
                            }
                            disabled={!isElevated}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            <FiTrash2 />
                            {t("actions.delete", "Delete")}
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
      </div>

      {/* Modals */}
      {openModal && (
        <ShiftModal
          dir={dir}
          isRTL={isRTL}
          mode={openModal.mode}
          initial={openModal.data}
          saving={saving}
          employees={employees}
          empLoading={empLoading}
          empErr={empErr}
          onClose={() => setOpenModal(null)}
          onSubmit={async ({ employeeId, date, startTime, endTime, location, role, notes, published }) => {
            // Backend expects: date, startTime, endTime, employeeId, (optional: location, role, notes, published)
            const payload = {
              employeeId,
              date,
              startTime,
              endTime,
              location,
              role,
              notes,
              published,
            };
            await upsert(payload, openModal.data?.id);
          }}
          t={t}
        />
      )}

      {confirm && (
        <ConfirmDeleteModal
          dir={dir}
          isRTL={isRTL}
          name={confirm.label}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const id = confirm.id;
            setConfirm(null);
            await doRemove(id);
          }}
          t={t}
        />
      )}
    </div>
  );
}

function ShiftModal({
  dir,
  isRTL,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
  t,
  employees,
  empLoading,
  empErr,
}) {
  const employeeRef = useRef(null);
  const dateRef = useRef(null);
  const startRef = useRef(null);
  const endRef = useRef(null);
  const locationRef = useRef(null);
  const roleRef = useRef(null);
  const notesRef = useRef(null);
  const publishedRef = useRef(null);

  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const initialEmpId = useMemo(() => {
    if (initial?.employeeId) return String(initial.employeeId);
    if (initial?.employee?.id) return String(initial.employee.id);
    if (!initial?.employeeName) return "";
    const found = employees.find((e) => e.fullName === initial.employeeName);
    return found ? String(found.id) : "";
  }, [initial, employees]);

  useEffect(() => {
    if (employeeRef.current) employeeRef.current.value = initialEmpId || "";
    if (dateRef.current) dateRef.current.value = initial?.date || today;
    if (startRef.current) startRef.current.value = initial?.startTime || "";
    if (endRef.current) endRef.current.value = initial?.endTime || "";
    if (locationRef.current) locationRef.current.value = initial?.location || "";
    if (roleRef.current) roleRef.current.value = initial?.role || "";
    if (notesRef.current) notesRef.current.value = initial?.notes || "";
    if (publishedRef.current) publishedRef.current.checked = Boolean(initial?.published);
  }, [initial, initialEmpId, today]);

  const submit = (e) => {
    e.preventDefault();
    setError("");

    const employeeId = employeeRef.current?.value;
    const date = dateRef.current?.value;
    const startTime = startRef.current?.value;
    const endTime = endRef.current?.value;
    const location = locationRef.current?.value.trim();
    const role = roleRef.current?.value.trim();
    const notes = notesRef.current?.value.trim();
    const published = Boolean(publishedRef.current?.checked);

    if (!employeeId) return setError(t("timeTracking.validation.name", "Employee name is required."));
    if (!date) return setError(t("shiftSchedules.validation.date", "Date is required."));
    if (!startTime || !endTime) return setError(t("shiftSchedules.validation.time", "Start and End are required."));
    if (startTime >= endTime)
      return setError(t("shiftSchedules.validation.order", "Start time must be before End time."));

    onSubmit({ employeeId, date, startTime, endTime, location, role, notes, published });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        dir={dir}
        className={`absolute top-0 h-full w-full max-w-2xl bg-white shadow-xl md:rounded-s-2xl ${
          isRTL ? "left-0" : "right-0"
        }`}
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 border-b bg-gray-50 px-5 py-4 shadow-sm relative">
          <button
            onClick={onClose}
            className={`rounded-lg p-2 hover:bg-gray-100 absolute top-2 ${isRTL ? "left-2" : "right-2"}`}
            aria-label={t("actions.close", "Close")}
          >
            ✕
          </button>

          <div className={`pe-12 ${isRTL ? "text-right" : "text-left"}`}>
            <h3 className="text-lg font-semibold">
              {mode === "edit" ? t("shiftSchedules.edit", "Edit Shift") : t("shiftSchedules.create", "Create Shift")}
            </h3>
            <p className="text-xs text-gray-500">
              {t("shiftSchedules.modalSubtitle", "Fill required fields")}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="h-[calc(100%-64px)] overflow-y-auto px-5 py-6">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {/* Employee select */}
            <Field label={t("table.employee", "Employee")}>
              <select
                ref={employeeRef}
                defaultValue={initialEmpId}
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t("applicants.placeholders.name", "Select…")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName ||
                      [e.firstName, e.lastName].filter(Boolean).join(" ") ||
                      e.name ||
                      e.email ||
                      `#${e.id}`}
                  </option>
                ))}
              </select>
              {empLoading && (
                <p className={`mt-1 text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}>
                  {t("loading", "Loading")}
                </p>
              )}
              {empErr && (
                <p className={`mt-1 text-xs text-red-600 ${isRTL ? "text-right" : ""}`}>{empErr}</p>
              )}
            </Field>

            {/* Date */}
            <Field label={t("holidayCalendar.date", "Date")}>
              <input
                ref={dateRef}
                type="date"
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                defaultValue={initial?.date || ""}
              />
            </Field>

            {/* Time range */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t("shiftSchedules.from", "From (Time)")}>
                <input
                  ref={startRef}
                  type="time"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  defaultValue={initial?.startTime || ""}
                />
              </Field>
              <Field label={t("shiftSchedules.to", "To (Time)")}>
                <input
                  ref={endRef}
                  type="time"
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  defaultValue={initial?.endTime || ""}
                />
              </Field>
            </div>

            {/* Location & Role */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t("shiftSchedules.location", "Location")}>
                <input
                  ref={locationRef}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("placeholders.location", "e.g., HQ Floor 2")}
                  defaultValue={initial?.location || ""}
                />
              </Field>
              <Field label={t("shiftSchedules.role", "Role")}>
                <input
                  ref={roleRef}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("placeholders.role", "e.g., Cashier")}
                  defaultValue={initial?.role || ""}
                />
              </Field>
            </div>

            {/* Notes */}
            <Field label={t("quick.notes", "Notes")}>
              <textarea
                ref={notesRef}
                rows={3}
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                placeholder={t("timeTracking.placeholders.notes", "Optional notes")}
                defaultValue={initial?.notes || ""}
              />
            </Field>

            {/* Published */}
            <div className="flex items-center gap-2">
              <input ref={publishedRef} type="checkbox" defaultChecked={Boolean(initial?.published)} id="pub" />
              <label htmlFor="pub" className="text-sm text-gray-800">
                {t("shiftSchedules.published", "Published (visible to employee)")}
              </label>
            </div>

            {/* Footer buttons */}
            <div className={`sticky bottom-0 bg-white/70 backdrop-blur pb-2 pt-3 ${isRTL ? "text-left" : "text-right"}`}>
              <div className={`inline-flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                  {t("actions.close", "Close")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <span className="animate-spin">⏳</span>}
                  {mode === "edit" ? t("actions.save", "Save changes") : t("shiftSchedules.create", "Create Shift")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ dir, isRTL, name, onCancel, onConfirm, t }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        dir={dir}
        className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl"
      >
        <div className={`mb-3 ${isRTL ? "text-right" : ""}`}>
          <h3 className="text-lg font-semibold">{t("shiftSchedules.confirmDelete", "Delete this shift?")}</h3>
          {name && <p className="mt-1 text-sm text-gray-600">{name}</p>}
        </div>
        <div className={`mt-5 flex gap-3 ${isRTL ? "flex-row-reverse" : "justify-end"}`}>
          <button onClick={onCancel} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            {t("actions.close", "Close")}
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            {t("actions.delete", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
    </div>
  );
}
