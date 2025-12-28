import React from "react";
import { useTranslation } from "react-i18next";
import { FiGlobe, FiLayers } from "react-icons/fi";

const Tile = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm backdrop-blur">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default function HealthInsuranceExternal() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-white p-6 md:p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-700 via-slate-600 to-indigo-600 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(255,255,255,0.12),transparent_26%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {t("actionPages.healthInsuranceExternal.badge")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                {t("actionPages.healthInsuranceExternal.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-100/90">
                {t("actionPages.healthInsuranceExternal.subtitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                {t("actionPages.shared.comingSoon")}
              </p>
              <p className="text-xs text-slate-100/90">
                {t("actionPages.shared.placeholder")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Tile
            icon={FiGlobe}
            title={t("actionPages.healthInsuranceExternal.cards.coverage.title")}
            desc={t("actionPages.healthInsuranceExternal.cards.coverage.desc")}
          />
          <Tile
            icon={FiLayers}
            title={t("actionPages.healthInsuranceExternal.cards.documentation.title")}
            desc={t("actionPages.healthInsuranceExternal.cards.documentation.desc")}
          />
        </div>
      </div>
    </div>
  );
}
