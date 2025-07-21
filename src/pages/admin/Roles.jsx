import React from "react";
import { useTranslation } from "react-i18next";

const Roles = () => {
  const { t } = useTranslation();
  // stub data
  const roles = [
    { id: 1, name: "Admin", description: "Full access" },
    { id: 2, name: "Manager", description: "Team management" },
    { id: 3, name: "Employee", description: "Self-service only" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.roles")}</h1>
      <table className="min-w-full bg-white rounded shadow">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">{t("rolesTable.id")}</th>
            <th className="px-4 py-2">{t("rolesTable.name")}</th>
            <th className="px-4 py-2">{t("rolesTable.desc")}</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(r => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2">{r.id}</td>
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Roles;
