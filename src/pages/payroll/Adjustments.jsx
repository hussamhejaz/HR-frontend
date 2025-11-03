// src/pages/payroll/AdjustmentsPro.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * AdjustmentsPro — HR-friendly attendance deductions
 * ---------------------------------------------------
 * Data sources:
 * - Employees                         GET /api/employees?limit=1000
 * - Attendance range                  GET /api/attendance/range?from=&to=
 * - Holidays                          GET /api/calendar/holidays?from=&to=
 * - Approved leave                    GET /api/leave?status=Approved&from=&to=&limit=10000
 * - Approved salary advances          GET /api/salary/requests?status=Approved&type=advance&from=&to=&limit=10000
 * - Published shifts (roster)         GET /api/attendance/shifts?from=&to=&published=true&limit=10000
 * - Bulk create payroll adjustments   POST /api/payroll/adjustments/bulk  { items: [...] }
 */

const API_BASE = "https://hr-backend-npbd.onrender.com/api";
const EMP_API  = `${API_BASE}/employees?limit=1000`;
const ATT_API  = `${API_BASE}/attendance/range`;
const HOL_API  = `${API_BASE}/calendar/holidays`;
const LEAVE_API= `${API_BASE}/leave`;
const ADV_API  = `${API_BASE}/salary/requests`;
const SHF_API  = `${API_BASE}/attendance/shifts`; // ✅ correct mount
const ADJ_API  = `${API_BASE}/payroll/adjustments/bulk`;

/* ------------------------------ auth headers ------------------------------ */
const getTenantId = () =>
  localStorage.getItem("currentTenantId") ||
  localStorage.getItem("tenantId") ||
  localStorage.getItem("tenant_id") ||
  "";
const getIdToken = () => localStorage.getItem("fb_id_token") || "";
const getAuthHeaders = () => {
  const h = { Accept: "application/json" };
  const t = getIdToken();
  const tenantId = getTenantId();
  if (t) h.Authorization = `Bearer ${t}`;
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  return h;
};
async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      ...getAuthHeaders(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes("application/json")) {
        const j = JSON.parse(text);
        if (j?.error || j?.message) msg = j.error || j.message;
      } else if (text) msg = text;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  if (ct.includes("application/json")) return JSON.parse(text);
  throw new Error(`Expected JSON but got '${ct}'. Sample: ${text.slice(0,200)}`);
}

