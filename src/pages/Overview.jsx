import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiDollarSign,
  FiBriefcase,
  FiGift,
  FiTrendingUp,
  FiStar,
  FiBookOpen,
} from "react-icons/fi";

const quickActions = [
  {
    key: "employeeAffairs",
    path: "/dashboard/employee-affairs",
    icon: FiUsers,
    accent: "from-sky-500 via-blue-500 to-indigo-600",
  },
  {
    key: "payroll",
    path: "/payroll/grades",
    icon: FiDollarSign,
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    key: "recruitment",
    path: "/recruitment/jobs",
    icon: FiBriefcase,
    accent: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    key: "benefits",
    path: "/dashboard/benefits",
    icon: FiGift,
    accent: "from-fuchsia-500 via-pink-500 to-rose-500",
  },
  {
    key: "orgDevelopment",
    path: "/dashboard/org-development",
    icon: FiTrendingUp,
    accent: "from-indigo-500 via-purple-500 to-slate-600",
  },
  {
    key: "talentManagement",
    path: "/dashboard/talent-management",
    icon: FiStar,
    accent: "from-lime-500 via-green-500 to-emerald-500",
  },
  {
    key: "trainingLearning",
    path: "/learning/courses",
    icon: FiBookOpen,
    accent: "from-blue-500 via-indigo-500 to-purple-500",
  },
];

const Overview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-white p-6 md:p-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.15),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {t("overview.quickActions.badge")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                {t("overview.quickActions.heroTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-indigo-50/90">
                {t("overview.quickActions.heroSubtitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                {t("overview.quickActions.panelTitle")}
              </p>
              <p className="text-xs text-indigo-100/90">
                {t("overview.quickActions.panelSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(({ key, icon: Icon, accent, path }) => (
            <button
              key={key}
              type="button"
              onClick={() => path && navigate(path)}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition duration-200 group-hover:opacity-10`}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md shadow-slate-200`}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900">
                    {t(`overview.quickActions.cards.${key}`)}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">
                      {t("overview.quickActions.tags.en")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">
                      {t("overview.quickActions.tags.ar")}
                    </span>
                    <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[11px] sm:inline">
                      {t("overview.quickActions.tags.ready")}
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-slate-300 transition duration-200 group-hover:text-slate-500">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Overview;
