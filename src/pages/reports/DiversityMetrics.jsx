import React from "react";
import { useTranslation } from "react-i18next";

const DiversityMetrics = () => {
  const { t } = useTranslation();
  // Stub data
  const metrics = [
    { category: "Gender (Women)", percent: "48%" },
    { category: "Gender (Men)",   percent: "52%" },
    { category: "Underrepresented Minorities", percent: "18%" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.diversity")}</h1>
      <table className="min-w-full bg-white rounded shadow overflow-x-auto">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">{t("diversityTable.category")}</th>
            <th className="px-4 py-2">{t("diversityTable.percent")}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-4 py-2">{m.category}</td>
              <td className="px-4 py-2">{m.percent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DiversityMetrics;
