// src/pages/recruitment/Applicants.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { FiUser } from "react-icons/fi";

const Applicants = () => {
  const { t } = useTranslation();

  const applicants = [
    { id: 1, name: "Noura Al-Fayed",  position: "Frontend Engineer", status: "Interviewed" },
    { id: 2, name: "Omar Hussein",    position: "UX Designer",       status: "Applied" },
    { id: 3, name: "Lina Zahra",      position: "Product Manager",   status: "Offered" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.applicants")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">{t("allEmployeesTable.id")}</th>
              <th className="px-4 py-2">{t("allEmployeesTable.name")}</th>
              <th className="px-4 py-2">{t("menu.jobs")}</th>
              <th className="px-4 py-2">{t("status") || "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="px-4 py-2">{app.id}</td>
                <td className="px-4 py-2 flex items-center">
                  <FiUser className="mr-2 text-gray-500" /> {app.name}
                </td>
                <td className="px-4 py-2">{app.position}</td>
                <td className="px-4 py-2">{app.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Applicants;
