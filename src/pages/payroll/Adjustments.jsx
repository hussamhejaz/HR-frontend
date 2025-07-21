import React from "react";
import { useTranslation } from "react-i18next";

const Adjustments = () => {
  const { t } = useTranslation();
  const items = [
    { id: 1, type: "Bonus",      employee: "Alice Johnson", amount: 500 },
    { id: 2, type: "Deduction",  employee: "Bob Smith",     amount: 150 },
    { id: 3, type: "Bonus",      employee: "Carol Lee",     amount: 300 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.adjustments")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("adjustmentsTable.id")}</th>
              <th className="px-4 py-2">{t("adjustmentsTable.type")}</th>
              <th className="px-4 py-2">{t("adjustmentsTable.employee")}</th>
              <th className="px-4 py-2">{t("adjustmentsTable.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.id}</td>
                <td className="px-4 py-2">{a.type}</td>
                <td className="px-4 py-2">{a.employee}</td>
                <td className="px-4 py-2">${a.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Adjustments;
