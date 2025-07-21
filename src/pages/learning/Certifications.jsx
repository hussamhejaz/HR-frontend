import React from "react";
import { useTranslation } from "react-i18next";
import { FiAward } from "react-icons/fi";

const Certifications = () => {
  const { t } = useTranslation();
  const certs = [
    { id: 1, name: "Certified React Dev",   date: "2025-05-20" },
    { id: 2, name: "UX Design Certificate", date: "2025-04-15" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.certifications")}</h1>
      <ul className="space-y-4">
        {certs.map((c) => (
          <li key={c.id} className="flex items-center bg-white p-4 rounded shadow">
            <FiAward className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-gray-600">{c.date}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Certifications;
