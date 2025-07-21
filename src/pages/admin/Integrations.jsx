import React from "react";
import { useTranslation } from "react-i18next";

const Integrations = () => {
  const { t } = useTranslation();
  // stub integrations
  const services = ["Slack", "Google Calendar", "Workday"];
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.integrations")}</h1>
      <ul className="list-disc pl-5">
        {services.map(s => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
};

export default Integrations;
