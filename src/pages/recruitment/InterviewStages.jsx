// src/pages/recruitment/InterviewStages.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiLoader,
  FiAlertTriangle,
  FiClock
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// CRA/Webpack-friendly env
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5002";
const INTERVIEWS_API = `${API_BASE}/api/recruitment/interviews`;

const cx = (...c) => c.filter(Boolean).join(" ");

export default function InterviewStages() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [working, setWorking] = useState(false);

  const [deleting, setDeleting] = useState(null);

  const fetchStages = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(INTERVIEWS_API);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // sort by position then name for stable view
      data.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.name||"").localeCompare(String(b.name||"")));
      setStages(Array.isArray(data) ? data : []);
    } catch {
      setErr(t("interviews.errorLoading", "Failed to load stages."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stages;
    return stages.filter((s) =>
      [s.name, s.description].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [stages, q]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (stage) => {
    setEditing(stage);
    setModalOpen(true);
  };

  const saveStage = async (payload) => {
    setWorking(true);
    try {
      const isEdit = Boolean(editing?.id);
      const url = isEdit ? `${INTERVIEWS_API}/${editing.id}` : INTERVIEWS_API;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setModalOpen(false);
      setEditing(null);
      fetchStages();
    } catch {
      alert(t("interviews.errorSaving", "Failed to save stage."));
    } finally {
      setWorking(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      const res = await fetch(`${INTERVIEWS_API}/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setDeleting(null);
      fetchStages();
    } catch {
      alert(t("interviews.errorDeleting", "Failed to delete stage."));
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
            <FiCalendar size={22} />
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <h1 className="text-2xl font-extrabold">{t("interviews.title", "Interview Stages")}</h1>
            <p className="text-sm text-gray-600">{t("interviews.subtitle", "Define your hiring pipeline stages")}</p>
          </div>
        </div>

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
              placeholder={t("interviews.searchPlaceholder", "Search stages…")}
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-indigo-700"
          >
            <FiPlus /> {t("interviews.new", "New Stage")}
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
            ? t("interviews.emptyFiltered", "No stages match your search.")
            : t("interviews.empty", "No stages yet. Create your first one.")}
        </div>
      )}

      {/* List */}
      {!loading && !err && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className={cx("flex items-start justify-between", isRTL ? "flex-row-reverse" : "")}>
                <div className={cx("flex items-start gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <FiCalendar />
                  </div>
                  <div className={isRTL ? "text-right" : ""}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{s.name || t("interviews.noName", "Untitled stage")}</h3>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 flex items-center gap-3">
                      {typeof s.position === "number" && (
                        <span>#{s.position}</span>
                      )}
                      {s.durationMin ? (
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="opacity-60" />
                          {t("interviews.durationMins", "{{mins}} mins", { mins: s.durationMin })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    <FiEdit2 /> {t("actions.edit", "Edit")}
                  </button>
                  <button
                    onClick={() => setDeleting(s)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <FiTrash2 /> {t("actions.delete", "Delete")}
                  </button>
                </div>
              </div>

              {s.description ? (
                <p className={cx("mt-3 text-sm text-gray-700", isRTL ? "text-right" : "")}>{s.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal kept mounted via portal (uncontrolled inputs to avoid focus loss) */}
      <StageModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        saving={working}
        initial={editing}
        t={t}
        isRTL={isRTL}
        onSave={(data) => {
          // Coerce number fields
          const payload = {
            ...data,
            position: data.position === "" ? null : Number(data.position),
            durationMin: data.durationMin === "" ? null : Number(data.durationMin),
          };
          saveStage(payload);
        }}
      />

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleting(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="mt-0.5 text-red-600" />
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-lg font-semibold">{t("interviews.confirmDelete", "Delete this stage?")}</h3>
                <p className="mt-1 text-sm text-gray-600">{deleting.name || ""}</p>
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
                {working ? t("actions.deleting", "Deleting…") : t("actions.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------ Modal (Uncontrolled + Portal) ------------------------ */

function StageModal({ open, onClose, onSave, saving, initial, t, isRTL }) {
  // Portal target
  const portalEl = useMemo(() => {
    let el = document.getElementById("interview-modal-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "interview-modal-portal";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  // reset key on create opens
  const [createTick, setCreateTick] = useState(0);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current && !initial?.id) setCreateTick((n) => n + 1);
    prevOpen.current = open;
  }, [open, initial?.id]);

  const formKey = initial?.id ? `edit_${initial.id}` : `create_${createTick}`;

  // Refs (uncontrolled)
  const nameRef = useRef(null);
  const descRef = useRef(null);
  const posRef = useRef(null);
  const durRef = useRef(null);

  const defaults = {
    name: initial?.name || "",
    description: initial?.description || "",
    position: initial?.position ?? "",
    durationMin: initial?.durationMin ?? ""
  };

  const [error, setError] = useState(null);

  const validate = () => {
    const name = (nameRef.current?.value || "").trim();
    if (!name) {
      setError(t("interviews.validation.name", "Stage name is required."));
      return false;
    }
    return true;
  };

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    onSave({
      name: nameRef.current.value.trim(),
      description: descRef.current.value.trim(),
      position: posRef.current.value,
      durationMin: durRef.current.value
    });
  };

  const Hidden = ({ children }) => <div style={{ display: open ? "block" : "none" }}>{children}</div>;

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
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* Sheet */}
        <div className={cx("absolute top-0 h-full w-full max-w-3xl bg-white shadow-xl md:rounded-s-2xl", isRTL ? "left-0" : "right-0")}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur px-5 py-4">
            <div className={cx("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-lg font-semibold">
                  {initial?.id ? t("interviews.editTitle", "Edit Stage") : t("interviews.createTitle", "Create Stage")}
                </h3>
                <p className="text-xs text-gray-600">{t("interviews.modalSubtitle", "Fill the fields and save")}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label={t("actions.close", "Close")}>
                <FiX />
              </button>
            </div>
          </div>

          {/* Body */}
          <form key={formKey} onSubmit={submit} className="h-[calc(100%-64px)] overflow-y-auto px-5 py-6">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label={t("interviews.fields.name", "Stage name")}>
                  <input
                    ref={nameRef}
                    defaultValue={defaults.name}
                    className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("interviews.placeholders.name", "e.g., Phone Screen")}
                    autoComplete="off"
                    spellCheck={false}
                    dir={isRTL ? "rtl" : "ltr"}
                  />
                </Field>

                <Field label={t("interviews.fields.position", "Order (optional)")}>
                  <input
                    ref={posRef}
                    defaultValue={defaults.position}
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </Field>

                <Field label={t("interviews.fields.durationMin", "Duration (mins)")}>
                  <input
                    ref={durRef}
                    defaultValue={defaults.durationMin}
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="30"
                  />
                </Field>
              </div>

              <div>
                <Field label={t("interviews.fields.description", "Description")}>
                  <textarea
                    ref={descRef}
                    defaultValue={defaults.description}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("interviews.placeholders.description", "What happens in this stage?")}
                  />
                </Field>
              </div>

              {/* Footer */}
              <div className={cx("sticky bottom-0 bg-white/70 backdrop-blur pt-2 pb-1", isRTL ? "text-left" : "text-right")}>
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
                    {initial?.id ? t("actions.save", "Save changes") : t("actions.create", "Create")}
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
