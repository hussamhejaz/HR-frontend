import React from "react";
import { useTranslation } from "react-i18next";

const LeavePolicies = () => {
  const { t } = useTranslation();
  // stub list
  const policies = [
    { id: 1, name: t("leavePolicy.annual"), days: 21 },
    { id: 2, name: t("leavePolicy.sick"), days: 10 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.leavePolicies")}</h1>
      <ul className="list-disc pl-5">
        {policies.map(p => (
          <li key={p.id}>
            {p.name}: {p.days} {t("leavePolicy.days")}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeavePolicies;
