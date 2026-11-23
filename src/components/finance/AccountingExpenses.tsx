import React, { useState, useMemo } from 'react';
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
  Eye,
  Edit,
  Download,
  Search,
  Calendar,
  Building2,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  downloadExpenseVoucherPDF,
  downloadExpensesLedgerPDF,
  downloadAccountingCategoriesPDF,
} from '../../utils/pdfGenerator';

interface AccountingExpensesProps {
  initialTab?: 'expenses' | 'categories';
}

export const AccountingExpenses: React.FC<AccountingExpensesProps> = ({ initialTab = 'expenses' }) => {
  const {
    accountingCategories,
    addAccountingCategory,
    updateAccountingCategory,
    deleteAccountingCategory,
    expenses,
    addExpense,
    updateExpense,
    approveExpense,
    rejectExpense,
    deleteExpense,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    canPerformFinanceAction,
    corporateEntity,
    projects,
    activeBranchId,
  } = useHRMS();

  // Unified financial authority (Super Admin & Finance Officer)
  const canManageFinances = canPerformAdminAction || canPerformFinanceAction;

  // Navigation tab & Category view mode ('list' | 'grid')
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>(initialTab);
  const [categoryViewMode, setCategoryViewMode] = useState<'list' | 'grid'>('list');

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // In-app Delete Confirmation Modal (Eliminates window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'expense';
    id: string;
    title: string;
    details: string;
    warning?: string;
  } | null>(null);

  // 1. Create Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    code: '',
    name: '',
    type: 'Operating Expense' as AccountingCategory['type'],
    description: '',
    budgetCapSAR: 150000,
    status: 'active' as const,
  });

  // 2. Edit Category Modal
  const [editCategoryTarget, setEditCategoryTarget] = useState<AccountingCategory | null>(null);
  const [editCatForm, setEditCatForm] = useState({
    code: '',
    name: '',
    type: 'Operating Expense' as AccountingCategory['type'],
    description: '',
    budgetCapSAR: 150000,
    status: 'active' as 'active' | 'archived',
  });

  // 3. View Category Modal (Dossier with linked expenses)
  const [viewCategoryTarget, setViewCategoryTarget] = useState<AccountingCategory | null>(null);

  // 4. Create Expense Modal
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

  // 5. Edit Expense Modal
  const [editExpenseTarget, setEditExpenseTarget] = useState<Expense | null>(null);
  const [editExpForm, setEditExpForm] = useState({
    categoryId: '',
    title: '',
    amountSAR: 0,
    vendor: '',
    date: '',
    projectId: '',
    submittedBy: '',
    receiptRef: '',
    notes: '',
    status: 'pending' as Expense['status'],
  });

  // 6. View Expense Modal
  const [viewExpenseTarget, setViewExpenseTarget] = useState<Expense | null>(null);

  // 7. Printable Voucher Modal
  const [printExpense, setPrintExpense] = useState<Expense | null>(null);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        e.expenseNumber.toLowerCase().includes(query) ||
        e.title.toLowerCase().includes(query) ||
        e.vendor.toLowerCase().includes(query) ||
        e.categoryName.toLowerCase().includes(query) ||
        (e.receiptRef && e.receiptRef.toLowerCase().includes(query));
      const matchesBranch = activeBranchId === 'all' || (e.branchId || 'BR-RUH') === activeBranchId;
      return matchesStatus && matchesSearch && matchesBranch;
    });
  }, [expenses, statusFilter, searchQuery, activeBranchId]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return accountingCategories.filter((c) => {
      const matchesType = categoryTypeFilter === 'all' || c.type === categoryTypeFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [accountingCategories, categoryTypeFilter, searchQuery]);

  // Total Metrics for Expenses
  const expenseMetrics = useMemo(() => {
    const totalCount = expenses.length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amountSAR, 0);
    const approvedAmount = expenses
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + e.amountSAR, 0);
    const pendingAmount = expenses
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + e.amountSAR, 0);
    return { totalCount, totalAmount, approvedAmount, pendingAmount };
  }, [expenses]);

  // Category Total Spend Lookup Map
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, { totalSpent: number; count: number }>();
    expenses.forEach((e) => {
      const current = map.get(e.categoryId) || { totalSpent: 0, count: 0 };
      map.set(e.categoryId, {
        totalSpent: current.totalSpent + e.amountSAR,
        count: current.count + 1,
      });
    });
    return map;
  }, [expenses]);

  // Handlers for Category CRUD
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
    setActionSuccessMsg(`Created accounting category ${catForm.name} (${catForm.code}).`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleOpenEditCat = (cat: AccountingCategory) => {
    setEditCategoryTarget(cat);
    setEditCatForm({
      code: cat.code,
      name: cat.name,
      type: cat.type,
      description: cat.description || '',
      budgetCapSAR: cat.budgetCapSAR || 100000,
      status: cat.status || 'active',
    });
  };

  const handleSaveEditCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryTarget) return;
    updateAccountingCategory(editCategoryTarget.id, editCatForm);
    if (viewCategoryTarget && viewCategoryTarget.id === editCategoryTarget.id) {
      setViewCategoryTarget({ ...viewCategoryTarget, ...editCatForm });
    }
    setEditCategoryTarget(null);
    setActionSuccessMsg(`Updated accounting category ${editCatForm.name}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteCat = (cat: AccountingCategory) => {
    const linked = expenses.filter((e) => e.categoryId === cat.id);
    setDeleteTarget({
      type: 'category',
      id: cat.id,
      title: cat.name,
      details: `Code: ${cat.code} · Classification: ${cat.type}`,
      warning:
        linked.length > 0
          ? `This category is currently linked to ${linked.length} corporate expense record(s).`
          : undefined,
    });
  };

  // Handlers for Expense CRUD
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
    setActionSuccessMsg(`Submitted corporate expense voucher for ${expForm.title}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleOpenEditExp = (exp: Expense) => {
    setEditExpenseTarget(exp);
    setEditExpForm({
      categoryId: exp.categoryId,
      title: exp.title,
      amountSAR: exp.amountSAR,
      vendor: exp.vendor,
      date: exp.date,
      projectId: exp.projectId || '',
      submittedBy: exp.submittedBy,
      receiptRef: exp.receiptRef || '',
      notes: exp.notes || '',
      status: exp.status,
    });
  };

  const handleSaveEditExp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpenseTarget) return;
    const cat = accountingCategories.find((c) => c.id === editExpForm.categoryId);
    const prj = projects.find((p) => p.id === editExpForm.projectId);

    const updatedData: Partial<Expense> = {
      ...editExpForm,
      categoryName: cat ? cat.name : editExpenseTarget.categoryName,
      projectName: prj ? prj.name : editExpenseTarget.projectName,
      amountSAR: Number(editExpForm.amountSAR),
    };

    updateExpense(editExpenseTarget.id, updatedData);

    if (viewExpenseTarget && viewExpenseTarget.id === editExpenseTarget.id) {
      setViewExpenseTarget({ ...viewExpenseTarget, ...updatedData } as Expense);
    }
    setEditExpenseTarget(null);
    setActionSuccessMsg(`Updated expense voucher ${editExpenseTarget.expenseNumber}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteExp = (exp: Expense) => {
    setDeleteTarget({
      type: 'expense',
      id: exp.id,
      title: exp.expenseNumber,
      details: `${exp.title} · ${formatCurrency(exp.amountSAR)} (${exp.vendor})`,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') {
      deleteAccountingCategory(deleteTarget.id);
      if (viewCategoryTarget && viewCategoryTarget.id === deleteTarget.id) {
        setViewCategoryTarget(null);
      }
      setActionSuccessMsg(`Deleted accounting category "${deleteTarget.title}".`);
    } else {
      deleteExpense(deleteTarget.id);
      if (viewExpenseTarget && viewExpenseTarget.id === deleteTarget.id) {
        setViewExpenseTarget(null);
      }
      setActionSuccessMsg(`Deleted corporate expense record "${deleteTarget.title}".`);
    }
    setDeleteTarget(null);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // PDF Export Handlers
  const handleDownloadSingleExpensePDF = (exp: Expense) => {
    downloadExpenseVoucherPDF(exp, corporateEntity, baseCurrency);
    setActionSuccessMsg(`Downloaded PDF Voucher for ${exp.expenseNumber}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDownloadLedgerPDF = () => {
    downloadExpensesLedgerPDF(filteredExpenses, corporateEntity, baseCurrency, statusFilter);
    setActionSuccessMsg(`Downloaded Corporate Expenses Ledger PDF (${filteredExpenses.length} records).`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDownloadCategoriesPDF = () => {
    downloadAccountingCategoriesPDF(accountingCategories, expenses, corporateEntity, baseCurrency);
    setActionSuccessMsg(`Downloaded Chart of Accounts & Categories PDF (${accountingCategories.length} categories).`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Accounting Categories & Corporate Expenses
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
              Financial Treasury
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating expenditure ledger, chart of accounts budget monitoring, voucher audit, and certified PDF export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'expenses' ? (
            <>
              <button
                onClick={handleDownloadLedgerPDF}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
                title="Download Corporate Expenses Ledger as Vector PDF"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Export Ledger PDF</span>
              </button>

              <button
                onClick={() => setExpModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Submit Expense</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownloadCategoriesPDF}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
                title="Download Chart of Accounts & Budget Categories Ledger as Vector PDF"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Export Categories PDF</span>
              </button>

              {canManageFinances && (
                <button
                  onClick={() => setCatModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Category</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Success Toast */}
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
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Vouchers</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {expenseMetrics.totalCount}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({accountingCategories.length} Categories)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Expenditure</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {formatCurrency(expenseMetrics.totalAmount)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Approved Settlement</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
              {formatCurrency(expenseMetrics.approvedAmount)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Pending Review</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
              {formatCurrency(expenseMetrics.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between text-xs shadow-xs">
        {/* Tabs */}
        <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            onClick={() => {
              setActiveTab('expenses');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Corporate Expenses ({expenses.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('categories');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Accounting Categories ({accountingCategories.length})</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'expenses' ? 'Search voucher, title, vendor...' : 'Search category or code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-md border border-slate-200 pl-8 pr-2.5 py-1 text-xs outline-none focus:border-slate-400"
            />
          </div>

          {activeTab === 'expenses' ? (
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 font-medium capitalize text-[11px] transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st} ({expenses.filter((e) => st === 'all' || e.status === st).length})
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryTypeFilter}
                onChange={(e) => setCategoryTypeFilter(e.target.value)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs outline-none bg-white font-medium text-slate-700"
              >
                <option value="all">All Classifications</option>
                <option value="Operating Expense">Operating Expense</option>
                <option value="Payroll & Compensation">Payroll & Compensation</option>
                <option value="Direct Project Cost">Direct Project Cost</option>
                <option value="Administrative">Administrative</option>
                <option value="Capital Asset">Capital Asset</option>
              </select>

              {/* List View / Grid View Switcher */}
              <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('list')}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    categoryViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('grid')}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    categoryViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid View</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: Corporate Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                  <th className="px-3.5 py-3">Expense Voucher & Payee</th>
                  <th className="px-3.5 py-3">Accounting Category</th>
                  <th className="px-3.5 py-3">Date & Reference</th>
                  <th className="px-3.5 py-3 text-right">Amount ({baseCurrency})</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-right pr-4">Actions (View, Edit, PDF, Delete)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No corporate expense records match the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="font-bold text-slate-700">{exp.expenseNumber}</span> · Vendor: {exp.vendor}
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="font-medium text-slate-800">{exp.categoryName}</div>
                        {exp.projectName && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Project: {exp.projectName}
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                        <div>{exp.date}</div>
                        <div className="text-slate-400 text-[10px]">{exp.receiptRef || 'Direct Invoice'}</div>
                      </td>

                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(exp.amountSAR)}
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            exp.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : exp.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>

                      {/* Actions: View, Edit, PDF, Print, Approve, Reject, Delete */}
                      <td className="px-3.5 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. View Voucher */}
                          <button
                            onClick={() => setViewExpenseTarget(exp)}
                            className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 transition-colors"
                            title="View Detailed Expense Voucher"
                          >
                            <Eye className="h-3 w-3 text-blue-600" />
                            <span>View</span>
                          </button>

                          {/* 2. Edit Voucher */}
                          <button
                            onClick={() => handleOpenEditExp(exp)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 hover:bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors"
                            title="Edit Expense Record"
                          >
                            <Edit className="h-3 w-3 text-slate-600" />
                            <span>Edit</span>
                          </button>

                          {/* 3. Download Vector PDF */}
                          <button
                            onClick={() => handleDownloadSingleExpensePDF(exp)}
                            className="rounded-md border border-slate-200 hover:bg-blue-50 hover:border-blue-200 p-1 text-slate-600 hover:text-blue-700 transition-colors"
                            title="Download Vector PDF Voucher"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* 4. Print Voucher Modal */}
                          <button
                            onClick={() => setPrintExpense(exp)}
                            className="rounded-md border border-slate-200 hover:bg-slate-100 p-1 text-slate-600 transition-colors"
                            title="Print Voucher Template"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* Approval Controls */}
                          {canPerformFinanceAction && exp.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveExpense(exp.id)}
                                className="rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 p-1 text-emerald-700 transition-colors"
                                title="Approve Settlement"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => rejectExpense(exp.id, 'Disallowed per corporate expense policy')}
                                className="rounded-md bg-rose-50 border border-rose-200 hover:bg-rose-100 p-1 text-rose-700 transition-colors"
                                title="Reject Expense"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {/* 5. Delete Expense */}
                          {canManageFinances && (
                            <button
                              onClick={() => handleDeleteExp(exp)}
                              className="rounded-md border border-slate-200 hover:bg-rose-50 hover:border-rose-200 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Expense Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100/90 font-semibold text-xs text-slate-800">
                    <td className="px-3.5 py-2.5 font-bold">
                      Filtered Total ({filteredExpenses.length} Records)
                    </td>
                    <td colSpan={2} className="px-3.5 py-2.5 text-slate-500 font-normal">
                      Aggregate Expenditure
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amountSAR, 0))}
                    </td>
                    <td colSpan={2} className="px-3.5 py-2.5 text-right pr-4">
                      <button
                        onClick={handleDownloadLedgerPDF}
                        className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                      >
                        <Download className="h-3 w-3" />
                        <span>Export Filtered PDF</span>
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Accounting Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categoryViewMode === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                    <th className="px-3.5 py-3">Code & Category</th>
                    <th className="px-3.5 py-3">Classification</th>
                    <th className="px-3.5 py-3 text-center">Status</th>
                    <th className="px-3.5 py-3 text-right">Budget Cap ({baseCurrency})</th>
                    <th className="px-3.5 py-3 text-right">Spent ({baseCurrency})</th>
                    <th className="px-3.5 py-3 w-40">Utilization</th>
                    <th className="px-3.5 py-3 text-center">Vouchers</th>
                    <th className="px-3.5 py-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        No accounting categories match the specified search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => {
                      const spendInfo = categorySpendMap.get(cat.id) || { totalSpent: 0, count: 0 };
                      const budgetCap = cat.budgetCapSAR || 0;
                      const remaining = budgetCap - spendInfo.totalSpent;
                      const utilPercent =
                        budgetCap > 0 ? Math.min(100, Math.round((spendInfo.totalSpent / budgetCap) * 100)) : 0;
                      const isOverBudget = spendInfo.totalSpent > budgetCap;

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{cat.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-slate-700">{cat.code}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[260px]">
                                {cat.description || 'General corporate accounting expenditure classification.'}
                              </span>
                            </div>
                          </td>

                          <td className="px-3.5 py-3 text-slate-700 font-medium whitespace-nowrap">
                            {cat.type}
                          </td>

                          <td className="px-3.5 py-3 text-center">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                cat.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {cat.status}
                            </span>
                          </td>

                          <td className="px-3.5 py-3 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                            {formatCurrency(budgetCap)}
                          </td>

                          <td className="px-3.5 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                            <div className="font-bold text-slate-900">{formatCurrency(spendInfo.totalSpent)}</div>
                            <div className={`text-[10px] ${remaining < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              Rem: {formatCurrency(remaining)}
                            </div>
                          </td>

                          <td className="px-3.5 py-3">
                            <div className="flex items-center justify-between text-[10.5px] font-mono tabular-nums mb-1">
                              <span className={isOverBudget ? 'font-bold text-rose-700' : 'text-slate-600'}>
                                {utilPercent}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOverBudget
                                    ? 'bg-rose-600'
                                    : utilPercent > 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(utilPercent, 100)}%` }}
                              />
                            </div>
                          </td>

                          <td className="px-3.5 py-3 text-center font-mono font-semibold text-slate-700 tabular-nums">
                            {spendInfo.count}
                          </td>

                          <td className="px-3.5 py-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewCategoryTarget(cat)}
                                className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 transition-colors cursor-pointer"
                                title="View Category Details & Linked Expenses"
                              >
                                <Eye className="h-3 w-3 text-blue-600" />
                                <span>View</span>
                              </button>

                              {canManageFinances && (
                                <button
                                  onClick={() => handleOpenEditCat(cat)}
                                  className="flex items-center gap-1 rounded border border-slate-200 hover:bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                                  title="Edit Category Details"
                                >
                                  <Edit className="h-3 w-3 text-slate-600" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {canManageFinances && (
                                <button
                                  onClick={() => handleDeleteCat(cat)}
                                  className="rounded border border-slate-200 hover:bg-rose-50 hover:border-rose-200 p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Accounting Category"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredCategories.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100/90 font-semibold text-xs text-slate-800">
                      <td colSpan={3} className="px-3.5 py-2.5 font-bold">
                        Filtered Categories ({filteredCategories.length} Accounts)
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(filteredCategories.reduce((sum, c) => sum + (c.budgetCapSAR || 0), 0))}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(
                          filteredCategories.reduce(
                            (sum, c) => sum + (categorySpendMap.get(c.id)?.totalSpent || 0),
                            0
                          )
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 font-normal">Aggregate Allocation</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-900 tabular-nums">
                        {filteredCategories.reduce(
                          (sum, c) => sum + (categorySpendMap.get(c.id)?.count || 0),
                          0
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right pr-4">
                        <button
                          onClick={handleDownloadCategoriesPDF}
                          className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          <Download className="h-3 w-3" />
                          <span>Export PDF</span>
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  No accounting categories match the specified search or filter.
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const spendInfo = categorySpendMap.get(cat.id) || { totalSpent: 0, count: 0 };
                  const budgetCap = cat.budgetCapSAR || 0;
                  const remaining = budgetCap - spendInfo.totalSpent;
                  const utilPercent = budgetCap > 0 ? Math.min(100, Math.round((spendInfo.totalSpent / budgetCap) * 100)) : 0;
                  const isOverBudget = spendInfo.totalSpent > budgetCap;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        {/* Top Header of Card */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-xs">{cat.name}</h3>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
                                  cat.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {cat.status}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 font-semibold block mt-0.5">
                              {cat.code}
                            </span>
                          </div>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 shrink-0">
                            {cat.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                          {cat.description || 'General corporate accounting expenditure classification.'}
                        </p>

                        {/* Budget Utilization Meter */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono tabular-nums">
                            <span className="text-slate-500">
                              Spent: <span className="font-bold text-slate-800">{formatCurrency(spendInfo.totalSpent)}</span>
                            </span>
                            <span className={isOverBudget ? 'font-bold text-rose-700' : 'text-slate-600'}>
                              {utilPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverBudget
                                  ? 'bg-rose-600'
                                  : utilPercent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.min(utilPercent, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums pt-0.5">
                            <span>Cap: {formatCurrency(budgetCap)}</span>
                            <span>Remaining: {formatCurrency(remaining)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Bar: View, Edit, PDF, Delete */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {spendInfo.count} Vouchers
                        </span>

                        <div className="flex items-center gap-1">
                          {/* View Category Dossier */}
                          <button
                            onClick={() => setViewCategoryTarget(cat)}
                            className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 transition-colors cursor-pointer"
                            title="View Category Details & Linked Expenses"
                          >
                            <Eye className="h-3 w-3 text-blue-600" />
                            <span>View</span>
                          </button>

                          {/* Edit Category */}
                          {canManageFinances && (
                            <button
                              onClick={() => handleOpenEditCat(cat)}
                              className="flex items-center gap-1 rounded border border-slate-200 hover:bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                              title="Edit Category Details"
                            >
                              <Edit className="h-3 w-3 text-slate-600" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Category */}
                          {canManageFinances && (
                            <button
                              onClick={() => handleDeleteCat(cat)}
                              className="rounded border border-slate-200 hover:bg-rose-50 hover:border-rose-200 p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Accounting Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW EXPENSE VOUCHER DOSSIER                                    */}
      {/* ========================================================================= */}
      {viewExpenseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Payment Voucher Dossier — {viewExpenseTarget.expenseNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingleExpensePDF(viewExpenseTarget)}
                  className="flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  title="Download Official Vector PDF"
                >
                  <Download className="h-3 w-3" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setViewExpenseTarget(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Highlight Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{viewExpenseTarget.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 font-mono text-[11px]">
                      <span>Voucher: {viewExpenseTarget.expenseNumber}</span>
                      <span>·</span>
                      <span>Date: {viewExpenseTarget.date}</span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                      viewExpenseTarget.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : viewExpenseTarget.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {viewExpenseTarget.status}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-baseline font-mono">
                  <span className="text-slate-500">Authorized Settlement Amount:</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(viewExpenseTarget.amountSAR)}
                  </span>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Payee / Vendor</div>
                  <div className="font-bold text-slate-800 mt-0.5">{viewExpenseTarget.vendor}</div>
                </div>

                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Accounting Category</div>
                  <div className="font-bold text-slate-800 mt-0.5">{viewExpenseTarget.categoryName}</div>
                </div>

                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Project Attribution</div>
                  <div className="text-slate-700 mt-0.5 font-medium">{viewExpenseTarget.projectName || 'General Operations'}</div>
                </div>

                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Invoice / Receipt Ref</div>
                  <div className="font-mono text-slate-700 mt-0.5">{viewExpenseTarget.receiptRef || 'Direct Invoice'}</div>
                </div>

                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Submitted By</div>
                  <div className="text-slate-700 mt-0.5 font-medium">{viewExpenseTarget.submittedBy}</div>
                </div>

                <div className="rounded-md border border-slate-100 bg-white p-3 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Authorized By</div>
                  <div className="text-slate-700 mt-0.5 font-medium">
                    {viewExpenseTarget.approvedBy || 'Pending Admin Signoff'}
                  </div>
                </div>
              </div>

              {/* Notes / Description */}
              {viewExpenseTarget.notes && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Expenditure Notes / Justification</div>
                  <p className="mt-1 text-slate-700 leading-relaxed">{viewExpenseTarget.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
              {canManageFinances && (
                <button
                  onClick={() => handleDeleteExp(viewExpenseTarget)}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Voucher</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    handleOpenEditExp(viewExpenseTarget);
                    setViewExpenseTarget(null);
                  }}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Voucher</span>
                </button>
                <button
                  onClick={() => setViewExpenseTarget(null)}
                  className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EXPENSE RECORD                                             */}
      {/* ========================================================================= */}
      {editExpenseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Expense Voucher — {editExpenseTarget.expenseNumber}
                </h3>
              </div>
              <button onClick={() => setEditExpenseTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExp} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  value={editExpForm.title}
                  onChange={(e) => setEditExpForm({ ...editExpForm, title: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Accounting Category</label>
                  <select
                    value={editExpForm.categoryId}
                    onChange={(e) => setEditExpForm({ ...editExpForm, categoryId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
                  >
                    {accountingCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount ({baseCurrency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editExpForm.amountSAR}
                    onChange={(e) => setEditExpForm({ ...editExpForm, amountSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payee / Vendor</label>
                  <input
                    type="text"
                    required
                    value={editExpForm.vendor}
                    onChange={(e) => setEditExpForm({ ...editExpForm, vendor: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editExpForm.date}
                    onChange={(e) => setEditExpForm({ ...editExpForm, date: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Project Assignment</label>
                  <select
                    value={editExpForm.projectId}
                    onChange={(e) => setEditExpForm({ ...editExpForm, projectId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
                  >
                    <option value="">General Enterprise Ops</option>
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
                    value={editExpForm.receiptRef}
                    onChange={(e) => setEditExpForm({ ...editExpForm, receiptRef: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Submitted By</label>
                  <input
                    type="text"
                    required
                    value={editExpForm.submittedBy}
                    onChange={(e) => setEditExpForm({ ...editExpForm, submittedBy: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Approval Status</label>
                  <select
                    value={editExpForm.status}
                    onChange={(e) => setEditExpForm({ ...editExpForm, status: e.target.value as Expense['status'] })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Justification</label>
                <textarea
                  rows={2}
                  value={editExpForm.notes}
                  onChange={(e) => setEditExpForm({ ...editExpForm, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditExpenseTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW ACCOUNTING CATEGORY DOSSIER & LINKED EXPENSES              */}
      {/* ========================================================================= */}
      {viewCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Accounting Category Dossier — {viewCategoryTarget.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {canPerformAdminAction && (
                  <button
                    onClick={() => {
                      handleOpenEditCat(viewCategoryTarget);
                      setViewCategoryTarget(null);
                    }}
                    className="flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit Category</span>
                  </button>
                )}
                <button
                  onClick={() => setViewCategoryTarget(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Category Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{viewCategoryTarget.name}</h2>
                    <span className="font-mono text-xs text-slate-500 font-bold block mt-0.5">
                      Code: {viewCategoryTarget.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {viewCategoryTarget.type}
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase">
                      {viewCategoryTarget.status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  {viewCategoryTarget.description || 'No detailed description provided.'}
                </p>

                {/* Budget metrics */}
                {(() => {
                  const spendInfo = categorySpendMap.get(viewCategoryTarget.id) || { totalSpent: 0, count: 0 };
                  const budgetCap = viewCategoryTarget.budgetCapSAR || 0;
                  const remaining = budgetCap - spendInfo.totalSpent;
                  const pct = budgetCap > 0 ? Math.round((spendInfo.totalSpent / budgetCap) * 100) : 0;

                  return (
                    <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Budget Cap</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{formatCurrency(budgetCap)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Total Spent</div>
                        <div className="font-bold text-emerald-700 text-sm mt-0.5">{formatCurrency(spendInfo.totalSpent)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Remaining / Utilization</div>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">{formatCurrency(remaining)} ({pct}%)</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Linked Expenses List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                    Linked Corporate Expense Vouchers (
                    {expenses.filter((e) => e.categoryId === viewCategoryTarget.id).length}
                    )
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Real-time expenditure ledger</span>
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Voucher & Date</th>
                        <th className="px-3 py-2">Title & Vendor</th>
                        <th className="px-3 py-2 text-right">Amount ({baseCurrency})</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses
                        .filter((e) => e.categoryId === viewCategoryTarget.id)
                        .map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-[11px]">
                              <div className="font-semibold text-slate-800">{e.expenseNumber}</div>
                              <div className="text-slate-400 text-[10px]">{e.date}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900">{e.title}</div>
                              <div className="text-[10px] text-slate-500">Payee: {e.vendor}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(e.amountSAR)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`text-[10px] font-semibold uppercase ${
                                  e.status === 'approved'
                                    ? 'text-emerald-700'
                                    : e.status === 'rejected'
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  setViewExpenseTarget(e);
                                  setViewCategoryTarget(null);
                                }}
                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                title="View Expense"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {expenses.filter((e) => e.categoryId === viewCategoryTarget.id).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            No corporate expenses currently logged under this accounting category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
              {canManageFinances && (
                <button
                  onClick={() => handleDeleteCat(viewCategoryTarget)}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Category</span>
                </button>
              )}
              <button
                onClick={() => setViewCategoryTarget(null)}
                className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 ml-auto"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT ACCOUNTING CATEGORY                                        */}
      {/* ========================================================================= */}
      {editCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Edit Accounting Category</h3>
              </div>
              <button onClick={() => setEditCategoryTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCat} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editCatForm.code}
                    onChange={(e) => setEditCatForm({ ...editCatForm, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Classification</label>
                  <select
                    value={editCatForm.type}
                    onChange={(e) =>
                      setEditCatForm({ ...editCatForm, type: e.target.value as AccountingCategory['type'] })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
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
                  value={editCatForm.name}
                  onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editCatForm.description}
                  onChange={(e) => setEditCatForm({ ...editCatForm, description: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Budget Allocation Cap (SAR)</label>
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    value={editCatForm.budgetCapSAR}
                    onChange={(e) => setEditCatForm({ ...editCatForm, budgetCapSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editCatForm.status}
                    onChange={(e) => setEditCatForm({ ...editCatForm, status: e.target.value as 'active' | 'archived' })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCategoryTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREATE ACCOUNTING CATEGORY                                      */}
      {/* ========================================================================= */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
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

      {/* ========================================================================= */}
      {/* MODAL 6: SUBMIT EXPENSE VOUCHER                                          */}
      {/* ========================================================================= */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
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
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
                  >
                    {accountingCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount ({baseCurrency})</label>
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
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
                  >
                    <option value="">General Enterprise Ops</option>
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

              <div>
                <label className="block font-medium text-slate-700 mb-1">Claimant / Submitted By</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khalid Al-Fassi"
                  value={expForm.submittedBy}
                  onChange={(e) => setExpForm({ ...expForm, submittedBy: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Reason or justification for this expenditure..."
                  value={expForm.notes}
                  onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
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

      {/* ========================================================================= */}
      {/* MODAL 7: PRINTABLE EXPENSE VOUCHER PREVIEW                                */}
      {/* ========================================================================= */}
      {printExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Print Single Expense Voucher
                </h3>
                <p className="text-xs text-slate-500">
                  ZATCA & Treasury Settlement Certified Template.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingleExpensePDF(printExpense)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  title="Download Vector PDF Voucher"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  <span>Download PDF</span>
                </button>
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

      {/* ========================================================================= */}
      {/* IN-APP CONFIRMATION MODAL: DELETE CATEGORY / EXPENSE                      */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-100 p-2.5 shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete {deleteTarget.type === 'category' ? 'Accounting Category' : 'Corporate Expense'}
                </h3>
                <p className="text-xs text-slate-500">This record will be permanently deleted from the financial ledger.</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1">
              <div className="text-xs font-semibold text-slate-800">{deleteTarget.title}</div>
              <div className="text-[11px] text-slate-500">{deleteTarget.details}</div>
              {deleteTarget.warning && (
                <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ {deleteTarget.warning}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs cursor-pointer transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
