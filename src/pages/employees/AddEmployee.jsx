// src/pages/employees/AddEmployee.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import {
  FiCheckCircle, FiAlertCircle, FiLoader,
  FiEye, FiEyeOff, FiCopy, FiKey
} from "react-icons/fi";
import { Link } from "react-router-dom";

const API_BASE = "https://hr-backend-npbd.onrender.com";

/* ------------ AUTH / TENANT HELPERS (unified keys) ----------------------- */
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  process.env.REACT_APP_TENANT_ID ||
  "";

const getIdToken = () => localStorage.getItem("fb_id_token") || "";

const getAuthHeaders = () => {
  const token = getIdToken();
  const tenantId = getTenantId();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

/** Force-refresh the Firebase ID token if possible to avoid 401 on expiry. */
async function refreshIdTokenIfPossible() {
  try {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    if (auth?.currentUser) {
      const fresh = await auth.currentUser.getIdToken(true);
      localStorage.setItem("fb_id_token", fresh);
      return fresh;
    }
  } catch (_e) {}
  return null;
}
/* ------------------------------------------------------------------------- */

export default function AddEmployee() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  // --- reference data (departments & teams) ---
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [refsError, setRefsError] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoadingRefs(true);
    setRefsError(null);

    const strictFetch = async (url) => {
      const res = await fetch(url, { headers: getAuthHeaders() });
      const raw = await res.text();
      let json;
      try { json = JSON.parse(raw); } catch { json = null; }
      if (!res.ok) {
        const msg = json?.error || json?.message || raw || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return json;
    };

    Promise.all([
      strictFetch(`${API_BASE}/api/departments`),
      strictFetch(`${API_BASE}/api/teams`),
    ])
      .then(([deps, tms]) => {
        if (cancel) return;
        setDepartments(Array.isArray(deps) ? deps : []);
        setTeams(Array.isArray(tms) ? tms : []);
        setLoadingRefs(false);
      })
      .catch((e) => {
        if (cancel) return;
        const msg =
          /401|403|unauth|tenant/i.test(String(e?.message || "")) 
            ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
            : t("teams.errorLoadingDeps", "Failed to load departments/teams.");
        setRefsError(msg);
        setLoadingRefs(false);
      });

    return () => { cancel = true; };
  }, [t]);

  // --- form state ---
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    nationality: "",
    phone: "",
    email: "",
    address: "",
    role: "",
    department: "",
    departmentId: "",
    teamName: "",
    teamId: "",
    employeeType: "Full-time",
    startDate: "",
    endDate: "",
    status: "Active",
    salary: "",
    payFrequency: "Monthly",
    bankName: "",
    accountNumber: "",
    iban: "",
  });

  // --- account creation (mobile only; backend expects these fields) ---
  const [account, setAccount] = useState({
    createLoginAccount: false,
    accountPassword: "",
  });
  const [showPass, setShowPass] = useState(false);

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
    const arr = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]);
    setAccount((a) => ({ ...a, accountPassword: arr.join("") }));
  };
  const copyPassword = async () => {
    try { await navigator.clipboard.writeText(account.accountPassword || ""); } catch {}
  };

  const [profilePic, setProfilePic] = useState(null);
  const [idDoc, setIdDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // -------- Focus/selection preserve --------
  const inputRefs = useRef({});
  const activeNameRef = useRef(null);
  const caretRef = useRef({ start: null, end: null });
  const register = (name) => (el) => { if (el) inputRefs.current[name] = el; };
  const onFocusField = (e) => { activeNameRef.current = e.target.name; };
  const onBlurField = () => { activeNameRef.current = null; caretRef.current = { start: null, end: null }; };

  useLayoutEffect(() => {
    const name = activeNameRef.current;
    if (!name) return;
    const el = inputRefs.current[name];
    if (!el) return;
    el.focus();
    const { start, end } = caretRef.current;
    if (start != null && end != null && typeof el.setSelectionRange === "function") {
      try { el.setSelectionRange(start, end); } catch {}
    }
  });

  const filteredTeams = useMemo(() => {
    if (!form.departmentId) return [];
    return teams.filter((t) => t.department === form.departmentId);
  }, [teams, form.departmentId]);

  const handleChange = (e) => {
    const { name, value, selectionStart, selectionEnd } = e.target;
    caretRef.current = { start: selectionStart ?? null, end: selectionEnd ?? null };
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    const dep = departments.find((d) => d.id === departmentId);
    setForm((prev) => ({
      ...prev,
      departmentId,
      department: dep?.name || "",
      teamId: "",
      teamName: "",
    }));
  };

  const handleTeamChange = (e) => {
    const teamId = e.target.value;
    const team = filteredTeams.find((t) => t.id === teamId);
    setForm((prev) => ({
      ...prev,
      teamId,
      teamName: team?.name || "",
    }));
  };

  const buildContract = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Employment Contract", 20, 20);
    doc.setFontSize(12);
    doc.text(`First Name: ${form.firstName}`, 20, 40);
    doc.text(`Last Name: ${form.lastName}`, 20, 50);
    doc.text(`Role: ${form.role}`, 20, 60);
    doc.text(`Department: ${form.department}`, 20, 70);
    doc.text(`Team: ${form.teamName || "—"}`, 20, 80);
    doc.text(`Start Date: ${form.startDate}`, 20, 90);
    doc.text(`End Date: ${form.endDate || "—"}`, 20, 100);
    doc.text("…contract terms…", 20, 120);
    return doc.output("blob");
  };

  const validate = () => {
    if (!form.departmentId) {
      setMsg({ type: "error", text: t("teams.departmentRequired", "Please choose a department.") });
      return false;
    }
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      setMsg({ type: "error", text: t("addEmployee.hints.contractEndDate", "End date must be after start date.") });
      return false;
    }
    if (account.createLoginAccount) {
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
        setMsg({ type: "error", text: t("addEmployee.account.emailInvalid", "Please enter a valid email (used as the account email).") });
        return false;
      }
      if (!account.accountPassword || account.accountPassword.length < 6) {
        setMsg({ type: "error", text: t("addEmployee.account.passwordWeak", "Password must be at least 6 characters.") });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({});
    if (!validate()) return;

    setSubmitting(true);

    try {
      await refreshIdTokenIfPossible(); // keep token fresh to avoid 401

      const contractBlob = buildContract();
      const data = new FormData();

      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(), // backend uses this for account creation
        address: form.address.trim(),
        nationality: form.nationality.trim(),
        role: form.role.trim(),
        department: form.department,
        departmentId: form.departmentId,
        teamName: form.teamName || "",
        teamId: form.teamId || "",
      };

      Object.entries(payload).forEach(([k, v]) => data.append(k, v ?? ""));
      if (profilePic) data.append("profilePic", profilePic);
      if (idDoc) data.append("idDoc", idDoc);
      data.append("contract", contractBlob, "contract.pdf");

      // ---- Account creation flags for backend (mobile app login only) ----
      if (account.createLoginAccount) {
        data.append("createLoginAccount", "true");
        data.append("accountPassword", account.accountPassword);
      }
      // -------------------------------------------------------------------

      const res = await fetch(`${API_BASE}/api/employees`, {
        method: "POST",
        headers: getAuthHeaders(), // Authorization + X-Tenant-Id (no Content-Type for FormData)
        body: data,
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);

      // reset form
      setForm({
        firstName: "",
        lastName: "",
        gender: "",
        dob: "",
        nationality: "",
        phone: "",
        email: "",
        address: "",
        role: "",
        department: "",
        departmentId: "",
        teamName: "",
        teamId: "",
        employeeType: "Full-time",
        startDate: "",
        endDate: "",
        status: "Active",
        salary: "",
        payFrequency: "Monthly",
        bankName: "",
        accountNumber: "",
        iban: "",
      });
      setProfilePic(null);
      setIdDoc(null);

      if (account.createLoginAccount) {
        const creds = `${t("fields.email", "Email")}: ${payload.email}\n${t("fields.password", "Password")}: ${account.accountPassword}`;
        setMsg({
          type: "success",
          text:
            t("addEmployee.successWithAccount", "Employee created. Mobile login account created.") +
            " " +
            t("addEmployee.account.giveToEmployee", "Share these credentials with the employee.") +
            `\n${creds}`,
        });
      } else {
        setMsg({ type: "success", text: t("addEmployee.success", "Employee created successfully.") });
      }

      setAccount({ createLoginAccount: false, accountPassword: "" });
    } catch (err) {
      console.error(err);
      const m = String(err?.message || "");
      const message =
        /Missing bearer token|Token expired|Invalid token|Unauthenticated|401/i.test(m)
          ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
          : m || t("addEmployee.error", "Failed to create employee. Please try again.");
      setMsg({ type: "error", text: message });
    } finally {
      setSubmitting(false);
    }
  };

  const FormGroup = ({ label, children, hint }) => (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );

  return (
    <div dir={dir} className="p-6 mx-auto max-w-4xl">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">{t("addEmployee.title", "Add Employee")}</h2>

        {/* Reference data messages */}
        {loadingRefs && <div className="mb-4 text-sm text-gray-600">{t("loading", "Loading")}…</div>}
        {!loadingRefs && refsError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {refsError}{" "}
            <span className="block text-xs text-gray-600 mt-1">
              {t("teams.tryAgain", "Try again or create a department first.")}{" "}
              <Link to="/departments/create" className="underline text-indigo-700">
                {t("departments.addButton", "Add Department")}
              </Link>
            </span>
          </div>
        )}

        {msg.text && (
          <div
            className={`whitespace-pre-wrap flex items-start gap-2 mb-4 p-3 rounded-lg ${
              msg.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {msg.type === "error" ? <FiAlertCircle size={20} className="mt-0.5" /> : <FiCheckCircle size={20} className="mt-0.5" />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Info */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t("addEmployee.sections.personal", "Personal Information")}</h3>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
              <FormGroup label={t("addEmployee.fields.firstName", "First name")}>
                <input
                  ref={register("firstName")}
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.firstName", "First name")}
                  required
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.lastName", "Last name")}>
                <input
                  ref={register("lastName")}
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.lastName", "Last name")}
                  required
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.gender", "Gender")}>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">{t("addEmployee.options.gender.select", "Select gender")}</option>
                  <option value="Male">{t("addEmployee.options.gender.male", "Male")}</option>
                  <option value="Female">{t("addEmployee.options.gender.female", "Female")}</option>
                </select>
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.dob", "Date of birth")} hint={t("addEmployee.hints.dob", "YYYY-MM-DD")}>
                <input
                  ref={register("dob")}
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  required
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.nationality", "Nationality")}>
                <input
                  ref={register("nationality")}
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.nationality", "e.g., Saudi")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.phone", "Phone")}>
                <input
                  ref={register("phone")}
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.phone", "+966 5x xxx xxxx")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.email", "Email")}>
                <input
                  ref={register("email")}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.email", "name@example.com")}
                  required
                  dir="ltr"
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.address", "Address")}>
                <input
                  ref={register("address")}
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.address", "Address")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>
            </div>
          </section>

          {/* Job Info */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t("addEmployee.sections.job", "Job Information")}</h3>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
              <FormGroup label={t("departments.name", "Department")}>
                <select
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleDepartmentChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  required
                  className="border px-4 py-2 rounded w-full bg-white focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingRefs || !!refsError}
                >
                  <option value="">{t("teams.selectDepartment", "Select Department")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {!loadingRefs && departments.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("departments.list.empty", "No departments yet. Create one.")}{" "}
                    <Link to="/departments/create" className="underline text-indigo-700">
                      {t("departments.addButton", "Add Department")}
                    </Link>
                  </p>
                )}
              </FormGroup>

              <FormGroup label={t("teams.name", "Team")}>
                <select
                  name="teamId"
                  value={form.teamId}
                  onChange={handleTeamChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full bg-white focus:ring-2 focus:ring-indigo-500"
                  disabled={!form.departmentId || loadingRefs || !!refsError}
                >
                  <option value="">{t("teams.select", "No team / Not set")}</option>
                  {filteredTeams.map((tm) => (
                    <option key={tm.id} value={tm.id}>{tm.name}</option>
                  ))}
                </select>
                {form.departmentId && filteredTeams.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("teams.none", "No teams found for this department.")}{" "}
                    <Link to="/teams/create" className="underline text-indigo-700">
                      {t("teams.addButton", "Add Team")}
                    </Link>
                  </p>
                )}
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.role", "Role")}>
                <input
                  ref={register("role")}
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.role", "e.g., Sales Associate")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup
                label={t("addEmployee.fields.contractStartDate", "Contract start date")}
                hint={t("addEmployee.hints.contractStartDate", "First working day")}
              >
                <input
                  ref={register("startDate")}
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  required
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.employeeType", "Employee type")}>
                <select
                  name="employeeType"
                  value={form.employeeType}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Full-time">{t("addEmployee.options.employeeType.fullTime", "Full-time")}</option>
                  <option value="Part-time">{t("addEmployee.options.employeeType.partTime", "Part-time")}</option>
                  <option value="Contract">{t("addEmployee.options.employeeType.contract", "Contract")}</option>
                  <option value="Intern">{t("addEmployee.options.employeeType.intern", "Intern")}</option>
                </select>
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.status", "Status")}>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Active">{t("addEmployee.options.status.active", "Active")}</option>
                  <option value="Probation">{t("addEmployee.options.status.probation", "Probation")}</option>
                  <option value="Terminated">{t("addEmployee.options.status.terminated", "Terminated")}</option>
                </select>
              </FormGroup>

              <FormGroup
                label={t("addEmployee.fields.contractEndDate", "Contract end date")}
                hint={t("addEmployee.hints.contractEndDate", "Optional; must be after start date")}
              >
                <input
                  ref={register("endDate")}
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>
            </div>
          </section>

          {/* Account (Mobile app) */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t("addEmployee.sections.account", "Account (Mobile app)")}</h3>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={account.createLoginAccount}
                  onChange={(e) => setAccount((a) => ({ ...a, createLoginAccount: e.target.checked }))}
                />
                <span className="text-sm">
                  {t("addEmployee.account.createNow", "Create mobile login now")}
                </span>
              </label>

              {account.createLoginAccount && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
                  <FormGroup label={t("addEmployee.account.email", "Account email")}>
                    <input
                      type="email"
                      value={form.email}
                      readOnly
                      dir="ltr"
                      className="border px-4 py-2 rounded w-full bg-gray-50 text-gray-700"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("addEmployee.account.emailNote", "Uses the employee email above. Edit it there if needed.")}
                    </p>
                  </FormGroup>

                  <FormGroup label={t("addEmployee.account.password", "Temporary password")}>
                    <div className="flex gap-2">
                      <input
                        type={showPass ? "text" : "password"}
                        value={account.accountPassword}
                        onChange={(e) => setAccount((a) => ({ ...a, accountPassword: e.target.value }))}
                        placeholder={t("addEmployee.account.passwordPlaceholder", "At least 6 characters")}
                        dir="ltr"
                        className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                        title={t("actions.toggleVisibility", "Show / Hide")}
                        onClick={() => setShowPass((v) => !v)}
                      >
                        {showPass ? <FiEyeOff /> : <FiEye />}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                        title={t("actions.copy", "Copy")}
                        onClick={copyPassword}
                        disabled={!account.accountPassword}
                      >
                        <FiCopy />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                        title={t("actions.generate", "Generate")}
                        onClick={genPassword}
                      >
                        <FiKey />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("addEmployee.account.hintMobileOnly", "This account can only sign in from the mobile app. Dashboard access is blocked.")}
                    </p>
                  </FormGroup>
                </div>
              )}
            </div>
          </section>

          {/* Payroll */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t("addEmployee.sections.payroll", "Payroll")}</h3>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
              <FormGroup label={t("addEmployee.fields.salary", "Salary")}>
                <input
                  ref={register("salary")}
                  type="number"
                  name="salary"
                  value={form.salary}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.salary", "e.g., 6000")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.payFrequency", "Pay frequency")}>
                <select
                  name="payFrequency"
                  value={form.payFrequency}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Monthly">{t("addEmployee.options.payFrequency.monthly", "Monthly")}</option>
                  <option value="Weekly">{t("addEmployee.options.payFrequency.weekly", "Weekly")}</option>
                  <option value="Hourly">{t("addEmployee.options.payFrequency.hourly", "Hourly")}</option>
                </select>
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.bankName", "Bank name")}>
                <input
                  ref={register("bankName")}
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.bankName", "Bank")}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.accountNumber", "Account number")}>
                <input
                  ref={register("accountNumber")}
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.accountNumber", "Account number")}
                  dir="ltr"
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.iban", "IBAN")}>
                <input
                  ref={register("iban")}
                  name="iban"
                  value={form.iban}
                  onChange={handleChange}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                  placeholder={t("addEmployee.placeholders.iban", "SA..")}
                  dir="ltr"
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </FormGroup>
            </div>
          </section>

          {/* Documents */}
          <section>
            <h3 className="text-lg font-semibold mb-3">{t("addEmployee.sections.documents", "Documents")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormGroup label={t("addEmployee.fields.profilePic", "Profile picture")} hint={t("addEmployee.hints.profilePic", "Optional")}>
                <input
                  type="file"
                  onChange={(e) => setProfilePic(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600"
                />
              </FormGroup>

              <FormGroup label={t("addEmployee.fields.idDoc", "ID document")} hint={t("addEmployee.hints.idDoc", "Optional")}>
                <input
                  type="file"
                  onChange={(e) => setIdDoc(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600"
                />
              </FormGroup>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || loadingRefs || !!refsError}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {submitting && <FiLoader className="animate-spin" />}
            {submitting ? t("addEmployee.buttons.submitting", "Submitting…") : t("addEmployee.buttons.submit", "Create Employee")}
          </button>
        </form>
      </div>
    </div>
  );
}
