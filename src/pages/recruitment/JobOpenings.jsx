// src/pages/recruitment/Jobs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBriefcase,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiPause,
  FiPlay,
  FiXCircle,
  FiAlertTriangle,
  FiLoader,
  FiX,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// CRA/Webpack-friendly env var
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002";
// Updated path to match server/routes/jobs.js
const JOBS_API = `${API_BASE}/api/jobs`;

const cx = (...cls) => cls.filter(Boolean).join(" ");

/* ----------------- Auth / Tenant helpers (shared pattern) ----------------- */
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

const strictFetch = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const raw = await res.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json ?? raw;
};
/* ------------------------------------------------------------------------- */

const StatusPill = ({ status }) => {
  const s = (status || "draft").toLowerCase();
  const styles = {
    draft: "bg-gray-100 text-gray-700 ring-gray-200",
    open: "bg-green-50 text-green-700 ring-green-200",
    paused: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    closed: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", styles[s] || styles.draft)}>
      {status || "Draft"}
    </span>
  );
};

export default function Jobs() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [working, setWorking] = useState(false);

  // Delete confirm
  const [deleting, setDeleting] = useState(null);

  const fetchJobs = () => {
    setLoading(true);
    setErr(null);
    strictFetch(JOBS_API, { headers: getAuthHeaders() })
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch((e) => {
        const msg = /401|403|unauth|tenant|token/i.test(String(e?.message || ""))
          ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
          : t("jobs.errorLoading", "Failed to load jobs.");
        setErr(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const by = (k) =>
      jobs.filter((j) => (j.status || "Draft").toLowerCase() === k).length;
    return {
      all: jobs.length,
      draft: by("draft"),
      open: by("open"),
      paused: by("paused"),
      closed: by("closed"),
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchesQ =
        !term ||
        [j.title, j.department, j.location, j.employmentType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus =
        statusFilter === "all" ||
        (j.status || "Draft").toLowerCase() === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [jobs, q, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (job) => {
    setEditing(job);
    setModalOpen(true);
  };

  const saveJob = async (payload) => {
    setWorking(true);
    try {
      const isEdit = Boolean(editing?.id);
      const url = isEdit ? `${JOBS_API}/${editing.id}` : JOBS_API;
      const method = isEdit ? "PUT" : "POST";
      await strictFetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
      setEditing(null);
      fetchJobs();
    } catch (e) {
      const msg = /401|403|unauth|tenant|token/i.test(String(e?.message || ""))
        ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
        : t("jobs.errorSaving", "Failed to save job.");
      alert(msg);
    } finally {
      setWorking(false);
    }
  };

  const updateStatus = async (job, newStatus) => {
    setWorking(true);
    try {
      await strictFetch(`${JOBS_API}/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchJobs();
    } catch (e) {
      const msg = /401|403|unauth|tenant|token/i.test(String(e?.message || ""))
        ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
        : t("jobs.errorStatus", "Failed to update status.");
      alert(msg);
    } finally {
      setWorking(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      await strictFetch(`${JOBS_API}/${deleting.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setDeleting(null);
      fetchJobs();
    } catch (e) {
      const msg = /401|403|unauth|tenant|token/i.test(String(e?.message || ""))
        ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
        : t("jobs.errorDeleting", "Failed to delete job.");
      alert(msg);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div dir={dir} className="p-6 mx-auto max-w-6xl">
      {/* Header */}
      <div className={cx("mb-6 flex flex-col gap-4 md:flex-row md:items-center", isRTL ? "md:flex-row-reverse md:justify-start" : "md:justify-between")}>
        <div className={cx("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FiBriefcase size={22} />
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <h1 className="text-2xl font-extrabold">{t("jobs.title", "Job Openings")}</h1>
            <p className="text-sm text-gray-600">{t("jobs.subtitle", "Create and manage your job postings")}</p>
          </div>
        </div>

        {/* Search / filter / create */}
        <div className={cx("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
          <div className="relative">
            <span className={cx("pointer-events-none absolute inset-y-0 flex items-center text-gray-400", isRTL ? "right-3" : "left-3")}>
              <FiSearch />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              dir={isRTL ? "rtl" : "ltr"}
              className={cx(
                "w-72 rounded-lg border border-gray-300 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500",
                isRTL ? "pr-10 pl-3" : "pl-10 pr-3"
              )}
              placeholder={t("jobs.searchPlaceholder", "Search by title, location…")}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t("jobs.filters.all", "All statuses")} ({stats.all})</option>
            <option value="draft">{t("jobs.filters.draft", "Draft")} ({stats.draft})</option>
            <option value="open">{t("jobs.filters.open", "Open")} ({stats.open})</option>
            <option value="paused">{t("jobs.filters.paused", "Paused")} ({stats.paused})</option>
            <option value="closed">{t("jobs.filters.closed", "Closed")} ({stats.closed})</option>
          </select>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-indigo-700"
          >
            <FiPlus /> {t("jobs.new", "New Job")}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>
      )}

      {/* Empty */}
      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-600">
          {q
            ? t("jobs.emptyFiltered", "No jobs match your search.")
            : t("jobs.empty", "No job postings yet. Create your first one.")}
        </div>
      )}

      {/* List */}
      {!loading && !err && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((j) => {
            const status = j.status || "Draft";
            const s = (status || "").toLowerCase();
            const isOpen = s === "open";
            const isClosed = s === "closed";
            return (
              <div key={j.id} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className={cx("flex items-start justify-between", isRTL ? "flex-row-reverse" : "")}>
                  <div className={cx("flex-1", isRTL ? "text-right" : "")}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{j.title || t("jobs.noTitle", "Untitled role")}</h3>
                      <StatusPill status={status} />
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {j.department ? <span className="mr-2 rtl:ml-2">{j.department}</span> : null}
                      {j.location ? <span className="mr-2 rtl:ml-2">• {j.location}</span> : null}
                      {j.employmentType ? <span className="mr-2 rtl:ml-2">• {j.employmentType}</span> : null}
                      {Number(j.openings) > 0 ? <span>• {t("jobs.openings", "Openings")}: {j.openings}</span> : null}
                    </div>
                  </div>
                </div>

                {j.description ? (
                  <p className={cx("mt-3 line-clamp-2 text-sm text-gray-700", isRTL ? "text-right" : "")}>
                    {j.description}
                  </p>
                ) : null}

                <div className={cx("mt-5 flex items-center gap-2", isRTL ? "justify-start flex-row-reverse" : "justify-end")}>
                  {!isClosed && (
                    <>
                      {isOpen ? (
                        <button
                          onClick={() => updateStatus(j, "Paused")}
                          disabled={working}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-50"
                        >
                          <FiPause /> {t("jobs.pause", "Pause")}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(j, "Open")}
                          disabled={working}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
                        >
                          <FiPlay /> {t("jobs.publish", "Publish")}
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(j, "Closed")}
                        disabled={working}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <FiXCircle /> {t("jobs.close", "Close")}
                      </button>
                    </>
                  )}
                  <button onClick={() => openEdit(j)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
                    <FiEdit2 /> {t("jobs.edit", "Edit")}
                  </button>
                  <button onClick={() => setDeleting(j)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                    <FiTrash2 /> {t("jobs.delete", "Delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal kept mounted via portal */}
      <JobModal
        open={modalOpen}
        isRTL={isRTL}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={saveJob}
        saving={working}
        initial={editing}
        t={t}
      />

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleting(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="mt-0.5 text-red-600" />
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-lg font-semibold">
                  {t("jobs.confirmDelete", "Delete this job?")}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{deleting.title || ""}</p>
              </div>
            </div>
            <div className={cx("mt-6 flex items-center gap-3", isRTL ? "justify-start flex-row-reverse" : "justify-end")}>
              <button onClick={() => setDeleting(null)} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                {t("actions.close", "Close")}
              </button>
              <button
                onClick={doDelete}
                disabled={working}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {working ? t("jobs.deleting", "Deleting…") : t("jobs.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------ Modal Component (UNCONTROLLED) ------------------------ */

function JobModal({ open, isRTL, onClose, onSave, saving, initial, t }) {
  // Stable portal root
  const portalEl = useMemo(() => {
    let el = document.getElementById("jobs-modal-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "jobs-modal-portal";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  // When opening CREATE (no initial.id), bump a counter so inputs reset each open
  const [createTick, setCreateTick] = useState(0);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current && !initial?.id) {
      setCreateTick((n) => n + 1);
    }
    prevOpen.current = open;
  }, [open, initial?.id]);

  // Form key: re-mount inputs when switching job OR opening a fresh create
  const formKey = initial?.id ? `edit_${initial.id}` : `create_${createTick}`;

  // Uncontrolled refs
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const departmentRef = useRef(null);
  const locationRef = useRef(null);
  const employmentTypeRef = useRef(null);
  const workModeRef = useRef(null);
  const openingsRef = useRef(null);
  const salaryMinRef = useRef(null);
  const salaryMaxRef = useRef(null);
  const currencyRef = useRef(null);
  const statusRef = useRef(null);
  const descriptionRef = useRef(null);
  const requirementsRef = useRef(null);
  const responsibilitiesRef = useRef(null);

  // Defaults
  const defaults = {
    title: initial?.title || "",
    department: initial?.department || "",
    location: initial?.location || "",
    employmentType: initial?.employmentType || "Full-time",
    workMode: initial?.workMode || "Onsite",
    openings: initial?.openings ?? 1,
    salaryMin: initial?.salaryMin ?? "",
    salaryMax: initial?.salaryMax ?? "",
    currency: initial?.currency || "SAR",
    status: initial?.status || "Draft",
    description: initial?.description || "",
    requirements: initial?.requirements || "",
    responsibilities: initial?.responsibilities || "",
  };

  const [error, setError] = useState(null);

  const validate = () => {
    const title = titleRef.current?.value?.trim() || "";
    const department = departmentRef.current?.value?.trim() || "";
    const min = salaryMinRef.current?.value;
    const max = salaryMaxRef.current?.value;
    if (!title) {
      setError(t("jobs.validation.title", "Job title is required."));
      return false;
    }
    if (!department) {
      setError(t("jobs.validation.department", "Department is required."));
      return false;
    }
    if (min !== "" && max !== "" && Number(min) > Number(max)) {
      setError(t("jobs.validation.salary", "Min salary cannot exceed max salary."));
      return false;
    }
    return true;
  };

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    onSave({
      title: titleRef.current.value,
      department: departmentRef.current.value,
      location: locationRef.current.value,
      employmentType: employmentTypeRef.current.value,
      workMode: workModeRef.current.value,
      openings: Number(openingsRef.current.value || 1),
      salaryMin: salaryMinRef.current.value === "" ? "" : Number(salaryMinRef.current.value),
      salaryMax: salaryMaxRef.current.value === "" ? "" : Number(salaryMaxRef.current.value),
      currency: currencyRef.current.value,
      status: statusRef.current.value,
      description: descriptionRef.current.value,
      requirements: requirementsRef.current.value,
      responsibilities: responsibilitiesRef.current.value,
    });
  };

  // Keep mounted; just hide when closed
  const Hidden = ({ children }) => (
    <div style={{ display: open ? "block" : "none" }}>{children}</div>
  );

  const Section = ({ title, children }) => (
    <div className="space-y-4">
      <h4 className={cx("text-sm font-semibold text-gray-800", isRTL ? "text-right" : "")}>{title}</h4>
      {children}
    </div>
  );
  const Field = ({ label, children, hint }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );

  return createPortal(
    <Hidden>
      <div className="fixed inset-0 z-50">
        {/* overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* sheet (no transforms) */}
        <div
          className={cx(
            "absolute top-0 h-full w-full max-w-3xl bg-white shadow-xl md:rounded-s-2xl",
            isRTL ? "left-0" : "right-0"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur px-5 py-4">
            <div className={cx("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-lg font-semibold">
                  {initial?.id ? t("jobs.editTitle", "Edit Job") : t("jobs.createTitle", "Create Job")}
                </h3>
                <p className="text-xs text-gray-600">
                  {t("jobs.modalSubtitle", "Fill the required fields then save")}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label={t("actions.close", "Close")}>
                <FiX />
              </button>
            </div>
          </div>

          {/* body */}
          <form key={formKey} ref={formRef} onSubmit={submit} className="h-[calc(100%-64px)] overflow-y-auto px-5 py-6">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-8">
              {/* Basics */}
              <Section title={t("jobs.sections.basics", "Basics")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label={t("jobs.fields.department", "Department")}>
                    <input
                      ref={departmentRef}
                      defaultValue={defaults.department}
                      dir={isRTL ? "rtl" : "ltr"}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                      placeholder={t("jobs.placeholders.department", "e.g., Engineering")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                  <Field label={t("jobs.fields.title", "Job title")}>
                    <input
                      ref={titleRef}
                      defaultValue={defaults.title}
                      dir={isRTL ? "rtl" : "ltr"}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                      placeholder={t("jobs.placeholders.title", "e.g., Senior Frontend Engineer")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                  <Field label={t("jobs.fields.employmentType", "Employment type")}>
                    <select
                      ref={employmentTypeRef}
                      defaultValue={defaults.employmentType}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Full-time">{t("filters.type.fullTime", "Full-time")}</option>
                      <option value="Part-time">{t("filters.type.partTime", "Part-time")}</option>
                      <option value="Contract">{t("filters.type.contract", "Contract")}</option>
                      <option value="Intern">{t("filters.type.intern", "Intern")}</option>
                    </select>
                  </Field>
                  <Field label={t("jobs.fields.location", "Location")}>
                    <input
                      ref={locationRef}
                      defaultValue={defaults.location}
                      dir={isRTL ? "rtl" : "ltr"}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                      placeholder={t("jobs.placeholders.location", "e.g., Riyadh, Remote")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                  <Field label={t("jobs.fields.openings", "Openings")}>
                    <input
                      ref={openingsRef}
                      type="text"
                      inputMode="numeric"
                      defaultValue={String(defaults.openings ?? 1)}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    />
                  </Field>
                  <Field label={t("jobs.fields.workMode", "Work mode")}>
                    <select
                      ref={workModeRef}
                      defaultValue={defaults.workMode}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Onsite">{t("jobs.workMode.onsite", "Onsite")}</option>
                      <option value="Remote">{t("jobs.workMode.remote", "Remote")}</option>
                      <option value="Hybrid">{t("jobs.workMode.hybrid", "Hybrid")}</option>
                    </select>
                  </Field>
                </div>
              </Section>

              {/* Compensation / Status */}
              <Section title={t("jobs.sections.compensation", "Compensation & Status")}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Field label={t("jobs.fields.status", "Status")}>
                    <select
                      ref={statusRef}
                      defaultValue={defaults.status}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Draft">{t("jobs.filters.draft", "Draft")}</option>
                      <option value="Open">{t("jobs.filters.open", "Open")}</option>
                      <option value="Paused">{t("jobs.filters.paused", "Paused")}</option>
                      <option value="Closed">{t("jobs.filters.closed", "Closed")}</option>
                    </select>
                  </Field>
                  <Field label={t("jobs.fields.salaryMin", "Min salary")}>
                    <input
                      ref={salaryMinRef}
                      type="text"
                      inputMode="numeric"
                      defaultValue={defaults.salaryMin === "" ? "" : String(defaults.salaryMin)}
                      className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                      placeholder={t("jobs.placeholders.min", "Min")}
                    />
                  </Field>
                  <Field label={t("jobs.fields.salaryMax", "Max salary")}>
                    <div className="flex items-center gap-2">
                      <input
                        ref={salaryMaxRef}
                        type="text"
                        inputMode="numeric"
                        defaultValue={defaults.salaryMax === "" ? "" : String(defaults.salaryMax)}
                        className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                        placeholder={t("jobs.placeholders.max", "Max")}
                      />
                      <select
                        ref={currencyRef}
                        defaultValue={defaults.currency}
                        className="rounded-xl border border-gray-300 py-2.5 px-3 bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="SAR">SAR</option>
                        <option value="USD">USD</option>
                        <option value="AED">AED</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </Field>
                </div>
              </Section>

              {/* Text sections */}
              <Section title={t("jobs.fields.description", "Description")}>
                <textarea
                  ref={descriptionRef}
                  defaultValue={defaults.description}
                  rows={4}
                  dir={isRTL ? "rtl" : "ltr"}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("jobs.placeholders.description", "What will the candidate do?")}
                />
              </Section>

              <Section title={t("jobs.fields.requirements", "Requirements")}>
                <textarea
                  ref={requirementsRef}
                  defaultValue={defaults.requirements}
                  rows={3}
                  dir={isRTL ? "rtl" : "ltr"}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("jobs.placeholders.requirements", "Must-have skills, experience, education…")}
                />
              </Section>

              <Section title={t("jobs.fields.responsibilities", "Responsibilities")}>
                <textarea
                  ref={responsibilitiesRef}
                  defaultValue={defaults.responsibilities}
                  rows={3}
                  dir={isRTL ? "rtl" : "ltr"}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("jobs.placeholders.responsibilities", "Daily tasks, ownership areas…")}
                />
              </Section>

              {/* Footer actions */}
              <div className={cx("sticky bottom-0 bg-white/70 backdrop-blur pt-4 pb-2", isRTL ? "text-left" : "text-right")}>
                <div className={cx("inline-flex gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                    {t("actions.close", "Close")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving && <FiLoader className="animate-spin" />}
                    {initial?.id ? t("jobs.save", "Save changes") : t("jobs.create", "Create job")}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Hidden>,
    portalEl
  );
}
