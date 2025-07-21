import React from "react";
import { useTranslation } from "react-i18next";

const Enrollments = () => {
  const { t } = useTranslation();
  const enrollments = [
    { id: 1, employee: "Alice Johnson", course: "React Basics",   status: "Completed" },
    { id: 2, employee: "Bob Smith",     course: "UX Fundamentals", status: "In Progress" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.enrollments")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("enrollmentsTable.id")}</th>
              <th className="px-4 py-2">{t("enrollmentsTable.employee")}</th>
              <th className="px-4 py-2">{t("enrollmentsTable.course")}</th>
              <th className="px-4 py-2">{t("enrollmentsTable.status")}</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-2">{e.id}</td>
                <td className="px-4 py-2">{e.employee}</td>
                <td className="px-4 py-2">{e.course}</td>
                <td className="px-4 py-2">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Enrollments;
