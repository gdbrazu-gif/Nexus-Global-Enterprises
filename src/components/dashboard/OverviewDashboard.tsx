import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Users,
  CalendarCheck,
  Banknote,
  Receipt,
  FolderGit2,
  Laptop,
  ArrowRight,
  TrendingUp,
  Clock,
  Coins,
  ShieldCheck,
} from 'lucide-react';

interface OverviewDashboardProps {
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const {
    employees,
    departments,
    timesheetEntries,
    expenses,
    projects,
    assets,
    formatCurrency,
    baseCurrency,
    corporateEntity,
    t,
  } = useHRMS();

  // Metrics
  const activeStaff = employees.length;
  const totalMonthlyPayroll = employees.reduce((acc, e) => acc + e.totalMonthlyPackage, 0);
  const totalAnnualPayroll = employees.reduce((acc, e) => acc + e.annualBaseSalary, 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const activeProjects = projects.filter((p) => p.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Welcome to {corporateEntity.companyName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise HRMS, Monthly Timesheet Ledger & Financial Resource Management Platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('timesheet-matrix')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Open Attendance Matrix</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('employees')}
          className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Workforce Size</span>
            <Users className="h-4 w-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900">
            {activeStaff}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {departments.length} Operating Departments
          </div>
        </div>

        <div
          onClick={() => onNavigate('payroll')}
          className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Monthly Base & Package</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(totalMonthlyPayroll)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Annual: {formatCurrency(totalAnnualPayroll)}
          </div>
        </div>

        <div
          onClick={() => onNavigate('timesheet-matrix')}
          className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Timesheet Matrix</span>
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-emerald-800 tabular-nums">
            31 Days
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            October 2026 · Fri/Sat Shaded
          </div>
        </div>

        <div
          onClick={() => onNavigate('expenses')}
          className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pending Vouchers</span>
            <Receipt className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-rose-900 tabular-nums">
            {pendingExpenses.length} Claims
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Requires Admin Review
          </div>
        </div>
      </div>

      {/* Main Two-Column Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Workflow Hub */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Enterprise Operational Hub</h2>
            <span className="text-xs text-slate-400 font-mono">Module Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => onNavigate('onboarding')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
            >
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Onboard New Employee</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Iqama, passport, nationality dropdown, salary editor, and document dossier.
              </p>
            </div>

            <div
              onClick={() => onNavigate('timesheet-matrix')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
            >
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Monthly Timesheet Grid</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Employees × Days matrix, Fri/Sat weekend shaded, log hours, and PDF summary.
              </p>
            </div>

            <div
              onClick={() => onNavigate('templates')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
            >
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Template Studio & PDF</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Single & multiple customizable templates (payslip, offer letter, vouchers).
              </p>
            </div>

            <div
              onClick={() => onNavigate('accounting-categories')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
            >
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Accounting & Expenses</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Create new accounting categories, approve/reject corporate vouchers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Corporate Legal Entity Snapshot */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-sans">
            <h2 className="text-sm font-bold text-slate-900">Corporate Legal Identity</h2>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">CR Number:</span>
              <span className="text-slate-900 font-semibold">{corporateEntity.crNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">VAT / Tax ID:</span>
              <span className="text-slate-900 font-semibold">{corporateEntity.vatNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Base Currency:</span>
              <span className="text-slate-900 font-bold">{baseCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bank:</span>
              <span className="text-slate-800 font-sans">{corporateEntity.bankName}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
              IBAN: {corporateEntity.iban}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
