// src/pages/employees/AllEmployees.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

const API_BASE =
  "https://hr-backend-npbd.onrender.com";

const PAGE_SIZE = 8;

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

const Badge = ({ children, color = "gray" }) => {
  const map = {
    green: "bg-green-100 text-green-700 ring-green-200",
    yellow: "bg-yellow-100 text-yellow-700 ring-yellow-200",
    red: "bg-red-100 text-red-700 ring-red-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${map[color] || map.gray}`}
    >
      {children}
    </span>
  );
};

const AllEmployees = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [etype, setEtype] = useState("all");
  const [page, setPage] = useState(1);

  // Quick view
  const [quickOpen, setQuickOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState(null);

  // Helpers
  const statusColor = (s) => {
    if (!s) return "gray";
    const x = s.toLowerCase();
    if (x.includes("active")) return "green";
    if (x.includes("probation")) return "yellow";
    if (x.includes("terminated") || x.includes("inactive")) return "red";
    return "blue";
  };

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

  // Fetch with auth + tenant headers
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    strictFetch(`${API_BASE}/api/employees`)
      .then((data) => {
        if (cancelled) return;
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = /401|403|unauth|tenant/i.test(String(e?.message || ""))
          ? t(
              "errors.authOrTenant",
              "You must be signed in and a tenant must be selected."
            )
          : t("errors.loadEmployees", "Failed to load employees.");
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  // Filter + paginate
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (status !== "all" && (e.status || "").toLowerCase() !== status)
        return false;
      if (etype !== "all" && (e.employeeType || "").toLowerCase() !== etype)
        return false;
      if (!term) return true;
      const name = `${e.firstName || ""} ${e.lastName || ""} ${e.name || ""}`.toLowerCase();
      return (
        name.includes(term) ||
        (e.email || "").toLowerCase().includes(term) ||
        (e.role || "").toLowerCase().includes(term) ||
        (e.department || "").toLowerCase().includes(term)
      );
    });
  }, [employees, q, status, etype]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [q, status, etype]);

  if (error)
    return (
      <div dir={dir} className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );

  return (
    <div dir={dir} className="p-6">
      {/* Header & filters */}
      <div
        className={`mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
          isRTL ? "text-right" : ""
        }`}
      >
        <h1 className="text-2xl font-bold">{t("allEmployees")}</h1>
        <div
          className={`flex flex-col md:flex-row gap-3 md:items-center ${
            isRTL ? "md:flex-row-reverse" : ""
          }`}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="w-full md:w-64 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t("filters.status.all")}</option>
            <option value="active">{t("filters.status.active")}</option>
            <option value="probation">{t("filters.status.probation")}</option>
            <option value="terminated">{t("filters.status.terminated")}</option>
            <option value="inactive">{t("filters.status.inactive")}</option>
          </select>

          <select
            value={etype}
            onChange={(e) => setEtype(e.target.value)}
            className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t("filters.type.all")}</option>
            <option value="full-time">{t("filters.type.fullTime")}</option>
            <option value="part-time">{t("filters.type.partTime")}</option>
            <option value="contract">{t("filters.type.contract")}</option>
            <option value="intern">{t("filters.type.intern")}</option>
          </select>

          <Link
            to="/employees/add"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            {t("actions.addEmployee")}
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
        <table className="min-w-full">
          <thead
            className={`bg-gray-50 text-sm font-semibold text-gray-700 ${
              isRTL ? "text-right" : "text-left"
            }`}
          >
            <tr>
              <th className="px-4 py-3">{t("table.employee")}</th>
              <th className="px-4 py-3">{t("table.department")}</th>
              <th className="px-4 py-3">{t("table.type")}</th>
              <th className="px-4 py-3">{t("table.status")}</th>
              <th className={`px-4 py-3 ${isRTL ? "text-left" : "text-right"}`}>
                {t("table.actions")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  </td>
                  <td
                    className={`px-4 py-4 ${
                      isRTL ? "text-left" : "text-right"
                    }`}
                  >
                    <div className="h-8 w-24 bg-gray-200 rounded" />
                  </td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={`px-4 py-10 text-gray-500 ${
                    isRTL ? "text-right" : "text-center"
                  }`}
                >
                  {q || status !== "all" || etype !== "all"
                    ? t("messages.noMatches")
                    : t("messages.noEmployees")}
                </td>
              </tr>
            ) : (
              pageData.map((emp) => {
                const fullName =
                  `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                  emp.name ||
                  "-";
                const initial = (fullName || "E").trim().charAt(0).toUpperCase();

                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    {/* Employee */}
                    <td className="px-4 py-4">
                      <div
                        className={`flex items-center gap-3 ${
                          isRTL ? "flex-row-reverse text-right" : ""
                        }`}
                      >
                        {/* Avatar */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold shrink-0">
                          {initial}
                        </div>

                        {/* Content */}
                        <div
                          className={`${
                            isRTL ? "text-right" : "text-left"
                          } leading-5`}
                        >
                          <div className="font-medium text-gray-900">
                            {fullName}
                          </div>

                          {/* Email (LTR island) */}
                          <div className="text-sm text-gray-500">
                            <span
                              dir="ltr"
                              className="inline-block max-w-[220px] truncate"
                            >
                              {emp.email || t("n/a")}
                            </span>
                          </div>

                          {/* Role · Department (tiny) */}
                          <div className="text-xs text-gray-400">
                            {[emp.role, emp.department]
                              .filter(Boolean)
                              .join(" · ") || t("n/a")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-4">{emp.department || t("n/a")}</td>

                    {/* Type */}
                    <td className="px-4 py-4">{trType(emp.employeeType)}</td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <Badge color={statusColor(emp.status)}>
                        {trStatus(emp.status)}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className={`px-4 py-4 ${
                        isRTL ? "text-left" : "text-right"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 ${
                          isRTL ? "justify-start flex-row-reverse" : "justify-end"
                        }`}
                      >
                        <button
                          onClick={() =>
                            navigate(`/employees/profiles/${emp.id}`)
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                        >
                          {t("actions.view")}
                        </button>
                        <button
                          onClick={() => {
                            setCurrentEmp(emp);
                            setQuickOpen(true);
                          }}
                          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          {t("actions.quickView")}
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

      {/* Pagination */}
      <div
        className={`mt-4 flex items-center justify-between ${
          isRTL ? "text-right" : ""
        }`}
      >
        <p className="text-sm text-gray-600">
          {filtered.length} {t("actions.results")}
        </p>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {t("actions.prev")}
          </button>
          <span className="text-sm text-gray-700">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {t("actions.next")}
          </button>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickOpen && currentEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setQuickOpen(false)}
          />
          <div dir={dir} className="relative z-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div
              className={`mb-4 flex items-start justify-between ${
                isRTL ? "text-right" : ""
              }`}
            >
              <div>
                <h3 className="text-xl font-semibold">
                  {(currentEmp.firstName || currentEmp.name) +
                    " " +
                    (currentEmp.lastName || "")}
                </h3>
                <p className="text-sm text-gray-500">
                  {(currentEmp.role || t("n/a"))} ·{" "}
                  {(currentEmp.department || t("n/a"))}
                </p>
              </div>
              <button
                onClick={() => setQuickOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200"
              >
                {t("actions.close")}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">{t("quick.job")}</h4>
                <div className="text-sm text-gray-700">
                  {t("quick.type")}:{" "}
                  <span className="font-medium">
                    {trType(currentEmp.employeeType)}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {t("quick.status")}:{" "}
                  <Badge color={statusColor(currentEmp.status)}>
                    {trStatus(currentEmp.status)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-700">
                  {t("quick.start")}:{" "}
                  <span className="font-medium">
                    {currentEmp.startDate || t("n/a")}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {t("quick.end")}:{" "}
                  <span className="font-medium">
                    {currentEmp.endDate || t("n/a")}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">{t("quick.contact")}</h4>
                <div className="text-sm text-gray-700">
                  {t("quick.email")}:{" "}
                  <span dir="ltr" className="font-medium inline-block">
                    {currentEmp.email || t("n/a")}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {t("quick.phone")}:{" "}
                  <span className="font-medium">
                    {currentEmp.phone || t("n/a")}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {t("quick.nationality")}:{" "}
                  <span className="font-medium">
                    {currentEmp.nationality || t("n/a")}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  IBAN:{" "}
                  <span dir="ltr" className="font-medium inline-block">
                    {currentEmp.iban || t("n/a")}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`mt-6 flex items-center gap-3 ${
                isRTL ? "justify-start flex-row-reverse" : "justify-end"
              }`}
            >
              <Link
                to={`/employees/profiles/${currentEmp.id}`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                {t("actions.viewFullProfile")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEmployees;
