import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/*
  Employees.jsx — List employees + view/update salary (+history)
  --------------------------------------------------------------
  API base: http://localhost:5002/api

  Uses:
    GET  /employees
    GET  /employees/:id/salary?limit=20
    POST /employees/:id/salary
    GET  /payroll/grades

  Auth headers sent automatically from localStorage:
    - Authorization: Bearer <fb_id_token>
    - X-Tenant-Id: <tenantId>

  UI: TailwindCSS + i18n (useTranslation)
*/

const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const EMP_API = `${API_BASE}/employees`;
const GRADES_API = `${API_BASE}/payroll/grades`;

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

// Robust fetch helper that gracefully surfaces server errors
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
  employees: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") q.append(k, v);
      });
      const url = q.toString() ? `${EMP_API}?${q.toString()}` : EMP_API;
      return http("GET", url);
    },
    getSalary: (id, limit = 20) =>
      http("GET", `${EMP_API}/${encodeURIComponent(id)}/salary?limit=${limit}`),
    setSalary: (id, payload) =>
      http("POST", `${EMP_API}/${encodeURIComponent(id)}/salary`, payload),
  },
  grades: {
    list: () => http("GET", GRADES_API),
  },
};

const CURRENCIES = ["SAR", "USD", "EUR"];
const PAY_FREQUENCIES = ["Monthly", "Biweekly", "Weekly", "Annual", "Hourly"];
const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : n ?? "—");
const ymd = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.valueOf())) return "";
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  const day = `${x.getDate()}`.padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
};

