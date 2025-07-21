import React from "react";
import { useTranslation } from "react-i18next";

const TurnoverReport = () => {
  const { t } = useTranslation();
  // Stub data
  const data = [
    { month: "January", rate: "5%" },
    { month: "February", rate: "4.5%" },
    { month: "March", rate: "6%" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.turnover")}</h1>
      <table className="min-w-full bg-white rounded shadow overflow-x-auto">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">{t("turnoverTable.month")}</th>
            <th className="px-4 py-2">{t("turnoverTable.rate")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-4 py-2">{row.month}</td>
              <td className="px-4 py-2">{row.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TurnoverReport;
