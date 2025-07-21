// src/components/Sidebar.jsx

import React, { useState, useEffect } from "react";
import {
  FiSettings,
  FiGrid,
  FiChevronDown,
  FiMenu,
  FiUsers,
  FiLayers,
  FiBriefcase,
  FiClock,
  FiCreditCard,
  FiActivity,
  FiBook,
  FiBarChart2,
  FiUser,
  FiGlobe,
} from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Sidebar = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("");
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const switchLanguage = () =>
    i18n.changeLanguage(i18n.language === "en" ? "ar" : "en");

  const menuItems = [
    {
      key: "menu.dashboard",
      icon: <FiGrid />,
      sub: [{ key: "menu.overview", path: "/dashboard/overview" }],
    },
    {
      key: "menu.employees",
      icon: <FiUsers />,
      sub: [
        { key: "menu.allEmployees", path: "/employees/all" },
        // { key: "menu.profiles", path: "/employees/profiles" },
         { key: "menu.addEmployee",  path: "/employees/add" },
        // { key: "menu.onboarding", path: "/employees/onboarding" },
        { key: "menu.offboarding", path: "/employees/offboarding" },
      ],
    },
    {
      key: "menu.departments",
      icon: <FiLayers />,
      sub: [
        { key: "menu.allDepartments", path: "/departments/all" },
        { key: "menu.createDept", path: "/departments/create" },
        { key: "--divider--" },
        { key: "menu.allTeams", path: "/teams/all" },
        { key: "menu.createTeam", path: "/teams/create" },
      ],
    },
    {
      key: "menu.recruitment",
      icon: <FiBriefcase />,
      sub: [
        { key: "menu.jobs", path: "/recruitment/jobs" },
        { key: "menu.applicants", path: "/recruitment/applicants" },
        { key: "menu.interviews", path: "/recruitment/interviews" },
        { key: "menu.offers", path: "/recruitment/offers" },
      ],
    },
    {
      key: "menu.attendance",
      icon: <FiClock />,
      sub: [
        { key: "menu.timesheets", path: "/attendance/timesheets" },
        { key: "menu.leave", path: "/attendance/leave" },
        { key: "menu.holidays", path: "/attendance/holidays" },
        { key: "menu.shifts", path: "/attendance/shifts" },
      ],
    },
    {
      key: "menu.payroll",
      icon: <FiCreditCard />,
      sub: [
        { key: "menu.grades", path: "/payroll/grades" },
        { key: "menu.payslips", path: "/payroll/payslips" },
        { key: "menu.adjustments", path: "/payroll/adjustments" },
      ],
    },
    {
      key: "menu.performance",
      icon: <FiActivity />,
      sub: [
        { key: "menu.reviews", path: "/performance/reviews" },
        { key: "menu.goals", path: "/performance/goals" },
        { key: "menu.feedback", path: "/performance/feedback" },
      ],
    },
    {
      key: "menu.learning",
      icon: <FiBook />,
      sub: [
        { key: "menu.courses", path: "/learning/courses" },
        { key: "menu.enrollments", path: "/learning/enrollments" },
        { key: "menu.certifications", path: "/learning/certifications" },
      ],
    },
    {
      key: "menu.reports",
      icon: <FiBarChart2 />,
      sub: [
        { key: "menu.turnover", path: "/reports/turnover" },
        { key: "menu.diversity", path: "/reports/diversity" },
        { key: "menu.customReports", path: "/reports/custom" },
      ],
    },
    {
      key: "menu.admin",
      icon: <FiSettings />,
      sub: [
        { key: "menu.roles", path: "/admin/roles" },
        { key: "menu.company", path: "/admin/company" },
        { key: "menu.leavePolicies", path: "/admin/leave-policies" },
        { key: "menu.integrations", path: "/admin/integrations" },
      ],
    },
    {
      key: "menu.account",
      icon: <FiUser />,
      sub: [
        { key: "menu.profile", path: "/account/profile" },
        { key: "menu.password", path: "/account/password" },
        { key: "menu.notifications", path: "/account/notifications" },
        { key: "menu.signout", path: "/account/signout" },
        { key: "langToggle", action: switchLanguage, icon: <FiGlobe /> },
      ],
    },
  ];

  const toggleMenu = (key) =>
    setActiveMenu((prev) => (prev === key ? "" : key));

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`bg-white shadow-lg text-gray-800 h-full flex flex-col transition-all duration-300 ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) setActiveMenu("");
              }}
              className={`p-2 rounded-full focus:outline-none transition-transform duration-300 ${
                isOpen ? "rotate-0" : "rotate-180"
              }`}
              aria-label={
                isOpen ? t("Collapse sidebar") : t("Expand sidebar")
              }
            >
              <FiMenu size={20} />
            </button>
            {isOpen && (
              <span className="font-bold text-lg text-gray-900 text-left rtl:text-right">
                {t("header")}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-4">
          {menuItems.map((item) => {
            const open = activeMenu === item.key;
            return (
              <div key={item.key} className="mb-1">
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`flex items-center justify-between w-full px-5 py-3 ${
                    open
                      ? "text-blue-600 border-l-4 border-blue-500 bg-blue-50"
                      : "text-gray-700 hover:bg-gray-100"
                  } rounded-r-lg transition-all duration-200`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {isOpen && (
                      <span className="font-medium text-sm text-left rtl:text-right">
                        {t(item.key)}
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <FiChevronDown
                      className={`transform transition-transform duration-200 ${
                        open ? "rotate-180 text-blue-500" : "text-gray-400"
                      }`}
                    />
                  )}
                </button>
                {isOpen && open && (
                  <div className="pl-12 pr-4 pb-3 space-y-1 rtl:pl-0 rtl:pr-12">
                    {item.sub.map((sub) => {
                      if (sub.key === "--divider--") {
                        return <hr key="divider" className="my-2 border-gray-200" />;
                      }
                      return sub.path ? (
                        <Link
                          key={sub.key}
                          to={sub.path}
                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors duration-200 text-left rtl:text-right ${
                            location.pathname === sub.path
                              ? "bg-blue-500 text-white"
                              : "text-gray-700 hover:bg-blue-100"
                          }`}
                        >
                          {sub.icon}
                          {t(sub.key)}
                        </Link>
                      ) : (
                        <button
                          key={sub.key}
                          onClick={sub.action}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-left rtl:text-right"
                        >
                          {sub.icon}
                          {t(sub.key)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`p-4 border-t text-center text-xs text-gray-500 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          {t("footer")}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
