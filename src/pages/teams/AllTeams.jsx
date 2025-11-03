// src/pages/teams/AllTeams.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiUserPlus,
  FiUserMinus,
  FiAlertTriangle,
  FiPlus,
  FiX,
  FiLoader,
  FiBriefcase,
  FiMapPin,
  FiMail
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

// Env base (set REACT_APP_API_BASE), fallback to local dev
const API_BASE =  "https://hr-backend-npbd.onrender.com";

/* ---------------------------- Auth/Tenant helpers ---------------------------- */
const getToken = () => localStorage.getItem("fb_id_token") || "";
const getTenantId = () => localStorage.getItem("activeTenantId") || "";

const authHeaders = (extra = {}) => {
  const token = getToken();
  const tenantId = getTenantId();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // ignore parse error, body stays null
  }
  if (!res.ok) {
    const msg =
      body?.error ||
      body?.message ||
      `${res.status} ${res.statusText}` ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}
/* --------------------------------------------------------------------------- */

const TeamCard = ({ team, department, onEdit, onDelete, onManageMembers, isRTL }) => {
  const { t } = useTranslation();
  const membersCount = Array.isArray(team.members)
    ? team.members.length
    : team.membersCount ?? 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-indigo-100">
      {/* Background accent */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 shadow-sm">
            <FiUsers size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {team.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                <FiUsers size={12} />
                {membersCount} {t("teams.members", "members")}
              </span>
              {department?.name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                  <FiBriefcase size={12} />
                  {department.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Details */}
      {team.description && (
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
          {team.description}
        </p>
      )}

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
            onClick={() => onManageMembers(team)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors duration-150"
          >
            <FiUserPlus size={14} />
            {t("teams.manageMembers", "Members")}
          </button>
          <button
            onClick={() => onEdit(team)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors duration-150"
          >
            <FiEdit2 size={14} />
            {t("departments.edit", "Edit")}
          </button>
          <button
            onClick={() => onDelete(team)}
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
        <FiUsers className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {hasSearch
          ? t("departments.list.emptyFiltered", "No teams match your search.")
          : t("teams.empty", "No teams yet.")}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasSearch
          ? "Try adjusting your search terms or filters to find what you're looking for."
          : "Get started by creating your first team to organize your employees."}
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
          to="/teams/create"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors duration-150"
        >
          <FiPlus size={16} />
          {t("teams.addButton", "Add Team")}
        </Link>
      )}
    </div>
  );
};

export default function AllTeams() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // dialogs
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [membersTeam, setMembersTeam] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchJson(`${API_BASE}/api/teams`, { headers: authHeaders() }),
      fetchJson(`${API_BASE}/api/departments`, { headers: authHeaders() }),
    ])
      .then(([teamsData, depsData]) => {
        if (cancelled) return;
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDepartments(Array.isArray(depsData) ? depsData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          setError(t("auth.signinRequired", "Please sign in again to continue."));
        } else if (err.status === 403) {
          setError(t("tenant.membershipRequired", "You don't have access to a tenant. Ask an admin to add you."));
        } else {
          setError(t("teams.errorLoading", "Failed to load teams."));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter((team) => {
      const dept = departments.find((d) => d.id === team.department);
      const searchableText = [
        team.name,
        team.description,
        dept?.name,
        String(Array.isArray(team.members) ? team.members.length : team.membersCount ?? "")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(term);
    });
  }, [searchTerm, teams, departments]);

  const refreshTeam = (updated) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const removeTeam = (id) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const clearSearch = () => setSearchTerm("");

  return (
    <div dir={dir} className="min-h-screen bg-gray-50/30 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                <FiUsers className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("allTeams", "All Teams")}
                </h1>
                <p className="mt-1 text-gray-600">
                  {t("teams.subtitle", "Organize employees into teams and assign them to departments")}
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
                  placeholder={t("teams.searchPlaceholder", "Search teams by name, department, description...")}
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
                to="/teams/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-blue-700"
              >
                <FiPlus size={18} />
                {t("teams.addButton", "Add Team")}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && !error && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">
                {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
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
                <h3 className="font-medium text-red-800">Unable to load teams</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="relative">
          {loading && <LoadingSkeleton />}
          
          {!loading && !error && filteredTeams.length === 0 && (
            <EmptyState 
              hasSearch={!!searchTerm} 
              onClearSearch={clearSearch}
              isRTL={isRTL}
            />
          )}

          {!loading && !error && filteredTeams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => {
                const department = departments.find((d) => d.id === team.department);
                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    department={department}
                    onEdit={setEditing}
                    onDelete={(team) => setDeleting({ id: team.id, name: team.name })}
                    onManageMembers={setMembersTeam}
                    isRTL={isRTL}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Team Modal */}
      {editing && (
        <EditTeamModal
          open={!!editing}
          team={editing}
          onClose={() => setEditing(null)}
          departments={departments}
          onSaved={(updated) => {
            refreshTeam(updated);
            setEditing(null);
          }}
        />
      )}

      {/* Manage Members Modal */}
      {membersTeam && (
        <ManageMembersModal
          open={!!membersTeam}
          team={membersTeam}
          onClose={() => setMembersTeam(null)}
          onSaved={(updated) => {
            refreshTeam(updated);
            setMembersTeam(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <DeleteTeamModal
          open={!!deleting}
          deleting={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            removeTeam(id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

/* ===================== EditTeamModal ===================== */
function EditTeamModal({ open, onClose, team, departments, onSaved }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  // const isRTL = dir === "rtl";

  const [form, setForm] = useState({
    name: "",
    department: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!open || !team) return;
    setMsg(null);
    setForm({
      name: team.name || "",
      department: team.department || "",
      description: team.description || "",
    });
  }, [open, team]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${team.id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMsg({ type: "success", text: t("teams.updated", "Team updated successfully.") });
      setTimeout(() => onSaved?.(updated), 1000);
    } catch {
      setMsg({ type: "error", text: t("teams.updateFailed", "Failed to update team. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl transform transition-all duration-200 scale-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600">
            <FiUsers size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{t("teams.editTitle", "Edit Team")}</h3>
            <p className="text-sm text-gray-600 mt-1">Update team information and department assignment</p>
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

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {t("teams.name", "Team Name")} *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
              placeholder={t("teams.namePlaceholder", "e.g., Mobile Platform Team")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {t("teams.department", "Department")} *
            </label>
            <select
              name="department"
              value={form.department}
              onChange={onChange}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
            >
              <option value="">{t("teams.selectDepartment", "Select Department")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              {t("departments.description", "Description")}
            </label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={onChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200 resize-none"
              placeholder={t("teams.descriptionPlaceholder", "Team responsibilities, goals, or focus areas...")}
            />
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-gray-100 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              {t("actions.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiLoader className="animate-spin" />
                  {t("teams.saving", "Saving Changes...")}
                </>
              ) : (
                t("editEmployee.save", "Save Changes")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== ManageMembersModal ===================== */
function ManageMembersModal({ open, onClose, team, onSaved }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const isRTL = dir === "rtl";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setLoading(true);

    fetchJson(`${API_BASE}/api/employees`, { headers: authHeaders() })
      .then((data) => {
        setEmployees(Array.isArray(data) ? data : []);
        const preset = new Set(Array.isArray(team?.members) ? team.members : []);
        setSelected(preset);
        setLoading(false);
      })
      .catch((err) => {
        if (err.status === 401) {
          setMsg({ type: "error", text: t("auth.signinRequired", "Please sign in again to continue.") });
        } else if (err.status === 403) {
          setMsg({ type: "error", text: t("tenant.membershipRequired", "You don't have access to a tenant.") });
        } else {
          setMsg({ type: "error", text: t("employees.errorLoading", "Failed to load employees.") });
        }
        setLoading(false);
      });
  }, [open, team, t]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      [e.firstName, e.lastName, e.email, e.department, e.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [searchTerm, employees]);

  const toggle = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const members = Array.from(selected);
      const res = await fetch(`${API_BASE}/api/teams/${team.id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ members, membersCount: members.length }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMsg({ type: "success", text: t("teams.membersSaved", "Team members updated successfully.") });
      setTimeout(() => onSaved?.(updated), 1000);
    } catch {
      setMsg({ type: "error", text: t("teams.membersSaveFailed", "Failed to update team members.") });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl transform transition-all duration-200 scale-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 text-green-600">
            <FiUserPlus size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("teams.manageMembers", "Manage Team Members")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t("teams.manageMembersDesc", "Add or remove members from")} <strong>{team?.name}</strong>
            </p>
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
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
              placeholder={t("teams.searchEmployees", "Search employees by name, email, or role...")}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={`absolute inset-y-0 ${
                  isRTL ? "left-3" : "right-3"
                } flex items-center text-gray-400 hover:text-gray-600`}
              >
                <FiX size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Employees */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 rounded-t-2xl border-b border-gray-200">
              {t("teams.available", "Available Employees")}
              <span className="text-gray-500 ml-2">
                ({filteredEmployees.filter(e => !selected.has(e.id || e._id)).length})
              </span>
            </div>
            <div className="max-h-80 overflow-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-600">
                  <FiLoader className="animate-spin h-6 w-6 mx-auto mb-2" />
                  {t("loading", "Loading employees...")}
                </div>
              ) : filteredEmployees.filter(e => !selected.has(e.id || e._id)).length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {searchTerm ? t("teams.noResults", "No employees match your search.") : t("teams.allAdded", "All employees are already in the team.")}
                </div>
              ) : (
                filteredEmployees
                  .filter(e => !selected.has(e.id || e._id))
                  .map((employee) => {
                    const id = employee.id || employee._id;
                    const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.name;
                    return (
                      <button
                        key={id}
                        onClick={() => toggle(id)}
                        className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                                {fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                  <FiMail size={12} />
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {employee.role && (
                                <span className="inline-flex items-center gap-1">
                                  <FiBriefcase size={12} />
                                  {employee.role}
                                </span>
                              )}
                              {employee.department && (
                                <span className="inline-flex items-center gap-1">
                                  <FiMapPin size={12} />
                                  {employee.department}
                                </span>
                              )}
                            </div>
                          </div>
                          <FiUserPlus className="text-green-600 shrink-0 ml-3" size={18} />
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Selected Members */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 rounded-t-2xl border-b border-gray-200">
              {t("teams.selected", "Team Members")}
              <span className="text-gray-500 ml-2">({selected.size})</span>
            </div>
            <div className="max-h-80 overflow-auto">
              {selected.size === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {t("teams.noneSelected", "No team members selected yet.")}
                </div>
              ) : (
                Array.from(selected).map((id) => {
                  const employee = employees.find((x) => (x.id || x._id) === id);
                  if (!employee) return null;
                  const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.name;
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(id)}
                      className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-green-600 text-sm font-medium">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                <FiMail size={12} />
                                {employee.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {employee.role && (
                              <span className="inline-flex items-center gap-1">
                                <FiBriefcase size={12} />
                                {employee.role}
                              </span>
                            )}
                          </div>
                        </div>
                        <FiUserMinus className="text-red-600 shrink-0 ml-3" size={18} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-100 justify-end mt-6">
          <button 
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            {t("actions.cancel", "Cancel")}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <FiLoader className="animate-spin" />
                {t("teams.savingMembers", "Saving Members...")}
              </>
            ) : (
              t("editEmployee.save", "Save Changes")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== DeleteTeamModal ===================== */
function DeleteTeamModal({ open, deleting, onClose, onDeleted }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  // const isRTL = dir === "rtl";
  const [working, setWorking] = useState(false);

  const handleDelete = async () => {
    setWorking(true);
    try {
      await fetchJson(`${API_BASE}/api/teams/${deleting.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      onDeleted?.(deleting.id);
    } catch {
      alert(t("teams.deleteFailed", "Failed to delete team. Please try again."));
    } finally {
      setWorking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transform transition-all duration-200 scale-100">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <FiAlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("teams.confirmDelete", "Delete this team?")}
            </h3>
            <p className="text-gray-600">
              Are you sure you want to delete <strong>"{deleting.name}"</strong>? This action cannot be undone and will remove all team associations.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={working}
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50"
          >
            {t("actions.cancel", "Cancel")}
          </button>
          <button
            onClick={handleDelete}
            disabled={working}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors duration-150 disabled:opacity-50"
          >
            {working ? (
              <>
                <FiLoader className="animate-spin" />
                {t("departments.deleting", "Deleting...")}
              </>
            ) : (
              t("departments.delete", "Delete Team")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}