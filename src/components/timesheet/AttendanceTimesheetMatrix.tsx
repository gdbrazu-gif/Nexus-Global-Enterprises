import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee, TimesheetEntry, TimesheetStatus } from '../../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  X,
  User,
  Plus,
  Eye,
  SlidersHorizontal,
  FileText,
  Check,
  Sparkles,
  Filter,
  Search,
  Building2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  downloadMonthlyTimesheetLedgerPDF,
  downloadEmployeeTimesheetPDF,
  downloadDailyMatrixGridBlankPDF,
  downloadDailyMatrixGridWithHoursPDF,
  TimesheetLedgerSummaryItem,
} from '../../utils/pdfGenerator';

export const AttendanceTimesheetMatrix: React.FC = () => {
  const {
    employees,
    timesheetEntries,
    updateTimesheetCell,
    batchUpdateTimesheetCells,
    clearAllTimesheetForMonth,
    clearEmployeeTimesheetForMonth,
    canPerformAdminAction,
    canPerformHrAction,
    activeBranchId,
    corporateEntity,
    baseCurrency,
    t,
  } = useHRMS();

  // Selected Month and Year
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // October

  // View Mode: 'ledger' (Monthly Timesheet Ledger) or 'matrix' (Daily Grid Matrix)
  const [activeViewMode, setActiveViewMode] = useState<'ledger' | 'matrix'>('ledger');

  // Unlogged days default to 0 work hours
  const defaultWorkHours = 0;

  // Filter by department and search
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifications
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. Single Cell Edit Dialog state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeCellData, setActiveCellData] = useState<{
    employee: Employee;
    date: string;
    dayNumber: number;
    dayName: string;
    isWeekend: boolean;
    entry?: TimesheetEntry;
  } | null>(null);

  const [formHours, setFormHours] = useState<number>(0);
  const [formOvertime, setFormOvertime] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<TimesheetStatus>('present');
  const [formNotes, setFormNotes] = useState<string>('');

  // 2. Adjust Work Hours Modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTargetEmpId, setAdjustTargetEmpId] = useState<string>('all');
  const [adjustRegularHours, setAdjustRegularHours] = useState<number>(8);
  const [adjustOvertimeHours, setAdjustOvertimeHours] = useState<number>(0);
  const [adjustStatus, setAdjustStatus] = useState<TimesheetStatus>('present');
  const [adjustScope, setAdjustScope] = useState<'weekdays' | 'unlogged' | 'all'>('weekdays');
  const [adjustNotes, setAdjustNotes] = useState<string>('Standard shift adjusted by People Operations');

  // 3. Employee Detailed Monthly Timesheet Ledger View Modal
  const [viewEmployeeLedgerTarget, setViewEmployeeLedgerTarget] = useState<Employee | null>(null);

  // 5. Purge/Reset Confirmation Modal
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeEmpTarget, setPurgeEmpTarget] = useState<Employee | null>(null);

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

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Generate days array with day of week & weekend check (Fri & Sat = Weekend in Saudi Arabia)
  const daysArray = useMemo(() => {
    const list = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeekNum = d.getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
      const dayNameShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isWeekend = dayOfWeekNum === 5 || dayOfWeekNum === 6; // Friday & Saturday
      const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      list.push({
        day,
        dayNameShort,
        isWeekend,
        dateString,
      });
    }
    return list;
  }, [selectedYear, selectedMonth, daysInMonth]);

  // Exclude employees marked as 'inactive' and filter by activeBranchId
  const activeWorkforceEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.status !== 'inactive' &&
        (activeBranchId === 'all' || (emp.branchId || 'BR-RUH') === activeBranchId)
    );
  }, [employees, activeBranchId]);

  // Distinct departments derived dynamically from non-inactive workforce roster
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    activeWorkforceEmployees.forEach((emp) => {
      if (emp.department) set.add(emp.department.trim());
    });
    return Array.from(set).sort();
  }, [activeWorkforceEmployees]);

  // Filtered employees (excluding inactive employees)
  const filteredEmployees = useMemo(() => {
    return activeWorkforceEmployees.filter((emp) => {
      const matchesDept =
        selectedDepartment === 'all' || emp.department === selectedDepartment;
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [activeWorkforceEmployees, selectedDepartment, searchQuery]);

  // Quick lookup map for entries: `empId_date` -> TimesheetEntry
  const entriesMap = useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    timesheetEntries.forEach((entry) => {
      map.set(`${entry.employeeId}_${entry.date}`, entry);
    });
    return map;
  }, [timesheetEntries]);

  // Per-employee monthly metrics based on logged entries and defaultWorkHours
  const employeeTotals = useMemo(() => {
    const totals: Record<
      string,
      { regular: number; overtime: number; totalHours: number; presentDays: number; leaves: number; absences: number }
    > = {};

    activeWorkforceEmployees.forEach((emp) => {
      let regular = 0;
      let overtime = 0;
      let presentDays = 0;
      let leaves = 0;
      let absences = 0;

      daysArray.forEach((d) => {
        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
        if (entry) {
          regular += entry.regularHours || 0;
          overtime += entry.overtimeHours || 0;
          if (entry.status === 'present' || entry.status === 'overtime') {
            presentDays++;
          } else if (entry.status === 'annual_leave' || entry.status === 'sick_leave') {
            leaves++;
          } else if (entry.status === 'absent') {
            absences++;
          }
        } else if (!d.isWeekend) {
          // Unlogged weekday uses defaultWorkHours (default is 0)
          regular += defaultWorkHours;
          if (defaultWorkHours > 0) {
            presentDays++;
          }
        }
      });

      totals[emp.id] = {
        regular,
        overtime,
        totalHours: regular + overtime,
        presentDays,
        leaves,
        absences,
      };
    });

    return totals;
  }, [activeWorkforceEmployees, daysArray, entriesMap, defaultWorkHours]);

  // Per-day total staff present
  const perDayPresentCount = useMemo(() => {
    return daysArray.map((d) => {
      if (d.isWeekend) return 0;
      let count = 0;
      activeWorkforceEmployees.forEach((emp) => {
        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
        if (entry) {
          if (entry.status === 'present' || entry.status === 'overtime') count++;
        } else if (defaultWorkHours > 0) {
          count++;
        }
      });
      return count;
    });
  }, [daysArray, activeWorkforceEmployees, entriesMap, defaultWorkHours]);

  // High-level Month Stats
  const monthStats = useMemo(() => {
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalPresentDays = 0;
    const workingDaysCount = daysArray.filter((d) => !d.isWeekend).length;

    Object.values(employeeTotals).forEach((t) => {
      totalRegular += t.regular;
      totalOvertime += t.overtime;
      totalPresentDays += t.presentDays;
    });

    const maxPossiblePresentDays = activeWorkforceEmployees.length * workingDaysCount;
    const complianceRate =
      maxPossiblePresentDays > 0
        ? Math.round((totalPresentDays / maxPossiblePresentDays) * 100)
        : 100;

    return {
      totalHours: totalRegular + totalOvertime,
      totalRegular,
      totalOvertime,
      complianceRate,
      activeStaff: activeWorkforceEmployees.length,
      workingDays: workingDaysCount,
    };
  }, [employeeTotals, activeWorkforceEmployees.length, daysArray]);

  // Open edit modal for a specific day cell
  const handleCellClick = (emp: Employee, d: (typeof daysArray)[0]) => {
    if (!canPerformAdminAction && !canPerformHrAction) {
      setActionSuccessMsg('Timesheet logging is restricted to Super Admin and HR Managers.');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      return;
    }

    const existing = entriesMap.get(`${emp.id}_${d.dateString}`);
    setActiveCellData({
      employee: emp,
      date: d.dateString,
      dayNumber: d.day,
      dayName: d.dayNameShort,
      isWeekend: d.isWeekend,
      entry: existing,
    });

    if (existing) {
      setFormHours(existing.regularHours);
      setFormOvertime(existing.overtimeHours);
      setFormStatus(existing.status);
      setFormNotes(existing.notes || '');
    } else {
      if (d.isWeekend) {
        setFormHours(0);
        setFormOvertime(0);
        setFormStatus('weekend');
        setFormNotes('Weekend rest');
      } else {
        setFormHours(defaultWorkHours);
        setFormOvertime(0);
        setFormStatus('present');
        setFormNotes('Standard work shift');
      }
    }

    setEditModalOpen(true);
  };

  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCellData) return;

    updateTimesheetCell(
      activeCellData.employee.id,
      activeCellData.date,
      Number(formHours),
      Number(formOvertime),
      formStatus,
      formNotes
    );

    setEditModalOpen(false);
    setActionSuccessMsg(`Saved hours for ${activeCellData.employee.fullName} on ${activeCellData.date}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Adjust Work Hours batch action (Optimized with batchUpdateTimesheetCells)
  const handleApplyAdjustWorkHours = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmployees =
      adjustTargetEmpId === 'all'
        ? activeWorkforceEmployees
        : activeWorkforceEmployees.filter((e) => e.id === adjustTargetEmpId);

    const updates: {
      empId: string;
      date: string;
      regularHours: number;
      overtimeHours: number;
      status: TimesheetStatus;
      notes?: string;
    }[] = [];

    targetEmployees.forEach((emp) => {
      daysArray.forEach((d) => {
        const existing = entriesMap.get(`${emp.id}_${d.dateString}`);

        if (adjustScope === 'weekdays' && d.isWeekend) {
          return;
        }
        if (adjustScope === 'unlogged' && existing) {
          return;
        }

        updates.push({
          empId: emp.id,
          date: d.dateString,
          regularHours: Number(adjustRegularHours),
          overtimeHours: Number(adjustOvertimeHours),
          status: adjustStatus,
          notes: adjustNotes,
        });
      });
    });

    const summary = `Adjusted work hours across ${updates.length} daily records for ${
      adjustTargetEmpId === 'all' ? 'all workforce members' : targetEmployees[0]?.fullName
    } (${adjustRegularHours}h Reg, +${adjustOvertimeHours}h OT).`;

    batchUpdateTimesheetCells(updates, summary);

    setAdjustModalOpen(false);
    setActionSuccessMsg(
      `Successfully adjusted work hours across ${updates.length} daily records for ${
        adjustTargetEmpId === 'all' ? 'all workforce members' : targetEmployees[0]?.fullName
      } (Regular: ${adjustRegularHours}h, OT: +${adjustOvertimeHours}h).`
    );
    setTimeout(() => setActionSuccessMsg(null), 4500);
  };


  // Direct Vector PDF Download for Monthly Ledger (ISO A4)
  const handleDownloadLedgerPDF = (orientationOverride: 'landscape' | 'portrait' = 'landscape') => {
    const summaryItems: TimesheetLedgerSummaryItem[] = filteredEmployees.map((emp) => {
      const t = employeeTotals[emp.id] || {
        regular: 0,
        overtime: 0,
        totalHours: 0,
        presentDays: 0,
        leaves: 0,
        absences: 0,
      };
      return {
        employee: emp,
        regularHours: t.regular,
        overtimeHours: t.overtime,
        totalHours: t.totalHours,
        presentDays: t.presentDays,
        leaves: t.leaves,
        absences: t.absences,
      };
    });

    downloadMonthlyTimesheetLedgerPDF(
      monthNames[selectedMonth - 1],
      selectedYear,
      summaryItems,
      corporateEntity,
      baseCurrency,
      monthStats,
      orientationOverride
    );

    setActionSuccessMsg(
      `Downloaded ISO A4 ${orientationOverride === 'portrait' ? 'Portrait' : 'Landscape'} Monthly Timesheet Ledger PDF for ${monthNames[selectedMonth - 1]} ${selectedYear}.`
    );
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Direct Vector PDF Download for Blank Daily Matrix Grid
  const handleDownloadBlankMatrixPDF = () => {
    downloadDailyMatrixGridBlankPDF(
      monthNames[selectedMonth - 1],
      selectedYear,
      filteredEmployees,
      corporateEntity,
      daysArray,
      { department: selectedDepartment, searchQuery }
    );

    setActionSuccessMsg(
      `Downloaded Blank Daily Matrix Grid PDF for ${monthNames[selectedMonth - 1]} ${selectedYear} (${filteredEmployees.length} workforce members).`
    );
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Direct Vector PDF Download for Daily Matrix Grid WITH WORKING HOURS
  const handleDownloadDailyMatrixWithHoursPDF = () => {
    downloadDailyMatrixGridWithHoursPDF(
      monthNames[selectedMonth - 1],
      selectedYear,
      filteredEmployees,
      corporateEntity,
      daysArray,
      entriesMap,
      defaultWorkHours,
      employeeTotals,
      { department: selectedDepartment, searchQuery }
    );

    setActionSuccessMsg(
      `Generated & Downloaded Daily Matrix Grid PDF with Working Hours for ${monthNames[selectedMonth - 1]} ${selectedYear}.`
    );
    setTimeout(() => setActionSuccessMsg(null), 4500);
  };

  // Direct Vector PDF Download for single employee
  const handleDownloadSingleEmployeePDF = (emp: Employee) => {
    const totals = employeeTotals[emp.id] || {
      regular: 0,
      overtime: 0,
      totalHours: 0,
      presentDays: 0,
      leaves: 0,
      absences: 0,
    };

    const dailyRows = daysArray.map((d) => {
      const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
      let status = 'present';
      let reg = defaultWorkHours;
      let ot = 0;
      let notes = '';

      if (entry) {
        status = entry.status;
        reg = entry.regularHours;
        ot = entry.overtimeHours;
        notes = entry.notes || '';
      } else if (d.isWeekend) {
        status = 'weekend';
        reg = 0;
        ot = 0;
      }

      return {
        day: d.day,
        dateString: d.dateString,
        dayName: d.dayNameShort,
        isWeekend: d.isWeekend,
        status,
        regularHours: reg,
        overtimeHours: ot,
        notes,
      };
    });

    downloadEmployeeTimesheetPDF(
      emp,
      monthNames[selectedMonth - 1],
      selectedYear,
      dailyRows,
      totals,
      corporateEntity,
      baseCurrency
    );

    setActionSuccessMsg(`Downloaded Timesheet PDF for ${emp.fullName}.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleOpenPurgeMonthModal = () => {
    setPurgeEmpTarget(null);
    setPurgeModalOpen(true);
  };

  const handleOpenPurgeEmployeeModal = (emp: Employee) => {
    setPurgeEmpTarget(emp);
    setPurgeModalOpen(true);
  };

  const handleConfirmPurge = () => {
    if (purgeEmpTarget) {
      clearEmployeeTimesheetForMonth(purgeEmpTarget.id, selectedYear, selectedMonth);
      setActionSuccessMsg(
        `Timesheet entries for ${purgeEmpTarget.fullName} have been reset for ${monthNames[selectedMonth - 1]} ${selectedYear}.`
      );
    } else {
      clearAllTimesheetForMonth(selectedYear, selectedMonth);
      setActionSuccessMsg(
        `All workforce timesheet logs for ${monthNames[selectedMonth - 1]} ${selectedYear} have been purged and reset.`
      );
    }
    setPurgeModalOpen(false);
    setPurgeEmpTarget(null);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Full Name',
      'Department',
      'Designation',
      'Employment Type',
      'Regular Hours',
      'Overtime Hours',
      'Total Hours',
      'Present Days',
      'Leaves',
      'Absences',
      ...daysArray.map((d) => `Day ${d.day} (${d.dayNameShort})`),
    ];

    const rows = filteredEmployees.map((emp) => {
      const totals = employeeTotals[emp.id] || {
        regular: 0,
        overtime: 0,
        totalHours: 0,
        presentDays: 0,
        leaves: 0,
        absences: 0,
      };

      const dailyValues = daysArray.map((d) => {
        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
        if (entry) {
          if (entry.overtimeHours > 0) {
            return `${entry.status.toUpperCase()} (${entry.regularHours}+${entry.overtimeHours}h)`;
          }
          return `${entry.status.toUpperCase()} (${entry.regularHours}h)`;
        }
        if (d.isWeekend) return 'WEEKEND (0h)';
        return `PRESENT (${defaultWorkHours}h)`;
      });

      return [
        `"${emp.id}"`,
        `"${emp.fullName.replace(/"/g, '""')}"`,
        `"${emp.department.replace(/"/g, '""')}"`,
        `"${emp.designation.replace(/"/g, '""')}"`,
        `"${emp.employmentType}"`,
        totals.regular,
        totals.overtime,
        totals.totalHours,
        totals.presentDays,
        totals.leaves,
        totals.absences,
        ...dailyValues.map((v) => `"${v}"`),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Timesheet_Ledger_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionSuccessMsg(`Exported timesheet CSV for ${monthNames[selectedMonth - 1]} ${selectedYear}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Attendance & Timesheet
            </h1>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Workforce shift tracking, monthly attendance Ledger
          </p>
        </div>

        {/* Action Controls: View Switcher, Adjust Work Hours, Download PDF, Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher: Monthly Timesheet Ledger vs Daily Matrix Grid */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setActiveViewMode('ledger')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                activeViewMode === 'ledger'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Monthly Timesheet </span>
            </button>
            <button
              onClick={() => setActiveViewMode('matrix')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                activeViewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Daily Timesheet</span>
            </button>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer font-mono"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Adjust Work Hours Button */}
          <button
            onClick={() => {
              setAdjustTargetEmpId('all');
              setAdjustModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            title="Adjust work hours for employees across the month"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
            <span>Edit Hours</span>
          </button>

          {/* Download Monthly Ledger PDF Button */}
          <button
            onClick={() => handleDownloadLedgerPDF('landscape')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            title="Download Official Monthly Timesheet Ledger as Vector PDF (ISO A4)"
          >
            <Download className="h-3.5 w-3.5" />
            <span></span>
          </button>

          {/* Make PDF with Working Hours Button (NEW) 
          <button
            onClick={handleDownloadDailyMatrixWithHoursPDF}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            title="Make PDF with recorded employee working hours, overtime and shift codes"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-100" />
            <span>Make PDF with working hours</span>
          </button>
          */}
          

          {/* Download Blank Daily Matrix PDF Button 
          <button
            onClick={handleDownloadBlankMatrixPDF}
            className="flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
            title="Download Official Blank Daily Matrix Grid PDF for On-Site Physical Timekeeping"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>Blank Daily Matrix PDF</span>
          </button>
          
          */}
          

          {/* Export CSV Button 
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            title="Export Monthly Timesheet Grid & Ledger to CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          
          */}
          

          {/* Reset Month Timesheet Logs Button */}
          <button
            onClick={handleOpenPurgeMonthModal}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-xs"
            title="Reset and clear all timesheet logs for this month"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            <span className="hidden sm:inline"></span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-xs text-slate-500 font-medium">Total Hours Logged</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {monthStats.totalHours.toLocaleString()}h
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({monthStats.totalRegular}h Reg)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-xs text-slate-500 font-medium">Overtime Approved</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
              +{monthStats.totalOvertime.toLocaleString()}h
            </span>
            <span className="text-[11px] text-slate-500">Billable</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-xs text-slate-500 font-medium">Attendance Rate</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
              {monthStats.complianceRate}%
            </span>
            <span className="text-[11px] text-slate-500">Compliance</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="text-xs text-slate-500 font-medium">Working Days / Staff</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {monthStats.workingDays}d / {monthStats.activeStaff}
            </span>
            <span className="text-[11px] text-slate-500">Active Staff</span>
          </div>
        </div>
      </div>

      {/* Filter, Default Work Hours & Legend Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between text-xs">
        {/* Search & Department Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 rounded-md border border-slate-200 pl-8 pr-2.5 py-1 text-xs outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs outline-none bg-white font-medium text-slate-700"
          >
            <option value="all">All Departments ({activeWorkforceEmployees.length})</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>


        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-100 border border-emerald-300"></span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-100 border border-amber-300"></span>
            <span>Overtime</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-blue-100 border border-blue-300"></span>
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-100 border border-rose-300"></span>
            <span>Absence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-slate-200 border border-slate-300"></span>
            <span className="font-medium text-slate-700">Fri/Sat Off</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY TIMESHEET LEDGER VIEW */}
      {activeViewMode === 'ledger' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Monthly Workforce Timesheet Ledger — {monthNames[selectedMonth - 1]} {selectedYear}
                </h2>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                  {filteredEmployees.length} Personnel
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Default: <span className="font-mono font-bold text-slate-700">{defaultWorkHours}h/day</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                    <th className="px-3.5 py-3">Employee</th>
                    <th className="px-3 py-3">Department & Designation</th>
                    <th className="px-3 py-3 text-right">Regular (h)</th>
                    <th className="px-3 py-3 text-right">Overtime (h)</th>
                    <th className="px-3 py-3 text-right">Total Hours</th>
                    <th className="px-3 py-3 text-center">Present</th>
                    <th className="px-3 py-3 text-center">Leave</th>
                    <th className="px-3 py-3 text-center">Absence</th>
                    <th className="px-3 py-3 text-center">Rate</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredEmployees.map((emp) => {
                    const totals = employeeTotals[emp.id] || {
                      regular: 0,
                      overtime: 0,
                      totalHours: 0,
                      presentDays: 0,
                      leaves: 0,
                      absences: 0,
                    };

                    const workingDays = monthStats.workingDays;
                    const empRate =
                      workingDays > 0
                        ? Math.min(100, Math.round((totals.presentDays / workingDays) * 100))
                        : 0;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Employee Avatar & Name */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={emp.profileImage}
                              alt={emp.fullName}
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {emp.fullName}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {emp.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Dept & Designation */}
                        <td className="px-3 py-2.5">
                          <div className="text-slate-800 font-medium">{emp.department}</div>
                          <div className="text-[11px] text-slate-500">{emp.designation}</div>
                        </td>

                        {/* Regular Hours */}
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900">
                          {totals.regular}h
                        </td>

                        {/* Overtime Hours */}
                        <td className="px-3 py-2.5 text-right font-mono">
                          {totals.overtime > 0 ? (
                            <span className="font-bold text-amber-700">+{totals.overtime}h</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Total Hours */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {totals.totalHours}h
                        </td>

                        {/* Present Days */}
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 font-semibold border border-emerald-200">
                            {totals.presentDays} d
                          </span>
                        </td>

                        {/* Leaves */}
                        <td className="px-3 py-2.5 text-center font-mono">
                          {totals.leaves > 0 ? (
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800 font-semibold border border-blue-200">
                              {totals.leaves} d
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Absences */}
                        <td className="px-3 py-2.5 text-center font-mono">
                          {totals.absences > 0 ? (
                            <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-800 font-semibold border border-rose-200">
                              {totals.absences} d
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                          <span className="font-bold text-slate-800">{empRate}%</span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          {totals.totalHours === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                              Default 0h
                            </span>
                          ) : totals.overtime > 0 ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                              Overtime
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                              Logged
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: View, Adjust, PDF */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Employee Ledger */}
                            <button
                              onClick={() => setViewEmployeeLedgerTarget(emp)}
                              className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 transition-colors"
                              title="View detailed day-by-day timesheet ledger"
                            >
                              <Eye className="h-3 w-3 text-blue-600" />
                              <span></span>
                            </button>

                            {/* Adjust Work Hours for this Employee */}
                            <button
                              onClick={() => {
                                setAdjustTargetEmpId(emp.id);
                                setAdjustModalOpen(true);
                              }}
                              className="flex items-center gap-1 rounded-md border border-slate-200 hover:bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors"
                              title="Adjust work hours for this employee"
                            >
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span></span>
                            </button>

                            {/* Download PDF for this employee */}
                            <button
                              onClick={() => handleDownloadSingleEmployeePDF(emp)}
                              className="rounded-md border border-slate-200 hover:bg-slate-50 p-1 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Download employee monthly timesheet PDF"
                            >
                              <Download className="h-3 w-3 text-slate-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100/90 font-semibold text-xs text-slate-800">
                    <td className="px-3.5 py-3 font-bold">
                      Workforce Total ({filteredEmployees.length} Personnel)
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-normal">
                      All Filtered Units
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold">
                      {monthStats.totalRegular}h
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-700">
                      +{monthStats.totalOvertime}h
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                      {monthStats.totalHours}h
                    </td>
                    <td colSpan={6} className="px-3 py-3 text-right text-slate-600 font-sans">
                      Aggregate Attendance Rate: <span className="font-bold text-emerald-700">{monthStats.complianceRate}%</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY MATRIX GRID VIEW */}
      {activeViewMode === 'matrix' && (
        <div className="space-y-3">
          {/* Daily Matrix Grid Action & Download Sub-bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Daily Matrix Grid & Physical Field Ledger — {monthNames[selectedMonth - 1]} {selectedYear}
                  </h4>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                    {filteredEmployees.length} Personnel · {daysArray.length} Days
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Interactive multi-day matrix. Download a printable blank PDF grid for manual on-site clocking, physical signatures, and supervisor audit.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadDailyMatrixWithHoursPDF}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
                title="Download Daily Matrix Grid PDF with recorded workforce working hours (ISO A4 Landscape)"
              >
                <Download className="h-3.5 w-3.5" />
                <span>working hours</span>
              </button>
              <button
                onClick={handleDownloadBlankMatrixPDF}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-colors"
                title="Download Blank Field Ledger PDF for manual clipboard attendance (ISO A4 Landscape)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                <span>Blank PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                  {/* Frozen Sticky Employee Column */}
                  <th className="sticky left-0 z-20 min-w-[200px] border-r border-slate-200 bg-slate-50 px-3 py-2.5">
                    Employee Name & ID
                  </th>

                  {/* Days 1 to 28/30/31 Columns */}
                  {daysArray.map((d) => (
                    <th
                      key={d.day}
                      className={`min-w-[34px] px-1 py-2 text-center border-r border-slate-200 ${
                        d.isWeekend
                          ? 'bg-slate-200/70 text-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-700'
                      }`}
                      title={`${d.dateString} (${d.dayNameShort})`}
                    >
                      <div className="font-mono text-[11px]">{d.day}</div>
                      <div className="text-[9px] font-normal tracking-tight text-slate-500">
                        {d.dayNameShort}
                      </div>
                    </th>
                  ))}

                  {/* Summary Columns */}
                  <th className="border-l border-slate-200 bg-slate-100/80 px-2 py-2 text-center text-[10px] font-semibold text-slate-700">
                    Reg (h)
                  </th>
                  <th className="border-l border-slate-200 bg-slate-100/80 px-2 py-2 text-center text-[10px] font-semibold text-amber-800">
                    OT (h)
                  </th>
                  <th className="border-l border-slate-200 bg-slate-100/80 px-2 py-2 text-center text-[10px] font-semibold text-slate-700">
                    Days
                  </th>
                  <th className="border-l border-slate-200 bg-slate-100/80 px-2 py-2 text-center text-[10px] font-semibold text-blue-800">
                    Leave
                  </th>
                  <th className="border-l border-slate-200 bg-slate-100/80 px-2 py-2 text-center text-[10px] font-semibold text-slate-700">
                    View
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredEmployees.map((emp) => {
                  const totals = employeeTotals[emp.id] || {
                    regular: 0,
                    overtime: 0,
                    totalHours: 0,
                    presentDays: 0,
                    leaves: 0,
                    absences: 0,
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Sticky Employee Name & Role */}
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2 shadow-xs font-sans">
                        <div className="flex items-center gap-2">
                          <img
                            src={emp.profileImage}
                            alt={emp.fullName}
                            referrerPolicy="no-referrer"
                            className="h-6 w-6 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate leading-tight text-xs">
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {emp.id} · {emp.department.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells (Interactive Click to Log/Adjust Hours) */}
                      {daysArray.map((d) => {
                        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
                        let cellDisplay = '';
                        let cellBg = '';

                        if (d.isWeekend) {
                          cellBg = 'bg-slate-100/90 text-slate-400';
                          cellDisplay = entry?.status === 'overtime' ? `+${entry.overtimeHours}` : 'OFF';
                        } else if (!entry) {
                          cellDisplay = String(defaultWorkHours);
                          cellBg =
                            defaultWorkHours === 0
                              ? 'hover:bg-slate-100 text-slate-400'
                              : 'hover:bg-emerald-50 text-slate-700 font-medium';
                        } else {
                          switch (entry.status) {
                            case 'present':
                              cellDisplay = String(entry.regularHours);
                              cellBg = 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 font-medium';
                              break;
                            case 'overtime':
                              cellDisplay = `${entry.regularHours}+${entry.overtimeHours}`;
                              cellBg = 'bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold';
                              break;
                            case 'annual_leave':
                            case 'sick_leave':
                              cellDisplay = 'L';
                              cellBg = 'bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold';
                              break;
                            case 'absent':
                              cellDisplay = 'A';
                              cellBg = 'bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold';
                              break;
                            case 'weekend':
                              cellDisplay = 'OFF';
                              cellBg = 'bg-slate-100 text-slate-400';
                              break;
                            default:
                              cellDisplay = String(entry.regularHours);
                              break;
                          }
                        }

                        return (
                          <td
                            key={d.day}
                            onClick={() => handleCellClick(emp, d)}
                            className={`h-9 px-0.5 text-center border-r border-slate-100 cursor-pointer select-none text-[11px] transition-colors ${cellBg}`}
                            title={`${emp.fullName} | ${d.dateString} (${d.dayNameShort})\nClick to log/adjust work hours`}
                          >
                            {cellDisplay}
                          </td>
                        );
                      })}

                      {/* Per-Employee Totals */}
                      <td className="border-l border-slate-200 bg-slate-50/50 px-2 py-2 text-center text-xs font-semibold text-slate-800 tabular-nums">
                        {totals.regular}
                      </td>
                      <td className="border-l border-slate-200 bg-amber-50/40 px-2 py-2 text-center text-xs font-bold text-amber-700 tabular-nums">
                        {totals.overtime > 0 ? `+${totals.overtime}` : '-'}
                      </td>
                      <td className="border-l border-slate-200 bg-slate-50/50 px-2 py-2 text-center text-xs text-slate-700 tabular-nums">
                        {totals.presentDays}
                      </td>
                      <td className="border-l border-slate-200 bg-blue-50/40 px-2 py-2 text-center text-xs font-medium text-blue-800 tabular-nums">
                        {totals.leaves > 0 ? totals.leaves : '-'}
                      </td>
                      <td className="border-l border-slate-200 bg-slate-50 px-2 py-2 text-center font-sans">
                        <button
                          onClick={() => setViewEmployeeLedgerTarget(emp)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                          title="View Employee Ledger"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Per-Day Staff Present Total Row */}
                <tr className="border-t-2 border-slate-300 bg-slate-100/90 font-semibold text-[11px] text-slate-700">
                  <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-2 font-sans">
                    Staff Present Total
                  </td>
                  {perDayPresentCount.map((count, idx) => (
                    <td
                      key={idx}
                      className={`px-0.5 py-2 text-center border-r border-slate-200 font-mono text-[10px] ${
                        daysArray[idx].isWeekend ? 'bg-slate-200/80 text-slate-400' : 'text-slate-900 font-bold'
                      }`}
                    >
                      {daysArray[idx].isWeekend ? '-' : count}
                    </td>
                  ))}
                  <td colSpan={5} className="border-l border-slate-200 bg-slate-200 px-2 py-2 text-center font-sans text-[10px] text-slate-600">
                    Month Aggregate ({monthStats.complianceRate}% Compliance)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 font-sans px-1 gap-2">
            <span>Click any cell to log or adjust regular hours, overtime (+OT), leave, or unexcused absences.</span>
            <div className="flex items-center gap-3">
              <span>Default unlogged: {defaultWorkHours}h. Fri & Sat shaded.</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADJUST WORK HOURS MODAL */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Adjust Work Hours — {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustWorkHours} className="mt-4 space-y-4 text-xs font-sans">
              {/* Target Scope */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Workforce Scope
                </label>
                <select
                  value={adjustTargetEmpId}
                  onChange={(e) => setAdjustTargetEmpId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none bg-white font-medium text-slate-800"
                >
                  <option value="all">All Workforce Employees ({activeWorkforceEmployees.length} Members)</option>
                  {activeWorkforceEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.id} - {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Hours Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Preset Work Hours Quick Fill
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustRegularHours(0);
                      setAdjustOvertimeHours(0);
                      setAdjustStatus('present');
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-center font-mono font-medium transition-colors ${
                      adjustRegularHours === 0 && adjustOvertimeHours === 0
                        ? 'border-slate-900 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    0h (Default 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustRegularHours(4);
                      setAdjustOvertimeHours(0);
                      setAdjustStatus('present');
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-center font-mono font-medium transition-colors ${
                      adjustRegularHours === 4 && adjustOvertimeHours === 0
                        ? 'border-slate-900 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    4h (Half Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustRegularHours(8);
                      setAdjustOvertimeHours(0);
                      setAdjustStatus('present');
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-center font-mono font-medium transition-colors ${
                      adjustRegularHours === 8 && adjustOvertimeHours === 0
                        ? 'border-slate-900 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    8h (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustRegularHours(8);
                      setAdjustOvertimeHours(2);
                      setAdjustStatus('overtime');
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-center font-mono font-medium transition-colors ${
                      adjustRegularHours === 8 && adjustOvertimeHours === 2
                        ? 'border-slate-900 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    8h + 2h OT
                  </button>
                </div>
              </div>

              {/* Exact Hours Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Regular Shift Hours (0 to 12)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    step={0.5}
                    value={adjustRegularHours}
                    onChange={(e) => setAdjustRegularHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Overtime Hours (+OT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    step={0.5}
                    value={adjustOvertimeHours}
                    onChange={(e) => {
                      const ot = Number(e.target.value);
                      setAdjustOvertimeHours(ot);
                      if (ot > 0) setAdjustStatus('overtime');
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Scope of Application */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Days in Month to Adjust
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustScope"
                      checked={adjustScope === 'weekdays'}
                      onChange={() => setAdjustScope('weekdays')}
                      className="text-slate-900"
                    />
                    <span>All Standard Weekdays (Excludes Fri/Sat Weekends)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustScope"
                      checked={adjustScope === 'unlogged'}
                      onChange={() => setAdjustScope('unlogged')}
                      className="text-slate-900"
                    />
                    <span>Unlogged Weekdays Only (Preserve Existing Entries)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustScope"
                      checked={adjustScope === 'all'}
                      onChange={() => setAdjustScope('all')}
                      className="text-slate-900"
                    />
                    <span>All Days in Month (Including Weekends)</span>
                  </label>
                </div>
              </div>

              {/* Status and Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Audit Notes / Reason
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Reason for work hours adjustment..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Apply Work Hours Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG / ADJUST SINGLE DAY TIME ENTRY DIALOG */}
      {editModalOpen && activeCellData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {t.logHours} / Adjust Day Hours
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  {activeCellData.employee.fullName} ({activeCellData.employee.id})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="mt-4 space-y-4 text-xs font-sans">
              <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 flex justify-between font-mono border border-slate-200">
                <span>Date: {activeCellData.date}</span>
                <span className="font-semibold text-slate-800">
                  {activeCellData.dayName} {activeCellData.isWeekend ? '(Weekend)' : '(Workday)'}
                </span>
              </div>

              {/* Quick Hours Preset Buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quick Select Hours
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormHours(0);
                      setFormOvertime(0);
                      setFormStatus('present');
                    }}
                    className={`rounded px-2.5 py-1 font-mono font-medium border text-xs ${
                      formHours === 0 && formOvertime === 0
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    0h
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormHours(4);
                      setFormOvertime(0);
                      setFormStatus('present');
                    }}
                    className={`rounded px-2.5 py-1 font-mono font-medium border text-xs ${
                      formHours === 4 && formOvertime === 0
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    4h
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormHours(8);
                      setFormOvertime(0);
                      setFormStatus('present');
                    }}
                    className={`rounded px-2.5 py-1 font-mono font-medium border text-xs ${
                      formHours === 8 && formOvertime === 0
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    8h (Std)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormHours(8);
                      setFormOvertime(2);
                      setFormStatus('overtime');
                    }}
                    className={`rounded px-2.5 py-1 font-mono font-medium border text-xs ${
                      formHours === 8 && formOvertime === 2
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    8h + 2h OT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormHours(0);
                      setFormOvertime(0);
                      setFormStatus('annual_leave');
                    }}
                    className={`rounded px-2.5 py-1 font-sans font-medium border text-xs ${
                      formStatus === 'annual_leave'
                        ? 'bg-blue-800 text-white border-blue-800'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Attendance Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => {
                    const st = e.target.value as TimesheetStatus;
                    setFormStatus(st);
                    if (st === 'weekend' || st === 'annual_leave' || st === 'sick_leave' || st === 'absent') {
                      setFormHours(0);
                    } else if (st === 'present' || st === 'overtime') {
                      if (formHours === 0) setFormHours(8);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-500 bg-white"
                >
                  <option value="present">Present (Standard Regular Shift)</option>
                  <option value="overtime">Present + Overtime Hours</option>
                  <option value="annual_leave">Annual Paid Vacation</option>
                  <option value="sick_leave">Sick Leave (Medical Certificate)</option>
                  <option value="absent">Unexcused Absence</option>
                  <option value="weekend">Weekend Rest (Off)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Regular Hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    step={0.5}
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Overtime Hours (+OT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    step={0.5}
                    value={formOvertime}
                    onChange={(e) => setFormOvertime(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work / Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Task completed, shift details, or leave reference..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EMPLOYEE MONTHLY TIMESHEET LEDGER VIEW MODAL */}
      {viewEmployeeLedgerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 md:p-8 my-8 shadow-2xl space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={viewEmployeeLedgerTarget.profileImage}
                  alt={viewEmployeeLedgerTarget.fullName}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover border-2 border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {viewEmployeeLedgerTarget.fullName}
                    </h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 border border-slate-200">
                      {viewEmployeeLedgerTarget.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {viewEmployeeLedgerTarget.department} · {viewEmployeeLedgerTarget.designation}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingleEmployeePDF(viewEmployeeLedgerTarget)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span></span>
                </button>
                <button
                  onClick={() => setViewEmployeeLedgerTarget(null)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            {(() => {
              const totals = employeeTotals[viewEmployeeLedgerTarget.id] || {
                regular: 0,
                overtime: 0,
                totalHours: 0,
                presentDays: 0,
                leaves: 0,
                absences: 0,
              };
              return (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Regular Work Hours</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {totals.regular} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Overtime Approved</span>
                    <span className="font-bold font-mono text-amber-700 text-sm">
                      +{totals.overtime} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total Monthly Hours</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {totals.totalHours} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Days Present</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {totals.presentDays} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Leaves & Absences</span>
                    <span className="font-bold font-mono text-slate-700 text-sm">
                      {totals.leaves} L / {totals.absences} A
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Day-by-Day Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase">
                  <tr>
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Day of Week</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Regular (h)</th>
                    <th className="px-3 py-2 text-right">Overtime (h)</th>
                    <th className="px-3 py-2">Notes / Audit Reference</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {daysArray.map((d) => {
                    const entry = entriesMap.get(`${viewEmployeeLedgerTarget.id}_${d.dateString}`);
                    let statusLabel = 'Present';
                    let regHours = defaultWorkHours;
                    let otHours = 0;
                    let notes = '-';

                    if (entry) {
                      statusLabel = entry.status.toUpperCase();
                      regHours = entry.regularHours;
                      otHours = entry.overtimeHours;
                      notes = entry.notes || '-';
                    } else if (d.isWeekend) {
                      statusLabel = 'WEEKEND OFF';
                      regHours = 0;
                      otHours = 0;
                    }

                    return (
                      <tr
                        key={d.day}
                        className={
                          d.isWeekend
                            ? 'bg-slate-50/80 text-slate-500'
                            : 'hover:bg-slate-50/70 text-slate-800'
                        }
                      >
                        <td className="px-3 py-2 font-bold">{d.day}</td>
                        <td className="px-3 py-2 text-slate-600">{d.dateString}</td>
                        <td className="px-3 py-2 font-sans font-medium">{d.dayNameShort}</td>
                        <td className="px-3 py-2 font-sans">
                          {d.isWeekend && otHours === 0 ? (
                            <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 font-medium">
                              WEEKEND OFF
                            </span>
                          ) : statusLabel === 'PRESENT' ? (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                              PRESENT
                            </span>
                          ) : statusLabel === 'OVERTIME' ? (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                              OVERTIME
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {statusLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold">{regHours}h</td>
                        <td className="px-3 py-2 text-right text-amber-700">
                          {otHours > 0 ? `+${otHours}h` : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-sans truncate max-w-xs">
                          {notes}
                        </td>
                        <td className="px-3 py-2 text-center font-sans">
                          <button
                            onClick={() => handleCellClick(viewEmployeeLedgerTarget, d)}
                            className="rounded px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>{corporateEntity.companyName} · Official Employee Timesheet Ledger</span>
              <button
                onClick={() => setViewEmployeeLedgerTarget(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 5: PURGE & RESET CONFIRMATION MODAL (Replaces window.confirm) */}
      {purgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {purgeEmpTarget
                    ? `Reset Timesheet: ${purgeEmpTarget.fullName}`
                    : `Purge All Workforce Timesheet Logs`}
                </h3>
                <p className="text-xs text-slate-500">
                  Target Period:{' '}
                  <span className="font-semibold text-slate-800">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-rose-50/80 border border-rose-200/60 p-3 text-xs text-rose-900 leading-relaxed space-y-1.5">
              <p>
                {purgeEmpTarget
                  ? `Are you sure you want to clear all manual timesheet entries and overtime records for ${purgeEmpTarget.fullName}? Unlogged days will default to 0 hours.`
                  : `Are you sure you want to clear all workforce timesheet entries for ${monthNames[selectedMonth - 1]} ${selectedYear}? This affects all employees across all departments.`}
              </p>
              <p className="text-[11px] text-rose-700 font-medium">
                • This administrative action will generate a formal enterprise audit log record.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPurgeModalOpen(false);
                  setPurgeEmpTarget(null);
                }}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Confirm Reset & Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
