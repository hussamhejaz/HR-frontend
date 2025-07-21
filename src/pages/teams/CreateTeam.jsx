// src/pages/teams/CreateTeam.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const CreateTeam = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [depsError, setDepsError]     = useState(null);

  const [form, setForm] = useState({
    name: "",
    department: "",
    membersCount: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // fetch departments once
  useEffect(() => {
    fetch("http://localhost:5002/api/departments")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setDepartments(data);
        setLoadingDeps(false);
      })
      .catch(() => {
        setDepsError(t("teams.errorLoadingDeps"));
        setLoadingDeps(false);
      });
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "membersCount" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5002/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      navigate("/teams/all");
    } catch {
      setError(t("teams.errorCreating"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("teams.createTitle")}</h1>

      {loadingDeps && <p className="mb-4">{t("loading")}…</p>}
      {depsError    && <p className="mb-4 text-red-600">{depsError}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow space-y-4"
      >
        {error && <div className="text-red-600">{error}</div>}

        {/* Team Name */}
        <div>
          <label className="block mb-1 font-medium">{t("teams.name")}</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded-lg"
          />
        </div>

        {/* Department Dropdown */}
        <div>
          <label className="block mb-1 font-medium">{t("teams.department")}</label>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded-lg bg-white"
          >
            <option value="">{t("teams.selectDepartment")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Members Count */}
        <div>
          <label className="block mb-1 font-medium">{t("teams.membersCount")}</label>
          <input
            name="membersCount"
            type="number"
            min="1"
            value={form.membersCount}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded-lg"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            {submitting ? t("teams.submitting") : t("teams.submit")}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
          >
            {t("Back")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeam;
