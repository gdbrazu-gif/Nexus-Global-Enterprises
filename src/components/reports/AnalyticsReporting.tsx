import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  BarChart3,
  Printer,
  TrendingUp,
  Users,
  Coins,
  CalendarCheck,
  Receipt,
  FileText,
  Download,
} from 'lucide-react';

export const AnalyticsReporting: React.FC = () => {
  const {
    employees,
    timesheetEntries,
    expenses,
    projects,
    formatCurrency,
    baseCurrency,
    corporateEntity,
    t,
  } = useHRMS();

  const [printReportOpen, setPrintReportOpen] = useState(false);

  // Financial & HR Intelligence Calculations
  const totalMonthlyBase = employees.reduce((acc, e) => acc + e.monthlyBaseSalary, 0);
  const totalAnnualBase = employees.reduce((acc, e) => acc + e.annualBaseSalary, 0);
  const totalMonthlyPackage = employees.reduce((acc, e) => acc + e.totalMonthlyPackage, 0);

  // Department salary distribution
  const departmentBreakdown = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + e.totalMonthlyPackage;
    return acc;
  }, {} as Record<string, number>);

  // Approved vs Pending expenses
  const approvedExpenses = expenses
    .filter((e) => e.status === 'approved')
    .reduce((acc, e) => acc + e.amountSAR, 0);
  const pendingExpenses = expenses
    .filter((e) => e.status === 'pending')
    .reduce((acc, e) => acc + e.amountSAR, 0);

  // Projects budget vs spent
  const totalProjectBudget = projects.reduce((acc, p) => acc + p.budgetSAR, 0);
  const totalProjectSpent = projects.reduce((acc, p) => acc + p.spentSAR, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.navReports}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive workforce intelligence, annual vs monthly compensation analytics, and exportable PDF dossiers.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Print Intelligence Report PDF</span>
        </button>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Monthly Payroll</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(totalMonthlyPackage)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Monthly Base: {formatCurrency(totalMonthlyBase)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Annual Base Liability</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-blue-900 tabular-nums">
            {formatCurrency(totalAnnualBase)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Formula: Monthly Base × 12
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Corporate OPEX Settled</span>
            <Receipt className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-emerald-800 tabular-nums">
            {formatCurrency(approvedExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Pending Approval: {formatCurrency(pendingExpenses)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Project Portfolio Delivery</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {Math.round((totalProjectSpent / (totalProjectBudget || 1)) * 100)}% Spent
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {formatCurrency(totalProjectSpent)} of {formatCurrency(totalProjectBudget)}
          </div>
        </div>
      </div>

      {/* Intelligence Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Compensation Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Department Monthly Compensation Share
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Currency: {baseCurrency}</span>
          </div>

          <div className="space-y-3">
            {Object.entries(departmentBreakdown).map(([dept, amount]) => {
              const share = Math.round((amount / (totalMonthlyPackage || 1)) * 100);
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800">{dept}</span>
                    <span className="font-mono text-slate-600 font-semibold">
                      {formatCurrency(amount)} ({share}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Annual Base Salary vs Monthly Package Matrix */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Workforce Seniority Compensation Banding
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Executive Audit</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {employees.slice(0, 5).map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <div className="font-sans font-semibold text-slate-900">{emp.fullName}</div>
                  <div className="text-[10px] text-slate-400">
                    {emp.designation} · {emp.nationality}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    {formatCurrency(emp.monthlyBaseSalary)} / mo
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Annual: {formatCurrency(emp.annualBaseSalary)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Intelligence Report Area */}
      <div className="print-container bg-white border border-slate-200 rounded-xl p-8 space-y-6">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <img src={corporateEntity.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{corporateEntity.companyName}</h2>
              <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                CR: {corporateEntity.crNumber} · VAT: {corporateEntity.vatNumber}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold uppercase tracking-wider block">
              EXECUTIVE INTELLIGENCE AUDIT
            </span>
            <span className="font-mono text-slate-500 block">
              Evaluation Date: {new Date().toISOString().substring(0, 10)}
            </span>
          </div>
        </div>

        <div className="text-xs leading-relaxed text-slate-700">
          This comprehensive audit certifies that all workforce compensation figures, timesheet attendance matrices, project milestones, and corporate expense allocations are reconciled and compliant with Saudi labor standards and corporate governance mandates.
        </div>

        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs font-sans">
          <div>
            <span className="text-slate-400 text-[11px] block mb-6">HR Director Sign-Off</span>
            <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
              Mona Al-Hassan
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block mb-6">CFO Financial Audit</span>
            <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
              Tariq Mansoor
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block mb-6">Super Admin Authorization</span>
            <div className="border-b border-slate-400 pb-1 font-mono text-[11px] font-bold">
              Khalid Al-Fassi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
