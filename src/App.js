// src/App.js

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout       from "./Layout";
import Login        from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";

// Dashboard
import Overview from "./pages/Overview";

// Employees
import AllEmployees  from "./pages/employees/AllEmployees";
import AddEmployee   from "./pages/employees/AddEmployee";      // ← new
import Offboarding   from "./pages/employees/Offboarding";

// Departments
import AllDepartments    from "./pages/departments/AllDepartments";
import CreateDepartment  from "./pages/departments/CreateDepartment";

// Teams
import AllTeams    from "./pages/teams/AllTeams";
import CreateTeam  from "./pages/teams/CreateTeam";

// Recruitment
import JobOpenings     from "./pages/recruitment/JobOpenings";
import Applicants      from "./pages/recruitment/Applicants";
import InterviewStages from "./pages/recruitment/InterviewStages";
import OfferManagement from "./pages/recruitment/OfferManagement";

// Attendance & Leave
import TimeTracking    from "./pages/attendance/TimeTracking";
import LeaveRequests   from "./pages/attendance/LeaveRequests";
import HolidayCalendar from "./pages/attendance/HolidayCalendar";
import ShiftSchedules  from "./pages/attendance/ShiftSchedules";

// Payroll & Compensation
import SalaryGrades from "./pages/payroll/SalaryGrades";
import Payslips     from "./pages/payroll/Payslips";
import Adjustments  from "./pages/payroll/Adjustments";

// Performance
import Reviews  from "./pages/performance/Reviews";
import Goals    from "./pages/performance/Goals";
import Feedback from "./pages/performance/Feedback";

// Learning & Development
import Courses        from "./pages/learning/Courses";
import Enrollments    from "./pages/learning/Enrollments";
import Certifications from "./pages/learning/Certifications";

// Reports & Analytics
import TurnoverReport  from "./pages/reports/TurnoverReport";
import DiversityMetrics from "./pages/reports/DiversityMetrics";
import CustomReports    from "./pages/reports/CustomReports";

// Administration
import Roles         from "./pages/admin/Roles";
import CompanySettings from "./pages/admin/CompanySettings";
import LeavePolicies   from "./pages/admin/LeavePolicies";
import Integrations    from "./pages/admin/Integrations";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Redirect to overview */}
        <Route index element={<Navigate to="dashboard/overview" replace />} />

        {/* Dashboard */}
        <Route path="dashboard">
          <Route path="overview" element={<Overview />} />
        </Route>

        {/* Employees */}
        <Route path="employees">
          <Route path="all"    element={<AllEmployees />} />
          <Route path="add"    element={<AddEmployee />} />
          <Route path="offboarding" element={<Offboarding />} />
        </Route>

        {/* Departments */}
        <Route path="departments">
          <Route path="all"    element={<AllDepartments />} />
          <Route path="create" element={<CreateDepartment />} />
        </Route>

        {/* Teams */}
        <Route path="teams">
          <Route path="all"    element={<AllTeams />} />
          <Route path="create" element={<CreateTeam />} />
        </Route>

        {/* Recruitment */}
        <Route path="recruitment">
          <Route path="jobs"       element={<JobOpenings />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="interviews" element={<InterviewStages />} />
          <Route path="offers"     element={<OfferManagement />} />
        </Route>

        {/* Attendance & Leave */}
        <Route path="attendance">
          <Route path="timesheets" element={<TimeTracking />} />
          <Route path="leave"      element={<LeaveRequests />} />
          <Route path="holidays"   element={<HolidayCalendar />} />
          <Route path="shifts"     element={<ShiftSchedules />} />
        </Route>

        {/* Payroll & Compensation */}
        <Route path="payroll">
          <Route path="grades"      element={<SalaryGrades />} />
          <Route path="payslips"    element={<Payslips />} />
          <Route path="adjustments" element={<Adjustments />} />
        </Route>

        {/* Performance */}
        <Route path="performance">
          <Route path="reviews"  element={<Reviews />} />
          <Route path="goals"    element={<Goals />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>

        {/* Learning & Development */}
        <Route path="learning">
          <Route path="courses"        element={<Courses />} />
          <Route path="enrollments"    element={<Enrollments />} />
          <Route path="certifications" element={<Certifications />} />
        </Route>

        {/* Reports & Analytics */}
        <Route path="reports">
          <Route path="turnover" element={<TurnoverReport />} />
          <Route path="diversity" element={<DiversityMetrics />} />
          <Route path="custom"   element={<CustomReports />} />
        </Route>

        {/* Administration */}
        <Route path="admin">
          <Route path="roles"          element={<Roles />} />
          <Route path="company"        element={<CompanySettings />} />
          <Route path="leave-policies" element={<LeavePolicies />} />
          <Route path="integrations"   element={<Integrations />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
