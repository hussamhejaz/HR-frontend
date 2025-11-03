import React, { useEffect, useMemo, useState } from "react";
import {
  getSuperadminSession,
  fetchTenantsSuper,
  registerTenantSuper,
  deleteTenantSuper,
} from "../../utils/superAuth";
import { useNavigate } from "react-router-dom";

/* ----------------------------- Small UI helpers ---------------------------- */
const IconButton = ({ children, className = "", ...rest }) => (
  <button
    className={
      "inline-flex items-center justify-center rounded-xl border px-3 py-2 hover:bg-gray-50 transition " +
      className
    }
    {...rest}
  >
    {children}
  </button>
);
const PrimaryButton = ({ children, className = "", ...rest }) => (
  <button
    className={
      "inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-4 py-2 shadow-sm hover:bg-indigo-700 transition disabled:opacity-60 " +
      className
    }
    {...rest}
  >
    {children}
  </button>
);

const StatCard = ({ title, value, sub }) => (
  <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-sm">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
    {sub ? <div className="mt-1 text-xs text-gray-400">{sub}</div> : null}
  </div>
);

const Empty = ({ onCreate }) => (
  <div className="rounded-2xl border border-dashed p-12 text-center">
    <div className="text-lg font-semibold">No tenants yet</div>
    <div className="text-sm text-gray-500 mt-1">
      Create your first tenant to get started.
    </div>
    <PrimaryButton className="mt-4" onClick={onCreate}>
      + Register tenant
    </PrimaryButton>
  </div>
);

const ErrorBanner = ({ text, onClose }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 flex items-start gap-3">
    <div className="text-xl leading-none">⚠️</div>
    <div className="flex-1">
      <div className="font-semibold">Something went wrong</div>
      <div className="text-sm mt-0.5">{text}</div>
    </div>
    <button className="opacity-60 hover:opacity-100" onClick={onClose}>
      ✕
    </button>
  </div>
);

