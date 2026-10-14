import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee, TimesheetEntry, TimesheetStatus } from '../../types';
import {
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  FileSpreadsheet,
  Download,
  X,
  User,
  Plus,
} from 'lucide-react';

export const AttendanceTimesheetMatrix: React.FC = () => {
  const {
    employees,
    timesheetEntries,
    updateTimesheetCell,
    clearAllTimesheetForMonth,
    canPerformAdminAction,
    canPerformHrAction,
    corporateEntity,
    t,
  } = useHRMS();

  // Selected Month and Year
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // October

  // Filter by department
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cell edit dialog state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeCellData, setActiveCellData] = useState<{
    employee: Employee;
    date: string;
    dayNumber: number;
    dayName: string;
    isWeekend: boolean;
    entry?: TimesheetEntry;
  } | null>(null);

  // Form fields inside edit modal
  const [formHours, setFormHours] = useState<number>(8);
  const [formOvertime, setFormOvertime] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<TimesheetStatus>('present');
  const [formNotes, setFormNotes] = useState<string>('');

  // Print Report Modal
  const [printReportOpen, setPrintReportOpen] = useState(false);

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

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept =
        selectedDepartment === 'all' || emp.department === selectedDepartment;
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, selectedDepartment, searchQuery]);

  // Quick lookup map for entries: `empId_date` -> TimesheetEntry
  const entriesMap = useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    timesheetEntries.forEach((entry) => {
      map.set(`${entry.employeeId}_${entry.date}`, entry);
    });
    return map;
  }, [timesheetEntries]);

  // Per-employee monthly metrics
  const employeeTotals = useMemo(() => {
    const totals: Record<
      string,
      { regular: number; overtime: number; presentDays: number; leaves: number; absences: number }
    > = {};

    employees.forEach((emp) => {
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
          // Default unlogged weekday is counted as present 8h
          regular += 8;
          presentDays++;
        }
      });

      totals[emp.id] = { regular, overtime, presentDays, leaves, absences };
    });

    return totals;
  }, [employees, daysArray, entriesMap]);

  // Per-day total staff present
  const perDayPresentCount = useMemo(() => {
    return daysArray.map((d) => {
      if (d.isWeekend) return 0;
      let count = 0;
      employees.forEach((emp) => {
        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
        if (entry) {
          if (entry.status === 'present' || entry.status === 'overtime') count++;
        } else {
          count++; // default present on unlogged weekdays
        }
      });
      return count;
    });
  }, [daysArray, employees, entriesMap]);

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

    const maxPossiblePresentDays = employees.length * workingDaysCount;
    const complianceRate =
      maxPossiblePresentDays > 0
        ? Math.round((totalPresentDays / maxPossiblePresentDays) * 100)
        : 100;

    return {
      totalHours: totalRegular + totalOvertime,
      totalRegular,
      totalOvertime,
      complianceRate,
      activeStaff: employees.length,
      workingDays: workingDaysCount,
    };
  }, [employeeTotals, employees.length, daysArray]);

  // Open edit modal for a specific day cell
  const handleCellClick = (emp: Employee, d: (typeof daysArray)[0]) => {
    if (!canPerformAdminAction && !canPerformHrAction) {
      alert('Timesheet logging is restricted to Super Admin and HR Managers.');
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
        setFormHours(8);
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
  };

  const handleClearAllTimesheet = () => {
    if (
      window.confirm(
        `Are you sure you want to clear and reset ALL timesheet entries for ${selectedYear}-${String(
          selectedMonth
        ).padStart(2, '0')}? This action will be audited.`
      )
    ) {
      clearAllTimesheetForMonth(selectedYear, selectedMonth);
    }
  };

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

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.timesheetTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.timesheetSubtitle}
          </p>
        </div>

        {/* Action Controls: Month selector, PDF/Print Report, Clear Timesheet */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
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

          {/* Print / PDF Monthly Summary Button */}
          <button
            onClick={() => setPrintReportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF Summary</span>
          </button>

          {/* Clear All Timesheet Button (Prompt specific: "Timesheet: Remove This All Timesheet") */}
          {canPerformAdminAction && (
            <button
              onClick={handleClearAllTimesheet}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
              title="Remove All Timesheet records for current month"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Month</span>
            </button>
          )}
        </div>
      </div>

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
            <span className="text-[11px] text-slate-500">Active</span>
          </div>
        </div>
      </div>

      {/* Filter & Legend Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search employee or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 rounded-md border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-slate-400"
          />

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs outline-none bg-white"
          >
            <option value="all">All Departments</option>
            <option value="Engineering & Technology">Engineering</option>
            <option value="Human Resources & Talent">Human Resources</option>
            <option value="Finance & Treasury">Finance & Treasury</option>
            <option value="Operations & Enterprise Projects">Operations</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300"></span>
            <span>Present (8h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300"></span>
            <span>Overtime (+OT)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-blue-100 border border-blue-300"></span>
            <span>Leave (L)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-rose-100 border border-rose-300"></span>
            <span>Absence (A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-slate-200/80 border border-slate-300"></span>
            <span className="font-medium text-slate-700">Fri/Sat Weekend</span>
          </div>
        </div>
      </div>

      {/* THE MONTHLY TIMESHEET MATRIX TABLE */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
              {/* Frozen Sticky Employee Column */}
              <th className="sticky left-0 z-20 min-w-[190px] border-r border-slate-200 bg-slate-50 px-3 py-2.5">
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

              {/* Per-Employee Month Summary Columns */}
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
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredEmployees.map((emp) => {
              const totals = employeeTotals[emp.id] || {
                regular: 0,
                overtime: 0,
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

                  {/* Day Cells (Interactive Click to Log/Edit) */}
                  {daysArray.map((d) => {
                    const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
                    let cellDisplay = '';
                    let cellBg = '';
                    let cellText = 'text-slate-800';

                    if (d.isWeekend) {
                      cellBg = 'bg-slate-100/90 text-slate-400';
                      cellDisplay = entry?.status === 'overtime' ? `+${entry.overtimeHours}` : 'OFF';
                    } else if (!entry) {
                      cellDisplay = '8';
                      cellBg = 'hover:bg-emerald-50 text-slate-700';
                    } else {
                      switch (entry.status) {
                        case 'present':
                          cellDisplay = String(entry.regularHours);
                          cellBg = 'bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 font-medium';
                          break;
                        case 'overtime':
                          cellDisplay = `8+${entry.overtimeHours}`;
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
                          cellDisplay = '8';
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
              <td colSpan={4} className="border-l border-slate-200 bg-slate-200 px-2 py-2 text-center font-sans text-[10px] text-slate-600">
                Month Aggregate
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 font-sans">
        <span>Click any cell to log regular hours, overtime (+OT), leave, or unexcused absences.</span>
        <span>Fri & Sat weekend automatically shaded for GCC/Saudi schedule.</span>
      </div>

      {/* MODAL: Log / Edit Time Entry Dialog */}
      {editModalOpen && activeCellData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {t.logHours}
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

            <form onSubmit={handleSaveCell} className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 flex justify-between font-mono">
                <span>Date: {activeCellData.date}</span>
                <span className="font-semibold text-slate-800">
                  {activeCellData.dayName} {activeCellData.isWeekend ? '(Weekend)' : '(Workday)'}
                </span>
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
                      setFormHours(8);
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
                  placeholder="Task completed, project code, or leave reference..."
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

      {/* PRINT / PDF MODAL: Executive Monthly Summary Report */}
      {printReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl p-6 md:p-8 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Monthly Timesheet Summary Report Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Ready for direct browser print or export to PDF
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerPrint}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setPrintReportOpen(false)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="print-container mt-6 space-y-6 text-slate-900">
              {/* Official Corporate Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Corporate Emblem"
                    className="h-12 w-12 object-contain"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {corporateEntity.companyName}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {corporateEntity.legalName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT: {corporateEntity.vatNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wider">
                    Official Workforce Ledger
                  </div>
                  <div className="text-slate-600 font-mono font-medium mt-0.5">
                    Period: {monthNames[selectedMonth - 1]} {selectedYear}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Generated: {new Date().toISOString().substring(0, 10)}
                  </div>
                </div>
              </div>

              {/* High-level Summary Metrics */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Staff</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {monthStats.activeStaff} Employees
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Work Hours</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {monthStats.totalHours.toLocaleString()} Hours
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Overtime Hours</span>
                  <span className="font-bold text-amber-700 font-mono text-sm">
                    +{monthStats.totalOvertime} Hours
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Attendance Rate</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {monthStats.complianceRate}%
                  </span>
                </div>
              </div>

              {/* Employee Breakdown Table */}
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-700 uppercase">
                    <th className="px-3 py-2">Emp ID</th>
                    <th className="px-3 py-2">Full Name</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2 text-right">Regular (h)</th>
                    <th className="px-3 py-2 text-right">Overtime (h)</th>
                    <th className="px-3 py-2 text-right">Total Hours</th>
                    <th className="px-3 py-2 text-right">Days Present</th>
                    <th className="px-3 py-2 text-right">Leave Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-xs">
                  {filteredEmployees.map((emp) => {
                    const t = employeeTotals[emp.id];
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-900">{emp.id}</td>
                        <td className="px-3 py-2 font-sans font-medium text-slate-900">
                          {emp.fullName}
                        </td>
                        <td className="px-3 py-2 font-sans text-slate-600">
                          {emp.department}
                        </td>
                        <td className="px-3 py-2 text-right">{t.regular}</td>
                        <td className="px-3 py-2 text-right text-amber-700">
                          {t.overtime > 0 ? `+${t.overtime}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {t.regular + t.overtime}
                        </td>
                        <td className="px-3 py-2 text-right">{t.presentDays}</td>
                        <td className="px-3 py-2 text-right text-blue-700">
                          {t.leaves > 0 ? t.leaves : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures & Certification Blocks */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Prepared by Timekeeper</div>
                  <div className="mt-8 border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Signature: ______________________
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">People Operations Dept</div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Verified by HR Director</div>
                  <div className="mt-8 border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Mona Al-Hassan (HR Director)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">HR & Compliance Division</div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Approved for Payroll (CFO)</div>
                  <div className="mt-8 border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Tariq Mansoor (CFO)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Finance & Treasury</div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                Nexus Global ERP System · Automated Workforce Timesheet Certified Audit Copy · {corporateEntity.address}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
