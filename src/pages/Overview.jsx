/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/Overview.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiBriefcase, 
  FiBarChart2, 
  FiCalendar, 
  FiDollarSign,
  FiClock,
  FiTrendingUp,

  FiPlus,
  FiAlertCircle
} from "react-icons/fi";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { api, isTokenExpired } from '../utils/api';

const Overview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);

  // Check authentication status
  const checkAuth = () => {
    const token = localStorage.getItem('fb_id_token');
    const tenantId = localStorage.getItem('currentTenantId') || localStorage.getItem('tenantId');
    
    if (!token || isTokenExpired(token) || !tenantId) {
      setAuthError(true);
      setError(t('overview.errors.loginToAccess'));
      return false;
    }
    return true;
  };

  // Fetch all dashboard data using your API utility
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        setAuthError(false);

        // Check authentication first
        if (!checkAuth()) {
          setLoading(false);
          return;
        }

        // Fetch key metrics from multiple endpoints using your API utility
        const [
          employeesRes,
          jobsRes,
          leaveRes,
          departmentsRes
        ] = await Promise.all([
          api('/api/employees'),
          api('/api/recruitment/jobs?status=open'),
          api('/api/leave?status=Pending&limit=50'),
          api('/api/departments')
        ]);

        // Check if any response is unauthorized
        if (employeesRes.status === 401 || jobsRes.status === 401) {
          setAuthError(true);
          setError(t('overview.errors.sessionExpired'));
          setLoading(false);
          return;
        }

        if (!employeesRes.ok) {
          throw new Error(`Failed to fetch employees: ${employeesRes.status}`);
        }

        const employees = await employeesRes.json();
        const openJobs = await jobsRes.ok ? await jobsRes.json() : [];
        const pendingLeaves = await leaveRes.ok ? await leaveRes.json() : [];
        const departments = await departmentsRes.ok ? await departmentsRes.json() : [];

        // Calculate metrics
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
        const openPositions = Array.isArray(openJobs) ? openJobs.length : 0;
        
        // Calculate turnover rate
        const exitedEmployees = employees.filter(emp => emp.status === 'Offboarded').length;
        const turnoverRate = totalEmployees > 0 ? ((exitedEmployees / totalEmployees) * 100).toFixed(1) : 0;

        // Calculate upcoming leaves (next 7 days)
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingLeaves = Array.isArray(pendingLeaves) ? pendingLeaves.filter(leave => {
          const fromDate = new Date(leave.from);
          return fromDate >= today && fromDate <= nextWeek;
        }).length : 0;

        // Calculate average salary
        const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
        const avgSalary = totalEmployees > 0 ? Math.round(totalSalary / totalEmployees) : 0;

        // Mock attendance rate (you can replace with actual attendance API)
        const attendanceRate = 94.5;

        setMetrics({
          totalEmployees,
          activeEmployees,
          openPositions,
          turnoverRate,
          upcomingLeaves,
          avgSalary,
          attendanceRate,
          trainingCompletion: 78,
          budgetUtilization: 82
        });

        // Generate hires vs exits chart data (last 6 months)
        const currentMonth = new Date().getMonth();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map(month => ({
          month,
          hires: Math.floor(Math.random() * 20) + 5,
          exits: Math.floor(Math.random() * 8) + 1
        }));
        setChartData(chartData);

        // Generate leave distribution data
        const leaveDistribution = [
          { name: t('overview.leaveTypes.annual'), value: 45, color: '#4f46e5' },
          { name: t('overview.leaveTypes.sick'), value: 25, color: '#ef4444' },
          { name: t('overview.leaveTypes.emergency'), value: 15, color: '#f59e0b' },
          { name: t('overview.leaveTypes.unpaid'), value: 10, color: '#6b7280' },
          { name: t('overview.leaveTypes.other'), value: 5, color: '#10b981' },
        ];
        setLeaveData(leaveDistribution);

        // Generate department data
        const departmentStats = Array.isArray(departments) ? departments.map(dept => {
          const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
          const growth = Math.floor(Math.random() * 20) + 1;
          const colors = ['blue', 'green', 'purple', 'yellow', 'red', 'indigo', 'pink'];
          return {
            name: dept.name,
            employees: deptEmployees.length,
            growth: `+${growth}%`,
            color: `bg-${colors[departments.indexOf(dept) % colors.length]}-500`
          };
        }) : [];

        setDepartmentData(departmentStats);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message);
        // Fallback to mock data for demo purposes
        setMetrics({
          totalEmployees: 142,
          activeEmployees: 138,
          openPositions: 8,
          turnoverRate: 3.2,
          upcomingLeaves: 12,
          avgSalary: 65000,
          attendanceRate: 94.5,
          trainingCompletion: 78,
          budgetUtilization: 82
        });
        
        setChartData([
          { month: 'Jan', hires: 12, exits: 2 },
          { month: 'Feb', hires: 8, exits: 1 },
          { month: 'Mar', hires: 15, exits: 3 },
          { month: 'Apr', hires: 10, exits: 2 },
          { month: 'May', hires: 18, exits: 4 },
          { month: 'Jun', hires: 14, exits: 2 },
        ]);
        
        setLeaveData([
          { name: t('overview.leaveTypes.annual'), value: 45, color: '#4f46e5' },
          { name: t('overview.leaveTypes.sick'), value: 25, color: '#ef4444' },
          { name: t('overview.leaveTypes.emergency'), value: 15, color: '#f59e0b' },
          { name: t('overview.leaveTypes.unpaid'), value: 10, color: '#6b7280' },
          { name: t('overview.leaveTypes.other'), value: 5, color: '#10b981' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Listen for auth expiration events
    const handleAuthExpired = () => {
      setAuthError(true);
      setError(t('overview.errors.sessionExpired'));
      setLoading(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [t]);

  const metricCards = [
    {
      label: t('overview.metrics.totalEmployees'),
      value: metrics?.totalEmployees || 0,
      change: "+12%",
      trend: "up",
      icon: <FiUsers className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-blue-500 to-blue-600",
      description: `${metrics?.activeEmployees || 0} ${t('overview.metrics.activeEmployees')}`
    },
    {
      label: t('overview.metrics.openPositions'),
      value: metrics?.openPositions || 0,
      change: "-3%",
      trend: "down",
      icon: <FiBriefcase className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-green-500 to-green-600",
      description: t('overview.metrics.acrossDepartments')
    },
    {
      label: t('overview.metrics.turnoverRate'),
      value: `${metrics?.turnoverRate || 0}%`,
      change: "-1.2%",
      trend: "down",
      icon: <FiBarChart2 className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-red-500 to-red-600",
      description: t('overview.metrics.last30Days')
    },
    {
      label: t('overview.metrics.upcomingLeaves'),
      value: metrics?.upcomingLeaves || 0,
      change: "+5",
      trend: "up",
      icon: <FiCalendar className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-yellow-500 to-yellow-600",
      description: t('overview.metrics.next7Days')
    },
    {
      label: t('overview.metrics.avgSalary'),
      value: `$${(metrics?.avgSalary || 0).toLocaleString()}`,
      change: "+4.2%",
      trend: "up",
      icon: <FiDollarSign className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-purple-500 to-purple-600",
      description: t('overview.metrics.annualBase')
    },
    {
      label: t('overview.metrics.attendanceRate'),
      value: `${metrics?.attendanceRate || 0}%`,
      change: "+2.1%",
      trend: "up",
      icon: <FiClock className="w-5 h-5" />,
      bg: "bg-gradient-to-r from-indigo-500 to-indigo-600",
      description: t('overview.metrics.currentMonth')
    },
  ];


  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Navigation handlers for quick actions
  const handleNavigateTo = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <div className="bg-gray-200 rounded-lg h-80"></div>
            <div className="bg-gray-200 rounded-lg h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('overview.errors.authenticationRequired')}</h2>
          <p className="text-gray-600 mb-6">{error || t('overview.errors.loginToAccess')}</p>
          <div className="space-x-3">
            <button 
              onClick={handleLoginRedirect}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              {t('overview.actions.goToLogin')}
            </button>
            <button 
              onClick={handleRetry}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              {t('overview.actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !authError) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiAlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">{t('overview.errors.demoMode')}</h2>
          <p className="text-yellow-700 mb-4">
            {t('overview.errors.showingDemoData')}
          </p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
          >
            {t('overview.errors.retryConnection')}
          </button>
        </div>
        
        {/* Show demo data even when there's an error */}
        <div className="mt-6">
          {/* Rest of the dashboard content with demo data */}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('overview.title')}</h1>
          <p className="text-gray-600 mt-1">{t('overview.welcome')}</p>
        </div>
        <div className="flex space-x-3">
         
          <button 
            onClick={handleAddEmployee}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>{t('overview.buttons.addEmployee')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((metric, index) => (
          <div
            key={metric.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${metric.bg} text-white`}>
                {metric.icon}
              </div>
              <span className={`text-sm font-medium flex items-center ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <FiTrendingUp className={`w-4 h-4 mr-1 ${
                  metric.trend === 'down' ? 'transform rotate-180' : ''
                }`} />
                {metric.change}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500 mt-1">{metric.label}</p>
              <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hires vs Exits Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('overview.charts.hiresVsExits')}</h2>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
              <option>{t('overview.charts.timePeriods.last6Months')}</option>
              <option>{t('overview.charts.timePeriods.last12Months')}</option>
              <option>{t('overview.charts.timePeriods.yearToDate')}</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="hires" name={t('overview.charts.newHires')} fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" name={t('overview.charts.exits')} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leave Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('overview.charts.leaveDistribution')}</h2>
            <span className="text-sm text-gray-500">{t('overview.charts.thisMonth')}</span>
          </div>
          <div className="flex flex-col lg:flex-row items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="lg:pl-6 mt-4 lg:mt-0 w-full lg:w-1/2">
              <div className="space-y-3">
                {leaveData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('overview.department.overview')}</h2>
          <div className="space-y-4">
            {departmentData.map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${dept.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{dept.employees} {t('overview.department.employees')}</span>
                  <span className="text-sm text-green-600 font-medium">{dept.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('overview.quickActions.title')}</h2>
          <div className="space-y-3">
            {[
              { 
                label: t('overview.quickActions.processPayroll'), 
                icon: '💰', 
                action: '/payroll/grades' 
              },
              { 
                label: t('overview.quickActions.scheduleInterview'), 
                icon: '📅', 
                action: '/recruitment/jobs' 
              },
              { 
                label: t('overview.quickActions.approveLeave'), 
                icon: '✅', 
                action: '/attendance/leave' 
              },
             
              { 
                label: t('overview.quickActions.addNewEmployee'), 
                icon: '👤', 
                action: '/employees/add' 
              },
            ].map((action, index) => (
              <button
                key={action.label}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors duration-150 border border-gray-100"
                onClick={() => handleNavigateTo(action.action)}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;