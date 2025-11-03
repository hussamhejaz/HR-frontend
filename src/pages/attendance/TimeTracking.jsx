// src/pages/attendance/TimeTracking.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiClock,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiLoader,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiBarChart2,
  FiUsers,
  FiCheck,
  FiX as FiClose,
  FiChevronDown,
  FiChevronUp,
  FiMessageSquare
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

/* -------------------- API & auth helpers -------------------- */
const API_BASE =  "https://hr-backend-npbd.onrender.com";
const API_URL  = `${API_BASE}/api/attendance/timesheets`;

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

const STATUSES = ["Pending", "Approved", "Rejected"];
const statusPill = {
  Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Approved: "bg-green-50 text-green-700 ring-1 ring-green-200",
  Rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

/* =================== NOTIFICATION HELPER =================== */
async function notifyTimesheet({
  mode,             // 'created' | 'updated' | 'deleted' | 'status' | 'progress'
  employeeId,       // preferred
  uid,              // fallback if needed
  timesheetId,
  date,
  hours,
  status,           // for 'status' mode
  project,
  task,
  updateNote,       // for 'progress' mode
  completed,        // for 'progress' mode
}) {
  try {
    const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

    const timeText = date ? `${date}${hours != null ? ` • ${Number(hours).toFixed(2)}h` : ""}` : "";

    let title = "Timesheet update";
    let body  = timeText || "Your timesheet has been updated.";
    let type  = "timesheet.updated";

    if (mode === "created") {
      title = "New time entry created";
      body  = timeText ? `A new entry was created for ${timeText}.` : "A new time entry was created.";
      type  = "timesheet.created";
    } else if (mode === "updated") {
      title = "Time entry updated";
      body  = timeText ? `Your entry for ${timeText} was updated.` : "Your time entry was updated.";
      type  = "timesheet.updated";
    } else if (mode === "deleted") {
      title = "Time entry deleted";
      body  = timeText ? `Your entry for ${timeText} was deleted.` : "A time entry was deleted.";
      type  = "timesheet.deleted";
    } else if (mode === "status") {
      title = status === "Approved" ? "Timesheet approved" :
              status === "Rejected" ? "Timesheet rejected" : "Timesheet status changed";
      body  = timeText
        ? `Your entry for ${timeText} is now "${status}".`
        : `Your time entry is now "${status}".`;
      type  = "timesheet.status";
    } else if (mode === "progress") {
      title = completed ? "Marked as done" : "Marked as not done";
      const tail = updateNote ? ` • ${updateNote}` : "";
      body  = timeText
        ? `Your entry for ${timeText} was ${completed ? "marked done" : "marked not done"}${tail ? ":" : ""} ${updateNote || ""}`
        : `Your time entry was ${completed ? "marked done" : "marked not done"}${tail ? ":" : ""} ${updateNote || ""}`;
      type  = "timesheet.progress";
    }

    const payload = {
      employeeId: employeeId || undefined,
      uid: uid || undefined,
      title,
      body,
      data: {
        type,
        timesheetId: String(timesheetId || ""),
        date: String(date || ""),
        hours: hours != null ? String(hours) : "",
        status: String(status || ""),
        project: String(project || ""),
        task: String(task || ""),
        completed: completed != null ? String(Boolean(completed)) : "",
      },
    };

    const r = await fetch(`${API_BASE}/api/notifications/send`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("notifyTimesheet failed", r.status, txt);
    } else {
      r.json().then((j) => console.log("notifyTimesheet =>", j)).catch(()=>{});
    }
  } catch (e) {
    console.warn("notifyTimesheet error:", e);
  }
}
/* ========================================================== */

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-200" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-indigo-500",
    green: "from-green-500 to-emerald-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-red-500"
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-sm`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

// Employee Hours Card Component
const EmployeeHoursCard = ({ data }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <FiUsers className="h-5 w-5 text-gray-600" />
      <h3 className="font-semibold text-gray-900">Hours by Employee</h3>
    </div>
    <div className="space-y-3">
      {data.slice(0, 6).map(([name, hours]) => (
        <div key={name} className="flex items-center justify-between">
          <span className="text-sm text-gray-700 truncate flex-1">{name}</span>
          <span className="text-sm font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg min-w-16 text-center">
            {hours.toFixed(2)}h
          </span>
        </div>
      ))}
      {data.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No data available
        </div>
      )}
    </div>
  </div>
);

// Time Entry Card Component
const TimeEntryCard = ({ entry, onEdit, onDelete, onStatusUpdate, onProgressUpdate, onInspect, working, isRTL, t }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-100">
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 h-1 w-full ${
        entry.status === "Approved" ? "bg-green-500" :
        entry.status === "Rejected" ? "bg-red-500" : "bg-amber-500"
      }`} />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 shadow-sm">
            <FiClock size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {entry.employee?.fullName || entry.employeeName || "—"}
              </h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                statusPill[entry.status] || statusPill.Pending
              }`}>
                {t(`timeTracking.status.${entry.status}`, entry.status || "Pending")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FiCalendar size={14} />
                {entry.date}
              </span>
              <span>•</span>
              <span className="font-medium text-gray-900">{Number(entry.hours).toFixed(2)}h</span>
              <span>•</span>
              <span>{entry.project || "No project"}</span>
              {entry.task && (
                <>
                  <span>•</span>
                  <span>{entry.task}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setShowActions(!showActions)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Actions
            {showActions ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Completion Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {entry.completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
              <FiCheckCircle size={14} />
              {t("labels.done", "Done")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              <FiXCircle size={14} />
              {t("labels.notDone", "Not done")}
            </span>
          )}
        </div>

        {/* Notes Preview */}
        {(entry.completionNote || entry.notes) && (
          <button
            onClick={() => onInspect(entry)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors duration-150"
          >
            <FiMessageSquare size={14} />
            {t("timeTracking.viewNotes", "View Notes")}
          </button>
        )}
      </div>

      {/* Expanded Actions */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className={`flex flex-wrap gap-2 ${isRTL ? "justify-start flex-row-reverse" : "justify-start"}`}>
            <button
              onClick={() => onProgressUpdate(entry, !entry.completed)}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors duration-150 disabled:opacity-50"
            >
              {entry.completed ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
              {entry.completed ? t("actions.markNotDone", "Mark Not Done") : t("actions.markDone", "Mark Done")}
            </button>

            {entry.status !== "Approved" && (
              <button
                onClick={() => onStatusUpdate(entry, "Approved")}
                disabled={working}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors duration-150 disabled:opacity-50"
              >
                <FiCheck size={14} />
                {t("actions.approve", "Approve")}
              </button>
            )}

            {entry.status !== "Rejected" && (
              <button
                onClick={() => onStatusUpdate(entry, "Rejected")}
                disabled={working}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
              >
                <FiClose size={14} />
                {t("actions.reject", "Reject")}
              </button>
            )}

            <button
              onClick={() => onEdit(entry)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors duration-150"
            >
              <FiEdit2 size={14} />
              {t("actions.edit", "Edit")}
            </button>

            <button
              onClick={() => onDelete(entry)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
            >
              <FiTrash2 size={14} />
              {t("actions.delete", "Delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// TimeEntryModal Component
const TimeEntryModal = ({ open, initial, isRTL, t, saving, employees, employeesLoading, onClose, onSave }) => {
  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    project: "",
    task: "",
    hours: "",
    notes: "",
    status: "Pending",
    completed: false,
    completionNote: ""
  });

  useEffect(() => {
    if (initial) {
      setForm({
        employeeId: initial.employee?.id || initial.employeeId || "",
        date: initial.date || "",
        project: initial.project || "",
        task: initial.task || "",
        hours: initial.hours || "",
        notes: initial.notes || "",
        status: initial.status || "Pending",
        completed: Boolean(initial.completed),
        completionNote: initial.completionNote || ""
      });
    } else {
      setForm({
        employeeId: "",
        date: new Date().toISOString().split('T')[0],
        project: "",
        task: "",
        hours: "",
        notes: "",
        status: "Pending",
        completed: false,
        completionNote: ""
      });
    }
  }, [initial, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initial ? t("timeTracking.edit", "Edit Time Entry") : t("timeTracking.new", "New Time Entry")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-150"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.employee", "Employee")} *
              </label>
              <select
                required
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                disabled={employeesLoading}
              >
                <option value="">{employeesLoading ? "Loading..." : "Select Employee"}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.date", "Date")} *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.project", "Project")}
              </label>
              <input
                type="text"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Project name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.task", "Task")}
              </label>
              <input
                type="text"
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Task description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.hours", "Hours")} *
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                required
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.status", "Status")}
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`timeTracking.status.${s}`, s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("timeTracking.notes", "Notes")}
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {t("timeTracking.markCompleted", "Mark as completed")}
              </span>
            </label>
          </div>

          {form.completed && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.completionNote", "Completion Notes")}
              </label>
              <textarea
                rows={2}
                value={form.completionNote}
                onChange={(e) => setForm({ ...form, completionNote: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Notes about completion..."
              />
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              {t("actions.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors duration-150 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiLoader className="animate-spin" />
                  {t("actions.saving", "Saving...")}
                </>
              ) : (
                t("actions.save", "Save Entry")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// NotesPanel Component
const NotesPanel = ({ open, row, isRTL, t, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("timeTracking.entryDetails", "Entry Details")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-150"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("timeTracking.workNotes", "Work Notes")}
            </h3>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {row.notes || t("timeTracking.noNotes", "No notes provided")}
              </p>
            </div>
          </div>

          {row.completed && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {t("timeTracking.completionNotes", "Completion Notes")}
              </h3>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {row.completionNote || t("timeTracking.noCompletionNotes", "No completion notes")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors duration-150"
          >
            {t("actions.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TimeTracking() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [completedFilter, setCompletedFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // employees (for dropdown)
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [working, setWorking] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [inspect, setInspect] = useState(null);

  // ---- fetch employees ----
  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const headers = { ...getAuthHeaders() };
      const tryUrls = [
        `${API_BASE}/api/employees?limit=500`,
        `${API_BASE}/api/tenants/${getTenantId()}/employees?limit=500`,
        `${API_BASE}/api/attendance/employees?limit=500`,
      ];

      let list = null;
      for (const url of tryUrls) {
        // eslint-disable-next-line no-await-in-loop
        const r = await fetch(url, { headers });
        if (r.ok) {
          const raw = await r.json();
          const arr = Array.isArray(raw)
            ? raw
            : Object.entries(raw || {}).map(([id, v]) => ({ id, ...v }));
          list = arr
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
        }
      }
      setEmployees(list || []);
    } catch {
      setEmployees([]);
    } finally {
      setEmpLoading(false);
    }
  }, []);

  // ---- fetch rows ----
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (completedFilter !== "all") {
        params.set("completed", completedFilter === "done" ? "true" : "false");
      }
      const r = await fetch(`${API_URL}?${params.toString()}`, { headers: getAuthHeaders() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const norm = (x) => ({
        ...x,
        employeeName: x.employee?.fullName || x.employeeName || "",
        employeeId: x.employee?.id || x.employeeId || "",
        completed: Boolean(x.completed),
      });
      setRows(Array.isArray(data) ? data.map(norm) : []);
    } catch {
      setErr(t("timeTracking.errorLoading", "Failed to load time entries."));
    } finally {
      setLoading(false);
    }
  }, [from, q, status, to, t, completedFilter]);

  useEffect(() => {
    fetchRows();
    fetchEmployees();
  }, [fetchRows, fetchEmployees]);

  const filtered = useMemo(() => rows, [rows]);

  const totalHours = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.hours) || 0), 0),
    [filtered]
  );

  const byEmployee = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = r.employee?.fullName || r.employeeName || r.employeeId || "—";
      map.set(key, (map.get(key) || 0) + (Number(r.hours) || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const pendingCount = useMemo(() => filtered.filter(r => r.status === "Pending").length, [filtered]);
  const completedCount = useMemo(() => filtered.filter(r => r.completed).length, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const saveRow = async (payload) => {
    setWorking(true);
    try {
      const isEdit = Boolean(editing?.id);
      const url = isEdit ? `${API_URL}/${editing.id}` : API_URL;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        let msg = t("timeTracking.errorSaving", "Failed to save time entry.");
        try {
          const j = JSON.parse(txt);
          if (j?.error) msg = j.error;
        } catch {
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      let saved = null;
      try { saved = await res.json(); } catch {}

      const tsId   = saved?.id || editing?.id || "";
      const empId  = saved?.employee?.id || saved?.employeeId || payload.employeeId || "";
      const uid    = saved?.employee?.uid || saved?.uid || "";
      const date   = saved?.date || payload.date;
      const hours  = saved?.hours ?? payload.hours;
      const project= saved?.project ?? payload.project;
      const task   = saved?.task ?? payload.task;

      notifyTimesheet({
        mode: isEdit ? "updated" : "created",
        employeeId: empId,
        uid,
        timesheetId: tsId,
        date,
        hours,
        project,
        task,
      });

      setModalOpen(false);
      setEditing(null);
      await fetchRows();
    } catch (e) {
      alert(e.message || t("timeTracking.errorSaving", "Failed to save time entry."));
    } finally {
      setWorking(false);
    }
  };

  const updateStatus = async (row, newStatus) => {
    setWorking(true);
    try {
      let res = await fetch(`${API_URL}/${row.id}/decision`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}/${row.id}`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      if (!res.ok) throw new Error(await res.text());

      notifyTimesheet({
        mode: "status",
        employeeId: row.employee?.id || row.employeeId,
        uid: row.employee?.uid || row.uid,
        timesheetId: row.id,
        date: row.date,
        hours: row.hours,
        status: newStatus,
        project: row.project,
        task: row.task,
      });

      await fetchRows();
    } catch {
      alert(t("timeTracking.errorStatus", "Failed to update status."));
    } finally {
      setWorking(false);
    }
  };

  const updateProgress = async (row, completed) => {
    setWorking(true);
    try {
      const updateNote = window.prompt(
        t("timeTracking.updateNotePrompt", "Add an optional note for this update"),
        ""
      );
      const res = await fetch(`${API_URL}/${row.id}/progress`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ completed, updateNote }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      notifyTimesheet({
        mode: "progress",
        employeeId: row.employee?.id || row.employeeId,
        uid: row.employee?.uid || row.uid,
        timesheetId: row.id,
        date: row.date,
        hours: row.hours,
        project: row.project,
        task: row.task,
        updateNote,
        completed,
      });

      await fetchRows();
    } catch {
      alert(t("timeTracking.errorProgress", "Failed to update progress."));
    } finally {
      setWorking(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      const row = deleting;

      const res = await fetch(`${API_URL}/${deleting.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());

      setDeleting(null);

      notifyTimesheet({
        mode: "deleted",
        employeeId: row.employee?.id || row.employeeId,
        uid: row.employee?.uid || row.uid,
        timesheetId: row.id,
        date: row.date,
        hours: row.hours,
        project: row.project,
        task: row.task,
      });

      await fetchRows();
    } catch {
      alert(t("timeTracking.errorDeleting", "Failed to delete time entry."));
    } finally {
      setWorking(false);
    }
  };

  const onExport = useCallback(() => {
    const header = [
      "id",
      "date",
      "employeeId",
      "employeeName",
      "project",
      "task",
      "hours",
      "status",
      "completed",
      "completionNote",
      "completedAt",
      "notes",
      "createdAt",
      "updatedAt",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        header
          .map((k) => {
            const v =
              k === "employeeId"
                ? r.employee?.id || r.employeeId || ""
                : k === "employeeName"
                ? r.employee?.fullName || r.employeeName || ""
                : r[k] ?? "";
            const s = String(v).replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${s}"` : s;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const resetFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setStatus("all");
    setCompletedFilter("all");
    setTimeout(fetchRows, 0);
  };

  return (
    <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                <FiClock className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("menu.timesheets", "Time Tracking")}
                </h1>
                <p className="mt-1 text-gray-600">
                  {t("timeTracking.subtitle", "Track hours by employee, project, and status")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <FiDownload size={16} />
                {t("actions.export", "Export")}
              </button>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-blue-700"
              >
                <FiPlus size={18} />
                {t("timeTracking.new", "New Entry")}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={FiClock}
            label="Total Hours"
            value={totalHours.toFixed(2)}
            color="blue"
          />
          <StatsCard
            icon={FiBarChart2}
            label="Pending Entries"
            value={pendingCount}
            color="orange"
          />
          <StatsCard
            icon={FiCheckCircle}
            label="Completed Tasks"
            value={completedCount}
            color="green"
          />
          <StatsCard
            icon={FiUsers}
            label="Total Entries"
            value={filtered.length}
            color="purple"
          />
        </div>

        {/* Filters Section */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 lg:flex-none lg:w-80">
                <div className={`pointer-events-none absolute inset-y-0 ${
                  isRTL ? "right-3" : "left-3"
                } flex items-center text-gray-400`}>
                  <FiSearch size={18} />
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 bg-white py-3 ${
                    isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                  } text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200`}
                  placeholder={t("timeTracking.search", "Search employees, projects, tasks...")}
                  onKeyDown={(e) => e.key === "Enter" && fetchRows()}
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <FiFilter size={16} />
                {t("actions.filter", "Filters")}
                {showFilters ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchRows}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                {t("actions.refresh", "Refresh")}
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.status", "Status")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">{t("filters.status.all", "All Statuses")}</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`timeTracking.status.${s}`, s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.completed", "Completion")}
                  </label>
                  <select
                    value={completedFilter}
                    onChange={(e) => setCompletedFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">{t("filters.completed.all", "All")}</option>
                    <option value="done">{t("filters.completed.done", "Done")}</option>
                    <option value="not_done">{t("filters.completed.not_done", "Not Done")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.from", "From Date")}
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("timeTracking.to", "To Date")}
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={fetchRows}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors duration-150"
                >
                  {t("actions.apply", "Apply Filters")}
                </button>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                  {t("actions.reset", "Reset All")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Employee Hours Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {/* Content will go here - either cards or table view */}
          </div>
          <EmployeeHoursCard data={byEmployee} />
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {loading && <LoadingSkeleton />}

          {!loading && err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-3">
                <FiXCircle className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-800">Unable to load time entries</h3>
                  <p className="text-red-700 mt-1">{err}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !err && filtered.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <FiClock className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("timeTracking.empty", "No time entries found")}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {q || status !== "all" || from || to ? 
                  "Try adjusting your filters to see more results." : 
                  "Get started by creating your first time entry to track working hours."}
              </p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors duration-150"
              >
                <FiPlus size={16} />
                {t("timeTracking.new", "New Time Entry")}
              </button>
            </div>
          )}

          {!loading && !err && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map((entry) => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={openEdit}
                  onDelete={(entry) => setDeleting(entry)}
                  onStatusUpdate={updateStatus}
                  onProgressUpdate={updateProgress}
                  onInspect={setInspect}
                  working={working}
                  isRTL={isRTL}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TimeEntryModal
        open={modalOpen}
        initial={editing}
        isRTL={isRTL}
        t={t}
        saving={working}
        employees={employees}
        employeesLoading={empLoading}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={saveRow}
      />

      <NotesPanel
        open={Boolean(inspect)}
        row={inspect}
        isRTL={isRTL}
        t={t}
        onClose={() => setInspect(null)}
      />

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleting(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("timeTracking.confirmDelete", "Delete this time entry?")}
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to delete the time entry for <strong>{deleting.employee?.fullName || deleting.employeeName}</strong> on {deleting.date}? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                {t("actions.cancel", "Cancel")}
              </button>
              <button
                onClick={doDelete}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors duration-150 disabled:opacity-50"
              >
                {working ? (
                  <>
                    <FiLoader className="animate-spin" />
                    {t("actions.deleting", "Deleting...")}
                  </>
                ) : (
                  t("actions.delete", "Delete Entry")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}