// src/pages/employees/Offboarding.jsx

import React from "react";
import {
  FiLogOut,
  FiTrash2,
  FiBriefcase,
  FiCreditCard,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

const Offboarding = () => {
  const { t } = useTranslation();

  const steps = [1, 2, 3, 4].map((i) => {
    const icons = [
      <FiLogOut className="text-white w-6 h-6" />,
      <FiTrash2 className="text-white w-6 h-6" />,
      <FiBriefcase className="text-white w-6 h-6" />,
      <FiCreditCard className="text-white w-6 h-6" />,
    ];
    const bgColors = ["bg-red-500", "bg-yellow-600", "bg-indigo-500", "bg-green-600"];
    return {
      title: t(`offboarding.step${i}.title`),
      description: t(`offboarding.step${i}.description`),
      icon: icons[i - 1],
      bg: bgColors[i - 1],
    };
  });

  return (
    <div className="p-8 max-w-4xl mx-auto rtl">
      {/* Page title */}
      <h1 className="text-3xl font-extrabold text-gray-800 mb-8 text-right">
        {t("menu.offboarding")}
      </h1>

      {/* Timeline cards */}
      <div className="space-y-12">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-center bg-white shadow-lg rounded-lg overflow-hidden"
          >
            {/* Icon circle */}
            <div className={`flex-shrink-0 p-4 ${step.bg}`}>
              {step.icon}
            </div>

            {/* Content */}
            <div className="p-6 flex-1">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 text-right">
                {idx + 1}. {step.title}
              </h2>
              <p className="text-gray-600 leading-relaxed text-right">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Offboarding;
