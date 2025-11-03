// src/pages/departments/AllDepartments.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiLayers,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiAlertTriangle,
  FiPlus,
  FiUsers,
  FiMapPin,
  FiCode,
  // FiFilter,
  FiX
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

// CRA/Webpack-friendly env var (set REACT_APP_API_BASE in .env)
const API_BASE =  "https://hr-backend-npbd.onrender.com";

// Build auth + tenant headers for every request
const authHeaders = () => {
  const token = localStorage.getItem("fb_id_token");
  const tenantId = localStorage.getItem("tenant_id");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

const ColorDot = ({ color }) => (
  <span
    className="inline-block h-3 w-3 rounded-full ring-2 ring-white shadow-sm"
    style={{ backgroundColor: color || "#e5e7eb" }}
    aria-hidden
  />
);

const DepartmentCard = ({ department, onEdit, onDelete, isRTL }) => {
  const { t } = useTranslation();
  
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-indigo-100">
      {/* Background accent */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 shadow-sm">
            <FiLayers size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {department.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {department.code && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                  <FiCode size={12} />
                  {department.code}
                </span>
              )}
              {department.color && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                  <ColorDot color={department.color} />
                  <span className="font-mono text-xs">{department.color}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Department Details */}
      <div className="space-y-3">
        {department.head && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiUsers className="text-gray-400" size={16} />
            <span className="font-medium">{t("allDepartmentsTable.head", "Department Head")}:</span>
            <span className="text-gray-900">{department.head}</span>
          </div>
        )}

        {department.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiMapPin className="text-gray-400" size={16} />
            <span className="text-gray-900">{department.location}</span>
          </div>
        )}

        {department.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {department.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            Active
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(department.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors duration-150"
          >
            <FiEdit2 size={14} />
            {t("departments.edit", "Edit")}
          </button>
          <button
            onClick={() => onDelete(department)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
          >
            <FiTrash2 size={14} />
            {t("departments.delete", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gray-200" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ hasSearch, onClearSearch, isRTL }) => {
  const { t } = useTranslation();
  
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <FiLayers className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {hasSearch
          ? t("departments.list.emptyFiltered", "No departments match your search.")
          : t("departments.list.empty", "No departments yet.")}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasSearch
          ? "Try adjusting your search terms or filters to find what you're looking for."
          : "Get started by creating your first department to organize your team structure."}
      </p>
      {hasSearch ? (
        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors duration-150"
        >
          <FiX size={16} />
          Clear Search
        </button>
      ) : (
        <Link
          to="/departments/create"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors duration-150"
        >
          <FiPlus size={16} />
          {t("departments.addButton", "Add Department")}
        </Link>
      )}
    </div>
  );
};

export default function AllDepartments() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fb_id_token");
    if (!token) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/departments`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error(t("errors.unauthorized", "Please sign in again."));
          if (res.status === 403) throw new Error(t("errors.forbidden", "You don't have access to this tenant."));
          throw new Error(t("departments.errorLoading", "Failed to load departments."));
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDepartments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || t("departments.errorLoading", "Failed to load departments."));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const filteredDepartments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter((dept) => {
      const searchableText = [dept.name, dept.head, dept.location, dept.code, dept.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(term);
    });
  }, [searchTerm, departments]);

  const handleDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      const res = await fetch(`${API_BASE}/api/departments/${deleting.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error(t("errors.unauthorized", "Please sign in again."));
        if (res.status === 403) throw new Error(t("errors.forbidden", "You don't have access to this tenant."));
        throw new Error(t("departments.errorDeleting", "Failed to delete department."));
      }
      setDepartments((prev) => prev.filter((d) => d.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      alert(e.message || t("departments.errorDeleting", "Failed to delete department."));
    } finally {
      setWorking(false);
    }
  };

  const clearSearch = () => setSearchTerm("");

  return (
    <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                <FiLayers className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("allDepartments", "All Departments")}
                </h1>
                <p className="mt-1 text-gray-600">
                  {t("departments.list.subtitle", "Manage all company departments")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 lg:flex-none">
                <div className={`pointer-events-none absolute inset-y-0 ${
                  isRTL ? "right-3" : "left-3"
                } flex items-center text-gray-400`}>
                  <FiSearch size={18} />
                </div>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 bg-white py-3 ${
                    isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                  } text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200`}
                  placeholder={t("departments.list.searchPlaceholder", "Search departments…")}
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className={`absolute inset-y-0 ${
                      isRTL ? "left-3" : "right-3"
                    } flex items-center text-gray-400 hover:text-gray-600`}
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>

              <Link
                to="/departments/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-purple-700"
              >
                <FiPlus size={18} />
                {t("departments.addButton", "Add Department")}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && !error && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">
                {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'}
                {searchTerm && ` found`}
              </span>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200 transition-colors duration-150"
                >
                  Clear
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">Unable to load departments</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="relative">
          {loading && <LoadingSkeleton />}
          
          {!loading && !error && filteredDepartments.length === 0 && (
            <EmptyState 
              hasSearch={!!searchTerm} 
              onClearSearch={clearSearch}
              isRTL={isRTL}
            />
          )}

          {!loading && !error && filteredDepartments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDepartments.map((department) => (
                <DepartmentCard
                  key={department.id}
                  department={department}
                  onEdit={(id) => navigate(`/departments/edit/${id}`)}
                  onDelete={setDeleting}
                  isRTL={isRTL}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => !working && setDeleting(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transform transition-all duration-200 scale-100">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <FiAlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("departments.confirmDelete", "Delete this department?")}
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>"{deleting.name}"</strong>? This action cannot be undone and will remove all associated data.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleting(null)}
                disabled={working}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50"
              >
                {t("actions.close", "Close")}
              </button>
              <button
                onClick={handleDelete}
                disabled={working}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors duration-150 disabled:opacity-50 flex items-center gap-2"
              >
                {working ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("departments.deleting", "Deleting…")}
                  </>
                ) : (
                  t("departments.delete", "Delete")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}