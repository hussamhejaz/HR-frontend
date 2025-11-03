// src/pages/public/Careers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiBriefcase, FiSearch, FiMapPin, FiClock } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002";
const JOBS_API = `${API_BASE}/public/recruitment/jobs`;

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Careers() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const location = useLocation();
  const showAll = new URLSearchParams(location.search).get("all") === "1";

  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch(JOBS_API);
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) || [];
        const normalized = data.map((j) => ({
          ...j,
          _status: String(j.status || "").trim().toLowerCase(),
          _title: (j.title || "").trim(),
          _department: (j.department || "").trim(),
          _location: (j.location || "").trim(),
          _employmentType: (j.employmentType || "").trim(),
        }));
        setJobs(normalized);
      } catch (e) {
        console.error(e);
        setErr(t("careers.errorLoading", "Failed to load jobs."));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [t]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = showAll ? jobs : jobs.filter((j) => j._status === "open");
    if (!term) return base;
    return base.filter((j) =>
      [j._title, j._department, j._location, j._employmentType]
        .filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [jobs, q, showAll]);

  return (
    <div dir={dir} className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 grid place-items-center">
            <FiBriefcase />
          </div>
          <div className={isRTL ? "text-right" : ""}>
            <h1 className="text-2xl font-extrabold">{t("careers.title", "Careers")}</h1>
            <p className="text-sm text-gray-600">{t("careers.subtitle", "Find your next role and apply in minutes")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className={cx("mb-6 flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
          <div className="relative w-full max-w-md">
            <span className={cx("pointer-events-none absolute inset-y-0 flex items-center text-gray-400", isRTL ? "right-3" : "left-3")}>
              <FiSearch />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              dir={isRTL ? "rtl" : "ltr"}
              className={cx("w-full rounded-lg border border-gray-300 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500", isRTL ? "pr-10 pl-3" : "pl-10 pr-3")}
              placeholder={t("careers.searchPlaceholder", "Search titles, locations…")}
            />
          </div>
          {showAll && (
            <span className="ml-3 text-xs text-gray-500">{t("careers.showingAll", "Showing all statuses (debug)")}</span>
          )}
        </div>

        {loading && (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        )}
        {!loading && err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>
        )}
        {!loading && !err && list.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-600">
            {q ? t("careers.emptyFiltered", "No job matches your search.") : t("careers.empty", "No open roles right now. Check back soon!")}
          </div>
        )}

        {!loading && !err && list.length > 0 && (
          <div className="grid gap-4">
            {list.map((j) => (
              <div key={j.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className={cx("flex items-start justify-between", isRTL ? "flex-row-reverse" : "")}>
                  <div className={isRTL ? "text-right" : ""}>
                    <h3 className="text-lg font-semibold text-gray-900">{j._title || j.title}</h3>
                    <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-3">
                      {j._department && <span>{j._department}</span>}
                      {j._location && <span className="inline-flex items-center gap-1"><FiMapPin className="opacity-60" /> {j._location}</span>}
                      {j._employmentType && <span className="inline-flex items-center gap-1"><FiClock className="opacity-60" /> {j._employmentType}</span>}
                    </div>
                    {j.description && <p className="mt-3 text-sm text-gray-700 line-clamp-2">{j.description}</p>}
                  </div>
                  <Link to={`/apply/${j.id}`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
                    {t("careers.apply", "Apply")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
