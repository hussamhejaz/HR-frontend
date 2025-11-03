// src/pages/public/ApplyJob.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiLoader } from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002";
// ✅ Public endpoints (no auth, no tenant headers)
const PUBLIC_JOBS_API = `${API_BASE}/public/recruitment/jobs`;

const cx = (...c) => c.filter(Boolean).join(" ");

function splitName(full = "") {
  const s = full.trim().replace(/\s+/g, " ");
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop();
  return { firstName: parts.join(" "), lastName };
}

export default function ApplyJob() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cvLink: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  // Load job (public)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingJob(true);
      setErr(null);
      try {
        const r = await fetch(`${PUBLIC_JOBS_API}/${encodeURIComponent(jobId)}`, {
          headers: { Accept: "application/json" },
        });
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
        const data = txt ? JSON.parse(txt) : null;
        if (!cancelled) setJob(data);
      } catch (e) {
        if (!cancelled) setErr(t("apply.errorLoading", "We couldn’t load this job."));
        // optional: console.error(e);
      } finally {
        if (!cancelled) setLoadingJob(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [jobId, t]);

  const update = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const validEmail = useMemo(
    () => !form.email || /^\S+@\S+\.\S+$/.test(form.email),
    [form.email]
  );

  const canSubmit = form.name.trim() && validEmail && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErr(null);
    try {
      const { firstName, lastName } = splitName(form.name);
      const payload = {
        firstName,
        lastName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        resumeUrl: form.cvLink.trim(),
        coverLetter: form.notes.trim(),
      };

      const r = await fetch(
        `${PUBLIC_JOBS_API}/${encodeURIComponent(jobId)}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
      // const data = txt ? JSON.parse(txt) : null; // not needed for now
      setDone(true);
    } catch (e) {
      setErr(
        t("apply.errorSubmitting", "Something went wrong. Please try again.")
      );
      // optional: console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <FiArrowLeft /> {t("apply.backToCareers", "Back to careers")}
          </Link>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Job summary */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {loadingJob ? (
            <div className="h-16 animate-pulse" />
          ) : err ? (
            <div className="text-red-600">{err}</div>
          ) : job ? (
            <>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {(job.department || "") +
                  (job.location ? ` • ${job.location}` : "") +
                  (job.employmentType ? ` • ${job.employmentType}` : "")}
              </p>
              {job.description && (
                <p className="text-sm text-gray-700 mt-3">{job.description}</p>
              )}
            </>
          ) : (
            <div className="text-gray-600">
              {t("apply.jobNotFound", "This job is no longer available.")}
            </div>
          )}
        </div>

        {/* Thank-you state */}
        {done ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h2 className="text-xl font-semibold text-green-800">
              {t("apply.thanksTitle", "Thanks for applying!")}
            </h2>
            <p className="mt-2 text-green-800">
              {t(
                "apply.thanksBody",
                "We’ve received your application. Our team will review it and get back to you soon."
              )}
            </p>
            <div className="mt-6">
              <Link
                to="/careers"
                className="rounded-lg border px-4 py-2 hover:bg-white"
              >
                {t("apply.backToJobs", "Back to all jobs")}
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6"
          >
            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label={t("apply.fields.name", "Full name")} isRTL={isRTL}>
                <input
                  value={form.name}
                  onChange={update("name")}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder={t(
                    "apply.placeholders.name",
                    "e.g., Dana Al-Salem"
                  )}
                  autoComplete="off"
                  spellCheck={false}
                  dir={isRTL ? "rtl" : "ltr"}
                  required
                />
              </Field>
              <Field label={t("apply.fields.email", "Email")} isRTL={isRTL}>
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  className={cx(
                    "w-full rounded-xl border py-2.5 px-3 focus:ring-2 focus:ring-indigo-500",
                    validEmail ? "border-gray-300" : "border-red-300"
                  )}
                  placeholder="name@example.com"
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  required
                />
              </Field>
              <Field label={t("apply.fields.phone", "Phone")} isRTL={isRTL}>
                <input
                  value={form.phone}
                  onChange={update("phone")}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder="+966 5x xxx xxxx"
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                />
              </Field>
              <Field label={t("apply.fields.cvLink", "CV link (URL)")} isRTL={isRTL}>
                <input
                  value={form.cvLink}
                  onChange={update("cvLink")}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://drive.google.com/…"
                  autoComplete="off"
                  dir="ltr"
                />
              </Field>
            </div>

            <Field label={t("apply.fields.notes", "Notes")} isRTL={isRTL}>
              <textarea
                value={form.notes}
                onChange={update("notes")}
                rows={4}
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                placeholder={t(
                  "apply.placeholders.notes",
                  "Anything you’d like us to know"
                )}
              />
            </Field>

            <div className={cx("pt-2", isRTL ? "text-left" : "text-right")}>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting && <FiLoader className="animate-spin" />}
                {t("apply.submit", "Submit application")}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, children, isRTL }) {
  return (
    <div>
      <label
        className={cx(
          "mb-1 block text-sm font-medium text-gray-800",
          isRTL ? "text-right" : ""
        )}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
