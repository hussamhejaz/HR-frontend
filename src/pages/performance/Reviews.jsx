import React from "react";
import { useTranslation } from "react-i18next";

const Reviews = () => {
  const { t } = useTranslation();
  const reviews = [
    { id: 1, employee: "Alice Johnson", date: "2025-06-25", score: "Exceeds Expectations" },
    { id: 2, employee: "Bob Smith",     date: "2025-06-20", score: "Meets Expectations"  },
    { id: 3, employee: "Carol Lee",     date: "2025-06-15", score: "Needs Improvement" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.reviews")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">{t("reviewsTable.id")}</th>
              <th className="px-4 py-2">{t("reviewsTable.employee")}</th>
              <th className="px-4 py-2">{t("reviewsTable.date")}</th>
              <th className="px-4 py-2">{t("reviewsTable.score")}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.employee}</td>
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reviews;
