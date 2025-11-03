// src/pages/attendance/HolidayCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar } from "react-icons/fi";

const API =
   "https://hr-backend-npbd.onrender.com"+
  "/api/attendance/holidays";

export default function HolidayCalendar() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState(null);
  const [openModal, setOpenModal] = useState(null); // {mode:'create'|'edit', data?}
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { id, label }

  const dfmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [i18n.language]
  );

  const fetchRows = async () => {
    try {
      setLoading(true);
      const r = await fetch(API);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
      setRows(sorted);
      setErr("");
    } catch {
      setErr(t("holidayCalendar.errorLoading", "Failed to load holidays."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsert = async (payload, id) => {
    try {
      setSaving(true);
      const r = await fetch(id ? `${API}/${id}` : API, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setOpenModal(null);
      await fetchRows();
      setBanner({
        type: "success",
        text:
          (id ? t("actions.save", "Save changes") : t("actions.create", "Create")) +
          " ✓",
      });
      setTimeout(() => setBanner(null), 1800);
    } catch {
      setBanner({
        type: "error",
        text: t("holidayCalendar.errorSaving", "Failed to save holiday."),
      });
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id) => {
    const prev = rows;
    setRows((xs) => xs.filter((x) => x.id !== id));
    try {
      const r = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (r.status !== 204) throw new Error("HTTP " + r.status);
      setBanner({ type: "success", text: t("actions.delete", "Delete") + " ✓" });
      setTimeout(() => setBanner(null), 1800);
    } catch {
      setRows(prev);
      setBanner({
        type: "error",
        text: t("holidayCalendar.errorDeleting", "Failed to delete holiday."),
      });
    }
  };

  return (
    <div dir={dir} className="p-6 font-sans">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-start">
            {t("holidayCalendar.title", "Holiday Calendar")}
          </h1>

          <div className="flex gap-2 ms-auto">
            <button
              onClick={fetchRows}
              className="rounded-lg border px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              {t("actions.refresh", "Refresh")}
            </button>
            <button
              onClick={() => setOpenModal({ mode: "create" })}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white shadow hover:bg-indigo-700"
            >
              {t("holidayCalendar.new", "New Holiday")}
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm shadow ${
            banner.type === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-green-200 bg-green-50 text-green-700"
          } text-start`}
        >
          {banner.text}
        </div>
      )}

      {err && <p className="mb-4 text-sm text-red-600 text-start">{err}</p>}

      {/* List */}
    {/* Table */}
<div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
  <div className="overflow-x-auto">
    <table className="min-w-full table-fixed">
      {/* Balance columns */}
      <colgroup>
        <col className="w-[45%]" />
        <col className="w-[25%]" />
        <col className="w-[30%]" />
      </colgroup>

      {/* Sticky, blurred header */}
      <thead
        className={`sticky top-0 z-10 bg-gray-50/80 backdrop-blur text-[0.8rem] font-semibold text-gray-700 ${
          isRTL ? "text-right" : "text-left"
        }`}
      >
        <tr>
          <th className="px-6 py-4">{t("holidayCalendar.name", "Name")}</th>
          <th className="px-6 py-4">{t("holidayCalendar.date", "Date")}</th>
          <th className={`px-6 py-4 ${isRTL ? "text-left" : "text-right"}`}>
            {t("table.actions", "Actions")}
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <tr key={`s-${i}`} className="animate-pulse">
              <td className="px-6 py-5">
                <div className="h-4 w-48 rounded bg-gray-200" />
              </td>
              <td className="px-6 py-5">
                <div className="h-4 w-32 rounded bg-gray-200" />
              </td>
              <td className="px-6 py-5">
                <div
                  className={`ml-auto h-8 w-24 rounded bg-gray-200 ${
                    isRTL ? "mr-auto ml-0" : ""
                  }`}
                />
              </td>
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td
              colSpan={3}
              className={`px-6 py-12 text-gray-500 ${
                isRTL ? "text-right" : "text-center"
              }`}
            >
              {t("messages.noMatches", "No results match your filters.")}
            </td>
          </tr>
        ) : (
          rows.map((h) => (
            <tr key={h.id} className="group transition-colors hover:bg-indigo-50/50">
              {/* NAME (chip + proper RTL order) */}
              <td className="px-6 py-4">
                <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white/70 px-3 py-1.5 shadow-sm">
                  {/* text first in RTL, second in LTR */}
                  <span
                    className={`truncate text-gray-900 ${
                      isRTL ? "order-1 ml-2" : "order-2 mr-2"
                    }`}
                    title={h.name}
                  >
                    {h.name}
                  </span>
                  <FiCalendar
                    className={`h-4 w-4 text-red-500 ${
                      isRTL ? "order-2" : "order-1"
                    }`}
                  />
                </div>
              </td>

              {/* DATE (pill) */}
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-900 ring-1 ring-gray-200">
                  <FiCalendar className="h-4 w-4 text-red-500" />
                  {dfmt.format(new Date(h.date))}
                </span>
              </td>

              {/* ACTIONS */}
              <td className={`px-6 py-4 ${isRTL ? "text-left" : "text-right"}`}>
                <div
                  className={`inline-flex items-center gap-2 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                >
                  <button
                    onClick={() => setOpenModal({ mode: "edit", data: h })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {t("actions.edit", "Edit")}
                  </button>
                  <button
                    onClick={() => setConfirm({ id: h.id, label: `${h.name} • ${h.date}` })}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {t("actions.delete", "Delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>


      {/* Modals */}
      {openModal && (
        <HolidayModal
          dir={dir}
          isRTL={isRTL}
          saving={saving}
          mode={openModal.mode}
          initial={openModal.data}
          onClose={() => setOpenModal(null)}
          onSubmit={async (payload) => upsert(payload, openModal.data?.id)}
          t={t}
        />
      )}

      {confirm && (
        <ConfirmDeleteModal
          dir={dir}
          isRTL={isRTL}
          name={confirm.label}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const id = confirm.id;
            setConfirm(null);
            await doRemove(id);
          }}
          t={t}
        />
      )}
    </div>
  );
}

function HolidayModal({ dir, isRTL, mode, initial, saving, onClose, onSubmit, t }) {
  const nameRef = useRef(null);
  const dateRef = useRef(null);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (initial) {
      if (nameRef.current) nameRef.current.value = initial.name || "";
      if (dateRef.current) dateRef.current.value = String(initial.date || "").slice(0, 10);
    }
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    setError("");
    const name = nameRef.current?.value.trim();
    const date = dateRef.current?.value;

    if (!name) return setError(t("holidayCalendar.name", "Name") + ": " + t("n/a", "N/A"));
    if (!date) return setError(t("holidayCalendar.date", "Date") + ": " + t("n/a", "N/A"));

    onSubmit({ name, date });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        dir={dir}
        className={`absolute top-0 h-full w-full max-w-xl bg-white shadow-xl md:rounded-s-2xl ${
          isRTL ? "left-0" : "right-0"
        }`}
      >
        {/* Sticky header with logical alignment and flipped close button */}
        <div className="sticky top-0 z-10 border-b bg-gray-50 px-5 py-4 shadow-sm relative">
          <button
            onClick={onClose}
            className={`rounded-lg p-2 hover:bg-gray-100 absolute top-2 ${
              isRTL ? "left-2" : "right-2"
            }`}
            aria-label={t("actions.close", "Close")}
          >
            ✕
          </button>

          <div className={`pe-12 ${isRTL ? "text-right" : "text-left"}`}>
            <h3 className="text-lg font-semibold">
              {mode === "edit"
                ? t("holidayCalendar.edit", "Edit Holiday")
                : t("holidayCalendar.create", "Create Holiday")}
            </h3>
            <p className="text-xs text-gray-500">
              {t("holidayCalendar.modalSubtitle", "Fill required fields")}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="h-[calc(100%-64px)] overflow-y-auto px-5 py-6">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-start">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <Field label={t("holidayCalendar.name", "Name")}>
              <input
                ref={nameRef}
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                placeholder={t("holidayCalendar.placeholders.name", "e.g., National Day")}
                defaultValue={initial?.name || ""}
              />
            </Field>

            <Field label={t("holidayCalendar.date", "Date")}>
              <input
                ref={dateRef}
                type="date"
                className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                defaultValue={initial?.date ? String(initial.date).slice(0, 10) : today}
              />
            </Field>

            <div className="sticky bottom-0 bg-white/70 backdrop-blur pb-2 pt-3 text-end">
              <div className="inline-flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  {t("actions.close", "Close")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <span className="animate-spin">⏳</span>}
                  {mode === "edit"
                    ? t("actions.save", "Save changes")
                    : t("holidayCalendar.create", "Create Holiday")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ dir, isRTL, name, onCancel, onConfirm, t }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        dir={dir}
        className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 text-start">
          <h3 className="text-lg font-semibold">
            {t("holidayCalendar.confirmDelete", "Delete this holiday?")}
          </h3>
          {name && <p className="mt-1 text-sm text-gray-600">{name}</p>}
        </div>
        <div className={`mt-5 flex gap-3 ${isRTL ? "flex-row-reverse" : "justify-end"}`}>
          <button onClick={onCancel} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            {t("actions.close", "Close")}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            {t("actions.delete", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="text-start">
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
    </div>
  );
}
