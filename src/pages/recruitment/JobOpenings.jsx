// src/pages/recruitment/JobOpenings.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { FiBriefcase } from "react-icons/fi";

const JobOpenings = () => {
  const { t } = useTranslation();

  const jobs = [
    { id: 1, title: "Frontend Engineer", department: "Engineering", status: "Open" },
    { id: 2, title: "UX Designer",        department: "Design",      status: "Closed" },
    { id: 3, title: "Product Manager",    department: "Product",     status: "Open" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.jobs")}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-4 bg-white rounded-lg shadow flex flex-col"
          >
            <div className="flex items-center mb-3">
              <FiBriefcase className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">{job.title}</h2>
            </div>
            <p className="text-gray-600 mb-1">
              <strong>{t("allTeamsTable.department")}:</strong> {job.department}
            </p>
            <p className="mt-auto text-sm">
              <span
                className={`px-2 py-1 rounded-full text-white ${
                  job.status === "Open" ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {job.status}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobOpenings;
