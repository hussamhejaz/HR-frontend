// src/pages/Overview.jsx
import React from "react";
import { FiUsers, FiBriefcase, FiBarChart2, FiCalendar } from "react-icons/fi";

const Overview = () => {
  // Example data
  const metrics = [
    {
      label: "Total Employees",
      value: 128,
      icon: <FiUsers className="w-6 h-6 text-white" />,
      bg: "bg-indigo-500",
    },
    {
      label: "Open Positions",
      value: 12,
      icon: <FiBriefcase className="w-6 h-6 text-white" />,
      bg: "bg-green-500",
    },
    {
      label: "Turnover Rate",
      value: "4.5%",
      icon: <FiBarChart2 className="w-6 h-6 text-white" />,
      bg: "bg-red-500",
    },
    {
      label: "Upcoming Leaves",
      value: 8,
      icon: <FiCalendar className="w-6 h-6 text-white" />,
      bg: "bg-yellow-500",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{/* t("menu.overview") */}Overview</h1>

      {/* Metrics cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center p-4 bg-white rounded-lg shadow"
          >
            <div className={`p-3 rounded-full ${m.bg} mr-4`}>
              {m.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{m.label}</p>
              <p className="text-xl font-semibold">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Placeholder for chart */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-medium mb-2">Monthly Hires</h2>
          <div className="h-48 flex items-center justify-center text-gray-400">
            {/* Replace with your chart component */}
            <svg
              className="w-full h-full"
              viewBox="0 0 200 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polyline
                points="0,60 40,40 80,50 120,30 160,45 200,20"
                stroke="#ccc"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Placeholder for another chart */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-medium mb-2">Leave Requests</h2>
          <div className="h-48 flex items-center justify-center text-gray-400">
            {/* Replace with your chart component */}
            <svg
              className="w-full h-full"
              viewBox="0 0 200 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="10" y="30" width="30" height="30" />
              <rect x="60" y="20" width="30" height="40" />
              <rect x="110" y="50" width="30" height="10" />
              <rect x="160" y="10" width="30" height="60" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
