import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee } from '../../types';
import {
  Banknote,
  Coins,
  Printer,
  Edit3,
  Search,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  X,
  CreditCard,
} from 'lucide-react';

export const PayrollCompensation: React.FC = () => {
  const {
    employees,
    formatCurrency,
    baseCurrency,
    updateSalary,
    canPerformAdminAction,
    corporateEntity,
    templateConfigs,
    t,
  } = useHRMS();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  // Edit salary modal
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [monthlyBase, setMonthlyBase] = useState(0);
  const [housing, setHousing] = useState(0);
  const [transport, setTransport] = useState(0);
  const [other, setOther] = useState(0);
  const [notes, setNotes] = useState('');

  // Payslip Print Preview modal
  const [payslipEmp, setPayslipEmp] = useState<Employee | null>(null);

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Aggregate Payroll Metrics
  const totalMonthlyPayroll = employees.reduce((acc, e) => acc + e.totalMonthlyPackage, 0);
  const totalAnnualPayroll = employees.reduce((acc, e) => acc + e.annualBaseSalary, 0);
  const averageMonthlySalary = totalMonthlyPayroll / (employees.length || 1);

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setMonthlyBase(emp.monthlyBaseSalary);
    setHousing(emp.housingAllowance);
    setTransport(emp.transportAllowance);
    setOther(emp.otherAllowances);
    setNotes('Periodic compensation review adjustment');
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
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Workforce Compensation & Salary Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Base compensation matrices, monthly/annual packages, and single printable payslips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-700">
            <Coins className="h-4 w-4 text-amber-600" />
            <span>Active Currency: {baseCurrency}</span>
          </div>
        </div>
      </div>

      {/* KPI Aggregate Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 font-medium">Total Monthly Payroll Package</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {formatCurrency(totalMonthlyPayroll)}
            </span>
            <span className="text-xs text-slate-400">/ month</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 font-medium">Total Annual Base Liability</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-900 font-mono tabular-nums">
              {formatCurrency(totalAnnualPayroll)}
            </span>
            <span className="text-xs text-slate-400">/ year</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 font-medium">Average Monthly Package</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-emerald-800 font-mono tabular-nums">
              {formatCurrency(averageMonthlySalary)}
            </span>
            <span className="text-xs text-slate-400">per staff</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
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
            className="rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
          >
            <option value="all">All Departments</option>
            <option value="Engineering & Technology">Engineering</option>
            <option value="Human Resources & Talent">Human Resources</option>
            <option value="Finance & Treasury">Finance & Treasury</option>
            <option value="Operations & Enterprise Projects">Operations</option>
          </select>
        </div>

        <div className="text-slate-500 text-xs font-mono">
          Showing {filtered.length} payroll accounts
        </div>
      </div>

      {/* Compensation Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
              <th className="px-4 py-3">Employee Name & ID</th>
              <th className="px-4 py-3 text-right">Monthly Base</th>
              <th className="px-4 py-3 text-right">Housing</th>
              <th className="px-4 py-3 text-right">Transport</th>
              <th className="px-4 py-3 text-right">Other</th>
              <th className="px-4 py-3 text-right font-bold text-slate-900">Total Monthly</th>
              <th className="px-4 py-3 text-right font-bold text-blue-900">Annual Base</th>
              <th className="px-4 py-3 text-center">Print / Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filtered.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-sans">
                  <div className="font-semibold text-slate-900">{emp.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {emp.id} · {emp.designation}
                  </div>
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                  {formatCurrency(emp.monthlyBaseSalary)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {formatCurrency(emp.housingAllowance)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {formatCurrency(emp.transportAllowance)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {formatCurrency(emp.otherAllowances)}
                </td>

                <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-800 bg-emerald-50/20">
                  {formatCurrency(emp.totalMonthlyPackage)}
                </td>

                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 bg-slate-50/50">
                  {formatCurrency(emp.annualBaseSalary)}
                </td>

                <td className="px-4 py-3 text-center font-sans">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Print Single Customizable Payslip */}
                    <button
                      onClick={() => setPayslipEmp(emp)}
                      className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-800 text-[11px] font-medium transition-colors"
                      title="Print Single Payslip Template"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Payslip</span>
                    </button>

                    {canPerformAdminAction && (
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="rounded p-1 text-amber-600 hover:bg-amber-50"
                        title="Edit Salary"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Edit Salary Structure */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Adjust Compensation & Base Salary
              </h3>
              <button onClick={() => setEditingEmp(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveSalary} className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 text-slate-600 font-mono text-[11px]">
                Employee: {editingEmp.fullName} ({editingEmp.id})
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Monthly Base Salary (SAR)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={monthlyBase}
                  onChange={(e) => setMonthlyBase(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  Annual Base = {(monthlyBase * 12).toLocaleString()} SAR
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Housing</label>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={housing}
                    onChange={(e) => setHousing(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Transport</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={transport}
                    onChange={(e) => setTransport(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Other</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={other}
                    onChange={(e) => setOther(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Audit Justification Notes</label>
                <textarea
                  required
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Single Customizable Payslip Print View */}
      {payslipEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Print Single Customizable Payslip
                </h3>
                <p className="text-xs text-slate-500">
                  Formatted according to Corporate Template Studio specifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setPayslipEmp(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="print-container mt-6 space-y-6 text-slate-900">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Logo"
                    className="h-12 w-12 object-contain"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {corporateEntity.companyName}
                    </h2>
                    <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT ID: {corporateEntity.vatNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider block">
                    MONTHLY PAYSLIP
                  </span>
                  <span className="font-mono text-slate-600 block mt-0.5">
                    Pay Period: October 2026
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 block">
                    Currency: {baseCurrency}
                  </span>
                </div>
              </div>

              {/* Employee Particulars Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">EMPLOYEE NAME</span>
                  <span className="font-bold text-slate-900 font-sans text-sm">
                    {payslipEmp.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">EMPLOYEE ID / IQAMA</span>
                  <span className="font-semibold text-slate-800">
                    {payslipEmp.id} / {payslipEmp.iqamaNationalId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DESIGNATION & DEPT</span>
                  <span className="text-slate-800 font-sans">
                    {payslipEmp.designation} ({payslipEmp.department})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">BANK DISBURSEMENT IBAN</span>
                  <span className="text-slate-800">{payslipEmp.bankIban}</span>
                </div>
              </div>

              {/* Itemized Earnings & Deductions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Itemized Earnings & Remuneration ({baseCurrency})
                </h4>
                <table className="w-full border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-700">
                      <th className="px-3 py-2 text-left">Compensation Element</th>
                      <th className="px-3 py-2 text-right">Basis</th>
                      <th className="px-3 py-2 text-right">Amount ({baseCurrency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 font-sans">Monthly Basic Salary</td>
                      <td className="px-3 py-2 text-right text-slate-500">Contractual</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(payslipEmp.monthlyBaseSalary)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">Housing Allowance</td>
                      <td className="px-3 py-2 text-right text-slate-500">25% Benchmark</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(payslipEmp.housingAllowance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">Transportation Allowance</td>
                      <td className="px-3 py-2 text-right text-slate-500">Fixed Monthly</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(payslipEmp.transportAllowance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">Other Professional Allowances</td>
                      <td className="px-3 py-2 text-right text-slate-500">Performance</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(payslipEmp.otherAllowances)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                      <td className="px-3 py-2.5 font-sans">NET SALARY PAYABLE</td>
                      <td className="px-3 py-2.5 text-right font-sans text-slate-500">
                        DIRECT DEPOSIT
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-800 text-sm">
                        {formatCurrency(payslipEmp.totalMonthlyPackage)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Annualized Projection */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-600">Annual Base Salary Equivalent (×12):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(payslipEmp.annualBaseSalary)}
                </span>
              </div>

              {/* Signature Blocks */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <span className="text-slate-500 block mb-6">Finance & Payroll Officer</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Tariq Mansoor (CFO)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block mb-6">Employee Acknowledgement</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    {payslipEmp.fullName}
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
    </div>
  );
};
