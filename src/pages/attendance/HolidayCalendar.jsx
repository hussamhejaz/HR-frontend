import React from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar } from "react-icons/fi";

const HolidayCalendar = () => {
  const { t } = useTranslation();
  const holidays = [
    { date: "2025-07-04", name: "Independence Day" },
    { date: "2025-12-25", name: "Christmas Day"   },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.holidays")}</h1>
      <ul className="space-y-4">
        {holidays.map((h, i) => (
          <li key={i} className="flex items-center bg-white p-4 rounded shadow">
            <FiCalendar className="w-6 h-6 text-red-500 mr-3" />
            <span>
              <strong>{h.date}:</strong> {h.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HolidayCalendar;
