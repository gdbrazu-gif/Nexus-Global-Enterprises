import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee } from '../../types';
import {
  Banknote,
  Coins,
  Printer,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  FileText,
  X,
  Clock,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Sparkles,
  Filter,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sun,
  ShieldAlert,
  List,
  LayoutGrid,
} from 'lucide-react';
import {
  downloadTimesheetSalaryLedgerPDF,
  downloadEmployeePayslipPDF,
  TimesheetSalaryLedgerRow,
} from '../../utils/pdfGenerator';

export const PayrollCompensation: React.FC = () => {
  const {
    employees,
    formatCurrency,
    baseCurrency,
    updateSalary,
    clearEmployeeTimesheetForMonth,
    canPerformAdminAction,
    canPerformHrAction,
    canPerformFinanceAction,
    activeBranchId,
    corporateEntity,
    templateConfigs,
    timesheetEntries,
    t,
  } = useHRMS();

  // Selected Month and Year for Timesheet Calculation (Default: October 2026)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // 1 = Jan, 10 = Oct

  // ==========================================
  // CUSTOMIZABLE FORMULA ENGINE STATE
  // ==========================================
  // 1. Standard Hourly Base Rate Determination
  // Configurable Divisor Methods: Statutory WPS (260 hrs) or Custom Hours.
  const [hourlyDivisorMethod, setHourlyDivisorMethod] = useState<
    'statutory_260' | 'custom_hours'
  >('statutory_260');
  const [customDivisorHours, setCustomDivisorHours] = useState<number>(176);
  const [rateSalaryBasis, setRateSalaryBasis] = useState<'base_only' | 'gross_package'>('base_only');

  // 2. Overtime Hours Remuneration
  // Requested: Overtime Hours × (Hourly Base Rate × 1) (with a 1× Holiday toggle)
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<number>(1.0); // Default 1.0× as requested
  const [holidayMultiplier, setHolidayMultiplier] = useState<number>(1.0); // Default 1.0× Holiday toggle as requested
  const [isHolidayRateActive, setIsHolidayRateActive] = useState<boolean>(false); // Holiday toggle switch

  // Formula Customizer Collapsible State
  const [showFormulaCustomizer, setShowFormulaCustomizer] = useState<boolean>(false);

  // Layout View Mode: 'list' (Data Table) | 'grid' (Cards Matrix)
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list');

  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [hoursFilter, setHoursFilter] = useState<'all' | 'overtime' | 'exact' | 'shortfall'>('all');

  // Interactive Modals
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [monthlyBase, setMonthlyBase] = useState(0);
  const [housing, setHousing] = useState(0);
  const [transport, setTransport] = useState(0);
  const [other, setOther] = useState(0);
  const [otherExpression, setOtherExpression] = useState('0');
  const [notes, setNotes] = useState('');

  // State tracking deleted payroll entries per period: key is `${selectedYear}-${String(selectedMonth).padStart(2, '0')}_${empId}`
  const [deletedPayrollKeys, setDeletedPayrollKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('apex_deleted_payrolls');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveDeletedPayrollKeys = (keys: string[]) => {
    setDeletedPayrollKeys(keys);
    try {
      localStorage.setItem('apex_deleted_payrolls', JSON.stringify(keys));
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Payroll Confirmation Modal Target (Deletes ONLY payroll, retains employee profile in directory)
  const [deletePayrollTarget, setDeletePayrollTarget] = useState<Employee | null>(null);

  // Detailed Step-by-Step Formula Breakdown Inspector Modal
  const [formulaModalEmp, setFormulaModalEmp] = useState<Employee | null>(null);

  // Payslip Print Preview modal
  const [payslipEmp, setPayslipEmp] = useState<Employee | null>(null);
  const [payslipMode, setPayslipMode] = useState<'timesheet' | 'contract'>('timesheet');

  // PDF Export notification
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // 1. Calculate Standard Expected Working Days in the Selected Month
  // Saudi Labor Law: Friday & Saturday are weekends.
  const { daysInMonth, standardWorkingDays } = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    let workDaysCount = 0;
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = d.getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday
      if (!isWeekend) {
        workDaysCount++;
      }
    }
    return {
      daysInMonth: totalDays,
      standardWorkingDays: workDaysCount,
    };
  }, [selectedYear, selectedMonth]);

  // Evaluates math expressions like "1000-100 = 900" or "1000-100" into numeric 900
  const evaluateArithmeticExpression = (expr: string): number => {
    try {
      const sanitized = expr.split('=')[0].trim();
      if (!sanitized) return 0;
      if (!/^[\d\s+\-*/.()]+$/.test(sanitized)) {
        const num = parseFloat(expr);
        return isNaN(num) ? 0 : Math.max(0, num);
      }
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      return typeof result === 'number' && !isNaN(result) ? Math.max(0, Math.round(result * 100) / 100) : 0;
    } catch {
      const num = parseFloat(expr);
      return isNaN(num) ? 0 : Math.max(0, num);
    }
  };

  // 2. Compute Determined Expected Standard Hours based on Customizable Formula
  const expectedStandardHours = useMemo(() => {
    switch (hourlyDivisorMethod) {
      case 'statutory_260':
        return 260.0;
      case 'custom_hours':
        return Math.max(1, customDivisorHours);
      default:
        return 260.0;
    }
  }, [hourlyDivisorMethod, customDivisorHours]);

  // 3. Effective Overtime Multiplier (accounts for the 1.0× Holiday toggle)
  const effectiveOvertimeMultiplier = useMemo(() => {
    return isHolidayRateActive ? holidayMultiplier : overtimeMultiplier;
  }, [isHolidayRateActive, holidayMultiplier, overtimeMultiplier]);

  // 1. User Requirement: "Make payroll only for active employees"
  // 2. User Requirement: "Delete only payroll" (exclude records deleted for this period)
  const eligibleWorkforce = useMemo(() => {
    const periodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return employees.filter((emp) => {
      // Must belong to active branch filter
      if (activeBranchId !== 'all' && (emp.branchId || 'BR-RUH') !== activeBranchId) return false;
      // Must be active workforce member
      if (emp.status !== 'active') return false;
      // Must not have payroll deleted for this period
      const isDeletedForPeriod = deletedPayrollKeys.includes(`${periodPrefix}_${emp.id}`);
      return !isDeletedForPeriod;
    });
  }, [employees, activeBranchId, selectedYear, selectedMonth, deletedPayrollKeys]);

  // List of active employees whose payroll was deleted for this month (for optional restore)
  const deletedThisMonth = useMemo(() => {
    const periodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return employees.filter(
      (emp) =>
        (activeBranchId === 'all' || (emp.branchId || 'BR-RUH') === activeBranchId) &&
        emp.status === 'active' &&
        deletedPayrollKeys.includes(`${periodPrefix}_${emp.id}`)
    );
  }, [employees, activeBranchId, selectedYear, selectedMonth, deletedPayrollKeys]);

  const handleRestoreAllDeletedPayrollsForMonth = () => {
    const periodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const newKeys = deletedPayrollKeys.filter((k) => !k.startsWith(`${periodPrefix}_`));
    saveDeletedPayrollKeys(newKeys);
    setActionSuccessMsg(
      `Restored all ${deletedThisMonth.length} deleted payroll records for ${monthNames[selectedMonth - 1]} ${selectedYear}.`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // 4. Precompute Timesheet Metrics per Employee for Selected Month/Year (Active eligible workforce only)
  const timesheetMetricsMap = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const map = new Map<
      string,
      {
        regularHours: number;
        overtimeHours: number;
        totalHours: number;
        presentDays: number;
        leaveDays: number;
        absentDays: number;
      }
    >();

    // Initialize all eligible active employees with 0
    eligibleWorkforce.forEach((emp) => {
      map.set(emp.id, {
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        presentDays: 0,
        leaveDays: 0,
        absentDays: 0,
      });
    });

    // Populate from actual timesheet entries matching month and year
    timesheetEntries.forEach((entry) => {
      if (entry.date.startsWith(monthPrefix)) {
        const current = map.get(entry.employeeId);
        if (current) {
          const reg = entry.regularHours || 0;
          const ot = entry.overtimeHours || 0;
          current.regularHours += reg;
          current.overtimeHours += ot;
          current.totalHours += reg + ot;

          if (entry.status === 'present' || entry.status === 'overtime') {
            current.presentDays++;
          } else if (entry.status === 'annual_leave' || entry.status === 'sick_leave') {
            current.leaveDays++;
          } else if (entry.status === 'absent') {
            current.absentDays++;
          }
        }
      }
    });

    return map;
  }, [eligibleWorkforce, timesheetEntries, selectedYear, selectedMonth]);

  // 5. Complete Workforce Compensation Dataset with Customizable Timesheet-Based Salary Calculations (Active Eligible Workforce Only)
  const calculatedWorkforce = useMemo(() => {
    return eligibleWorkforce.map((emp) => {
      const ts = timesheetMetricsMap.get(emp.id) || {
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        presentDays: 0,
        leaveDays: 0,
        absentDays: 0,
      };

      const expected = expectedStandardHours || 176;

      // Base for rate determination: Monthly Base vs Total Monthly Package
      const salaryBasisNumerator =
        rateSalaryBasis === 'gross_package' ? emp.totalMonthlyPackage : emp.monthlyBaseSalary;

      // Standard Hourly Base Rate = Salary Basis ÷ Expected Month Hours (customizable formula)
      const hourlyBaseRate = salaryBasisNumerator / expected;

      // Overtime Hourly Rate = Hourly Base Rate × Effective Multiplier
      // Requested: Overtime Hours × (Hourly Base Rate × 1) (with a 1× Holiday toggle)
      const hourlyOvertimeRate = hourlyBaseRate * effectiveOvertimeMultiplier;

      // Regular Pay (pro-rated based on logged regular hours against expected hours)
      const timesheetRegularPay =
        Math.round((ts.regularHours / expected) * emp.monthlyBaseSalary * 100) / 100;

      // Overtime Remuneration = Overtime Hours × (Hourly Base Rate × Multiplier)
      const timesheetOvertimePay = Math.round(ts.overtimeHours * hourlyOvertimeRate * 100) / 100;

      // Timesheet Earned Base Salary
      const timesheetEarnedBase =
        Math.round((timesheetRegularPay + timesheetOvertimePay) * 100) / 100;

      // Fixed Monthly Allowances
      const totalAllowances = emp.housingAllowance + emp.transportAllowance + emp.otherAllowances;

      // Total Timesheet Payable Salary
      const timesheetTotalPayable = Math.round((timesheetEarnedBase + totalAllowances) * 100) / 100;

      // Contract Benchmark Package
      const contractTotalPackage = emp.totalMonthlyPackage;

      // Variance vs Contract Package (+ is overtime bonus, - is shortfall deduction)
      const varianceSAR = Math.round((timesheetTotalPayable - contractTotalPackage) * 100) / 100;

      // Hours completion rate
      const completionRate = expected > 0 ? (ts.totalHours / expected) * 100 : 0;

      return {
        ...emp,
        timesheet: {
          regularHours: ts.regularHours,
          overtimeHours: ts.overtimeHours,
          totalHours: ts.totalHours,
          presentDays: ts.presentDays,
          leaveDays: ts.leaveDays,
          absentDays: ts.absentDays,
          expectedHours: expected,
          hoursDelta: ts.totalHours - expected,
          completionRate,
          hourlyBaseRate,
          hourlyOvertimeRate,
          effectiveOvertimeMultiplier,
          timesheetRegularPay,
          timesheetOvertimePay,
          timesheetEarnedBase,
          totalAllowances,
          timesheetTotalPayable,
          contractTotalPackage,
          varianceSAR,
        },
      };
    });
  }, [
    eligibleWorkforce,
    timesheetMetricsMap,
    expectedStandardHours,
    rateSalaryBasis,
    effectiveOvertimeMultiplier,
  ]);

  // 6. Filtered Records
  const filtered = useMemo(() => {
    return calculatedWorkforce.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.id.toLowerCase().includes(search.toLowerCase()) ||
        emp.designation.toLowerCase().includes(search.toLowerCase());
      const matchesDept = selectedDept === 'all' || emp.department === selectedDept;

      let matchesHours = true;
      if (hoursFilter === 'overtime') {
        matchesHours = emp.timesheet.overtimeHours > 0;
      } else if (hoursFilter === 'exact') {
        matchesHours = Math.abs(emp.timesheet.totalHours - emp.timesheet.expectedHours) < 0.1;
      } else if (hoursFilter === 'shortfall') {
        matchesHours = emp.timesheet.totalHours < emp.timesheet.expectedHours;
      }

      return matchesSearch && matchesDept && matchesHours;
    });
  }, [calculatedWorkforce, search, selectedDept, hoursFilter]);

  // 7. Aggregate Macro Metrics
  const totalWorkforceHours = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.totalHours, 0);
  }, [calculatedWorkforce]);

  const totalRegularHours = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.regularHours, 0);
  }, [calculatedWorkforce]);

  const totalOvertimeHours = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.overtimeHours, 0);
  }, [calculatedWorkforce]);

  const totalTimesheetCalculatedPayroll = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.timesheetTotalPayable, 0);
  }, [calculatedWorkforce]);

  const totalContractPayroll = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.contractTotalPackage, 0);
  }, [calculatedWorkforce]);

  const totalOvertimeLiability = useMemo(() => {
    return calculatedWorkforce.reduce((acc, e) => acc + e.timesheet.timesheetOvertimePay, 0);
  }, [calculatedWorkforce]);

  const netPayrollVariance = totalTimesheetCalculatedPayroll - totalContractPayroll;

  const workforceHoursFulfillment = useMemo(() => {
    const totalExpected = calculatedWorkforce.length * expectedStandardHours;
    return totalExpected > 0 ? (totalWorkforceHours / totalExpected) * 100 : 0;
  }, [calculatedWorkforce, expectedStandardHours, totalWorkforceHours]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Reset Formula to requested Defaults
  const handleResetFormulaDefaults = () => {
    setHourlyDivisorMethod('statutory_260');
    setCustomDivisorHours(176);
    setRateSalaryBasis('base_only');
    setOvertimeMultiplier(1.0); // 1.0× standard requested
    setHolidayMultiplier(1.0); // 1.0× Holiday requested
    setIsHolidayRateActive(false);
    setActionSuccessMsg('Reset formula parameters to Statutory WPS (260 hrs) & 1.0× Holiday standard.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setMonthlyBase(emp.monthlyBaseSalary);
    setHousing(emp.housingAllowance);
    setTransport(emp.transportAllowance);
    setOther(emp.otherAllowances);
    setOtherExpression(String(emp.otherAllowances));
    setNotes('Periodic compensation review adjustment');
  };

  const handleOtherExpressionChange = (val: string) => {
    setOtherExpression(val);
    const calculated = evaluateArithmeticExpression(val);
    setOther(calculated);
  };

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    updateSalary(
      editingEmp.id,
      Number(monthlyBase),
      Number(housing),
      Number(transport),
      Number(other),
      notes
    );
    setEditingEmp(null);
    setActionSuccessMsg(`Updated compensation package for ${editingEmp.fullName}`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Delete Payroll Action Handler (Deletes ONLY payroll, retains employee profile in directory)
  const handleConfirmDeletePayroll = () => {
    if (!deletePayrollTarget) return;
    const periodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const periodKey = `${periodPrefix}_${deletePayrollTarget.id}`;

    // Clear timesheet records for this employee for this month in context
    if (clearEmployeeTimesheetForMonth) {
      clearEmployeeTimesheetForMonth(deletePayrollTarget.id, selectedYear, selectedMonth);
    }

    // Save deleted payroll key for this period
    const newKeys = [...deletedPayrollKeys, periodKey];
    saveDeletedPayrollKeys(newKeys);

    setActionSuccessMsg(
      `Deleted payroll record for ${deletePayrollTarget.fullName} for ${monthNames[selectedMonth - 1]} ${selectedYear}. (Employee profile remains active in directory).`
    );
    setDeletePayrollTarget(null);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleExportTimesheetLedgerPDF = () => {
    try {
      setPdfGenerating(true);
      const rows: TimesheetSalaryLedgerRow[] = filtered.map((emp) => ({
        employeeId: emp.id,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        contractMonthlyBase: emp.monthlyBaseSalary,
        expectedHours: emp.timesheet.expectedHours,
        regularHours: emp.timesheet.regularHours,
        overtimeHours: emp.timesheet.overtimeHours,
        totalHours: emp.timesheet.totalHours,
        hourlyBaseRate: emp.timesheet.hourlyBaseRate,
        timesheetRegularPay: emp.timesheet.timesheetRegularPay,
        timesheetOvertimePay: emp.timesheet.timesheetOvertimePay,
        timesheetEarnedBase: emp.timesheet.timesheetEarnedBase,
        totalAllowances: emp.timesheet.totalAllowances,
        timesheetTotalPayable: emp.timesheet.timesheetTotalPayable,
        contractTotalPackage: emp.timesheet.contractTotalPackage,
        varianceSAR: emp.timesheet.varianceSAR,
      }));

      downloadTimesheetSalaryLedgerPDF(rows, corporateEntity, baseCurrency, {
        monthName: monthNames[selectedMonth - 1],
        year: selectedYear,
        expectedStandardHours,
        department: selectedDept,
        overtimeMultiplier: effectiveOvertimeMultiplier,
        divisorMethodName:
          hourlyDivisorMethod === 'statutory_260'
            ? 'Statutory WPS (260 hrs)'
            : `Custom ${customDivisorHours} hrs`,
      });

      setActionSuccessMsg(
        `Downloaded Timesheet-Based Salary Ledger PDF for ${monthNames[selectedMonth - 1]} ${selectedYear}`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Dedicated Individual Employee Payslip PDF Download Handler
  const handleDownloadSinglePayslipPDF = (emp: Employee, mode: 'timesheet' | 'contract' = 'timesheet') => {
    try {
      const targetData = calculatedWorkforce.find((e) => e.id === emp.id);
      if (!targetData) return;

      downloadEmployeePayslipPDF(
        {
          employee: targetData,
          monthName: monthNames[selectedMonth - 1],
          year: selectedYear,
          payslipMode: mode,
          timesheet: targetData.timesheet,
          divisorMethodName:
            hourlyDivisorMethod === 'statutory_260'
              ? 'Statutory WPS (260 hrs)'
              : `Custom ${customDivisorHours} hrs`,
          isHolidayRateActive,
        },
        corporateEntity,
        baseCurrency
      );

      setActionSuccessMsg(
        `Downloaded official PDF Payslip for ${emp.fullName} (${monthNames[selectedMonth - 1]} ${selectedYear})`
      );
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Find active employee for formula breakdown modal
  const activeFormulaData = useMemo(() => {
    if (!formulaModalEmp) return null;
    return calculatedWorkforce.find((e) => e.id === formulaModalEmp.id) || null;
  }, [formulaModalEmp, calculatedWorkforce]);

  // Find active employee for payslip modal
  const activePayslipData = useMemo(() => {
    if (!payslipEmp) return null;
    return calculatedWorkforce.find((e) => e.id === payslipEmp.id) || null;
  }, [payslipEmp, calculatedWorkforce]);

  // Find active employee for delete payroll modal
  const activeDeleteTargetData = useMemo(() => {
    if (!deletePayrollTarget) return null;
    return calculatedWorkforce.find((e) => e.id === deletePayrollTarget.id) || null;
  }, [deletePayrollTarget, calculatedWorkforce]);



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Header & Period Controller */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Workforce Compensation & Salary Ledger
            </h1>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              FORMULA ACTIVE
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              ACTIVE EMPLOYEES ({eligibleWorkforce.length})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly base Salary & hourly base Salary, overtime, and ledger.
          </p>
        </div>

        {/* Right Action Bar: Period Selector, Formula Settings, PDF Button & Currency */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector (Month & Year) */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 sm:p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <div className="flex items-center gap-1 px-1.5 sm:px-2">
              <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-semibold text-xs text-slate-800 outline-none cursor-pointer"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-mono font-semibold text-xs text-slate-800 outline-none cursor-pointer"
              >
                {[2025, 2026, 2027,2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Toggle Formula Customizer Button */}
          <button
            type="button"
            onClick={() => setShowFormulaCustomizer((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs border ${
              showFormulaCustomizer
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Configure Standard Hourly Rate & Overtime Formula Parameters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Formula</span>
            <span className="sm:hidden">Formula</span>
            {showFormulaCustomizer ? (
              <ChevronUp className="h-3 w-3 ml-0.5" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </button>

          {/* Export Timesheet Ledger PDF */}
          <button
            type="button"
            disabled={pdfGenerating}
            onClick={handleExportTimesheetLedgerPDF}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Download Official Timesheet-Based Salary Ledger PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="font-bold"></span>
          </button>

          {/* Currency Pill */}
          
        </div>
      </div>

      {/* Deleted Payroll Banner with Restore */}
      {deletedThisMonth.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{deletedThisMonth.length}</strong> payroll record{deletedThisMonth.length > 1 ? 's' : ''} deleted for {monthNames[selectedMonth - 1]} {selectedYear}. (Personnel profiles remain active in company directory).
            </span>
          </div>
          <button
            type="button"
            onClick={handleRestoreAllDeletedPayrollsForMonth}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore All ({deletedThisMonth.length})</span>
          </button>
        </div>
      )}

      {/* ==========================================
          CUSTOMIZABLE FORMULA & RATE ENGINE PANEL
          ========================================== */}
      {showFormulaCustomizer && (
        <div className="rounded-xl border border-blue-300 bg-gradient-to-br from-blue-50/90 to-slate-50 p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-200/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-600 text-white p-1.5 shadow-xs">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Customizable Formula & Rate Determination Engine
                </h3>
                <p className="text-[11px] text-slate-600">
                  Adjust Standard Hourly Base Rate divisors, Overtime remuneration multipliers, and 1.0× Holiday toggles.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetFormulaDefaults}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 self-start sm:self-auto bg-white px-2.5 py-1 rounded border border-blue-200 shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to Defaults (1.0× OT / 1.0× Holiday)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* PANEL 1: Standard Hourly Base Rate Determination */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-mono">1</span>
                  Standard Hourly Base Rate Determination
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-blue-700">
                  Divisor: {expectedStandardHours} hrs
                </span>
              </div>

              {/* Divisor Method Options */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-800">
                    Configurable Divisor Methods:
                  </label>
                  <span className="text-[10.5px] font-mono text-blue-700 font-bold">
                    Effective: {expectedStandardHours} hrs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {/* 1. Statutory WPS (260 hrs) */}
                  <button
                    type="button"
                    onClick={() => setHourlyDivisorMethod('statutory_260')}
                    className={`rounded-lg p-2 text-left border transition-all cursor-pointer ${
                      hourlyDivisorMethod === 'statutory_260'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-[11px]">Statutory WPS (260 hrs)</span>
                      <span className="text-[10px] px-1 bg-blue-100 text-blue-800 rounded font-mono font-bold">260h</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Saudi Labor Law WPS standard
                    </div>
                    <div className="text-[10px] text-blue-700 font-mono mt-0.5 font-semibold">
                      Fixed 260.0 hours
                    </div>
                  </button>

                  {/* 2. Custom Hours */}
                  <button
                    type="button"
                    onClick={() => setHourlyDivisorMethod('custom_hours')}
                    className={`rounded-lg p-2 text-left border transition-all cursor-pointer ${
                      hourlyDivisorMethod === 'custom_hours'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-[11px]">Custom Hours</span>
                      <span className="text-[10px] px-1.5 bg-blue-100 text-blue-800 rounded font-mono font-bold">{customDivisorHours}h</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                      User-configured divisor hours
                    </div>
                    <div className="text-[10px] text-blue-700 font-mono mt-0.5 font-semibold">
                      Specified {customDivisorHours}.0 hours
                    </div>
                  </button>
                </div>
              </div>

              {/* Sub-inputs: Custom Hours */}
              {hourlyDivisorMethod === 'custom_hours' && (
                <div className="flex items-center gap-2 pt-1 font-mono text-xs bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-[11px] text-slate-700 font-sans font-semibold">Custom Divisor Hours:</span>
                  <input
                    type="number"
                    min={1}
                    max={400}
                    value={customDivisorHours}
                    onChange={(e) => setCustomDivisorHours(Math.max(1, Number(e.target.value)))}
                    className="w-24 rounded border border-slate-300 px-2 py-1 outline-none text-xs bg-white font-mono font-bold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 font-sans">hours / month</span>
                </div>
              )}

              {/* Salary Numerator Basis */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Rate Determination Basis:</span>
                <div className="flex items-center gap-1 font-sans">
                  <button
                    type="button"
                    onClick={() => setRateSalaryBasis('base_only')}
                    className={`rounded px-2 py-0.5 border cursor-pointer ${
                      rateSalaryBasis === 'base_only'
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Monthly Basic Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateSalaryBasis('gross_package')}
                    className={`rounded px-2 py-0.5 border cursor-pointer ${
                      rateSalaryBasis === 'gross_package'
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Gross Package (Base + Allowances)
                  </button>
                </div>
              </div>

              {/* Live Formula Preview Box */}
              <div className="rounded bg-slate-50 border border-slate-200 p-2 font-mono text-[11px] text-slate-800">
                <span className="text-slate-500 block text-[10px] font-sans">ACTIVE BASE RATE EQUATION:</span>
                <strong>Hourly Base Rate</strong> = {rateSalaryBasis === 'base_only' ? 'Monthly Basic' : 'Total Package'} ÷ <strong>{expectedStandardHours} hrs</strong>{' '}
                <span className="text-slate-500 text-[10px] font-sans">
                  ({hourlyDivisorMethod === 'statutory_260'
                    ? 'Statutory WPS (260 hrs)'
                    : `Custom ${customDivisorHours} hrs`})
                </span>
              </div>
            </div>

            {/* PANEL 2: Overtime Hours Remuneration & Holiday Toggle */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-mono">2</span>
                  Overtime Hours Remuneration Formula
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-amber-800">
                  Multiplier: {effectiveOvertimeMultiplier.toFixed(2)}×
                </span>
              </div>

              {/* Multiplier Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Normal Overtime Multiplier (Default: 1.0×):
                  </label>
                  <span className="text-[10.5px] font-mono text-slate-500">
                    Active: <strong>{overtimeMultiplier}×</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {[1.0, 1.25, 1.5, 2.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOvertimeMultiplier(val)}
                      className={`rounded-md p-1.5 text-center border transition-all ${
                        overtimeMultiplier === val
                          ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-2xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {val.toFixed(1)}× {val === 1.0 ? '(Req)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requested Holiday Toggle */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-amber-950 text-xs block">
                        1.0× Holiday Overtime Toggle
                      </span>
                      <span className="text-[10.5px] text-amber-800">
                        Requested toggle: Applies holiday multiplier to overtime hours
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isHolidayRateActive}
                      onChange={(e) => setIsHolidayRateActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {isHolidayRateActive && (
                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-amber-900 font-medium">Holiday Multiplier Setting:</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[1.0, 1.5, 2.0].map((hVal) => (
                        <button
                          key={hVal}
                          type="button"
                          onClick={() => setHolidayMultiplier(hVal)}
                          className={`rounded px-2 py-0.5 border ${
                            holidayMultiplier === hVal
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white text-slate-700 border-amber-300'
                          }`}
                        >
                          {hVal.toFixed(1)}× Holiday
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Formula Preview Box */}
              <div className="rounded bg-slate-50 border border-slate-200 p-2 font-mono text-[11px] text-slate-800">
                <span className="text-slate-500 block text-[10px] font-sans">ACTIVE OVERTIME EQUATION:</span>
                <strong>Overtime Pay</strong> = Overtime Hours × (Hourly Base Rate × <strong>{effectiveOvertimeMultiplier.toFixed(1)}</strong>)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate KPI Strip (Responsive 2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1: Total Timesheet Hours Logged */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Total Hours Logged</span>
            <div className="rounded-md bg-blue-50 p-1 sm:p-1.5 text-blue-600">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {totalWorkforceHours.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500">hrs</span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500 pt-1.5 sm:pt-2 border-t border-slate-100">
            <span>Reg: <strong>{totalRegularHours}h</strong></span>
            <span className="text-amber-600 font-bold">+{totalOvertimeHours}h OT</span>
          </div>
        </div>

        {/* KPI 2: Timesheet-Based Calculated Payroll */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4 shadow-2xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-emerald-900 font-medium">Timesheet Payroll</span>
            <div className="rounded-md bg-emerald-100 text-emerald-700 p-1 sm:p-1.5">
              <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-emerald-950 font-mono tabular-nums truncate">
              {formatCurrency(totalTimesheetCalculatedPayroll)}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-emerald-800 pt-1.5 sm:pt-2 border-t border-emerald-200/60">
            <span>Payable:</span>
            <span className="font-bold">
              {netPayrollVariance >= 0 ? `+${formatCurrency(netPayrollVariance)}` : formatCurrency(netPayrollVariance)}
            </span>
          </div>
        </div>

        {/* KPI 3: Overtime Premium Compensation */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 sm:p-4 shadow-2xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-amber-900 font-medium">Overtime Remuneration</span>
            <div className="rounded-md bg-amber-100 text-amber-700 p-1 sm:p-1.5">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-amber-950 font-mono tabular-nums truncate">
              {formatCurrency(totalOvertimeLiability)}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-amber-800 pt-1.5 sm:pt-2 border-t border-amber-200/60">
            <span>Rate Multiplier:</span>
            <span className="font-bold">{effectiveOvertimeMultiplier.toFixed(1)}×</span>
          </div>
        </div>

        {/* KPI 4: Contract Benchmark Monthly Package */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Contract Benchmark</span>
            <div className="rounded-md bg-slate-100 text-slate-700 p-1 sm:p-1.5">
              <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
              {formatCurrency(totalContractPayroll)}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500 pt-1.5 sm:pt-2 border-t border-slate-100">
            <span>Personnel:</span>
            <span>{eligibleWorkforce.length} Active Records</span>
          </div>
        </div>
      </div>

      {/* Filter and View Modes Controller */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 text-xs">
          {/* Search Input & Department Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, ID or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 outline-none focus:border-slate-400 text-xs"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-medium"
            >
              <option value="all">All Departments</option>
              <option value="Engineering & Technology">Engineering</option>
              <option value="Human Resources & Talent">Human Resources</option>
              <option value="Finance & Treasury">Finance & Treasury</option>
              <option value="Operations & Enterprise Projects">Operations</option>
              <option value="Legal & Regulatory Compliance">Legal & Compliance</option>
            </select>
          </div>

          {/* List View / Grid View Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium self-end sm:self-auto shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all cursor-pointer ${
                layoutMode === 'list'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Switch to List View (Data Table)"
            >
              <List className={`h-3.5 w-3.5 ${layoutMode === 'list' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Switch to Grid View (Cards Matrix)"
            >
              <LayoutGrid className={`h-3.5 w-3.5 ${layoutMode === 'grid' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Grid View</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Tags */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Status:
            </span>
            <button
              type="button"
              onClick={() => setHoursFilter('all')}
              className={`rounded-md px-2 py-0.5 border transition-colors ${
                hoursFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({calculatedWorkforce.length})
            </button>
            <button
              type="button"
              onClick={() => setHoursFilter('overtime')}
              className={`rounded-md px-2 py-0.5 border transition-colors ${
                hoursFilter === 'overtime'
                  ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              ⚡ Overtime ({calculatedWorkforce.filter((e) => e.timesheet.overtimeHours > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setHoursFilter('exact')}
              className={`rounded-md px-2 py-0.5 border transition-colors ${
                hoursFilter === 'exact'
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
              }`}
            >
              Standard 100% ({calculatedWorkforce.filter((e) => Math.abs(e.timesheet.totalHours - e.timesheet.expectedHours) < 0.1).length})
            </button>
            <button
              type="button"
              onClick={() => setHoursFilter('shortfall')}
              className={`rounded-md px-2 py-0.5 border transition-colors ${
                hoursFilter === 'shortfall'
                  ? 'bg-rose-600 text-white border-rose-600 font-semibold'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              }`}
            >
              Shortfall ({calculatedWorkforce.filter((e) => e.timesheet.totalHours < e.timesheet.expectedHours).length})
            </button>
          </div>

          <div className="text-slate-500 font-mono text-[10.5px]">
            Showing <strong className="text-slate-800">{filtered.length}</strong> accounts
          </div>
        </div>
      </div>

      {/* ==============================================================
          RESPONSIVE VIEW:
      {/* ==============================================================
          VIEW MODES:
          1. LIST VIEW (Data Table)
          2. GRID VIEW (Cards Matrix: 1-col mobile, 2-col tablet, 3-col desktop)
          ============================================================== */}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-2xs">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No matching personnel records found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query, department, or hours filter.
          </p>
        </div>
      ) : layoutMode === 'list' ? (
        /* 1. LIST VIEW: COMPREHENSIVE DATA TABLE */
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="md:hidden px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10.5px] text-slate-500 flex items-center justify-between font-medium">
            <span>👉 Scroll horizontally to inspect all ledger columns</span>
            <span className="font-mono">{filtered.length} Records</span>
          </div>
          <table className="w-full border-collapse text-left text-xs font-sans min-w-[900px] md:min-w-0">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="px-3.5 py-3">Employee & ID</th>
                <th className="px-3.5 py-3">Department</th>

                <th className="px-3.5 py-3 text-right">Contract Base</th>

                <th className="px-3.5 py-3 text-center bg-blue-50/40 text-blue-900 border-x border-blue-100">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span>Timesheet Total Hours</span>
                  </div>
                  <span className="text-[9.5px] font-normal lowercase tracking-normal text-slate-400 block mt-0.5 font-mono">
                    (reg + ot / {expectedStandardHours}h)
                  </span>
                </th>

                <th className="px-3.5 py-3 text-right font-mono">
                  Rate ({baseCurrency}/h)
                </th>

                <th className="px-3.5 py-3 text-right font-mono text-amber-700">
                  Overtime ({effectiveOvertimeMultiplier.toFixed(1)}×)
                </th>

                <th className="px-3.5 py-3 text-right text-slate-600 font-mono">
                  Allowances
                </th>

                {/* Timesheet-Based Salary Calculation Column */}
                <th className="px-3.5 py-3 text-right font-bold text-emerald-950 bg-emerald-50/60 border-l border-emerald-100">
                  <div className="flex items-center justify-end gap-1">
                    <Calculator className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Timesheet-Based Salary</span>
                  </div>
                  <span className="text-[9.5px] font-normal lowercase tracking-normal text-emerald-700 block mt-0.5 font-mono">
                    Payable for {monthNames[selectedMonth - 1].substring(0, 3)}
                  </span>
                </th>

                <th className="px-3.5 py-3 text-right font-mono text-[10.5px]">
                  Variance
                </th>

                {/* Action Column including requested Delete Button */}
                <th className="px-3.5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filtered.map((emp) => {
                const ts = emp.timesheet;
                const hasOvertime = ts.overtimeHours > 0;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Personnel Info */}
                    <td className="px-3.5 py-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp.profileImage}
                          alt={emp.fullName}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {emp.id} · {emp.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-3.5 py-3 font-sans text-slate-700 text-[11px]">
                      {emp.department}
                    </td>

                    {/* Contract Monthly Base */}
                    <td className="px-3.5 py-3 text-right tabular-nums text-slate-800">
                      {formatCurrency(emp.monthlyBaseSalary)}
                    </td>

                    {/* Timesheet Total Hours Column */}
                    <td className="px-3.5 py-3 text-center bg-blue-50/20 border-x border-blue-50">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm tabular-nums">
                            {ts.totalHours.toFixed(1)} hrs
                          </span>
                          {hasOvertime && (
                            <span className="rounded bg-amber-100 text-amber-800 font-bold px-1 py-0.2 text-[9.5px]">
                              +{ts.overtimeHours}h OT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500">
                          <span>{ts.regularHours.toFixed(0)}h Reg</span>
                          <span>·</span>
                          <span
                            className={
                              ts.completionRate >= 100
                                ? 'text-emerald-700 font-semibold'
                                : 'text-rose-600 font-semibold'
                            }
                          >
                            {ts.completionRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Hourly Base Rate */}
                    <td className="px-3.5 py-3 text-right tabular-nums text-slate-700 font-mono">
                      <div>{ts.hourlyBaseRate.toFixed(1)} {baseCurrency}</div>
                      <div className="text-[10px] text-slate-400">
                        OT: {ts.hourlyOvertimeRate.toFixed(1)}
                      </div>
                    </td>

                    {/* Overtime Remuneration */}
                    <td className="px-3.5 py-3 text-right tabular-nums">
                      {hasOvertime ? (
                        <span className="text-amber-800 font-bold">
                          +{formatCurrency(ts.timesheetOvertimePay)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0 {baseCurrency}</span>
                      )}
                    </td>

                    {/* Allowances */}
                    <td className="px-3.5 py-3 text-right tabular-nums text-slate-600">
                      {formatCurrency(ts.totalAllowances)}
                    </td>

                    {/* Timesheet-Based Salary Calculation */}
                    <td className="px-3.5 py-3 text-right tabular-nums bg-emerald-50/30 border-l border-emerald-100">
                      <div className="font-bold text-emerald-900 text-sm">
                        {formatCurrency(ts.timesheetTotalPayable)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        Regular + OT + Allowances
                      </div>
                    </td>

                    {/* Variance vs Contract */}
                    <td className="px-3.5 py-3 text-right tabular-nums">
                      {ts.varianceSAR > 0 ? (
                        <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[11px] font-bold">
                          +{formatCurrency(ts.varianceSAR)}
                        </span>
                      ) : ts.varianceSAR < 0 ? (
                        <span className="rounded-md bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[11px] font-bold">
                          {formatCurrency(ts.varianceSAR)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Exact (0)</span>
                      )}
                    </td>

                    {/* Actions: Payslip, PDF, Edit, and Delete */}
                    <td className="px-3.5 py-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1">

                        {/* Single Payslip */}
                        <button
                          type="button"
                          onClick={() => {
                            setPayslipEmp(emp);
                            setPayslipMode('timesheet');
                          }}
                          className="rounded bg-slate-100 hover:bg-slate-200 p-1 text-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Print Single Payslip Template"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {/* REQUESTED DEDICATED PDF BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSinglePayslipPDF(emp, 'timesheet')}
                          className="rounded bg-rose-50 hover:bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[11px] font-bold border border-rose-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                          title={`Download Official PDF Payslip for ${emp.fullName}`}
                        >
                          <Download className="h-3 w-3" />
                          <span className="text-[10px]"></span>
                        </button>

                        {/* Edit Salary Modal */}
                        {(canPerformAdminAction || canPerformHrAction) && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="rounded p-1 text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Contract Salary"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* DELETE ONLY PAYROLL BUTTON */}
                        {(canPerformAdminAction || canPerformHrAction || canPerformFinanceAction) && (
                          <button
                            type="button"
                            onClick={() => setDeletePayrollTarget(emp)}
                            className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Delete Payroll Record (Employee profile remains active in directory)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-100/80 font-mono font-bold text-xs">
                <td className="px-3.5 py-3 font-sans text-slate-900">
                  TOTALS ({filtered.length} Personnel)
                </td>
                <td className="px-3.5 py-3 font-sans text-slate-500">-</td>

                <td className="px-3.5 py-3 text-right text-slate-900">
                  {formatCurrency(filtered.reduce((a, b) => a + b.monthlyBaseSalary, 0))}
                </td>

                <td className="px-3.5 py-3 text-center text-blue-900 font-bold">
                  {filtered.reduce((a, b) => a + b.timesheet.totalHours, 0).toFixed(1)} hrs
                </td>

                <td className="px-3.5 py-3 text-right text-slate-500">-</td>

                <td className="px-3.5 py-3 text-right text-amber-700">
                  +{formatCurrency(filtered.reduce((a, b) => a + b.timesheet.timesheetOvertimePay, 0))}
                </td>

                <td className="px-3.5 py-3 text-right text-slate-600">
                  {formatCurrency(filtered.reduce((a, b) => a + b.timesheet.totalAllowances, 0))}
                </td>

                <td className="px-3.5 py-3 text-right text-emerald-950 font-bold bg-emerald-100/60 text-sm">
                  {formatCurrency(filtered.reduce((a, b) => a + b.timesheet.timesheetTotalPayable, 0))}
                </td>

                <td className="px-3.5 py-3 text-right">
                  {netPayrollVariance >= 0 ? (
                    <span className="text-emerald-700 font-bold">
                      +{formatCurrency(netPayrollVariance)}
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold">
                      {formatCurrency(netPayrollVariance)}
                    </span>
                  )}
                </td>

                <td className="px-3.5 py-3 text-center font-sans text-slate-500">
                  Audited
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* 2. GRID VIEW: RESPONSIVE CARDS MATRIX (1-col on mobile, 2-col on tablet, 3-col on desktop) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filtered.map((emp) => {
            const ts = emp.timesheet;
            const hasOvertime = ts.overtimeHours > 0;

            return (
              <div
                key={emp.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Top: Avatar, Name, Designation & Department */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={emp.profileImage}
                        alt={emp.fullName}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {emp.id} · {emp.designation}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {emp.department}
                        </div>
                      </div>
                    </div>

                    {/* Variance Badge */}
                    <div className="shrink-0 text-right">
                      {ts.varianceSAR > 0 ? (
                        <span className="inline-block rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-mono font-bold">
                          +{formatCurrency(ts.varianceSAR)}
                        </span>
                      ) : ts.varianceSAR < 0 ? (
                        <span className="inline-block rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[11px] font-mono font-bold">
                          {formatCurrency(ts.varianceSAR)}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-mono">
                          Exact (0)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hours Fulfillment Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500 font-sans flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        Hours Fulfillment:
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {ts.totalHours.toFixed(1)} / {expectedStandardHours}h ({ts.completionRate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ts.completionRate >= 100
                            ? 'bg-emerald-500'
                            : ts.completionRate >= 80
                            ? 'bg-blue-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, ts.completionRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Middle: 2x2 Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-mono mt-3">
                    {/* Metric 1: Timesheet Total Hours */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" /> Total Hours:
                      </span>
                      <div className="font-bold text-slate-900 text-sm">
                        {ts.totalHours.toFixed(1)} hrs
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {ts.regularHours}h Reg · <span className="text-amber-700 font-semibold">+{ts.overtimeHours}h OT</span>
                      </div>
                    </div>

                    {/* Metric 2: Standard Base Rate */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Hourly Base Rate:
                      </span>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">
                        {ts.hourlyBaseRate.toFixed(1)} {baseCurrency}/h
                      </div>
                      <div className="text-[10px] text-slate-500">
                        OT: {ts.hourlyOvertimeRate.toFixed(1)} ({ts.effectiveOvertimeMultiplier.toFixed(1)}×)
                      </div>
                    </div>

                    {/* Metric 3: Contract Monthly Base */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Contract Base:
                      </span>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5">
                        {formatCurrency(emp.monthlyBaseSalary)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Allowances: {formatCurrency(ts.totalAllowances)}
                      </div>
                    </div>

                    {/* Metric 4: Timesheet-Based Calculated Salary */}
                    <div className="rounded bg-emerald-50 border border-emerald-200 p-1.5">
                      <span className="text-[10px] text-emerald-800 font-sans font-semibold block flex items-center gap-1">
                        <Calculator className="h-3 w-3 text-emerald-600" /> Calculated Salary:
                      </span>
                      <div className="font-bold text-emerald-950 text-sm mt-0.5">
                        {formatCurrency(ts.timesheetTotalPayable)}
                      </div>
                      {hasOvertime && (
                        <div className="text-[9.5px] text-amber-800 font-medium">
                          Incl. +{formatCurrency(ts.timesheetOvertimePay)} OT
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Bar with Print, PDF, Edit, and Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Single Payslip Print Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPayslipEmp(emp);
                        setPayslipMode('timesheet');
                      }}
                      className="flex items-center gap-1 rounded-md bg-slate-100 text-slate-800 px-2 py-1 text-xs font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Print Single Payslip"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span></span>
                    </button>

                    {/* REQUESTED DEDICATED PDF BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePayslipPDF(emp, 'timesheet')}
                      className="flex items-center gap-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                      title={`Download Official PDF Payslip for ${emp.fullName}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span></span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit Salary Button */}
                    {(canPerformAdminAction || canPerformHrAction) && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(emp)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Edit Salary Structure"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                      </button>
                    )}

                    {/* DELETE ONLY PAYROLL BUTTON */}
                    {(canPerformAdminAction || canPerformHrAction || canPerformFinanceAction) && (
                      <button
                        type="button"
                        onClick={() => setDeletePayrollTarget(emp)}
                        className="rounded-md border border-rose-200 bg-rose-50/60 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Delete Payroll Record (Employee profile remains active in directory)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==============================================================
          MODAL 2: DELETE ONLY PAYROLL CONFIRMATION MODAL
          ============================================================== */}
      {deletePayrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-600 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Delete Payroll Record — {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete only the payroll record for this employee for {monthNames[selectedMonth - 1]} {selectedYear}?
                </p>
              </div>
            </div>

            {/* Employee Target Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2.5">
                <img
                  src={deletePayrollTarget.profileImage}
                  alt={deletePayrollTarget.fullName}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover border border-slate-300 bg-white"
                />
                <div>
                  <div className="font-bold text-slate-900">{deletePayrollTarget.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {deletePayrollTarget.id} · {deletePayrollTarget.designation}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block font-sans">Department:</span>
                  <span className="font-medium text-slate-800">{deletePayrollTarget.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Timesheet Total:</span>
                  <span className="font-bold text-slate-900">{activeDeleteTargetData?.timesheet.totalHours || 0} hrs</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Timesheet Net:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(activeDeleteTargetData?.timesheet.timesheetTotalPayable || deletePayrollTarget.monthlyBaseSalary)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Employment Status:</span>
                  <span className="font-semibold text-emerald-700 capitalize">{deletePayrollTarget.status}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-700 bg-slate-100 rounded-lg p-2.5 border border-slate-200 font-medium flex items-start gap-1.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <span>
                <strong>Important:</strong> Deleting this payroll record clears only this month&apos;s timesheet hours and salary calculation. The employee profile, contract details, and system user access will <strong>remain completely intact and active</strong> in the employee directory.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletePayrollTarget(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayroll}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Delete Payroll</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 3: SINGLE PAYSLIP PRINT PREVIEW
          ============================================================== */}
      {activePayslipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2 no-print">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Print Single Customizable Payslip
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Formatted according to Corporate Template Studio & Formula Specifications.
                </p>
              </div>

              {/* Mode Toggle & Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setPayslipMode('timesheet')}
                    className={`rounded-md px-2 py-1 transition-all ${
                      payslipMode === 'timesheet'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Timesheet Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayslipMode('contract')}
                    className={`rounded-md px-2 py-1 transition-all ${
                      payslipMode === 'contract'
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Fixed Contract
                  </button>
                </div>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePayslipPDF(activePayslipData, payslipMode)}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  title="Download Official Vector Payslip PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayslipEmp(null)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="print-container mt-4 sm:mt-6 space-y-4 sm:space-y-6 text-slate-900">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 sm:pb-4 gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Logo"
                    className="h-10 w-10 sm:h-12 sm:w-12 object-contain bg-slate-900 p-1 rounded"
                  />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {corporateEntity.companyName}
                    </h2>
                    <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT ID: {corporateEntity.vatNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs shrink-0">
                  <span className="font-bold text-slate-900 uppercase tracking-wider block">
                    MONTHLY PAYSLIP
                  </span>
                  <span className="font-mono text-slate-700 block mt-0.5">
                    Pay Period: {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] text-slate-500 block">
                    Basis: {payslipMode === 'timesheet' ? 'Timesheet Logged Hours' : 'Standard Monthly Contract'}
                  </span>
                </div>
              </div>

              {/* Employee Particulars Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">EMPLOYEE NAME</span>
                  <span className="font-bold text-slate-900 font-sans text-xs sm:text-sm">
                    {activePayslipData.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">EMPLOYEE ID / IQAMA</span>
                  <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
                    {activePayslipData.id} / {activePayslipData.iqamaNationalId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">DESIGNATION & DEPT</span>
                  <span className="text-slate-800 font-sans text-[11px] sm:text-xs">
                    {activePayslipData.designation} ({activePayslipData.department})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">BANK IBAN</span>
                  <span className="text-slate-800 text-[11px] sm:text-xs truncate block">{activePayslipData.bankIban}</span>
                </div>
              </div>

              {/* Timesheet Hours Audit Box (If timesheet mode) */}
              {payslipMode === 'timesheet' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 sm:p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-blue-950 font-bold border-b border-blue-200/80 pb-1.5 font-sans gap-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>Timesheet Hours Audit & Rate Schedule</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-blue-800">
                      Standard: {expectedStandardHours}h ({standardWorkingDays} Workdays)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Regular Hours:</span>
                      <strong className="text-slate-900">{activePayslipData.timesheet.regularHours.toFixed(1)} hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Overtime Hours:</span>
                      <strong className="text-amber-700 font-bold">+{activePayslipData.timesheet.overtimeHours.toFixed(1)} hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Total Logged:</span>
                      <strong className="text-blue-900 font-bold">{activePayslipData.timesheet.totalHours.toFixed(1)} hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Rate (Base/OT):</span>
                      <strong className="text-slate-900">
                        {activePayslipData.timesheet.hourlyBaseRate.toFixed(1)} / {activePayslipData.timesheet.hourlyOvertimeRate.toFixed(1)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Itemized Earnings & Deductions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Itemized Earnings & Remuneration ({baseCurrency})
                </h4>
                <table className="w-full border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-700">
                      <th className="px-2.5 sm:px-3 py-2 text-left">Compensation Element</th>
                      <th className="px-2.5 sm:px-3 py-2 text-right">Basis</th>
                      <th className="px-2.5 sm:px-3 py-2 text-right">Amount ({baseCurrency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslipMode === 'timesheet' ? (
                      <>
                        <tr>
                          <td className="px-2.5 sm:px-3 py-2 font-sans font-medium text-slate-900">
                            Regular Working Hours Pay
                          </td>
                          <td className="px-2.5 sm:px-3 py-2 text-right text-slate-500 text-[11px]">
                            {activePayslipData.timesheet.regularHours}h @ {activePayslipData.timesheet.hourlyBaseRate.toFixed(1)}/h
                          </td>
                          <td className="px-2.5 sm:px-3 py-2 text-right font-semibold text-slate-900">
                            {formatCurrency(activePayslipData.timesheet.timesheetRegularPay)}
                          </td>
                        </tr>

                        {activePayslipData.timesheet.overtimeHours > 0 && (
                          <tr className="bg-amber-50/30">
                            <td className="px-2.5 sm:px-3 py-2 font-sans font-medium text-amber-950 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-600" />
                              <span>Overtime Remuneration</span>
                            </td>
                            <td className="px-2.5 sm:px-3 py-2 text-right text-amber-800 text-[11px]">
                              {activePayslipData.timesheet.overtimeHours}h @ {activePayslipData.timesheet.effectiveOvertimeMultiplier.toFixed(1)}× ({activePayslipData.timesheet.hourlyOvertimeRate.toFixed(1)}/h)
                            </td>
                            <td className="px-2.5 sm:px-3 py-2 text-right font-bold text-amber-900">
                              +{formatCurrency(activePayslipData.timesheet.timesheetOvertimePay)}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td className="px-2.5 sm:px-3 py-2 font-sans">Monthly Basic Salary</td>
                        <td className="px-2.5 sm:px-3 py-2 text-right text-slate-500">Contractual</td>
                        <td className="px-2.5 sm:px-3 py-2 text-right font-semibold">
                          {formatCurrency(activePayslipData.monthlyBaseSalary)}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td className="px-2.5 sm:px-3 py-2 font-sans">Housing Allowance</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right text-slate-500">Fixed Monthly</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right">
                        {formatCurrency(activePayslipData.housingAllowance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 sm:px-3 py-2 font-sans">Transportation Allowance</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right text-slate-500">Fixed Monthly</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right">
                        {formatCurrency(activePayslipData.transportAllowance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 sm:px-3 py-2 font-sans">Other Professional Allowances</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right text-slate-500">Corporate Subsidies</td>
                      <td className="px-2.5 sm:px-3 py-2 text-right">
                        {formatCurrency(activePayslipData.otherAllowances)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                      <td className="px-2.5 sm:px-3 py-2.5 font-sans">NET SALARY PAYABLE</td>
                      <td className="px-2.5 sm:px-3 py-2.5 text-right font-sans text-slate-500 text-[10px] sm:text-xs">
                        WAGE PROTECTION SYSTEM (WPS)
                      </td>
                      <td className="px-2.5 sm:px-3 py-2.5 text-right text-emerald-800 text-sm">
                        {formatCurrency(
                          payslipMode === 'timesheet'
                            ? activePayslipData.timesheet.timesheetTotalPayable
                            : activePayslipData.totalMonthlyPackage
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Annualized Projection */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 sm:p-3 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-600 text-[11px] font-sans">Contract Annual Base (×12):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(activePayslipData.annualBaseSalary)}
                </span>
              </div>

              {/* Signature Blocks */}
              <div className="pt-4 sm:pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 sm:gap-8 text-xs font-sans">
                <div>
                  <span className="text-slate-500 block mb-5 sm:mb-6 text-[11px]">Finance & Payroll Officer</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[10.5px]">
                    Tariq Mansoor (CFO)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block mb-5 sm:mb-6 text-[11px]">Employee Acknowledgement</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[10.5px]">
                    {activePayslipData.fullName}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                {templateConfigs.payslip?.footerNote ||
                  'Nexus Global ERP System · Commercial Registration: 1010729384.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 4: EDIT SALARY STRUCTURE MODAL
          ============================================================== */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Adjust Compensation & Base Salary
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure contract base salary and allowance structure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="mt-4 space-y-3.5 text-xs">
              {/* Employee Summary Card */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-slate-700 font-mono text-[11px] border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={editingEmp.profileImage}
                    alt={editingEmp.fullName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-cover border border-slate-300 bg-white"
                  />
                  <div>
                    <span className="font-bold text-slate-900 font-sans text-xs block">{editingEmp.fullName}</span>
                    <span className="text-slate-500 text-[10px]">{editingEmp.id} · {editingEmp.designation}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Current Package:</span>
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    {formatCurrency(editingEmp.totalMonthlyPackage)}
                  </span>
                </div>
              </div>

              {/* Monthly Base Salary */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Monthly Base Salary ({baseCurrency})
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={100}
                  value={monthlyBase}
                  onChange={(e) => setMonthlyBase(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  Annual Base = {(monthlyBase * 12).toLocaleString()} {baseCurrency}
                </span>
              </div>

              {/* Allowances: Housing, Transport & Other */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Housing ({baseCurrency})</label>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={housing}
                    onChange={(e) => setHousing(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Transport ({baseCurrency})</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={transport}
                    onChange={(e) => setTransport(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700">Other ({baseCurrency})</label>
                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                      = {other.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={otherExpression}
                    onChange={(e) => handleOtherExpressionChange(e.target.value)}
                    placeholder="e.g. 1000-100"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                    title="Enter allowance value or arithmetic expression (e.g. 1000-100 = 900)"
                  />
                  
                </div>
              </div>

              {/* Total Summary Preview Card */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 font-mono text-[11px] flex justify-between items-center">
                <span className="text-slate-600 font-sans">New Total Monthly Package:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(monthlyBase + housing + transport + other)}
                </span>
              </div>

              {/* Audit Justification Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Audit Justification Notes</label>
                <textarea
                  required
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Save Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
