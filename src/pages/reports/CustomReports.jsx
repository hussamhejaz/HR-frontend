import React from "react";
import { useTranslation } from "react-i18next";
import { FiSettings } from "react-icons/fi";

const CustomReports = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.customReports")}</h1>
      <p className="text-gray-600 mb-4">{t("customReports.description")}</p>
      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-flex items-center">
        <FiSettings className="mr-2" /> {t("customReports.createButton")}
      </button>
    </div>
  );
};

export default CustomReports;
