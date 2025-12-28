import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FiHome, FiGlobe } from "react-icons/fi";

const Block = ({ icon: Icon, title, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </button>
);

export default function HealthInsurance() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-white p-6 md:p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_26%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {t("actionPages.healthInsurance.badge")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                {t("actionPages.healthInsurance.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-rose-50/90">
                {t("actionPages.healthInsurance.subtitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                {t("actionPages.shared.comingSoon")}
              </p>
              <p className="text-xs text-rose-100/90">
                {t("actionPages.shared.placeholder")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block
            icon={FiHome}
            title={t("actionPages.healthInsurance.cards.public.title")}
            desc={t("actionPages.healthInsurance.cards.public.desc")}
            onClick={() => navigate("/dashboard/employee-affairs/health-insurance/public")}
          />
          <Block
            icon={FiGlobe}
            title={t("actionPages.healthInsurance.cards.external.title")}
            desc={t("actionPages.healthInsurance.cards.external.desc")}
            onClick={() => navigate("/dashboard/employee-affairs/health-insurance/external")}
          />
        </div>
      </div>
    </div>
  );
}
