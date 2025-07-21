import React from "react";
import { useTranslation } from "react-i18next";

const Payslips = () => {
  const { t } = useTranslation();
  const payslips = [
    { id: 1, employee: "Alice Johnson", amount: 5500, date: "2025-06-30" },
    { id: 2, employee: "Bob Smith",     amount: 4800, date: "2025-06-30" },
    { id: 3, employee: "Carol Lee",     amount: 6200, date: "2025-06-30" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.payslips")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("payslipsTable.id")}</th>
              <th className="px-4 py-2">{t("payslipsTable.employee")}</th>
              <th className="px-4 py-2">{t("payslipsTable.amount")}</th>
              <th className="px-4 py-2">{t("payslipsTable.date")}</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.id}</td>
                <td className="px-4 py-2">{p.employee}</td>
                <td className="px-4 py-2">${p.amount.toLocaleString()}</td>
                <td className="px-4 py-2">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payslips;
