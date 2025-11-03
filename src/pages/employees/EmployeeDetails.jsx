// src/pages/employees/EmployeeDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import EmployeeOffboardingSection from "../../components/EmployeeOffboardingSection";
import EditEmployeeModal from "../../components/EditEmployeeModal";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5002";

/* ----------------- Auth / Tenant helpers (unified) ----------------- */
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

const strictFetch = async (url) => {
  const res = await fetch(url, { headers: getAuthHeaders() });
  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
};
/* ------------------------------------------------------------------- */

const Field = ({ label, children }) => (
  <div>
    <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-gray-900">{children}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const EmployeeDetails = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    strictFetch(`${API_BASE}/api/employees/${id}`)
      .then((d) => {
        if (cancelled) return;
        setEmp(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = /401|403|unauth|tenant|sign/i.test(String(e?.message || ""))
          ? t(
              "errors.authOrTenant",
              "You must be signed in and a tenant must be selected."
            )
          : t("errors.employeeNotFound", "Employee not found");
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  // Translators for enum values
  const trStatus = (s) => {
    const key = (s || "").toLowerCase();
    if (key === "active") return t("filters.status.active");
    if (key === "probation") return t("filters.status.probation");
    if (key === "terminated") return t("filters.status.terminated");
    if (key === "inactive") return t("filters.status.inactive");
    return s || t("n/a");
  };

  const trType = (s) => {
    const key = (s || "").toLowerCase();
    if (["full-time", "full time", "fulltime"].includes(key))
      return t("filters.type.fullTime");
    if (["part-time", "part time", "parttime"].includes(key))
      return t("filters.type.partTime");
    if (key === "contract") return t("filters.type.contract");
    if (key === "intern") return t("filters.type.intern");
    return s || t("n/a");
  };

  const trPayFreq = (s) => {
    const key = (s || "").toLowerCase();
    if (key === "monthly") return t("payFreq.monthly");
    if (key === "weekly") return t("payFreq.weekly");
    if (key === "hourly") return t("payFreq.hourly");
    return s || t("n/a");
  };

  if (loading) return <div className="p-6">{t("loading")}…</div>;
  if (error)
    return (
      <div dir={dir} className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
        <div className="mt-4">
          <Link to="/employees/all" className="underline text-indigo-700">
            {t("Back")}
          </Link>
        </div>
      </div>
    );
  if (!emp)
    return (
      <div className="p-6 text-red-600">{t("errors.employeeNotFound")}</div>
    );

  const fullName =
    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || t("n/a");

  return (
    <div dir={dir} className="p-6 space-y-6">
      {/* Header */}
      <div
        className={`flex items-center justify-between ${
          isRTL ? "text-right" : ""
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            isRTL ? "flex-row-reverse" : ""
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
            {fullName.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-sm text-gray-500">
              {(emp.role || t("n/a"))} · {(emp.department || t("n/a"))}
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 ${
            isRTL ? "flex-row-reverse" : ""
          }`}
        >
          {/* Edit modal trigger */}
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg border px-3 py-2 hover:bg-gray-50"
          >
            {t("editEmployee.open")}
          </button>

          {/* Jump to Offboarding section on this page */}
          <a
            href="#offboarding"
            className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
          >
            {t("offboarding.title")}
          </a>

          <Link
            to="/employees/all"
            className="rounded-lg border px-3 py-2 hover:bg-gray-50"
          >
            {t("Back")}
          </Link>
        </div>
      </div>

      {/* Job */}
      <Section title={t("details.job")}>
        <Field label={t("fields.employeeType")}>
          {trType(emp.employeeType)}
        </Field>
        <Field label={t("fields.status")}>{trStatus(emp.status)}</Field>
        <Field label={t("fields.startDate")}>{emp.startDate || t("n/a")}</Field>
        <Field label={t("fields.endDate")}>{emp.endDate || "—"}</Field>
      </Section>

      {/* Personal & Contact */}
      <Section title={t("details.personal")}>
        <Field label={t("fields.email")}>
          <span dir="ltr" className="inline-block">
            {emp.email || t("n/a")}
          </span>
        </Field>
        <Field label={t("fields.phone")}>{emp.phone || t("n/a")}</Field>
        <Field label={t("fields.nationality")}>
          {emp.nationality || t("n/a")}
        </Field>
        <Field label={t("fields.address")}>{emp.address || t("n/a")}</Field>
        <Field label={t("fields.dob")}>{emp.dob || t("n/a")}</Field>
        <Field label={t("fields.iban")}>
          <span dir="ltr" className="inline-block">
            {emp.iban || t("n/a")}
          </span>
        </Field>
      </Section>

      {/* Payroll */}
      <Section title={t("details.payroll")}>
        <Field label={t("fields.salary")}>{emp.salary || t("n/a")}</Field>
        <Field label={t("fields.payFrequency")}>
          {trPayFreq(emp.payFrequency)}
        </Field>
        <Field label={t("fields.bankName")}>{emp.bankName || t("n/a")}</Field>
        <Field label={t("fields.accountNumber")}>
          <span dir="ltr" className="inline-block">
            {emp.accountNumber || t("n/a")}
          </span>
        </Field>
      </Section>

      {/* Documents */}
      {emp.contractUrl || emp.profilePicUrl || emp.idDocUrl ? (
        <Section title={t("details.documents")}>
          <Field label={t("fields.contract")}>
            {emp.contractUrl ? (
              <a
                className="text-indigo-600 underline"
                href={emp.contractUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("details.open")}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label={t("fields.profilePic")}>
            {emp.profilePicUrl ? (
              <a
                className="text-indigo-600 underline"
                href={emp.profilePicUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("details.open")}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label={t("fields.idDoc")}>
            {emp.idDocUrl ? (
              <a
                className="text-indigo-600 underline"
                href={emp.idDocUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("details.open")}
              </a>
            ) : (
              "—"
            )}
          </Field>
        </Section>
      ) : null}

      {/* Offboarding section */}
      <div id="offboarding">
        <Section title={t("offboarding.title")}>
          <div className="md:col-span-2">
            <EmployeeOffboardingSection employeeId={id} />
          </div>
        </Section>
      </div>

      {/* Edit modal */}
      <EditEmployeeModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={emp}
        onSaved={(updated) => setEmp(updated)}
      />
    </div>
  );
};

export default EmployeeDetails;
