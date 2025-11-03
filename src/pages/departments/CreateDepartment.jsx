// src/pages/departments/CreateDepartment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FiLayers,
  FiUser,
  FiType,
  FiMapPin,
  FiTag,
  FiDroplet,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
} from "react-icons/fi";

// Prefer env var, fallback to local
const API_BASE ="https://hr-backend-npbd.onrender.com";

/* ---------- Small presentational components (top-level, stable) ---------- */
function Label({ children, icon, rtl = false }) {
  return (
    <label className={`block mb-1.5 font-medium text-gray-800 ${rtl ? "text-right" : ""}`}>
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
    </label>
  );
}

function Hint({ children, rtl = false }) {
  return <p className={`mt-1 text-xs text-gray-500 ${rtl ? "text-right" : ""}`}>{children}</p>;
}

function Card({ children }) {
  return <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">{children}</div>;
}
/* ----------------------------------------------------------------------- */

// helper to include auth + tenant headers on every request
const authHeaders = () => {
  const token = localStorage.getItem("fb_id_token");
  const tenantId = localStorage.getItem("tenant_id"); // e.g., "test"
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

export default function CreateDepartment() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    head: "",
    code: "",
    location: "",
    description: "",
    color: "#4f46e5",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // optional route guard: if not logged in (no token), go to login
  useEffect(() => {
    const token = localStorage.getItem("fb_id_token");
    if (!token) navigate("/login");
  }, [navigate]);

  // generic setter with optional transform
  const setField =
    (key, transform) =>
    (e) => {
      const raw = e.target.value;
      setForm((s) => ({ ...s, [key]: transform ? transform(raw) : raw }));
    };

  const codeSuggestion = useMemo(() => {
    if (!form.name) return "";
    return form.name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || "")
      .join("")
      .slice(0, 4)
      .toUpperCase();
  }, [form.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/departments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 401) throw new Error(t("errors.unauthorized", "Please sign in again."));
        if (res.status === 403) throw new Error(t("errors.forbidden", "You don't have access to this tenant."));
        if (res.status === 400) throw new Error(t("errors.badRequest", "Invalid data."));
        if (res.status === 409) throw new Error(t("departments.duplicate", "Department name already exists."));
        throw new Error(txt || t("departments.errorCreating", "Failed to create department."));
      }

      navigate("/departments/all");
    } catch (err) {
      console.error(err);
      setError(err.message || t("departments.errorCreating", "Failed to create department."));
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for icon placement
  const iconSide = isRTL ? "right-3" : "left-3";
  const padWithIcon = isRTL ? "pr-10" : "pl-10";

  return (
    <div dir={dir} className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className={`mb-6 ${isRTL ? "text-right" : "text-left"}`}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600">
          <FiLayers size={26} />
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-gray-900">{t("departments.createTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("departments.createSubtitle")}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <Label icon={<FiType className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.name")}
              </Label>
              <div className="relative">
                <span className={`pointer-events-none absolute inset-y-0 ${iconSide} flex items-center text-gray-400`}>
                  <FiType />
                </span>
                <input
                  value={form.name}
                  onChange={setField("name")}
                  required
                  className={`w-full rounded-xl border border-gray-300 ${padWithIcon} py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder={t("departments.namePlaceholder")}
                />
              </div>
              <Hint rtl={isRTL}>{t("departments.nameHint")}</Hint>
            </div>

            {/* Head */}
            <div>
              <Label icon={<FiUser className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.head")}
              </Label>
              <div className="relative">
                <span className={`pointer-events-none absolute inset-y-0 ${iconSide} flex items-center text-gray-400`}>
                  <FiUser />
                </span>
                <input
                  value={form.head}
                  onChange={setField("head")}
                  className={`w-full rounded-xl border border-gray-300 ${padWithIcon} py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder={t("departments.headPlaceholder")}
                />
              </div>
              <Hint rtl={isRTL}>{t("departments.headHint")}</Hint>
            </div>

            {/* Code */}
            <div>
              <Label icon={<FiTag className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.code")}
              </Label>
              <div className="relative">
                <span className={`pointer-events-none absolute inset-y-0 ${iconSide} flex items-center text-gray-400`}>
                  <FiTag />
                </span>
                <input
                  value={form.code}
                  onChange={setField("code", (v) => v.toUpperCase())}
                  maxLength={6}
                  className={`w-full rounded-xl border border-gray-300 ${padWithIcon} py-2.5 px-3 uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder={t("departments.codePlaceholder")}
                />
              </div>
              <Hint rtl={isRTL}>
                {t("departments.codeHint")}{" "}
                {codeSuggestion && (
                  <span className="text-indigo-600">
                    {t("departments.codeSuggested")}
                    {codeSuggestion}
                  </span>
                )}
              </Hint>
            </div>

            {/* Location */}
            <div>
              <Label icon={<FiMapPin className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.location")}
              </Label>
              <div className="relative">
                <span className={`pointer-events-none absolute inset-y-0 ${iconSide} flex items-center text-gray-400`}>
                  <FiMapPin />
                </span>
                <input
                  value={form.location}
                  onChange={setField("location")}
                  className={`w-full rounded-xl border border-gray-300 ${padWithIcon} py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder={t("departments.locationPlaceholder")}
                />
              </div>
              <Hint rtl={isRTL}>{t("departments.locationHint")}</Hint>
            </div>

            {/* Description (full width) */}
            <div className="md:col-span-2">
              <Label icon={<FiType className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.description")}
              </Label>
              <textarea
                value={form.description}
                onChange={setField("description")}
                rows={4}
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("departments.descriptionPlaceholder")}
              />
              <Hint rtl={isRTL}>{t("departments.descriptionHint")}</Hint>
            </div>

            {/* Color */}
            <div className="md:col-span-2">
              <Label icon={<FiDroplet className="text-indigo-500" />} rtl={isRTL}>
                {t("departments.color")}
              </Label>
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <input
                  type="color"
                  value={form.color}
                  onChange={setField("color")}
                  className="h-10 w-14 cursor-pointer rounded-md border border-gray-300"
                  aria-label={t("departments.color")}
                />
                <input
                  value={form.color}
                  onChange={setField("color")}
                  className="w-40 rounded-xl border border-gray-300 py-2.5 px-3 font-mono"
                />
              </div>
              <Hint rtl={isRTL}>{t("departments.colorHint")}</Hint>
            </div>
          </div>

          {/* Actions */}
          <div
            className={`mt-8 flex items-center gap-3 ${
              isRTL ? "justify-start flex-row-reverse" : "justify-end"
            }`}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              {isRTL ? <FiChevronRight /> : <FiChevronLeft />}
              {t("Back")}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <FiCheck />
              {submitting ? t("departments.submitting") : t("departments.createBtn")}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
