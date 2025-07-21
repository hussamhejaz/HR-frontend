import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const EmployeeProfiles = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5002/api/employees/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setEmployee(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("employeeNotFound"));
        setLoading(false);
      });
  }, [id, t]);

  if (loading) return <p className="p-6">{t("loading")}…</p>;
  if (error)   return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-indigo-600 hover:underline"
      >
        ← {t("Back")}
      </button>
      <h1 className="text-2xl font-bold mb-4">{employee.name}</h1>
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <span className="font-semibold">{t("allEmployeesTable.id")}: </span>
          {employee.id}
        </div>
        <div>
          <span className="font-semibold">{t("allEmployeesTable.role")}: </span>
          {employee.role}
        </div>
        <div>
          <span className="font-semibold">{t("allEmployeesTable.status")}: </span>
          {employee.status}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfiles;
