// src/pages/departments/AllDepartments.jsx
import React, { useEffect, useState } from "react";
import { FiLayers, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AllDepartments = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Fetch all departments
  useEffect(() => {
    fetch("https://hr-backend-npbd.onrender.com/api/departments")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setDepartments(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("departments.errorLoading"));
        setLoading(false);
      });
  }, [t]);

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm(t("departments.confirmDelete"))) return;
    try {
      const res = await fetch(`https://hr-backend-npbd.onrender.com/api/departments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      // remove from UI
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert(t("departments.errorDeleting"));
    }
  };

  if (loading) return <p className="p-6">{t("loading")}…</p>;
  if (error)   return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("allDepartments")}</h1>
        <Link
          to="/departments/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {t("departments.addButton")}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-2xl shadow p-6 flex flex-col justify-between hover:shadow-lg transition-shadow"
          >
            <div>
              <div className="flex items-center mb-3">
                <FiLayers className="w-6 h-6 text-indigo-600 mr-2 rtl:ml-2 rtl:mr-0" />
                <h2 className="text-2xl font-semibold">{dept.name}</h2>
              </div>
              <p className="text-gray-600">
                <span className="font-medium">{t("allDepartmentsTable.head")}: </span>
                {dept.head || t("n/a")}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to={`/departments/edit/${dept.id}`}
                className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
              >
                <FiEdit2 /> {t("departments.edit")}
              </Link>
              <button
                onClick={() => handleDelete(dept.id)}
                className="flex items-center gap-1 text-red-600 hover:underline font-medium"
              >
                <FiTrash2 /> {t("departments.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllDepartments;