/* ------------------------------ Slide-over UI ------------------------------ */
function SlideOver({ open, onClose, title, children, footer }) {
  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* panel */}
      <div
        className={`absolute right-0 top-0 h-full w-[92vw] sm:w-[480px] bg-white shadow-2xl transition-transform
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
        </div>
        <div className="p-5 overflow-auto h-[calc(100%-4rem-4rem)]">{children}</div>
        <div className="px-5 py-4 border-t bg-gray-50">{footer}</div>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
export default function TenantsDashboard() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [idToken, setIdToken] = useState("");

  const [query, setQuery] = useState("");

  // create drawer
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    locale: "en",
    timezone: "UTC",
  });
  const [submitting, setSubmitting] = useState(false);

  // delete confirm drawer
  const [del, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      const sess = await getSuperadminSession();
      if (!sess.ok) {
        setErr("Forbidden: insufficient role");
        setLoading(false);
        return nav("/superadmin/login", { replace: true });
      }
      setIdToken(sess.idToken);
      try {
        const list = await fetchTenantsSuper(sess.idToken);
        setRows(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e.message || "Failed to load tenants");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.id, r.name, r.ownerEmail, r.ownerUsername, r.timezone, r.locale]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, query]);

  async function refresh() {
    const list = await fetchTenantsSuper(idToken);
    setRows(Array.isArray(list) ? list : []);
  }

  async function onCreate(e) {
    e?.preventDefault?.();
    if (!form.name.trim()) return alert("Tenant name is required");
    if (!/^[a-z0-9](?:[a-z0-9._-]{2,30})$/.test(form.username.trim()))
      return alert("Username must be a-z0-9._- and 3–31 chars");
    if (!form.password || form.password.length < 8)
      return alert("Password must be at least 8 characters");

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        locale: form.locale || "en",
        timezone: form.timezone || "UTC",
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      };
      const created = await registerTenantSuper(idToken, payload);
      await refresh();
      setOpenCreate(false);
      setForm({ name: "", username: "", email: "", password: "", locale: "en", timezone: "UTC" });
      // small toast
      window.setTimeout(() => alert(`Tenant created: ${created.tenantId}`), 50);
    } catch (e) {
      alert(e.message || "Failed to register tenant");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      await deleteTenantSuper(idToken, del.id);
      await refresh();
      setDel(null);
    } catch (e) {
      alert(e.message || "Failed to delete tenant");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-bold">Tenants</div>
          <div className="text-sm text-gray-500">Super Admin Console</div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton onClick={refresh}>↻ Refresh</IconButton>
          <PrimaryButton onClick={() => setOpenCreate(true)}>+ Register tenant</PrimaryButton>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total tenants" value={rows.length} />
        <StatCard
          title="With owner email"
          value={rows.filter((r) => r.ownerEmail).length}
          sub="Owners linked by email"
        />
        <StatCard
          title="Using UTC"
          value={rows.filter((r) => (r.timezone || "UTC").toUpperCase() === "UTC").length}
          sub="Time zone quick glance"
        />
      </div>

      {/* Search + error */}
      <div className="space-y-3">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search id, name, owner email or username…"
            className="w-full rounded-2xl border px-4 py-2.5 pl-10 shadow-sm focus:ring-2 focus:ring-indigo-200"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</div>
          {query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setQuery("")}
            >
              ✕
            </button>
          )}
        </div>
        {err && <ErrorBanner text={err} onClose={() => setErr("")} />}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border bg-white/70 backdrop-blur shadow-sm overflow-hidden">
        <div className="max-h-[62vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50/90 backdrop-blur border-b">
              <tr className="text-left">
                <th className="px-4 py-3 w-56">Actions</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Locale</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6">
                    <Empty onCreate={() => setOpenCreate(true)} />
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <IconButton
                          onClick={() => navigator.clipboard.writeText(t.id)}
                          title="Copy tenant id"
                        >
                          ⧉ Copy ID
                        </IconButton>
                        <IconButton
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setDel({ id: t.id, name: t.name })}
                          title="Delete tenant"
                        >
                          🗑 Delete
                        </IconButton>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{t.name || "—"}</td>
                    <td className="px-4 py-3">{t.ownerUsername || "—"}</td>
                    <td className="px-4 py-3">{t.ownerEmail || "—"}</td>
                    <td className="px-4 py-3">{t.locale || "—"}</td>
                    <td className="px-4 py-3">{t.timezone || "—"}</td>
                    <td className="px-4 py-3">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create slide-over */}
      <SlideOver
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Register new tenant"
        footer={
          <div className="flex items-center justify-end gap-2">
            <IconButton onClick={() => setOpenCreate(false)}>Cancel</IconButton>
            <PrimaryButton disabled={submitting} onClick={onCreate}>
              {submitting ? "Creating…" : "Create tenant"}
            </PrimaryButton>
          </div>
        }
      >
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tenant name *</label>
              <input
                className="w-full rounded-xl border px-3 py-2.5"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Owner username *</label>
              <input
                className="w-full rounded-xl border px-3 py-2.5"
                placeholder="e.g. john.doe"
                value={form.username}
                onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                required
              />
              <div className="text-[11px] text-gray-500 mt-1">
                Allowed: a-z 0-9 . _ - (3–31 chars)
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Owner email (optional)</label>
              <input
                type="email"
                className="w-full rounded-xl border px-3 py-2.5"
                placeholder="owner@company.com"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Owner password *</label>
              <input
                type="password"
                className="w-full rounded-xl border px-3 py-2.5"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                required
              />
              <div className="text-[11px] text-gray-500 mt-1">Min 8 characters</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Locale</label>
                <input
                  className="w-full rounded-xl border px-3 py-2.5"
                  value={form.locale}
                  onChange={(e) => setForm((s) => ({ ...s, locale: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Timezone</label>
                <input
                  className="w-full rounded-xl border px-3 py-2.5"
                  value={form.timezone}
                  onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Delete confirm slide-over */}
      <SlideOver
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete tenant"
        footer={
          <div className="flex items-center justify-end gap-2">
            <IconButton onClick={() => setDel(null)}>Cancel</IconButton>
            <button
              className="inline-flex items-center justify-center rounded-xl bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition disabled:opacity-60"
              disabled={deleting}
              onClick={onConfirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-sm">
            You’re about to delete tenant{" "}
            <b>{del?.name || del?.id}</b>. This cannot be undone.
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            All tenant data under this id will be removed from your database.
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
