import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AllEmployees = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    fetch("http://localhost:5002/api/employees")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("Failed to load employees."));
        setLoading(false);
      });
  }, [t]);

  if (loading) return <p className="p-6">{t("loading")}…</p>;
  if (error)   return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("allEmployees")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">{t("allEmployeesTable.name")}</th>
              <th className="px-4 py-2 text-left">{t("allEmployeesTable.role")}</th>
              <th className="px-4 py-2 text-left">{t("allEmployeesTable.status")}</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b last:border-none hover:bg-gray-50">
                <td className="px-4 py-2">{emp.name}</td>
                <td className="px-4 py-2">{emp.role}</td>
                <td className="px-4 py-2">{emp.status}</td>
                <td className="px-4 py-2">
                  <Link
                    to={`/employees/profiles/${emp.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {t("viewDetails")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllEmployees;
