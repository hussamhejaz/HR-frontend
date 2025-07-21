// src/pages/recruitment/InterviewStages.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar } from "react-icons/fi";

const InterviewStages = () => {
  const { t } = useTranslation();

  const stages = [
    { id: 1, name: "Phone Screen",        description: "Initial phone screening call." },
    { id: 2, name: "Technical Interview", description: "In-depth coding & design interview." },
    { id: 3, name: "HR Interview",        description: "Culture & benefits discussion." },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.interviews")}</h1>
      <div className="space-y-6">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-start bg-white p-4 rounded-lg shadow">
            <FiCalendar className="w-6 h-6 text-indigo-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold">{stage.name}</h2>
              <p className="text-gray-700">{stage.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewStages;
