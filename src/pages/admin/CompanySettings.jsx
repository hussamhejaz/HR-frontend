import React from "react";
import { useTranslation } from "react-i18next";

const CompanySettings = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.company")}</h1>
      <p className="text-gray-600">{t("companySettings.description")}</p>
      {/* add form or settings UI here */}
    </div>
  );
};

export default CompanySettings;
