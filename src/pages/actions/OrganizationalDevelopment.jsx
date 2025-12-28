import React from "react";
import { useTranslation } from "react-i18next";
import { FiTrendingUp, FiCompass } from "react-icons/fi";

const InfoCard = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm backdrop-blur">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default function OrganizationalDevelopment() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-white p-6 md:p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-slate-600 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.14),transparent_24%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {t("actionPages.orgDevelopment.badge")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                {t("actionPages.orgDevelopment.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-indigo-50/90">
                {t("actionPages.orgDevelopment.subtitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                {t("actionPages.shared.comingSoon")}
              </p>
              <p className="text-xs text-indigo-100/90">
                {t("actionPages.shared.placeholder")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={FiTrendingUp}
            title={t("actionPages.orgDevelopment.cards.structure.title")}
            desc={t("actionPages.orgDevelopment.cards.structure.desc")}
          />
          <InfoCard
            icon={FiCompass}
            title={t("actionPages.orgDevelopment.cards.strategy.title")}
            desc={t("actionPages.orgDevelopment.cards.strategy.desc")}
          />
        </div>
      </div>
    </div>
  );
}
