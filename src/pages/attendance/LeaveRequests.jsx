import React from "react";
import { useTranslation } from "react-i18next";

const LeaveRequests = () => {
  const { t } = useTranslation();
  const requests = [
    { id: 1, employee: "Alice Johnson", type: "Vacation",   from: "2025-07-10", to: "2025-07-15", status: "Approved" },
    { id: 2, employee: "Bob Smith",     type: "Sick Leave", from: "2025-07-02", to: "2025-07-03", status: "Pending"  },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.leave")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("allEmployeesTable.id")}</th>
              <th className="px-4 py-2">{t("menu.employees")}</th>
              <th className="px-4 py-2">{t("leaveRequests.type", "Type")}</th>
              <th className="px-4 py-2">{t("leaveRequests.period", "Period")}</th>
              <th className="px-4 py-2">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.employee}</td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.from} – {r.to}</td>
                <td className="px-4 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveRequests;
