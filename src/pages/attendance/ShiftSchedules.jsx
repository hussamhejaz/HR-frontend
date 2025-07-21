import React from "react";
import { useTranslation } from "react-i18next";

const ShiftSchedules = () => {
  const { t } = useTranslation();
  const shifts = [
    { id: 1, employee: "Alice Johnson", shift: "08:00–16:00" },
    { id: 2, employee: "Bob Smith",     shift: "09:00–17:00" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.shifts")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("allEmployeesTable.id")}</th>
              <th className="px-4 py-2">{t("menu.employees")}</th>
              <th className="px-4 py-2">{t("shiftSchedules.shift", "Shift")}</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{s.id}</td>
                <td className="px-4 py-2">{s.employee}</td>
                <td className="px-4 py-2">{s.shift}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShiftSchedules;
