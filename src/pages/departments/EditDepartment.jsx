// src/pages/departments/EditDepartment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiLayers, FiLoader, FiArrowLeft, FiArrowRight, FiAlertTriangle } from "react-icons/fi";

// CRA/Webpack-friendly env var (set REACT_APP_API_BASE in .env)
const API_BASE =  "https://hr-backend-npbd.onrender.com";

// Build auth + tenant headers for every request
const authHeaders = () => {
  const token = localStorage.getItem("fb_id_token");
  const tenantId = localStorage.getItem("tenant_id");
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

export default function EditDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // original fetched data, used to compute a PATCH-like diff
  const [original, setOriginal] = useState(null);

  const [form, setForm] = useState({
    name: "",
    head: "",
    code: "",
    location: "",
    description: "",
    color: "#4f46e5",
  });

  // Fetch department
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    
    fetch(`${API_BASE}/api/departments/${id}`, { 
      headers: authHeaders() 
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("notfound");
          if (r.status === 401) throw new Error("unauthorized");
          throw new Error("load");
        }
        return r.json();
      })
      .then((d) => {
        if (cancel) return;
        setOriginal(d);
        setForm({
          name: d.name || "",
          head: d.head || "",
          code: d.code || "",
          location: d.location || "",
          description: d.description || "",
          color: d.color || "#4f46e5",
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancel) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [id]);

  // Only send changed fields
  const changed = useMemo(() => {
    if (!original) return {};
    const diff = {};
    for (const [k, v] of Object.entries(form)) {
      if (String(original[k] ?? "") !== String(v ?? "")) diff[k] = v;
    }
    return diff;
  }, [form, original]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({
      ...s,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!form.name.trim()) {
      setMsg({
        type: "error",
        text: t("departments.nameRequired", "Department name is required."),
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/departments/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(changed),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("unauthorized");
        if (res.status === 404) throw new Error("notfound");
        throw new Error(await res.text());
      }
      
      const updated = await res.json();
      setOriginal(updated);
      setMsg({
        type: "success",
        text: t("departments.updated", "Department updated successfully."),
      });
      // Navigate back after a short success flash
      setTimeout(() => navigate("/departments/all"), 1500);
    } catch (err) {
      console.error("Update error:", err);
      setMsg({
        type: "error",
        text: t("departments.errorUpdating", "Failed to update department. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FiLoader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">{t("loading", "Loading department details...")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error === "notfound") {
    return (
      <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <FiAlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("departments.notFound", "Department not found")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("departments.notFoundDescription", "The department you're looking for doesn't exist or you don't have access to it.")}
            </p>
            <Link
              to="/departments/all"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors duration-150"
            >
              <FiArrowLeft className={isRTL ? "rotate-180" : ""} />
              {t("Back", "Back to Departments")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">
                  {t("departments.errorLoading", "Failed to load department")}
                </h3>
                <p className="text-red-700 mt-1">
                  {error === "unauthorized" 
                    ? t("errors.unauthorized", "Please sign in again.")
                    : t("departments.errorLoadingDescription", "There was a problem loading the department details.")
                  }
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/departments/all"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors duration-150"
              >
                <FiArrowLeft className={isRTL ? "rotate-180" : ""} />
                {t("Back", "Back to Departments")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/departments/all"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-150"
            >
              <FiArrowLeft className={isRTL ? "rotate-180" : ""} />
              {t("Back", "Back")}
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <FiLayers className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("departments.editTitle", "Edit Department")}
              </h1>
              <p className="mt-1 text-gray-600">
                {original?.name && (
                  <>
                    {t("departments.editing", "Editing")}: <strong>{original.name}</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-6 rounded-2xl p-4 border ${
              msg.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {msg.type === "success" ? (
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <FiAlertTriangle className="h-5 w-5" />
              )}
              <span className="font-medium">{msg.text}</span>
            </div>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
        >
          {/* Row: Name / Head */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                {t("departments.name", "Department Name")} *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                placeholder={t("departments.namePlaceholder", "e.g., Engineering")}
              />
              <p className="mt-2 text-xs text-gray-500">
                {t("departments.nameHint", "Must be unique.")}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                {t("departments.head", "Department Head")}
              </label>
              <input
                name="head"
                value={form.head}
                onChange={onChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                placeholder={t("departments.headPlaceholder", "e.g., Sara Al-Qahtani")}
              />
              <p className="mt-2 text-xs text-gray-500">
                {t("departments.headHint", "Choose a manager or leave empty for now.")}
              </p>
            </div>
          </div>

          {/* Row: Code / Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                {t("departments.code", "Code")}
              </label>
              <input
                dir="ltr"
                name="code"
                value={form.code}
                onChange={onChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm uppercase tracking-widest focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                placeholder={t("departments.codePlaceholder", "ENG")}
              />
              <p className="mt-2 text-xs text-gray-500">
                {t("departments.codeHint", "Short identifier used in reports.")}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                {t("departments.location", "Location")}
              </label>
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                placeholder={t("departments.locationPlaceholder", "Riyadh HQ")}
              />
              <p className="mt-2 text-xs text-gray-500">
                {t("departments.locationHint", "City, site, or remote.")}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {t("departments.description", "Description")}
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200 resize-none"
              placeholder={t(
                "departments.descriptionPlaceholder",
                "Product engineering, platform, QA…"
              )}
            />
            <p className="mt-2 text-xs text-gray-500">
              {t("departments.descriptionHint", "What does this department own or do?")}
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {t("departments.color", "Department Color")}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                name="color"
                value={form.color || "#4f46e5"}
                onChange={onChange}
                className="h-12 w-12 cursor-pointer rounded-lg border border-gray-200 p-1 shadow-sm"
                aria-label={t("departments.color", "Department color")}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="h-6 w-6 rounded border shadow-sm"
                    style={{ backgroundColor: form.color || "#4f46e5" }} 
                  />
                  <code dir="ltr" className="text-sm font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">
                    {form.color || "#4f46e5"}
                  </code>
                </div>
                <p className="text-xs text-gray-500">
                  {t("departments.colorHint", "Used in charts, badges, and visual elements.")}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            className={`flex items-center gap-3 pt-6 border-t border-gray-100 ${
              isRTL ? "justify-start flex-row-reverse" : "justify-end"
            }`}
          >
            <Link
              to="/departments/all"
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              {t("actions.cancel", "Cancel")}
            </Link>

            <button
              type="submit"
              disabled={saving || Object.keys(changed).length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <FiLoader className="animate-spin" />
                  {t("departments.updating", "Saving Changes...")}
                </>
              ) : (
                <>
                  {t("departments.updateBtn", "Save Changes")}
                  <FiArrowRight className={isRTL ? "rotate-180" : ""} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}