/* ---------------------------- date/time helpers --------------------------- */
const ymd = (d) => {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${mm}-${dd}`;
};
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const isWeekend = (dateYMD, workweek = "sun-thu") => {
  const dow = new Date(dateYMD).getDay(); // 0 Sun ... 6 Sat
  if (workweek === "mon-fri") return dow === 0 || dow === 6; // Sun or Sat
  return dow === 5 || dow === 6; // GCC: Fri(5), Sat(6)
};

/* ------------------------------ policy caps ------------------------------- */
const MAX_LATE_PCT_DEFAULT  = 0.50; // <= 50% of base via lateness
const MAX_TOTAL_PCT_DEFAULT = 1.00; // <= 100% of base total

/* ------------------------------- UI atoms --------------------------------- */
const Badge = ({ tone = "gray", title, children }) => (
  <span
    title={title}
    className={
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs " +
      (tone === "red"
        ? "bg-red-100 text-red-700"
        : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : tone === "green"
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-700")
    }
  >
    {children}
  </span>
);
function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
function Card({ title, value, hint }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-[11px] text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

/* ----------------------------- data fetchers ------------------------------ */
async function fetchEmployees() {
  const data = await http("GET", EMP_API);
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  return [];
}
async function fetchAttendanceRange(fromYMD, toYMD) {
  const url = `${ATT_API}?from=${encodeURIComponent(fromYMD)}&to=${encodeURIComponent(toYMD)}`;
  const raw = await http("GET", url);
  const byDateEmp = {};
  if (Array.isArray(raw)) {
    for (const rec of raw) {
      const d = rec.date || (rec.id ? String(rec.id).split("/")[0] : null);
      const emp = rec.employeeId || (rec.id ? String(rec.id).split("/")[1] : null);
      if (!d || !emp) continue;
      byDateEmp[d] = byDateEmp[d] || {};
      byDateEmp[d][emp] = { ...rec, date: d, employeeId: emp };
    }
  } else if (raw?.byDateEmp) {
    return raw;
  }
  return { byDateEmp };
}
async function fetchHolidays(fromYMD, toYMD) {
  try {
    const url = `${HOL_API}?from=${encodeURIComponent(fromYMD)}&to=${encodeURIComponent(toYMD)}`;
    const arr = await http("GET", url);
    if (Array.isArray(arr)) {
      return new Set(arr.map((h) => (h.date || "").slice(0, 10)).filter(Boolean));
    }
  } catch {}
  return new Set();
}
async function fetchApprovedLeaves(fromYMD, toYMD) {
  const url = `${LEAVE_API}?status=Approved&from=${encodeURIComponent(fromYMD)}&to=${encodeURIComponent(toYMD)}&limit=10000`;
  const rows = await http("GET", url);
  return Array.isArray(rows) ? rows : [];
}
async function fetchApprovedAdvances(fromYMD, toYMD) {
  // Only advances with expectedDate inside the selected month
  const q = new URLSearchParams({
    status: "Approved",
    type: "advance",
    from: fromYMD,
    to: toYMD,
    limit: "10000",
  });
  const url = `${ADV_API}?${q.toString()}`;
  const rows = await http("GET", url);
  return Array.isArray(rows) ? rows : [];
}
/** Published shifts (roster) -> index */
async function fetchShifts(fromYMD, toYMD) {
  const q = new URLSearchParams({
    from: fromYMD,
    to: toYMD,
    published: "true",
    limit: "10000",
  });
  const rows = await http("GET", `${SHF_API}?${q.toString()}`);
  const byDateEmp = {};
  for (const s of Array.isArray(rows) ? rows : []) {
    const d = s.date;
    const empId = s.employee?.id || s.employeeId;
    if (!d || !empId) continue;
    byDateEmp[d] = byDateEmp[d] || {};
    byDateEmp[d][empId] = byDateEmp[d][empId] || [];
    byDateEmp[d][empId].push({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      role: s.role || "",
      location: s.location || "",
    });
  }
  for (const d of Object.keys(byDateEmp)) {
    for (const emp of Object.keys(byDateEmp[d])) {
      byDateEmp[d][emp].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    }
  }
  return { byDateEmp };
}

/* ------------------------------ leave helpers ----------------------------- */
function explodeLeaveDays(leave) {
  const out = new Map();
  const paid = !!leave.paid;
  const start = new Date(leave.from);
  const end   = new Date(leave.to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    let frac = 1;
    if (leave.halfDayStart && k === ymd(start)) frac -= 0.5;
    if (leave.halfDayEnd   && k === ymd(end))   frac -= 0.5;
    out.set(k, paid ? 0 : Math.max(0, frac));
  }
  return out;
}

/* ------------------------------ calculations ------------------------------ */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmtMoney = (n, cur) => {
  const v = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "USD", maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${cur || ""} ${v.toFixed(2)}`;
  }
};
function minutesLate(checkInISO, shiftHHMM = "09:00", graceMin = 10) {
  if (!checkInISO) return 0;
  const inAt = new Date(checkInISO);
  const [hh, mm] = String(shiftHHMM).split(":").map(Number);
  const start = new Date(inAt);
  start.setHours(hh || 0, mm || 0, 0, 0);
  const diff = (inAt - start) / 60000;
  const late = Math.max(0, Math.floor(diff) - (Number(graceMin) || 0));
  return late > 0 ? late : 0;
}
const earliestShiftStart = (shiftsByDateEmp, dateYMD, empId, fallback) => {
  const arr = shiftsByDateEmp?.[dateYMD]?.[empId];
  return Array.isArray(arr) && arr.length ? arr[0].startTime : fallback;
};

