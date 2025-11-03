// src/pages/offboarding/Offboarding.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiLogOut,
  FiTrash2,
  FiBriefcase,
  FiCreditCard,
  FiUser,
  FiCalendar,
  FiClipboard,
  FiCheckCircle,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

const API_BASE =  "https://hr-backend-npbd.onrender.com";

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
/* ------------------------------------------------------------------- */

const toYMD = (d) => {
  if (!d) return "";
  try {
    // if already in YYYY-MM-DD pass through
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${m}-${day}`;
  } catch {
    return "";
  }
};

const Offboarding = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // form state
  const [empId, setEmpId] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [reason, setReason] = useState("End of contract");
  const [handoverTo, setHandoverTo] = useState("");
  const [noticeServed, setNoticeServed] = useState(true);
  const [notes, setNotes] = useState("");

  const [checklist, setChecklist] = useState({
    assetsReturned: false,
    emailDisabled: false,
    payrollCleared: false,
    accessRevoked: false,
    exitInterviewDone: false,
  });

  // load employees (tenant + bearer required)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMsg(null);

    fetch(`${API_BASE}/api/employees`, {
      headers: { ...getAuthHeaders() },
    })
      .then(async (r) => {
        const raw = await r.text();
        let data = [];
        try { data = JSON.parse(raw); } catch {}
        if (!r.ok) {
          const serverMsg = (data && (data.error || data.message)) || raw || `HTTP ${r.status}`;
          throw new Error(serverMsg);
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const authish = /401|403|unauth|tenant|token/i.test(String(e?.message || ""));
        setMsg({
          type: "error",
          text: authish
            ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
            : (e?.message || t("offboarding.messages.error")),
        });
        setEmployees([]);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [t]);

  const selectedEmp = useMemo(
    () => employees.find((e) => e.id === empId) || null,
    [empId, employees]
  );

  const setCl = (key) => (e) =>
    setChecklist((c) => ({ ...c, [key]: e.target.checked }));

  // validation: at least one checklist item + employee + date; also lastDay >= startDate (if present)
  const lastDayBeforeStart =
    !!(selectedEmp?.startDate && lastDay) && new Date(lastDay) < new Date(selectedEmp.startDate || "");

  const canSubmit =
    !!empId &&
    !!lastDay &&
    !lastDayBeforeStart &&
    (checklist.assetsReturned ||
      checklist.emailDisabled ||
      checklist.payrollCleared ||
      checklist.accessRevoked ||
      checklist.exitInterviewDone);

  const resetForm = () => {
    setEmpId("");
    setLastDay("");
    setReason("End of contract");
    setHandoverTo("");
    setNoticeServed(true);
    setNotes("");
    setChecklist({
      assetsReturned: false,
      emailDisabled: false,
      payrollCleared: false,
      accessRevoked: false,
      exitInterviewDone: false,
    });
    setMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!canSubmit) {
      if (!empId)
        return setMsg({ type: "error", text: t("offboarding.messages.validation.employeeRequired") });
      if (!lastDay)
        return setMsg({ type: "error", text: t("offboarding.messages.validation.lastDayRequired") });
      if (lastDayBeforeStart)
        return setMsg({ type: "error", text: t("offboarding.messages.validation.lastDayBeforeStart") });
      return;
    }

    setSubmitLoading(true);

    try {
      const payload = {
        employeeId: empId,
        reason,
        lastDay: toYMD(lastDay),
        handoverTo,
        noticeServed,
        checklist,
        notes,
        updateEmployee: true, // backend will set status/endDate
      };

      const res = await fetch(`${API_BASE}/api/offboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!res.ok) {
        const serverMsg = (json && (json.error || json.message)) || text || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      setMsg({ type: "success", text: t("offboarding.messages.success") });
      resetForm();
    } catch (err) {
      console.error(err);
      const authish = /401|403|unauth|tenant|token/i.test(String(err?.message || ""));
      setMsg({
        type: "error",
        text: authish
          ? t("errors.authOrTenant", "You must be signed in and a tenant must be selected.")
          : (err.message || t("offboarding.messages.error")),
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const steps = [
    {
      title: t("offboarding.flow.step1.title"),
      description: t("offboarding.flow.step1.description"),
      icon: <FiLogOut className="text-white w-6 h-6" />,
      bg: "bg-red-500",
    },
    {
      title: t("offboarding.flow.step2.title"),
      description: t("offboarding.flow.step2.description"),
      icon: <FiTrash2 className="text-white w-6 h-6" />,
      bg: "bg-yellow-600",
    },
    {
      title: t("offboarding.flow.step3.title"),
      description: t("offboarding.flow.step3.description"),
      icon: <FiBriefcase className="text-white w-6 h-6" />,
      bg: "bg-indigo-500",
    },
    {
      title: t("offboarding.flow.step4.title"),
      description: t("offboarding.flow.step4.description"),
      icon: <FiCreditCard className="text-white w-6 h-6" />,
      bg: "bg-green-600",
    },
  ];

  return (
    <div dir={dir} className="p-8 max-w-5xl mx-auto">
      {/* Page title */}
      <h1 className={`text-3xl font-extrabold text-gray-800 mb-8 ${isRTL ? "text-right" : ""}`}>
        {t("offboarding.title")}
      </h1>

      {/* Timeline cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center bg-white shadow rounded-lg overflow-hidden">
            <div className={`flex-shrink-0 p-4 ${step.bg}`}>{step.icon}</div>
            <div className="p-4 flex-1">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {idx + 1}. {step.title}
              </h2>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white shadow rounded-xl border border-gray-100">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <FiClipboard className="text-gray-500" />
          <h2 className="text-lg font-semibold">{t("offboarding.form.cardTitle")}</h2>
        </div>

        {msg && (
          <div
            className={`mx-6 mt-4 rounded-lg p-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Employee & dates */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FiUser /> {t("offboarding.form.employee")}
              </label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                required
                disabled={loading}
              >
                <option value="">
                  {loading ? t("loading") + "…" : t("offboarding.form.selectEmployee")}
                </option>
                {!loading &&
                  employees.map((e) => {
                    const name =
                      `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || "—";
                    return (
                      <option key={e.id} value={e.id}>
                        {name} {e.role ? `· ${e.role}` : ""}
                      </option>
                    );
                  })}
              </select>
              <p className="text-xs text-gray-500">{t("offboarding.form.chooseEmployee")}</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FiCalendar /> {t("offboarding.form.lastDay")}
              </label>
              <input
                type="date"
                value={lastDay}
                onChange={(e) => setLastDay(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                required
                min={selectedEmp?.startDate || undefined}
              />
              <p className="text-xs text-gray-500">{t("offboarding.form.lastDayHint")}</p>
              {lastDayBeforeStart && (
                <p className="text-xs text-red-600">
                  {t("offboarding.messages.validation.lastDayBeforeStart")}
                </p>
              )}
            </div>
          </div>

          {/* Reason / notice / handover */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? "text-right" : ""}`}>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("offboarding.form.reason")}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option>{t("offboarding.form.reasons.endOfContract")}</option>
                <option>{t("offboarding.form.reasons.resignation")}</option>
                <option>{t("offboarding.form.reasons.termination")}</option>
                <option>{t("offboarding.form.reasons.retirement")}</option>
                <option>{t("offboarding.form.reasons.other")}</option>
              </select>
              <p className="text-xs text-gray-500">{t("offboarding.form.reasonHint")}</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t("offboarding.form.noticeServed")}
              </label>
              <select
                value={noticeServed ? "yes" : "no"}
                onChange={(e) => setNoticeServed(e.target.value === "yes")}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="yes">{t("offboarding.form.yes")}</option>
                <option value="no">{t("offboarding.form.no")}</option>
              </select>
              <p className="text-xs text-gray-500">{t("offboarding.form.noticeHint")}</p>
            </div>
          </div>

          {/* Handover */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? "text-right" : ""}`}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t("offboarding.form.handoverTo")}
              </label>
              <input
                value={handoverTo}
                onChange={(e) => setHandoverTo(e.target.value)}
                placeholder={t("offboarding.form.handoverPlaceholder")}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">{t("offboarding.form.handoverHint")}</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t("offboarding.form.notes")}
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("offboarding.form.notesPlaceholder")}
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">{t("offboarding.form.notesHint")}</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <FiCheckCircle className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">
                {t("offboarding.form.checklistTitle")}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.assetsReturned}
                  onChange={setCl("assetsReturned")}
                />
                {t("offboarding.form.assetsReturned")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.emailDisabled}
                  onChange={setCl("emailDisabled")}
                />
                {t("offboarding.form.emailDisabled")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.accessRevoked}
                  onChange={setCl("accessRevoked")}
                />
                {t("offboarding.form.accessRevoked")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.payrollCleared}
                  onChange={setCl("payrollCleared")}
                />
                {t("offboarding.form.payrollCleared")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.exitInterviewDone}
                  onChange={setCl("exitInterviewDone")}
                />
                {t("offboarding.form.exitInterviewDone")}
              </label>
            </div>
          </div>

          {/* Submit */}
          <div
            className={`flex items-center gap-3 ${
              isRTL ? "justify-start flex-row-reverse" : "justify-end"
            }`}
          >
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              {t("offboarding.form.reset")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitLoading}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitLoading
                ? t("offboarding.form.processing")
                : t("offboarding.form.submit")}
            </button>
          </div>
        </form>

        {/* Review summary */}
        {selectedEmp && (
          <div className="border-t p-6 bg-gray-50">
            <h4 className="font-semibold text-gray-800 mb-3">
              {t("offboarding.form.summaryTitle")}
            </h4>
            <div className="text-sm text-gray-700">
              <div>
                <span className="font-medium">
                  {t("offboarding.form.summaryEmployee")}:
                </span>{" "}
                {`${selectedEmp.firstName || ""} ${selectedEmp.lastName || ""}`.trim() ||
                  selectedEmp.name}
                {selectedEmp.role ? ` · ${selectedEmp.role}` : ""}
              </div>
              <div>
                <span className="font-medium">
                  {t("offboarding.form.summaryLastDay")}:
                </span>{" "}
                {lastDay || "—"}
              </div>
              <div>
                <span className="font-medium">
                  {t("offboarding.form.summaryReason")}:
                </span>{" "}
                {reason}
              </div>
              <div>
                <span className="font-medium">
                  {t("offboarding.form.summaryHandover")}:
                </span>{" "}
                {handoverTo || "—"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Offboarding;
