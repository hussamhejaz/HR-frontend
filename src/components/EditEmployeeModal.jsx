// src/components/EditEmployeeModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiLoader } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const API_BASE =  "https://hr-backend-npbd.onrender.com";

/* ----------------- Auth / Tenant helpers (same as EmployeeDetails.jsx) ----------------- */
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  process.env.REACT_APP_TENANT_ID ||
  "";

const getIdToken = () => localStorage.getItem("fb_id_token") || "";

const getAuthHeaders = () => {
  const headers = {};
  const token = getIdToken();
  const tenantId = getTenantId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};
/* --------------------------------------------------------------------------------------- */

/* -------------------- tiny presentational components (stable) -------------------- */
const HiddenWrapper = React.memo(function HiddenWrapper({ open, children }) {
  return (
    <div
      style={{ display: open ? "flex" : "none" }}
      className="fixed inset-0 z-50 items-center justify-center"
    >
      {children}
    </div>
  );
});

const Field = React.memo(function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-700">{label}</label>
      {children}
    </div>
  );
});
/* --------------------------------------------------------------------------------- */

export default function EditEmployeeModal({ open, onClose, employee, onSaved }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  // Stable portal root
  const portalEl = useMemo(() => {
    let el = document.getElementById("edit-employee-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "edit-employee-portal";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    department: "",
    role: "",
    status: "Active",
    employeeType: "Full-time",
  });

  // Track “user is typing” to avoid re-hydration
  const isEditingRef = useRef(false);

  // Keep last hydrated employee id to avoid re-hydrating while open
  const hydratedForId = useRef(null);
  const prevOpen = useRef(false);

  // Build a snapshot of incoming employee props
  const snap = useMemo(
    () => ({
      id: employee?.id ?? null,
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      address: employee?.address ?? "",
      department: employee?.department ?? "",
      role: employee?.role ?? "",
      status: employee?.status ?? "Active",
      employeeType: employee?.employeeType ?? "Full-time",
    }),
    [
      employee?.id,
      employee?.firstName,
      employee?.lastName,
      employee?.email,
      employee?.phone,
      employee?.address,
      employee?.department,
      employee?.role,
      employee?.status,
      employee?.employeeType,
    ]
  );

  // Keep latest snapshot in a ref so effect deps can be minimal
  const latestSnapRef = useRef(snap);
  useEffect(() => {
    latestSnapRef.current = snap;
  }, [snap]);

  // HYDRATE ONLY when opening or switching employee id,
  // and NEVER hydrate while the user is actively typing.
  useEffect(() => {
    const openingNow = open && !prevOpen.current;
    const sameEmployee = hydratedForId.current === employee?.id;
    prevOpen.current = open;

    if (!open || !employee?.id) return;

    if ((openingNow || !sameEmployee) && !isEditingRef.current) {
      setMsg(null);
      const s = latestSnapRef.current;
      setForm({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        address: s.address,
        department: s.department,
        role: s.role,
        status: s.status,
        employeeType: s.employeeType,
      });
      hydratedForId.current = s.id;
    }
  }, [open, employee?.id]); // minimal deps; safe via latestSnapRef

  // Only send changed fields
  const changed = useMemo(() => {
    if (!employee) return {};
    const diff = {};
    Object.entries(form).forEach(([k, v]) => {
      const oldV = employee[k] ?? "";
      if (String(v ?? "") !== String(oldV ?? "")) diff[k] = v;
    });
    return diff;
  }, [form, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };
  const handleBlur = () => {
    // small timeout so tabbing between fields doesn’t flip too early
    setTimeout(() => {
      isEditingRef.current = false;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!employee?.id) return;

    // If nothing changed, skip PUT to avoid unnecessary request
    if (Object.keys(changed).length === 0) {
      setMsg({ type: "success", text: t("editEmployee.noChanges", "Nothing to update") });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(), // <-- add auth + tenant headers
        },
        body: JSON.stringify(changed),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMsg({ type: "success", text: t("editEmployee.success") });
      onSaved?.(updated);
      setTimeout(() => {
        hydratedForId.current = null;
        onClose?.();
      }, 300);
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: t("editEmployee.error") });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <HiddenWrapper open={open}>
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          hydratedForId.current = null;
          onClose?.();
        }}
      />
      <div
        dir={dir}
        className="relative z-10 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("editEmployee.title")}</h3>
          <button
            onClick={() => {
              hydratedForId.current = null;
              onClose?.();
            }}
            className="rounded-lg p-2 hover:bg-gray-100"
            type="button"
          >
            <FiX />
          </button>
        </div>

        {msg && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("editEmployee.fields.firstName")}>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              placeholder={t("addEmployee.placeholders.firstName")}
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.lastName")}>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              placeholder={t("addEmployee.placeholders.lastName")}
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.email")}>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.phone")}>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.address")}>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.department")}>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.role")}>
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              type="text"
              autoComplete="off"
            />
          </Field>

          <Field label={t("editEmployee.fields.status")}>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Active">{t("filters.status.active")}</option>
              <option value="Probation">{t("filters.status.probation")}</option>
              <option value="Inactive">{t("filters.status.inactive")}</option>
              <option value="Terminated">{t("filters.status.terminated")}</option>
            </select>
          </Field>

          <Field label={t("editEmployee.fields.employeeType")}>
            <select
              name="employeeType"
              value={form.employeeType}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Full-time">{t("filters.type.fullTime")}</option>
              <option value="Part-time">{t("filters.type.partTime")}</option>
              <option value="Contract">{t("filters.type.contract")}</option>
              <option value="Intern">{t("filters.type.intern")}</option>
            </select>
          </Field>

          <div className="md:col-span-2 mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                hydratedForId.current = null;
                onClose?.();
              }}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              {t("editEmployee.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <FiLoader className="animate-spin" /> {t("editEmployee.saving")}
                </span>
              ) : (
                t("editEmployee.save")
              )}
            </button>
          </div>
        </form>
      </div>
    </HiddenWrapper>,
    portalEl
  );
}
