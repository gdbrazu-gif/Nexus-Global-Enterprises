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
    expenses,
    projects,
    formatCurrency,
    baseCurrency,
    corporateEntity,
    activeBranchId,
    getBranchName,
    hasModulePermission,
    canPerformAdminAction,
  } = useHRMS();

  const canEmployees = hasModulePermission('employees', 'read');
  const canAttendance = hasModulePermission('attendance', 'read');
  const canPayroll = hasModulePermission('payroll', 'read');
  const canAccounting = hasModulePermission('accounting', 'read');
  const canTemplates = hasModulePermission('templates', 'read');
  const canManpower = hasModulePermission('manpower', 'read');
  const canInventory = hasModulePermission('inventory', 'read');
  const canSettings = hasModulePermission('settings', 'read');

  const branchEmployees =
    activeBranchId === 'all'
      ? employees
      : employees.filter((e) => (e.branchId || 'BR-RUH') === activeBranchId);
  const branchDepartments =
    activeBranchId === 'all'
      ? departments
      : departments.filter((d) => (d.branchId || 'BR-RUH') === activeBranchId);
  const branchExpenses =
    activeBranchId === 'all'
      ? expenses
      : expenses.filter((e) => (e.branchId || 'BR-RUH') === activeBranchId);

  // Metrics
  const activeStaff = branchEmployees.length;
  const totalMonthlyPayroll = branchEmployees.reduce((acc, e) => acc + e.totalMonthlyPackage, 0);
  const totalAnnualPayroll = branchEmployees.reduce((acc, e) => acc + e.annualBaseSalary, 0);
  const pendingExpenses = branchExpenses.filter((e) => e.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Welcome to {corporateEntity.companyName}
            </h1>
            {activeBranchId !== 'all' && (
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Branch: {getBranchName(activeBranchId)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise HRMS, Multi-Branch Operations, Monthly Timesheet Ledger &amp; Financial Resource Platform.
          </p>
        </div>

        {canAttendance && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('timesheet-matrix')}
              className="w-full sm:w-auto min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <CalendarCheck className="h-4 w-4 shrink-0" />
              <span>Open Attendance Matrix</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={canEmployees ? () => onNavigate('employees') : undefined}
          className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 transition-colors min-w-0 ${
            canEmployees ? 'cursor-pointer hover:border-slate-300' : 'opacity-80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Workforce Size</span>
            <Users className="h-4 w-4 text-slate-700 shrink-0" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums truncate">
            {activeStaff}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Across {branchDepartments.length} Departments ({projects.filter((p) => (activeBranchId === 'all' || (p.branchId || 'BR-RUH') === activeBranchId) && p.status === 'in_progress').length} Active Projects)
          </div>
        </div>

        <div
          onClick={canPayroll ? () => onNavigate('payroll') : undefined}
          className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 transition-colors min-w-0 ${
            canPayroll ? 'cursor-pointer hover:border-slate-300' : 'opacity-80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Monthly Payroll</span>
            <Coins className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums truncate">
            {canPayroll ? formatCurrency(totalMonthlyPayroll) : 'Restricted'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate tabular-nums">
            {canPayroll ? `Annual: ${formatCurrency(totalAnnualPayroll)}` : 'Protected by RBAC Policy'}
          </div>
        </div>

        <div
          onClick={canAttendance ? () => onNavigate('timesheet-matrix') : undefined}
          className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 transition-colors min-w-0 ${
            canAttendance ? 'cursor-pointer hover:border-slate-300' : 'opacity-80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Timesheet Matrix</span>
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-bold font-mono tracking-tight text-emerald-800 tabular-nums truncate">
            31 Days
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Fri/Sat Shaded
          </div>
        </div>

        <div
          onClick={canAccounting ? () => onNavigate('expenses') : undefined}
          className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 transition-colors min-w-0 ${
            canAccounting ? 'cursor-pointer hover:border-slate-300' : 'opacity-80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Pending Vouchers</span>
            <Receipt className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-bold font-mono tracking-tight text-rose-900 tabular-nums truncate">
            {canAccounting ? `${pendingExpenses.length} Claims` : 'Restricted'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {canAccounting ? 'Requires Review' : 'Protected by RBAC Policy'}
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
            {canEmployees && (
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
            )}

            {canAttendance && (
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
            )}

            {canTemplates && (
              <div
                onClick={() => onNavigate('templates')}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Template Studio &amp; PDF</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-[11px]">
                  Single &amp; multiple customizable templates (payslip, offer letter, vouchers).
                </p>
              </div>
            )}

            {canAccounting && (
              <div
                onClick={() => onNavigate('accounting-categories')}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer transition-colors space-y-1"
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Accounting &amp; Expenses</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-[11px]">
                  Create new accounting categories, approve/reject corporate vouchers.
                </p>
              </div>
            )}

            {canManpower && (
              <div
                onClick={() => onNavigate('manpower-suppliers')}
                className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 hover:border-blue-400 cursor-pointer transition-colors space-y-1"
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Manpower &amp; POS</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <p className="text-slate-500 text-[11px]">
                  Labor supply agencies, Ajeer/Qiwa agreements, deployed workers, and service orders.
                </p>
              </div>
            )}

            {canInventory && (
              <div
                onClick={() => onNavigate('inventory-catalog')}
                className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/30 hover:border-amber-400 cursor-pointer transition-colors space-y-1"
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Inventory Invoices &amp; Stock</span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-slate-500 text-[11px]">
                  Warehouse catalog SKUs, delivery invoices, and stock In/Out movement logs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Corporate Legal Entity Snapshot */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-sans">
            <h2 className="text-sm font-bold text-slate-900">Corporate Legal Identity</h2>
            {canSettings && (
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {canPerformAdminAction ? 'Edit' : 'View'}
              </button>
            )}
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
