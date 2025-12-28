// src/App.js
import React, { useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Layout       from "./Layout";
import Login        from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";

// Dashboard
import Overview from "./pages/Overview";

// Employees
import AllEmployees     from "./pages/employees/AllEmployees";
import AddEmployee      from "./pages/employees/AddEmployee";
import EmployeeDetails  from "./pages/employees/EmployeeDetails";
import Offboarding      from "./pages/employees/Offboarding";
import Resignations     from "./pages/employees/Resignations";

// Departments
import AllDepartments   from "./pages/departments/AllDepartments";
import CreateDepartment from "./pages/departments/CreateDepartment";
import EditDepartment   from "./pages/departments/EditDepartment";

// Teams
import AllTeams   from "./pages/teams/AllTeams";
import CreateTeam from "./pages/teams/CreateTeam";

// Recruitment (internal)
import JobOpenings from "./pages/recruitment/JobOpenings";
import Applicants  from "./pages/recruitment/Applicants";
// import OfferManagement from "./pages/recruitment/OfferManagement";

// Attendance & Leave
import TimeTracking       from "./pages/attendance/TimeTracking";
import LeaveRequests      from "./pages/attendance/LeaveRequests";
// import HolidayCalendar  from "./pages/attendance/HolidayCalendar";
import ShiftSchedules     from "./pages/attendance/ShiftSchedules";
import AttendanceAdmin    from "./pages/attendance/AttendanceAdmin";
import AttendanceOverview from "./pages/attendance/AttendanceOverview";

// Payroll & Compensation
import SalaryGrades   from "./pages/payroll/SalaryGrades";
import SalaryRequests from "./pages/payroll/salaryRequests";
import Adjustments    from "./pages/payroll/Adjustments";

// Performance
import Reviews  from "./pages/performance/Reviews";
import Goals    from "./pages/performance/Goals";
import Feedback from "./pages/performance/Feedback";

// Learning & Development
import Courses        from "./pages/learning/Courses";
import Enrollments    from "./pages/learning/Enrollments";
import Certifications from "./pages/learning/Certifications";

// Quick Action Pages
import EmployeeAffairs from "./pages/actions/EmployeeAffairs";
import BenefitsRewards from "./pages/actions/BenefitsRewards";
import OrganizationalDevelopment from "./pages/actions/OrganizationalDevelopment";
import TalentManagement from "./pages/actions/TalentManagement";
import SocialInsurance from "./pages/actions/SocialInsurance";
import HealthInsurance from "./pages/actions/HealthInsurance";
import HealthInsurancePublic from "./pages/actions/HealthInsurancePublic";
import HealthInsuranceExternal from "./pages/actions/HealthInsuranceExternal";
import AttendanceDeparture from "./pages/actions/AttendanceDeparture";
import Archive from "./pages/actions/Archive";
import HiringJustifications from "./pages/actions/HiringJustifications";
import Deductions from "./pages/actions/Deductions";

// Reports & Analytics
import TurnoverReport   from "./pages/reports/TurnoverReport";
import DiversityMetrics from "./pages/reports/DiversityMetrics";
import CustomReports    from "./pages/reports/CustomReports";

// Administration
import Roles           from "./pages/admin/Roles";
import CompanySettings from "./pages/admin/CompanySettings";
import LeavePolicies   from "./pages/admin/LeavePolicies";
import Integrations    from "./pages/admin/Integrations";

// 🔓 PUBLIC (external)
import Careers  from "./pages/public/Careers";
import ApplyJob from "./pages/public/ApplyJob";

// 🔒 SUPER ADMIN (separate portal)
import TenantsDashboard        from "./pages/superadmin/TenantsDashboard";
import SuperAdminLogin         from "./pages/superadmin/SuperAdminLogin";
import SuperAdminPrivateRoute  from "./components/SuperAdminPrivateRoute";
import SuperAdminLayout        from "./pages/superadmin/SuperAdminLayout";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

function App() {
  const { i18n } = useTranslation();

  // Stable computed values -> no exhaustive-deps warning
  const { lang, dir } = useMemo(() => {
    const lng = i18n.resolvedLanguage || i18n.language || "en";
    const base = lng.split("-")[0].toLowerCase();
    const d = RTL_LANGS.has(base) ? "rtl" : "ltr";
    return { lang: lng, dir: d };
  }, [i18n.resolvedLanguage, i18n.language]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("dir", dir);
    html.setAttribute("lang", lang);
    document.body.classList.toggle("rtl", dir === "rtl"); // optional helper class
  }, [dir, lang]);

  return (
    <Routes>
      {/* PUBLIC (tenant) */}
      <Route path="/login" element={<Login />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/apply/:jobId" element={<ApplyJob />} />

      {/* PUBLIC (superadmin) */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />

      {/* PROTECTED (superadmin) */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminPrivateRoute>
            <SuperAdminLayout />
          </SuperAdminPrivateRoute>
        }
      >
        <Route index element={<Navigate to="tenants" replace />} />
        <Route path="tenants" element={<TenantsDashboard />} />
      </Route>

      {/* PROTECTED (tenant area) */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard/overview" replace />} />

        <Route path="dashboard">
          <Route path="overview" element={<Overview />} />
          <Route path="employee-affairs" element={<EmployeeAffairs />} />
          <Route path="employee-affairs/social-insurance" element={<SocialInsurance />} />
          <Route path="employee-affairs/health-insurance" element={<HealthInsurance />} />
          <Route path="employee-affairs/health-insurance/public" element={<HealthInsurancePublic />} />
          <Route path="employee-affairs/health-insurance/external" element={<HealthInsuranceExternal />} />
          <Route path="employee-affairs/attendance" element={<AttendanceDeparture />} />
          <Route path="employee-affairs/attendance/deductions" element={<Deductions />} />
          <Route path="employee-affairs/archive" element={<Archive />} />
          <Route path="employee-affairs/archive/justifications" element={<HiringJustifications />} />
          <Route path="benefits" element={<BenefitsRewards />} />
          <Route path="org-development" element={<OrganizationalDevelopment />} />
          <Route path="talent-management" element={<TalentManagement />} />
        </Route>

        <Route path="employees">
          <Route path="all" element={<AllEmployees />} />
          <Route path="add" element={<AddEmployee />} />
          <Route path="profiles/:id" element={<EmployeeDetails />} />
          <Route path="offboarding" element={<Offboarding />} />
          <Route path="profiles/:id/offboarding" element={<Offboarding />} />
          <Route path="resignations" element={<Resignations />} />
        </Route>

        <Route path="departments">
          <Route path="all" element={<AllDepartments />} />
          <Route path="create" element={<CreateDepartment />} />
          <Route path="edit/:id" element={<EditDepartment />} />
        </Route>

        <Route path="teams">
          <Route path="all" element={<AllTeams />} />
          <Route path="create" element={<CreateTeam />} />
        </Route>

        <Route path="recruitment">
          <Route path="jobs" element={<JobOpenings />} />
          <Route path="applicants" element={<Applicants />} />
          {/* <Route path="offers" element={<OfferManagement />} /> */}
        </Route>

        <Route path="attendance">
          <Route path="timesheets" element={<TimeTracking />} />
          <Route path="leave" element={<LeaveRequests />} />
          {/* <Route path="holidays" element={<HolidayCalendar />} /> */}
          <Route path="shifts" element={<ShiftSchedules />} />
          <Route path="admin" element={<AttendanceAdmin />} />
          {/* NOTE: nested path should be relative */}
          <Route path="records" element={<AttendanceOverview />} />
        </Route>

        <Route path="payroll">
          <Route path="grades" element={<SalaryGrades />} />
          <Route path="salary-requests" element={<SalaryRequests />} />
          <Route path="adjustments" element={<Adjustments />} />
        </Route>

        <Route path="performance">
          <Route path="reviews" element={<Reviews />} />
          <Route path="goals" element={<Goals />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>

        <Route path="learning">
          <Route path="courses" element={<Courses />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="certifications" element={<Certifications />} />
        </Route>

        <Route path="reports">
          <Route path="turnover" element={<TurnoverReport />} />
          <Route path="diversity" element={<DiversityMetrics />} />
          <Route path="custom" element={<CustomReports />} />
        </Route>

        <Route path="admin">
          <Route path="roles" element={<Roles />} />
          <Route path="company" element={<CompanySettings />} />
          <Route path="leave-policies" element={<LeavePolicies />} />
          <Route path="integrations" element={<Integrations />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/careers" replace />} />
    </Routes>
  );
}

export default App;
