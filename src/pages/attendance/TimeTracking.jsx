import React from "react";
import { useTranslation } from "react-i18next";

const TimeTracking = () => {
  const { t } = useTranslation();
  const entries = [
    { date: "2025-06-30", employee: "Alice Johnson", hours: 8 },
    { date: "2025-06-30", employee: "Bob Smith",   hours: 7.5 },
    { date: "2025-06-29", employee: "Carol Lee",   hours: 8 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.timesheets")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("timeTracking.date", "Date")}</th>
              <th className="px-4 py-2">{t("menu.employees")}</th>
              <th className="px-4 py-2">{t("timeTracking.hours", "Hours")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2">{e.date}</td>
                <td className="px-4 py-2">{e.employee}</td>
                <td className="px-4 py-2">{e.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeTracking;
