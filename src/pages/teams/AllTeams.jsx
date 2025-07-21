// src/pages/teams/AllTeams.jsx
import React, { useEffect, useState } from "react";
import { FiUsers } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AllTeams = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Fetch both teams and departments in parallel
    Promise.all([
      fetch("http://localhost:5002/api/teams").then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch("http://localhost:5002/api/departments").then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    ])
      .then(([teamsData, depsData]) => {
        setTeams(teamsData);
        setDepartments(depsData);
      })
      .catch(() => {
        setError(t("teams.errorLoading"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p className="p-6">{t("loading")}…</p>;
  if (error)   return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t("allTeams")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          // find the department object by id
          const dept = departments.find((d) => d.id === team.department);
          return (
            <div
              key={team.id}
              className="bg-white rounded-xl shadow p-6 flex flex-col justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <FiUsers className="w-6 h-6 text-indigo-600 mr-2 rtl:ml-2 rtl:mr-0" />
                <h2 className="text-xl font-semibold">{team.name}</h2>
              </div>

              <p className="text-gray-600 mb-2">
                {t("teams.department")}:{" "}
                <span className="font-medium">
                  {dept ? dept.name : t("n/a")}
                </span>
              </p>

              <p className="text-gray-600 mb-4">
                {t("teams.membersCount")}: <span className="font-medium">{team.membersCount}</span>
              </p>

              <Link
                to={`/teams/${team.id}`}
                className="mt-auto inline-block text-indigo-600 hover:underline font-medium"
              >
                {t("viewDetails")}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllTeams;
