// src/pages/teams/CreateTeam.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import {
  FiUsers,
  FiLoader,
  FiSearch,
  FiMinus,
  FiPlus,
  FiArrowRight,
  FiArrowLeft,
} from "react-icons/fi";

const API_BASE =  "https://hr-backend-npbd.onrender.com";

export default function CreateTeam() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [depsError, setDepsError] = useState(null);
  const [depQuery, setDepQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    department: "", // departmentId
    membersCount: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("fb_id_token") || "";
    const tenantId = localStorage.getItem("currentTenantId") || "";
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers["X-Tenant-Id"] = tenantId; // optional
    return headers;
  };

  useEffect(() => {
    let cancel = false;
    setLoadingDeps(true);
    setDepsError(null);

    fetch(`${API_BASE}/api/departments`, { headers: getAuthHeaders() })
      .then(async (res) => {
        const raw = await res.text();
        let json;
        try { json = JSON.parse(raw); } catch {}
        if (!res.ok) {
          throw new Error(json?.error || json?.message || raw || `HTTP ${res.status}`);
        }
        return json;
      })
      .then((data) => {
        if (cancel) return;
        setDepartments(Array.isArray(data) ? data : []);
        setLoadingDeps(false);
      })
      .catch((e) => {
        if (cancel) return;
        setDepsError(e?.message || t("teams.errorLoadingDeps", "Failed to load departments."));
        setLoadingDeps(false);
      });

    return () => { cancel = true; };
  }, [t]);

  const filteredDeps = useMemo(() => {
    const q = depQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      [d.name, d.code, d.location].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [depQuery, departments]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "membersCount" ? Number(value) : value }));
  };

  const stepMembers = (delta) =>
    setForm((f) => ({ ...f, membersCount: Math.max(1, (Number(f.membersCount) || 1) + delta) }));

  // 🔧 Only require auth + basic form fields; don't force client tenant selection
  const validate = () => {
    const token = localStorage.getItem("fb_id_token");
    if (!token) {
      setMsg({ type: "error", text: t("errors.unauthorized", "You must be signed in.") });
      return false;
    }
    if (!form.name.trim()) {
      setMsg({ type: "error", text: t("teams.nameRequired", "Team name is required.") });
      return false;
    }
    if (!form.department) {
      setMsg({ type: "error", text: t("teams.departmentRequired", "Please choose a department.") });
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          department: form.department,
          membersCount: Number(form.membersCount) || 1,
        }),
      });

      const raw = await res.text();
      let json; try { json = JSON.parse(raw); } catch {}

      if (!res.ok) {
        const message = json?.error || json?.message || raw || `HTTP ${res.status}`;
        throw new Error(message);
      }

      setMsg({ type: "success", text: t("teams.created", "Team created successfully.") });
      setTimeout(() => navigate("/teams/all"), 600);
    } catch (e) {
      setMsg({
        type: "error",
        // surface real server reason (e.g., "No tenant membership found")
        text: e?.message || t("teams.errorCreating", "Failed to create team."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, hint, children }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );

  return (
    <div dir={dir} className="p-6 mx-auto max-w-3xl">
      <div className={`mb-6 flex items-center gap-3 ${isRTL ? "justify-end flex-row-reverse" : "justify-start"}`}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <FiUsers size={22} />
        </div>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-extrabold">{t("teams.addTitle", "Create Team")}</h1>
          <p className="text-sm text-gray-600">
            {t("teams.subtitle", "Create a team and link it to a department.")}
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${
          msg.type === "success" ? "border-green-200 bg-green-50 text-green-700"
                                 : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow space-y-6">
        <Field
          label={t("teams.name", "Team Name")}
          hint={t("teams.nameHint", "Give your team a clear, human-friendly name.")}
        >
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="w-full rounded-lg border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
            placeholder={t("teams.namePlaceholder", "e.g., Mobile Platform")}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label={t("teams.department", "Department")}
            hint={t("teams.selectDepartment", "Select the parent department")}
          >
            {loadingDeps ? (
              <div className="inline-flex items-center gap-2 text-gray-600">
                <FiLoader className="animate-spin" /> {t("loading", "Loading")}…
              </div>
            ) : depsError ? (
              <div className="text-red-600">{depsError}</div>
            ) : (
              <>
                <div className="relative mb-2">
                  <span className={`pointer-events-none absolute inset-y-0 ${isRTL ? "right-3" : "left-3"} flex items-center text-gray-400`}>
                    <FiSearch />
                  </span>
                  <input
                    value={depQuery}
                    onChange={(e) => setDepQuery(e.target.value)}
                    className={`w-full rounded-lg border ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"} py-2 text-sm focus:ring-2 focus:ring-indigo-500`}
                    placeholder={t("departments.list.searchPlaceholder", "Search departments…")}
                  />
                </div>

                <select
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  required
                  className="w-full rounded-lg border bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t("teams.selectDepartment", "Select Department")}</option>
                  {filteredDeps.length === 0 ? (
                    <option value="" disabled>
                      {t("departments.list.emptyFiltered", "No departments match your search.")}
                    </option>
                  ) : (
                    filteredDeps.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `• ${d.code}` : ""} {d.location ? `• ${d.location}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </>
            )}
          </Field>

          <Field
            label={t("teams.membersCount", "Members")}
            hint={t("teams.membersHint", "Approximate number of members.")}
          >
            <div className={`flex items-stretch rounded-lg border overflow-hidden w-full md:w-56 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button type="button" onClick={() => stepMembers(-1)} className="px-3 hover:bg-gray-50" aria-label={t("teams.decrement", "Decrease")}>
                <FiMinus />
              </button>
              <input
                name="membersCount"
                type="number"
                min={1}
                value={form.membersCount}
                onChange={onChange}
                className="w-full border-x px-3 py-2 text-center outline-none focus:ring-0"
              />
              <button type="button" onClick={() => stepMembers(1)} className="px-3 hover:bg-gray-50" aria-label={t("teams.increment", "Increase")}>
                <FiPlus />
              </button>
            </div>
          </Field>
        </div>

        <div className={`mt-2 flex items-center gap-3 ${isRTL ? "justify-start flex-row-reverse" : "justify-end"}`}>
          <Link to="/teams/all" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            {t("Back", "Back")}
          </Link>

          <button
            type="submit"
            disabled={submitting || loadingDeps || !!depsError}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FiLoader className="animate-spin" />
                {t("teams.submitting", "Creating…")}
              </>
            ) : (
              <>
                {t("teams.submit", "Create Team")}
                {isRTL ? <FiArrowLeft /> : <FiArrowRight />}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
