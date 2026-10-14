import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { AccountingCategory, Expense } from '../../types';
import {
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Printer,
  X,
  DollarSign,
  Coins,
  FileText,
  Filter,
} from 'lucide-react';

export const AccountingExpenses: React.FC = () => {
  const {
    accountingCategories,
    addAccountingCategory,
    expenses,
    addExpense,
    approveExpense,
    rejectExpense,
    deleteExpense,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    canPerformFinanceAction,
    corporateEntity,
    employees,
    projects,
    t,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // New Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    code: '',
    name: '',
    type: 'Operating Expense' as AccountingCategory['type'],
    description: '',
    budgetCapSAR: 150000,
    status: 'active' as const,
  });

  // New Expense Modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    categoryId: accountingCategories[0]?.id || 'CAT-6100',
    title: '',
    amountSAR: 5000,
    vendor: '',
    date: new Date().toISOString().substring(0, 10),
    projectId: 'PRJ-2026-01',
    submittedBy: 'Khalid Al-Fassi',
    receiptRef: '',
    notes: '',
  });

  // Printable Expense Voucher Modal
  const [printExpense, setPrintExpense] = useState<Expense | null>(null);

  const filteredExpenses = expenses.filter((e) => {
    if (statusFilter === 'all') return true;
    return e.status === statusFilter;
  });

  const handleCreateCat = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountingCategory(catForm);
    setCatModalOpen(false);
    setCatForm({
      code: '',
      name: '',
      type: 'Operating Expense',
      description: '',
      budgetCapSAR: 150000,
      status: 'active',
    });
  };

  const handleCreateExp = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = accountingCategories.find((c) => c.id === expForm.categoryId);
    const prj = projects.find((p) => p.id === expForm.projectId);
    addExpense({
      ...expForm,
      categoryName: cat?.name || 'General Expense',
      projectName: prj?.name,
      amountSAR: Number(expForm.amountSAR),
    });
    setExpModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Accounting Categories & Corporate Expenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating expenditure ledger, accounting chart of accounts, and admin expense approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPerformAdminAction && (
            <button
              onClick={() => setCatModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Accounting Category</span>
            </button>
          )}

          <button
            onClick={() => setExpModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'expenses'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'categories'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Accounting Categories ({accountingCategories.length})
        </button>
      </div>

      {/* TAB 1: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st} ({expenses.filter((e) => st === 'all' || e.status === st).length})
                </button>
              ))}
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              Admin-Only Approval Enforced
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                  <th className="px-4 py-3">Expense Voucher & Payee</th>
                  <th className="px-4 py-3">Accounting Category</th>
                  <th className="px-4 py-3">Date & Reference</th>
                  <th className="px-4 py-3 text-right">Amount ({baseCurrency})</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {exp.expenseNumber} · Vendor: {exp.vendor}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-800">
                      {exp.categoryName}
                      {exp.projectName && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Project: {exp.projectName}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      <div>{exp.date}</div>
                      <div className="text-slate-400">{exp.receiptRef || 'Direct Invoice'}</div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(exp.amountSAR)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          exp.status === 'approved'
                            ? 'text-emerald-700'
                            : exp.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>

                    {/* Actions: View / Print Voucher, Approve, Reject, Delete (Admin only) */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPrintExpense(exp)}
                          className="rounded p-1 text-slate-600 hover:bg-slate-100"
                          title="Print Expense Voucher Template"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {canPerformFinanceAction && exp.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveExpense(exp.id)}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                              title="Approve (Admin only)"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => rejectExpense(exp.id, 'Disallowed per corporate policy')}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Reject (Admin only)"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {canPerformAdminAction && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete expense record ${exp.expenseNumber}?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Accounting Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountingCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{cat.name}</h3>
                  <span className="font-mono text-[11px] text-slate-500 font-semibold">
                    {cat.code}
                  </span>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  {cat.type}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{cat.description}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Budget Cap:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(cat.budgetCapSAR)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create Accounting Category */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Accounting Category</h3>
              <button onClick={() => setCatModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCat} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6500-MARKETING"
                    value={catForm.code}
                    onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Classification</label>
                  <select
                    value={catForm.type}
                    onChange={(e) =>
                      setCatForm({ ...catForm, type: e.target.value as AccountingCategory['type'] })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    <option value="Operating Expense">Operating Expense</option>
                    <option value="Payroll & Compensation">Payroll & Compensation</option>
                    <option value="Direct Project Cost">Direct Project Cost</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Capital Asset">Capital Asset</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing, PR & Regional Conferences"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Accounting description and allowable expenditure types..."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Budget Allocation Cap (SAR)</label>
                <input
                  type="number"
                  min={1000}
                  step={5000}
                  value={catForm.budgetCapSAR}
                  onChange={(e) => setCatForm({ ...catForm, budgetCapSAR: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Accounting Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Submit Expense Voucher */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Submit Corporate Expense Voucher</h3>
              <button onClick={() => setExpModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateExp} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Production Cloud Infrastructure Hosting"
                  value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Accounting Category</label>
                  <select
                    value={expForm.categoryId}
                    onChange={(e) => setExpForm({ ...expForm, categoryId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {accountingCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount (SAR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={10}
                    value={expForm.amountSAR}
                    onChange={(e) => setExpForm({ ...expForm, amountSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payee / Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amazon Web Services"
                    value={expForm.vendor}
                    onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Project Assignment</label>
                  <select
                    value={expForm.projectId}
                    onChange={(e) => setExpForm({ ...expForm, projectId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice / Receipt Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-99410"
                    value={expForm.receiptRef}
                    onChange={(e) => setExpForm({ ...expForm, receiptRef: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Submit Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Print Single Expense Voucher */}
      {printExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Print Single Customizable Expense Voucher
                </h3>
                <p className="text-xs text-slate-500">
                  ZATCA & Treasury Settlement Certified Template.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setPrintExpense(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Document */}
            <div className="print-container mt-6 space-y-6 text-slate-900">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Emblem"
                    className="h-12 w-12 object-contain"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {corporateEntity.companyName}
                    </h2>
                    <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT: {corporateEntity.vatNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider block">
                    PAYMENT VOUCHER
                  </span>
                  <span className="font-mono text-slate-700 block font-semibold mt-0.5">
                    {printExpense.expenseNumber}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 block">
                    Date: {printExpense.date}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">PAYEE / VENDOR</span>
                  <span className="font-bold text-slate-900 text-sm font-sans">
                    {printExpense.vendor}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">ACCOUNTING CATEGORY</span>
                  <span className="font-semibold text-slate-800 font-sans">
                    {printExpense.categoryName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">PROJECT ATTRIBUTION</span>
                  <span className="text-slate-800 font-sans">
                    {printExpense.projectName || 'General Operations'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">INVOICE / RECEIPT REF</span>
                  <span className="text-slate-800">{printExpense.receiptRef || 'Direct Electronic Bill'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 uppercase">
                  Expenditure Specification
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {printExpense.title}
                  </div>
                  {printExpense.notes && (
                    <div className="text-xs text-slate-600">{printExpense.notes}</div>
                  )}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center font-mono">
                    <span className="text-xs text-slate-500 font-sans">Total Authorized Settlement:</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(printExpense.amountSAR)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 text-[11px] block mb-6">Submitted By</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    {printExpense.submittedBy}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block mb-6">Treasury Review</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Verified & Disbursed
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block mb-6">Admin Authorized</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px] text-emerald-800 font-bold">
                    {printExpense.approvedBy || 'Pending Admin Signoff'}
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                Nexus Global ERP Treasury Module · Bank IBAN: {corporateEntity.iban} · {corporateEntity.bankName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
