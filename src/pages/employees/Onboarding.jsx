// src/pages/employees/Onboarding.jsx
import React, { useEffect, useState } from "react";
import { useTranslation }    from "react-i18next";
import {
  FiFileText,
  FiMail,
  FiTool,
  FiUsers,
  FiCheckCircle,
} from "react-icons/fi";

const STEP_KEYS = ["step1","step2","step3","step4"];

const Onboarding = () => {
  const { t } = useTranslation();

  // load saved completion state or default to all false
  const [done, setDone] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("onboardDone"));
      if (Array.isArray(stored) && stored.length === STEP_KEYS.length) return stored;
    } catch {}
    return Array(STEP_KEYS.length).fill(false);
  });

  // persist on change
  useEffect(() => {
    localStorage.setItem("onboardDone", JSON.stringify(done));
  }, [done]);

  const toggle = (idx) => {
    setDone((prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  };

  const steps = [
    {
      key: "onboarding.step1",
      icon: <FiFileText size={24} />,
      color: "bg-blue-100 text-blue-600",
    },
    {
      key: "onboarding.step2",
      icon: <FiMail size={24} />,
      color: "bg-green-100 text-green-600",
    },
    {
      key: "onboarding.step3",
      icon: <FiTool size={24} />,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      key: "onboarding.step4",
      icon: <FiUsers size={24} />,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">{t("menu.onboarding")}</h1>
      <div className="space-y-4">
        {steps.map(({ key, icon, color }, i) => (
          <div
            key={key}
            className="flex items-center bg-white p-4 rounded-lg shadow"
          >
            <div
              className={`p-3 rounded-full mr-4 ${color} flex-shrink-0`}
            >
              {icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {`${i + 1}. ${t(`${key}.title`)}`}
              </h2>
              <p className="text-gray-600">{t(`${key}.description`)}</p>
            </div>
            <button
              onClick={() => toggle(i)}
              className={`ml-4 p-2 rounded-full transition ${
                done[i]
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
              aria-label={
                done[i]
                  ? t("Mark as not done")
                  : t("Mark as done")
              }
            >
              <FiCheckCircle size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
