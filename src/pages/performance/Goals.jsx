import React from "react";
import { useTranslation } from "react-i18next";
import { FiTarget } from "react-icons/fi";

const Goals = () => {
  const { t } = useTranslation();
  const goals = [
    { id: 1, title: "Improve code coverage to 90%", owner: "Alice Johnson", status: "In Progress" },
    { id: 2, title: "Launch new onboarding flow", owner: "Bob Smith",     status: "Completed"   },
    { id: 3, title: "Reduce support tickets by 20%", owner: "Carol Lee",    status: "At Risk"      },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.goals")}</h1>
      <div className="space-y-4">
        {goals.map((g) => (
          <div key={g.id} className="flex items-center bg-white p-4 rounded shadow">
            <FiTarget className="w-6 h-6 text-green-500 mr-3" />
            <div className="flex-1">
              <h2 className="font-semibold">{g.title}</h2>
              <p className="text-sm text-gray-600">
                <strong>{t("goalsTable.owner")}:</strong> {g.owner}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-white ${
                g.status === "Completed"
                  ? "bg-green-500"
                  : g.status === "In Progress"
                  ? "bg-blue-500"
                  : "bg-yellow-500"
              }`}
            >
              {g.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;
