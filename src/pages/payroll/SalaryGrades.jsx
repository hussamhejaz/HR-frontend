import React from "react";
import { useTranslation } from "react-i18next";

const SalaryGrades = () => {
  const { t } = useTranslation();
  const grades = [
    { grade: "A", min: 50000, max: 70000 },
    { grade: "B", min: 70001, max: 90000 },
    { grade: "C", min: 90001, max: 110000 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.grades")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("salaryGradesTable.grade")}</th>
              <th className="px-4 py-2">{t("salaryGradesTable.min")}</th>
              <th className="px-4 py-2">{t("salaryGradesTable.max")}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{g.grade}</td>
                <td className="px-4 py-2">${g.min.toLocaleString()}</td>
                <td className="px-4 py-2">${g.max.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalaryGrades;
