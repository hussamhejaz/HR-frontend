// src/pages/recruitment/OfferManagement.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { FiAward } from "react-icons/fi";

const OfferManagement = () => {
  const { t } = useTranslation();

  const offers = [
    { id: 1, candidate: "Noura Al-Fayed", position: "Frontend Engineer", status: "Accepted" },
    { id: 2, candidate: "Omar Hussein",   position: "UX Designer",       status: "Pending"  },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("menu.offers")}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center bg-white p-4 rounded-lg shadow"
          >
            <FiAward className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <p>
                <strong>{offer.candidate}</strong> — {offer.position}
              </p>
              <p className="text-sm">
                <span
                  className={`px-2 py-1 rounded-full text-white ${
                    offer.status === "Accepted" ? "bg-green-500" : "bg-gray-500"
                  }`}
                >
                  {offer.status}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferManagement;