/* -------------------------------- Page -------------------------------- */
export default function Employees() {
  const { t } = useTranslation();

  // filters
  const [filters, setFilters] = useState({ q: "", status: "" });

  // list
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // grades cache (for dropdown)
  const [grades, setGrades] = useState([]);

  // salary drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEmp, setActiveEmp] = useState(null); // minimal row info
  const [salaryData, setSalaryData] = useState(null); // GET /:id/salary result
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  const loadGrades = useCallback(async () => {
    try {
      const list = await api.grades.list();
      setGrades(Array.isArray(list) ? list : []);
    } catch (e) {
      // don't block page if grades fail to load
      console.warn("Failed to load grades:", e?.message || e);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.status) params.status = filters.status;
      const data = await api.employees.list(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRows();
    loadGrades();
  }, [fetchRows, loadGrades]);

  const openSalary = async (emp) => {
    setActiveEmp(emp);
    setDrawerError("");
    setSalaryData(null);
    setDrawerOpen(true);
    try {
      const data = await api.employees.getSalary(emp.id, 20);
      setSalaryData(data);
    } catch (e) {
      setDrawerError(e.message || "Failed to load salary");
    }
  };

  const saveSalary = async (payload) => {
    if (!activeEmp) return;
    setSaving(true);
    setDrawerError("");
    try {
      await api.employees.setSalary(activeEmp.id, payload);
      // refresh both drawer + list
      const fresh = await api.employees.getSalary(activeEmp.id, 20);
      setSalaryData(fresh);
      fetchRows();
    } catch (e) {
      setDrawerError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("menu.employees", "Employees")}</h1>
      </div>

      {/* Toolbar */}
      <Toolbar filters={filters} setFilters={setFilters} />

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("employees.name", "Name")}</Th>
              <Th>{t("employees.email", "Email")}</Th>
              <Th>{t("employees.role", "Role")}</Th>
              <Th>{t("employees.department", "Department")}</Th>
              <Th>{t("employees.status", "Status")}</Th>
              <Th>{t("employees.salary", "Salary")}</Th>
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
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <Td className="font-medium">
                    {`${r.firstName || ""} ${r.lastName || ""}`.trim() || "—"}
                  </Td>
                  <Td>{r.email || "—"}</Td>
                  <Td>{r.role || "—"}</Td>
                  <Td>{r.department || "—"}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${
                        (r.status || "Active") === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          (r.status || "Active") === "Active" ? "bg-green-600" : "bg-gray-400"
                        }`}
                      />
                      {r.status || "Active"}
                    </span>
                  </Td>
                  <Td>
                    {r.salary != null ? (
                      <span className="whitespace-nowrap">
                        {fmtNum(r.salary)} {r.salaryCurrency || ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <IconButton
                        title={t("actions.editSalary", "Edit salary")}
                        onClick={() => openSalary(r)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M12 1a3 3 0 0 1 3 3v1h1a3 3 0 0 1 3 3v1h-2V8a1 1 0 0 0-1-1h-1v1a3 3 0 0 1-3 3h-1a1 1 0 0 0 0 2h2a5 5 0 0 0 5-5h2a7 7 0 0 1-7 7h-1a3 3 0 1 1 0-6h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-1v1a3 3 0 0 1-3 3H8a1 1 0 0 0 0 2h2a5 5 0 0 0 5-5h2a7 7 0 0 1-7 7H8a3 3 0 1 1 0-6h1a1 1 0 0 0 1-1V4a3 3 0 0 1 3-3Z"
                          />
                        </svg>
                      </IconButton>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Salary Drawer */}
      <Drawer
        open={drawerOpen}
        title={
          activeEmp
            ? `${t("titles.salaryFor", "Salary for")} ${`${activeEmp.firstName || ""} ${activeEmp.lastName || ""}`.trim()}`
            : t("titles.salary", "Salary")
        }
        onClose={() => {
          setDrawerOpen(false);
          setActiveEmp(null);
          setSalaryData(null);
          setDrawerError("");
        }}
      >
        {drawerError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {drawerError}
          </div>
        )}

        {!salaryData ? (
          <div className="text-gray-500">{t("common.loading", "Loading...")}</div>
        ) : (
          <SalaryEditor
            data={salaryData}
            grades={grades}
            onSave={saveSalary}
            saving={saving}
          />
        )}

        {salaryData?.history?.length ? (
          <div className="mt-8">
            <h4 className="font-semibold mb-2">{t("titles.salaryHistory", "Salary history")}</h4>
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left font-semibold text-gray-700">
                    <th className="px-6 py-3">{t("history.when", "When")}</th>
                    <th className="px-6 py-3">{t("history.by", "By")}</th>
                    <th className="px-6 py-3">{t("history.salary", "Salary")}</th>
                    <th className="px-6 py-3">{t("history.currency", "Currency")}</th>
                    <th className="px-6 py-3">{t("history.payFrequency", "Pay Freq.")}</th>
                    <th className="px-6 py-3">{t("history.grade", "Grade")}</th>
                    <th className="px-6 py-3">{t("history.effectiveFrom", "Effective From")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salaryData.history.map((h, index) => (
                    <tr key={h.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 text-gray-600 font-mono">
                        {h.at ? new Date(h.at).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{h.actor?.email || h.actor?.uid || "—"}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{fmtNum(h.after?.salary)}</td>
                      <td className="px-6 py-4 text-gray-600">{h.after?.currency || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{h.after?.payFrequency || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {h.after?.gradeId
                          ? (grades.find((g) => g.id === h.after.gradeId)?.name || h.after.gradeId)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {h.after?.effectiveFrom || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

/* ---------------------------- Toolbar ---------------------------- */
function Toolbar({ filters, setFilters }) {
  const { t } = useTranslation();
  const set = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">
            {t("common.search", "Search")}
          </label>
          <input
            type="text"
            value={filters.q}
            onChange={set("q")}
            placeholder={t("common.searchPlaceholder", "Name, email, role, department...")}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("common.status", "Status")}
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={filters.status}
            onChange={set("status")}
          >
            <option value="">{t("common.all", "All")}</option>
            <option value="Active">{t("common.active", "Active")}</option>
            <option value="Inactive">{t("common.inactive", "Inactive")}</option>
            <option value="On Leave">{t("status.onLeave", "On Leave")}</option>
            <option value="Terminated">{t("status.terminated", "Terminated")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Salary Editor -------------------------- */
function SalaryEditor({ data, grades, onSave, saving }) {
  const { t } = useTranslation();

  // Initialize form from GET data
  const [form, setForm] = useState(() => ({
    salary: data.salary ?? 0,
    currency: data.salaryCurrency || "SAR",
    payFrequency: data.payFrequency || "Monthly",
    gradeId: data.gradeId || "",
    effectiveFrom: data.compensationEffectiveFrom || ymd(new Date()),
  }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({
      salary: data.salary ?? 0,
      currency: data.salaryCurrency || "SAR",
      payFrequency: data.payFrequency || "Monthly",
      gradeId: data.gradeId || "",
      effectiveFrom: data.compensationEffectiveFrom || ymd(new Date()),
    });
  }, [data]);

  const set = (k, map = (v) => v) => (e) =>
    setForm((s) => ({ ...s, [k]: map(e.target?.value ?? e) }));

  const validate = () => {
    const e = {};
    const n = Number(form.salary);
    if (Number.isNaN(n) || n < 0) e.salary = t("errors.invalidNumber", "Invalid number");
    if (!form.currency || String(form.currency).length < 3)
      e.currency = t("errors.currencyCode", "3-letter code");
    if (form.effectiveFrom && !/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveFrom))
      e.effectiveFrom = t("errors.dateFormat", "Use YYYY-MM-DD");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      salary: Number(form.salary),
      currency: String(form.currency).toUpperCase(),
      payFrequency: form.payFrequency,
      gradeId: form.gradeId || null,
      effectiveFrom: form.effectiveFrom || null,
    };
    onSave(payload);
  };

  // helpful grade label
  const gradeOptions = useMemo(
    () =>
      (grades || []).map((g) => ({
        id: g.id,
        label: g.name ? `${g.name}${g.level ? ` — L${g.level}` : ""}` : g.id,
      })),
    [grades]
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("employees.salary", "Salary")} *</label>
          <input
            type="number"
            className={`w-full border rounded-lg px-3 py-2 ${errors.salary ? "border-red-500" : ""}`}
            value={form.salary}
            onChange={set("salary", (v) => (v === "" ? "" : Number(v)))}
            min="0"
            step="0.01"
          />
          {errors.salary && <p className="text-xs text-red-600 mt-1">{errors.salary}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("salaryGradesTable.currency", "Currency")} *</label>
          <select
            className={`w-full border rounded-lg px-3 py-2 ${errors.currency ? "border-red-500" : ""}`}
            value={form.currency}
            onChange={set("currency", (v) => String(v).toUpperCase())}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("history.payFrequency", "Pay Freq.")}</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.payFrequency}
            onChange={set("payFrequency")}
          >
            {PAY_FREQUENCIES.map((pf) => (
              <option key={pf} value={pf}>
                {pf}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("employees.grade", "Grade")}</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.gradeId}
            onChange={set("gradeId")}
          >
            <option value="">{t("common.none", "None")}</option>
            {gradeOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("history.effectiveFrom", "Effective From")}
          </label>
          <input
            type="date"
            className={`w-full border rounded-lg px-3 py-2 ${errors.effectiveFrom ? "border-red-500" : ""}`}
            value={form.effectiveFrom || ""}
            onChange={set("effectiveFrom")}
          />
          {errors.effectiveFrom && (
            <p className="text-xs text-red-600 mt-1">{errors.effectiveFrom}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {t("hints.effectiveDate", "When the change becomes active")}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {saving ? t("common.saving", "Saving...") : t("actions.save", "Save")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------ Drawer ------------------------------ */
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
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl transition-transform ${
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

/* ----------------------------- Tiny atoms ----------------------------- */
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