import React from "react";
import { useTranslation } from "react-i18next";
import { FiMessageCircle } from "react-icons/fi";

const Feedback = () => {
  const { t } = useTranslation();
  const items = [
    { id: 1, from: "Manager", to: "Alice Johnson", comment: "Great leadership on project X." },
    { id: 2, from: "Peer",    to: "Bob Smith",     comment: "Very responsive during sprint." },
    { id: 3, from: "Direct Report", to: "Carol Lee", comment: "Helpful mentoring." },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.feedback")}</h1>
      <ul className="space-y-4">
        {items.map((f) => (
          <li key={f.id} className="flex bg-white p-4 rounded shadow">
            <FiMessageCircle className="w-6 h-6 text-purple-500 mr-3" />
            <div>
              <p className="text-sm">
                <strong>{t("feedbackTable.from")}:</strong> {f.from}
              </p>
              <p className="text-sm">
                <strong>{t("feedbackTable.to")}:</strong> {f.to}
              </p>
              <p className="mt-1">{f.comment}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Feedback;
