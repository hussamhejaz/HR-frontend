import React from "react";
import { useTranslation } from "react-i18next";
import { FiBookOpen } from "react-icons/fi";

const Courses = () => {
  const { t } = useTranslation();
  const courses = [
    { id: 1, title: "React Basics",         instructor: "Jane Doe",    duration: "3h" },
    { id: 2, title: "Advanced Node.js",     instructor: "John Smith",  duration: "4h" },
    { id: 3, title: "UX Fundamentals",      instructor: "Emily Davis", duration: "2.5h" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.courses")}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <div key={c.id} className="p-4 bg-white rounded shadow flex flex-col">
            <div className="flex items-center mb-3">
              <FiBookOpen className="w-6 h-6 text-indigo-500 mr-2" />
              <h2 className="text-lg font-semibold">{c.title}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{t("coursesTable.instructor")}:</strong> {c.instructor}
            </p>
            <p className="text-sm text-gray-600">
              <strong>{t("coursesTable.duration")}:</strong> {c.duration}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;