/* ================================== UI =================================== */
export default function AdjustmentsPro() {
  const { t } = useTranslation();

  // Month picker defaults to current month
  const [pickedMonth, setPickedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Rule settings (can be promoted to a settings page later)
  const [workweek, setWorkweek] = useState("sun-thu");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [grace, setGrace] = useState(10);
  const [ratePerMinute, setRatePerMinute] = useState(1);
  const [absenceMode, setAbsenceMode] = useState("dailySalary"); // "dailySalary" | "fixed"
  const [absenceFixedAmount, setAbsenceFixedAmount] = useState(0);
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState(22);
  const [currency, setCurrency] = useState("SAR");

  // Shifts + holidays toggles
  const [useShifts, setUseShifts] = useState(true);
  const [useServerHolidays, setUseServerHolidays] = useState(true);
  const [manualHolidayText, setManualHolidayText] = useState("");

  // Data
  const [employees, setEmployees] = useState([]);
  const [attData, setAttData] = useState({ byDateEmp: {} });
  const [serverHolidays, setServerHolidays] = useState(new Set());
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [approvedAdvances, setApprovedAdvances] = useState([]);
  const [shifts, setShifts] = useState({ byDateEmp: {} });

  // UX
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [onlyWithDeductions, setOnlyWithDeductions] = useState(true);
  const [sortKey, setSortKey] = useState("total"); // "total" | "name"
  const [descending, setDescending] = useState(true);
  const [detailEmp, setDetailEmp] = useState(null); // { id, name, row }

  const { fromYMD, toYMD } = useMemo(() => {
    const [yyyy, mm] = pickedMonth.split("-").map(Number);
    const first = firstOfMonth(new Date(yyyy, (mm || 1) - 1, 1));
    const last = lastOfMonth(first);
    return { fromYMD: ymd(first), toYMD: ymd(last) };
  }, [pickedMonth]);

  const manualHolidaySet = useMemo(() => {
    const lines = manualHolidayText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(lines);
  }, [manualHolidayText]);

  const holidaySet = useMemo(
    () => (useServerHolidays ? serverHolidays : manualHolidaySet),
    [useServerHolidays, serverHolidays, manualHolidaySet]
  );
  const isHoliday = useCallback((dateYMD) => holidaySet.has(dateYMD), [holidaySet]);

  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(fromYMD);
    const end = new Date(toYMD);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(ymd(d));
    return days;
  }, [fromYMD, toYMD]);

  // Index: employeeId => Map(ymd => unpaid fraction)
  const leaveIndex = useMemo(() => {
    const byEmp = new Map();
    for (const L of approvedLeaves) {
      const empId = L.employee?.id || L.employeeId || L.empId;
      if (!empId) continue;
      const daysMap = explodeLeaveDays(L);
      if (!byEmp.has(empId)) byEmp.set(empId, new Map());
      const tgt = byEmp.get(empId);
      for (const [d, f] of daysMap) {
        tgt.set(d, Math.max(f, tgt.get(d) || 0));
      }
    }
    return byEmp;
  }, [approvedLeaves]);

  // Index: employeeId -> { count, total, items }
  const advancesIndex = useMemo(() => {
    const m = new Map();
    for (const r of approvedAdvances) {
      const empId = r.employeeId;
      if (!empId) continue;
      const cur = m.get(empId) || { count: 0, total: 0, items: [] };
      const amt = Number(r.amount) || 0;
      cur.count += 1;
      cur.total += amt;
      cur.items.push({ id: r.id, expectedDate: r.expectedDate, amount: amt, currency: r.currency });
      m.set(empId, cur);
    }
    return m;
  }, [approvedAdvances]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [emps, att, hols, leaves, advs, shf] = await Promise.all([
        fetchEmployees(),
        fetchAttendanceRange(fromYMD, toYMD),
        fetchHolidays(fromYMD, toYMD),
        fetchApprovedLeaves(fromYMD, toYMD),
        fetchApprovedAdvances(fromYMD, toYMD), // ✅ advances filtered to this month
        fetchShifts(fromYMD, toYMD),
      ]);
      setEmployees(emps);
      setAttData(att);
      setServerHolidays(hols);
      setApprovedLeaves(leaves);
      setApprovedAdvances(advs);
      setShifts(shf);
    } catch (e) {
      setErr(e.message || t("errors.loadFailed", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [fromYMD, toYMD, t]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ----------------------------- core rows ----------------------------- */
  const baseRows = useMemo(() => {
    if (!employees.length) return [];
    const { byDateEmp } = attData;
    const shiftsBy = shifts.byDateEmp || {};
    const out = [];

    for (const emp of employees) {
      const empId = emp.id || emp.employeeId || emp.key;
      if (!empId) continue;

      const base = Number(emp.baseSalary || emp.salary || 0);
      let lateCount = 0;
      let lateMinutesTotal = 0;
      let absences = 0;

      const daysExplained = []; // for drawer

      for (const d of calendarDays) {
        const hasShift = useShifts && Array.isArray(shiftsBy?.[d]?.[empId]) && shiftsBy[d][empId].length > 0;
        if (!hasShift) {
          if (isWeekend(d, workweek) || isHoliday(d)) {
            daysExplained.push({ date: d, status: t("detailsDrawer.nonWorking", "Non-working"), note: isHoliday(d) ? t("detailsDrawer.holiday", "Holiday") : t("detailsDrawer.weekend", "Weekend") });
            continue;
          }
        }

        const leaveFrac = leaveIndex.get(empId)?.get(d) || 0;
        const rec = byDateEmp?.[d]?.[empId];
        const hasCheckIn = !!(rec && rec.checkInAt);

        if (leaveFrac > 0) {
          absences += leaveFrac;
          daysExplained.push({ 
            date: d, 
            status: leaveFrac === 1 
              ? t("detailsDrawer.unpaidLeaveFull", "Unpaid leave (1.0)") 
              : t("detailsDrawer.unpaidLeaveHalf", "Unpaid half-day (0.5)") 
          });
          continue;
        }

        if (!hasCheckIn) {
          absences += 1;
          daysExplained.push({ date: d, status: t("detailsDrawer.absent", "Absent") });
          continue;
        }

        const startHHMM = hasShift ? earliestShiftStart(shiftsBy, d, empId, shiftStart) : shiftStart;
        const mLate = minutesLate(rec.checkInAt, startHHMM, Number(grace) || 0);
        if (mLate > 0) {
          lateCount += 1;
          lateMinutesTotal += mLate;
          daysExplained.push({ 
            date: d, 
            status: t("detailsDrawer.lateMinutes", "Late {minutes} min", { minutes: mLate }), 
            checkInAt: rec.checkInAt, 
            shiftStart: startHHMM 
          });
        } else {
          daysExplained.push({ 
            date: d, 
            status: t("detailsDrawer.onTime", "On time"), 
            checkInAt: rec.checkInAt, 
            shiftStart: startHHMM 
          });
        }
      }

      // Raw deductions
      const lateRaw = lateMinutesTotal * (Number(ratePerMinute) || 0);
      let absenceRaw = 0;
      if (absences > 0) {
        if (absenceMode === "dailySalary") {
          const daily = workingDaysInMonth > 0 ? base / Number(workingDaysInMonth) : 0;
          absenceRaw = daily * absences;
        } else {
          absenceRaw = absences * (Number(absenceFixedAmount) || 0);
        }
      }

      // Caps
      const absenceDeduction = round2(Math.min(absenceRaw, base * MAX_TOTAL_PCT_DEFAULT));
      const remainingAfterAbs = Math.max(0, base - absenceDeduction);
      const lateCapByPct = base * MAX_LATE_PCT_DEFAULT;
      const lateDeduction = round2(Math.min(lateRaw, lateCapByPct, remainingAfterAbs));
      const total = round2(Math.min(base * MAX_TOTAL_PCT_DEFAULT, absenceDeduction + lateDeduction));
      const netPay = round2(Math.max(0, base - total));

      out.push({
        employeeId: empId,
        employeeName:
          [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() ||
          emp.fullName || emp.displayName || emp.code || emp.employeeCode || empId,
        baseSalary: base,
        lateCount,
        lateMinutesTotal,
        absences,
        lateDeduction,
        absenceDeduction,
        total,
        netPay,
        _lateCapped: lateDeduction < lateRaw,
        _totalCapped: total < absenceDeduction + lateDeduction || total >= base,
        advances: advancesIndex.get(empId) || { count: 0, total: 0, items: [] },
        daysExplained,
      });
    }
    return out;
  }, [
    employees,
    attData,
    shifts,
    calendarDays,
    workweek,
    shiftStart,
    grace,
    ratePerMinute,
    absenceMode,
    absenceFixedAmount,
    workingDaysInMonth,
    isHoliday,
    leaveIndex,
    advancesIndex,
    useShifts,
    t
  ]);

  const filteredSortedRows = useMemo(() => {
    let list = baseRows;
    if (onlyWithDeductions) list = list.filter((r) => r.total > 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => r.employeeName.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "name") {
        return descending
          ? b.employeeName.localeCompare(a.employeeName)
          : a.employeeName.localeCompare(b.employeeName);
      }
      return descending ? b.total - a.total : a.total - b.total;
    });
    return list;
  }, [baseRows, onlyWithDeductions, query, sortKey, descending]);

  const totals = useMemo(() => {
    let employeesAffected = 0;
    let absences = 0;
    let lateMinutes = 0;
    let totalDeduction = 0;
    let advancesTotal = 0;
    let advancesCount = 0;
    for (const r of filteredSortedRows) {
      if (r.total > 0) employeesAffected += 1;
      absences += r.absences;
      lateMinutes += r.lateMinutesTotal;
      totalDeduction += r.total;
      advancesTotal += r.advances.total || 0;
      advancesCount += r.advances.count || 0;
    }
    return {
      employeesAffected,
      absences: round2(absences),
      lateMinutes,
      totalDeduction: round2(totalDeduction),
      advancesTotal: round2(advancesTotal),
      advancesCount,
    };
  }, [filteredSortedRows]);

  /* ------------------------------ actions ------------------------------ */
  const [posting, setPosting] = useState(false);
  const createAdjustments = async () => {
    if (!filteredSortedRows.length) return;
    setPosting(true);
    setErr("");
    try {
      const items = filteredSortedRows.map((r) => ({
        employeeId: r.employeeId,
        amount: r.total, // positive = deduction
        type: "Deduction",
        reason: t("adjustments.attendanceDeduction", "Attendance deduction"),
        currency,
        periodFrom: fromYMD,
        periodTo: toYMD,
        meta: {
          month: pickedMonth,
          lateMinutes: r.lateMinutesTotal,
          lateCount: r.lateCount,
          absences: r.absences,
          netPay: r.netPay,
          holidaysApplied: Array.from(holidaySet),
          usingShifts: useShifts,
          rules: {
            workweek,
            shiftStart,
            grace: Number(grace),
            ratePerMinute: Number(ratePerMinute),
            absenceMode,
            absenceFixedAmount: Number(absenceFixedAmount),
            workingDaysInMonth: Number(workingDaysInMonth),
            caps: { maxLatePct: MAX_LATE_PCT_DEFAULT, maxTotalPct: MAX_TOTAL_PCT_DEFAULT },
          },
          advances: r.advances?.items || [],
        },
      }));
      await http("POST", ADJ_API, { items });
      alert(t("adjustments.created", "Adjustments created successfully."));
    } catch (e) {
      setErr(e.message || t("errors.createFailed", "Failed to create adjustments"));
    } finally {
      setPosting(false);
    }
  };

  const exportCsv = () => {
    const header = [
      t("adjustmentsTable.employee", "Employee"),
      t("adjustmentsTable.employee", "Employee ID"),
      t("adjustmentsTable.baseSalary", "Base Salary"),
      t("adjustmentsTable.netPay", "Net Pay"),
      t("adjustmentsTable.total", "Total"),
      t("adjustmentsTable.absenceDeduction", "Absence Deduction"),
      t("adjustmentsTable.lateDeduction", "Late Deduction"),
      t("adjustmentsTable.absences", "Absences"),
      t("adjustmentsTable.lateMinutes", "Late Minutes"),
      t("adjustmentsTable.lateCount", "Late Days"),
      t("common.from", "From"),
      t("common.to", "To"),
      t("common.currency", "Currency"),
      t("adjustments.holidaysCount", "Holidays Count"),
      t("Sum.AdvancesCount", "Advances Count"),
      t("Sum.AdvancesTotal", "Advances Total")
    ];
    const rows = filteredSortedRows.map((r) => [
      r.employeeName,
      r.employeeId, 
      r.baseSalary, 
      r.netPay, 
      r.total,
      r.absenceDeduction, 
      r.lateDeduction, 
      r.absences, 
      r.lateMinutesTotal, 
      r.lateCount,
      fromYMD, 
      toYMD, 
      currency, 
      holidaySet.size, 
      r.advances.count, 
      r.advances.total
    ]);
    const csv = [header, ...rows].map(line =>
      line.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-adjustments_${fromYMD}_${toYMD}.csv`;
    a.click();
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("menu.adjustments", "Payroll Adjustments")}</h1>
        <div className="text-sm text-gray-500">
          {fromYMD} → {toYMD}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Card 
          title={t("Sum.Employees", "Employees affected")} 
          value={totals.employeesAffected} 
        />
        <Card 
          title={t("Sum.Absences", "Absences (days)")} 
          value={totals.absences} 
        />
        <Card 
          title={t("Sum.LateMinutes", "Late minutes")} 
          value={totals.lateMinutes} 
        />
        <Card 
          title={t("Sum.AdvancesCount", "Advances (this month)")} 
          value={totals.advancesCount} 
        />
        <Card 
          title={t("Sum.AdvancesTotal", "Advances total (this month)")} 
          value={fmtMoney(totals.advancesTotal, currency)} 
        />
        <Card 
          title={t("Sum.TotalDeduction", "Total deduction")} 
          value={fmtMoney(totals.totalDeduction, currency)} 
        />
      </div>

      {/* Controls */}
      <div className="rounded-xl border p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">{t("adjustments.month", "Month")}</label>
            <input
              type="month"
              value={pickedMonth}
              onChange={(e) => setPickedMonth(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t("adjustments.search", "Search employee")}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder={t("adjustments.searchPh", "Type a name…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyWithDeductions}
                  onChange={(e) => setOnlyWithDeductions(e.target.checked)}
                />
                {t("adjustments.onlyWith", "Show only with deductions")}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">{t("adjustments.sortBy", "Sort by")}</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg px-3 py-2"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="total">{t("adjustments.total", "Total deduction")}</option>
                <option value="name">{t("adjustments.name", "Name")}</option>
              </select>
              <button
                onClick={() => setDescending((v) => !v)}
                className="px-3 py-2 border rounded-lg"
                title={t("adjustments.toggleOrder", "Toggle order")}
              >
                {descending ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>

        {/* Rules & Holidays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2">{t("adjustments.shiftRules", "Shift & Late Rules")}</div>
            <label className="inline-flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={useShifts} onChange={(e) => setUseShifts(e.target.checked)} />
              {t("adjustments.useShifts", "Use shifts (if available)")}
            </label>

            <label className="block text-sm mb-1">{t("adjustments.workweek", "Workweek")}</label>
            <select
              className="w-full border rounded-lg px-3 py-2 mb-2"
              value={workweek}
              onChange={(e) => setWorkweek(e.target.value)}
            >
              <option value="sun-thu">{t("adjustments.sunThu", "Sun–Thu (GCC)")}</option>
              <option value="mon-fri">{t("adjustments.monFri", "Mon–Fri")}</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">{t("adjustments.shiftStart", "Default shift start")}</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{t("adjustments.grace", "Grace (min)")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2"
                  value={grace}
                  onChange={(e) => setGrace(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-sm mb-1">{t("adjustments.ratePerMinute", "Rate per late minute")}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={ratePerMinute}
                  onChange={(e) => setRatePerMinute(e.target.value)}
                />
                <input
                  className="w-24 border rounded-lg px-3 py-2"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2">{t("adjustments.absenceRules", "Absence Rules")}</div>
            <label className="block text-sm mb-1">{t("adjustments.mode", "Mode")}</label>
            <select
              className="w-full border rounded-lg px-3 py-2 mb-2"
              value={absenceMode}
              onChange={(e) => setAbsenceMode(e.target.value)}
            >
              <option value="dailySalary">{t("adjustments.dailySalary", "Daily salary (base/workingDays)")}</option>
              <option value="fixed">{t("adjustments.fixedAmount", "Fixed amount per day")}</option>
            </select>

            {absenceMode === "dailySalary" ? (
              <div>
                <label className="block text-sm mb-1">{t("adjustments.workingDays", "Working days in month")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border rounded-lg px-3 py-2"
                  value={workingDaysInMonth}
                  onChange={(e) => setWorkingDaysInMonth(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("adjustments.usesBaseSalary", "Uses each employee's base salary")}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-1">{t("adjustments.fixedPerDay", "Fixed per absence day")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2"
                  value={absenceFixedAmount}
                  onChange={(e) => setAbsenceFixedAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2">{t("adjustments.holidays", "Holidays")}</div>
            <label className="inline-flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={useServerHolidays}
                onChange={(e) => setUseServerHolidays(e.target.checked)}
              />
              {t("adjustments.useServerHolidays", "Use server holiday calendar (if available)")}
            </label>

            {!useServerHolidays && (
              <>
                <label className="block text-sm mb-1">
                  {t("adjustments.manualHolidays", "Manual holidays (one date per line, YYYY-MM-DD)")}
                </label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t("adjustments.holidaysPlaceholder", "2025-09-23\n2025-06-15\n2025-06-16")}
                  value={manualHolidayText}
                  onChange={(e) => setManualHolidayText(e.target.value)}
                />
              </>
            )}

            <div className="text-xs text-gray-500 mt-2">
              {t("adjustments.holidayNote", "Holidays are excluded from absence counting.")}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            disabled={posting || filteredSortedRows.length === 0}
            onClick={createAdjustments}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {posting 
              ? t("adjustments.creating", "Creating…") 
              : t("adjustments.createBtn", "Create adjustments")
            }
          </button>
          <button onClick={exportCsv} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
            {t("adjustments.exportCsv", "Export CSV")}
          </button>
          <button onClick={refresh} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
            {t("common.refresh", "Refresh")}
          </button>
        </div>
      </div>

      {/* Notices */}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {err}
        </div>
      )}

      {/* Results */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <Th>{t("adjustmentsTable.employee", "Employee")}</Th>
              <Th>{t("adjustmentsTable.baseSalary", "Base salary")}</Th>
              <Th>{t("adjustmentsTable.netPay", "Net pay")}</Th>
              <Th>{t("adjustmentsTable.total", "Total deduction")}</Th>
              <Th>{t("adjustmentsTable.absenceDeduction", "Absence")}</Th>
              <Th>{t("adjustmentsTable.lateDeduction", "Lateness")}</Th>
              <Th>{t("adjustmentsTable.absences", "Absences")}</Th>
              <Th>{t("adjustmentsTable.lateMinutes", "Late minutes")}</Th>
              <Th>{t("adjustmentsTable.lateCount", "Late days")}</Th>
              <Th>{t("adjustmentsTable.advances", "Advances")}</Th>
              <Th className="text-right">{t("common.actions", "Actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            ) : filteredSortedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  {t("common.noResults", "No results")}
                </td>
              </tr>
            ) : (
              filteredSortedRows.map((r) => (
                <tr key={r.employeeId} className="border-t">
                  <Td className="font-medium">{r.employeeName}</Td>
                  <Td>{fmtMoney(r.baseSalary, currency)}</Td>
                  <Td>
                    <Badge tone={r.netPay > 0 ? "green" : "red"}>
                      {fmtMoney(r.netPay, currency)}
                    </Badge>
                  </Td>
                  <Td className="font-semibold">
                    {fmtMoney(r.total, currency)}
                    {r._totalCapped ? " *" : ""}
                  </Td>
                  <Td title={r._totalCapped ? t("adjustments.capped", "Capped by policy") : ""}>
                    {fmtMoney(r.absenceDeduction, currency)}
                  </Td>
                  <Td>
                    <span title={r._lateCapped ? t("adjustments.capped", "Capped by policy") : ""}>
                      {fmtMoney(r.lateDeduction, currency)}
                      {r._lateCapped ? ` (${t("adjustments.cappedShort", "cap")})` : ""}
                    </span>
                  </Td>
                  <Td>
                    {r.absences > 0 ? (
                      <Badge tone="red">{r.absences}</Badge>
                    ) : (
                      <Badge tone="green">0</Badge>
                    )}
                  </Td>
                  <Td>
                    {r.lateMinutesTotal > 0 ? (
                      <Badge tone="amber">{r.lateMinutesTotal}</Badge>
                    ) : (
                      <Badge tone="green">0</Badge>
                    )}
                  </Td>
                  <Td>
                    {r.lateCount > 0 ? (
                      <Badge tone="amber">{r.lateCount}</Badge>
                    ) : (
                      <Badge tone="green">0</Badge>
                    )}
                  </Td>
                  <Td>
                    {r.advances.count > 0 ? (
                      <Badge
                        tone="amber"
                        title={r.advances.items.map(a => `${a.expectedDate}: ${fmtMoney(a.amount, a.currency)}`).join("\n")}
                      >
                        {r.advances.count} / {fmtMoney(r.advances.total, currency)}
                      </Badge>
                    ) : (
                      <Badge tone="green">0</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setDetailEmp({ id: r.employeeId, name: r.employeeName, row: r })}
                      className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    >
                      {t("common.details", "Details")}
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details drawer */}
      {detailEmp && (
        <DetailsDrawer
          onClose={() => setDetailEmp(null)}
          employee={detailEmp}
          currency={currency}
          calendarDays={calendarDays}
          byDateEmp={attData.byDateEmp}
          shiftsBy={shifts.byDateEmp}
          holidaySet={holidaySet}
          leaveMap={leaveIndex.get(detailEmp.id) || new Map()}
          workweek={workweek}
          defaultShiftStart={shiftStart}
          grace={grace}
          advances={detailEmp.row?.advances || { items: [] }}
        />
      )}
    </div>
  );
}

/* --------------------------- details drawer --------------------------- */
function DetailsDrawer({
  onClose, employee, currency,
  calendarDays, byDateEmp, shiftsBy, holidaySet, leaveMap,
  workweek, defaultShiftStart, grace, advances
}) {
  const { t } = useTranslation();

  // Build day-by-day timeline with shift, att, leave/holiday, status
  const rows = useMemo(() => {
    return calendarDays.map((d) => {
      const weekend = isWeekend(d, workweek);
      const holiday = holidaySet.has(d);
      const leaveFrac = leaveMap.get(d) || 0;
      const att = byDateEmp?.[d]?.[employee.id];
      const hasShift = Array.isArray(shiftsBy?.[d]?.[employee.id]) && shiftsBy[d][employee.id].length > 0;
      const shiftStart = hasShift ? shiftsBy[d][employee.id][0].startTime : defaultShiftStart;

      let status = t("detailsDrawer.onTime", "On time");
      let note = "";
      if (!hasShift && (weekend || holiday)) {
        status = t("detailsDrawer.nonWorking", "Non-working");
        note = holiday ? t("detailsDrawer.holiday", "Holiday") : t("detailsDrawer.weekend", "Weekend");
      } else if (leaveFrac > 0) {
        status = leaveFrac === 1 
          ? t("detailsDrawer.unpaidLeaveFull", "Unpaid leave (1.0)") 
          : t("detailsDrawer.unpaidLeaveHalf", "Unpaid half-day (0.5)");
      } else if (!att || !att.checkInAt) {
        status = t("detailsDrawer.absent", "Absent");
      } else {
        const m = minutesLate(att.checkInAt, shiftStart, Number(grace) || 0);
        status = m > 0 
          ? t("detailsDrawer.lateMinutes", "Late {minutes} min", { minutes: m }) 
          : t("detailsDrawer.onTime", "On time");
      }

      return {
        date: d,
        status,
        note,
        shift: hasShift ? `${shiftsBy[d][employee.id][0].startTime}–${shiftsBy[d][employee.id][0].endTime}` : "-",
        checkIn: att?.checkInAt ? new Date(att.checkInAt).toLocaleTimeString() : "—",
        checkOut: att?.checkOutAt ? new Date(att.checkOutAt).toLocaleTimeString() : "—",
      };
    });
  }, [
    calendarDays, byDateEmp, shiftsBy, holidaySet, leaveMap, 
    workweek, defaultShiftStart, grace, employee?.id, t
  ]);

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col">
        {/* header (not scrollable) */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <div className="text-lg font-semibold">{employee.name}</div>
            <div className="text-xs text-gray-500">{employee.id}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">✕</button>
        </div>

        {/* SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* top cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border p-3">
              <div className="font-semibold mb-2">{t("common.summary", "Summary")}</div>
              <div className="text-sm space-y-1">
                <div>
                  {t("adjustmentsTable.baseSalary", "Base salary")}:{" "}
                  <b>{fmtMoney(employee.row.baseSalary, currency)}</b>
                </div>
                <div>
                  {t("adjustmentsTable.netPay", "Net pay")}:{" "}
                  <b>{fmtMoney(employee.row.netPay, currency)}</b>
                </div>
                <div>
                  {t("adjustmentsTable.total", "Total deduction")}:{" "}
                  <b>{fmtMoney(employee.row.total, currency)}</b>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ({t("adjustmentsTable.absenceDeduction", "Absence")}: {fmtMoney(employee.row.absenceDeduction, currency)} • {t("adjustmentsTable.lateDeduction", "Lateness")}: {fmtMoney(employee.row.lateDeduction, currency)})
                </div>
                <div className="mt-2">
                  {t("adjustmentsTable.advances", "Advances")} ({t("common.thisMonth", "this month")}): {advances.count || 0}
                  {advances.count ? ` • ${fmtMoney(advances.total, advances.items?.[0]?.currency || currency)}` : ""}
                  {advances.items?.length ? (
                    <ul className="text-xs text-gray-600 list-disc ml-4 mt-1">
                      {advances.items.map((a) => (
                        <li key={a.id}>
                          {a.expectedDate}: {fmtMoney(a.amount, a.currency)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="font-semibold mb-2">
                {t("adjustments.policySnapshot", "Policy snapshot")}
              </div>
              <div className="text-xs text-gray-700 space-y-1">
                <div>
                  {t("adjustments.ratePerMinute", "Late rate/min")}:{" "}
                  <b>{t("common.perSettings", "per settings")}</b>
                </div>
                <div>
                  {t("adjustments.grace", "Grace")}:{" "}
                  <b>{String(grace)} {t("common.minutes", "min")}</b>
                </div>
                <div>
                  {t("adjustments.useShifts", "Using rostered shifts")}:{" "}
                  <b>{t("common.yes", "Yes")}</b>
                </div>
                <div>
                  {t("adjustments.holidayCount", "Holiday count in range")}:{" "}
                  <b>{holidaySet.size}</b>
                </div>
              </div>
            </div>
          </div>

          {/* table (both axes scroll) */}
          <div className="px-4 pb-4">
            <div className="rounded-xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <Th>{t("common.note", "Note")}</Th>
                    <Th>{t("common.status", "Status")}</Th>
                    <Th>{t("common.checkOut", "Check-out")}</Th>
                    <Th>{t("common.checkIn", "Check-in")}</Th>
                    <Th>{t("common.shift", "Shift")}</Th>
                    <Th>{t("common.date", "Date")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-t">
                      <Td className="text-gray-500">{r.note || "—"}</Td>
                      <Td>
                        <Badge tone={
                          r.status.startsWith(t("detailsDrawer.lateMinutes", "Late")) ? "amber" :
                          r.status === t("detailsDrawer.absent", "Absent") ? "red" :
                          r.status === t("detailsDrawer.onTime", "On time") ? "green" : "gray"
                        }>
                          {r.status}
                        </Badge>
                      </Td>
                      <Td>{r.checkOut}</Td>
                      <Td>{r.checkIn}</Td>
                      <Td>{r.shift}</Td>
                      <Td>{r.date}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-gray-500 mt-2">
              * {t("adjustments.lateExplanation", "Late = check-in after shift start minus {grace} minutes grace. If no shift that day, default start is used.", { grace: Number(grace) || 0 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}