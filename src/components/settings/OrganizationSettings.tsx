import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { SUPPORTED_CURRENCIES } from '../../data/initialData';
import { CustomPrivilege, RoleTier } from '../../types';
import {
  Building2,
  Coins,
  Shield,
  Key,
  Plus,
  Share2,
  Trash2,
  Edit3,
  Check,
  CreditCard,
  UserCheck,
  X,
  Mail,
  Copy,
  Upload,
  Image,
  RotateCcw,
} from 'lucide-react';

export const OrganizationSettings: React.FC = () => {
  const {
    corporateEntity,
    updateCorporateEntity,
    baseCurrency,
    setBaseCurrency,
    formatCurrency,
    customPrivileges,
    addCustomPrivilege,
    updateCustomPrivilege,
    deleteCustomPrivilege,
    employees,
    updateEmployee,
    canPerformAdminAction,
    setShareAccessModalOpen,
    t,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<'corporate' | 'currency' | 'rbac' | 'privileges'>('corporate');

  // Corporate Form State
  const [legalForm, setLegalForm] = useState({ ...corporateEntity });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Privilege Modal
  const [privModalOpen, setPrivModalOpen] = useState(false);
  const [editingPrivId, setEditingPrivId] = useState<string | null>(null);
  const [privForm, setPrivForm] = useState({
    name: '',
    description: '',
    assignedUsersCount: 1,
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canExportPdf: true,
      canManageSalary: false,
      canManageExpense: false,
      canManageTimesheet: false,
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLegalForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCorporate = (e: React.FormEvent) => {
    e.preventDefault();
    updateCorporateEntity(legalForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSavePrivilege = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPrivId) {
      updateCustomPrivilege(editingPrivId, privForm);
    } else {
      addCustomPrivilege(privForm);
    }
    setPrivModalOpen(false);
    setEditingPrivId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.navSettings}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Corporate identity, legal entity records, multi-currency engine, and Super Admin RBAC governance.
          </p>
        </div>

        <button
          onClick={() => setShareAccessModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Share2 className="h-4 w-4" />
          <span>Share User Access via Email</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('corporate')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'corporate'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Corporate Identity & Legal Entity
        </button>
        <button
          onClick={() => setActiveTab('currency')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'currency'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Base Operating Currency (Auto Recalc)
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'rbac'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System Access Role Tiers (All Users)
        </button>
        <button
          onClick={() => setActiveTab('privileges')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'privileges'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Custom Privileges & Granular Permissions
        </button>
      </div>

      {/* TAB 1: Corporate Identity & Legal Entity */}
      {activeTab === 'corporate' && (
        <form onSubmit={handleSaveCorporate} className="space-y-5 max-w-3xl">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Corporate Identity, Logo & Registry
              </h3>
              {saveSuccess && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="h-4 w-4" /> Changes saved to ERP
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Company Trading Name</label>
                <input
                  type="text"
                  required
                  value={legalForm.companyName}
                  onChange={(e) => setLegalForm({ ...legalForm, companyName: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Full Legal Registered Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={legalForm.legalName}
                  onChange={(e) => setLegalForm({ ...legalForm, legalName: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Commercial Registration (CR Number)
                </label>
                <input
                  type="text"
                  required
                  value={legalForm.crNumber}
                  onChange={(e) => setLegalForm({ ...legalForm, crNumber: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tax / VAT Registration ID
                </label>
                <input
                  type="text"
                  required
                  value={legalForm.vatNumber}
                  onChange={(e) => setLegalForm({ ...legalForm, vatNumber: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Official Company Email</label>
                <input
                  type="email"
                  required
                  value={legalForm.email}
                  onChange={(e) => setLegalForm({ ...legalForm, email: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Company Phone</label>
                <input
                  type="text"
                  required
                  value={legalForm.phone}
                  onChange={(e) => setLegalForm({ ...legalForm, phone: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Official Corporate Address</label>
                <input
                  type="text"
                  required
                  value={legalForm.address}
                  onChange={(e) => setLegalForm({ ...legalForm, address: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none text-xs"
                />
              </div>
            </div>

            {/* Corporate Logo Management */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="block font-medium text-slate-800">
                Official Corporate Logo & Brand Emblem
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="relative group shrink-0">
                  <img
                    src={legalForm.logoUrl}
                    alt="Corporate Emblem"
                    className="h-16 w-16 rounded-lg object-contain bg-slate-900 p-2 border border-slate-300 shadow-xs"
                  />
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="company-logo-file"
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-600" />
                      <span>Upload New Logo</span>
                    </label>
                    <input
                      id="company-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setLegalForm((prev) => ({
                          ...prev,
                          logoUrl: '/src/assets/images/corporate_logo_hrms_1791900623826.jpg',
                        }))
                      }
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      title="Reset to default Nexus Global logo"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Default</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Or Image URL / Asset Path:
                    </label>
                    <input
                      type="text"
                      value={legalForm.logoUrl}
                      onChange={(e) => setLegalForm({ ...legalForm, logoUrl: e.target.value })}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Corporate Bank Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Corporate Bank Account & Payroll Settlement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={legalForm.bankName}
                  onChange={(e) => setLegalForm({ ...legalForm, bankName: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Title</label>
                <input
                  type="text"
                  required
                  value={legalForm.accountTitle}
                  onChange={(e) => setLegalForm({ ...legalForm, accountTitle: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Corporate IBAN</label>
                <input
                  type="text"
                  required
                  value={legalForm.iban}
                  onChange={(e) => setLegalForm({ ...legalForm, iban: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">SWIFT / BIC Code</label>
                <input
                  type="text"
                  required
                  value={legalForm.swiftCode}
                  onChange={(e) => setLegalForm({ ...legalForm, swiftCode: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
            >
              Save Corporate Identity Details
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Base Operating Currency */}
      {activeTab === 'currency' && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Base Operating Currency Configuration
              </h3>
              <p className="text-slate-500 mt-0.5">
                Setting the Base Currency automatically propagates and recalculates across all compensation structures, annual base salaries, expense vouchers, accounting categories, and printable templates!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {SUPPORTED_CURRENCIES.map((c) => (
                <div
                  key={c.code}
                  onClick={() => setBaseCurrency(c.code)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    baseCurrency === c.code
                      ? 'border-slate-900 bg-slate-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {c.code} ({c.symbol})
                    </span>
                    {baseCurrency === c.code && (
                      <span className="rounded bg-slate-900 text-white p-1">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-1 font-medium">{c.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    Rate: 1 {c.code} = {c.rateToSAR} SAR
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block font-sans">
                Active Benchmark Verification:
              </span>
              <div>Example Standard Base Salary (38,000 SAR equivalent):</div>
              <div className="text-sm font-bold text-emerald-800">
                {formatCurrency(38000)} in {baseCurrency}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: System Access Role Tier List (All Users) */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                System Access Role Tier: All Users
              </h3>
              <p className="text-slate-500">
                Active enterprise accounts, assigned tier privileges, and operational status.
              </p>
            </div>
            <button
              onClick={() => setShareAccessModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Invite & Share Link</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                  <th className="px-4 py-3">User & Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role Tier Assignment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Modify Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{emp.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {emp.email} · ID: {emp.id}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{emp.department}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-slate-800 capitalize">
                        {emp.roleTier.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {emp.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <select
                        value={emp.roleTier}
                        onChange={(e) =>
                          updateEmployee(emp.id, { roleTier: e.target.value as RoleTier })
                        }
                        className="rounded border border-slate-200 px-2 py-1 text-xs outline-none bg-white font-mono"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="finance_officer">Finance Officer</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Custom Privileges & Permissions */}
      {activeTab === 'privileges' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Custom Privileges & Granular Permissions
              </h3>
              <p className="text-slate-500">
                Define specialized privilege profiles with granular view, edit, delete, and approve rights.
              </p>
            </div>
            {canPerformAdminAction && (
              <button
                onClick={() => {
                  setEditingPrivId(null);
                  setPrivForm({
                    name: '',
                    description: '',
                    assignedUsersCount: 1,
                    permissions: {
                      canView: true,
                      canEdit: false,
                      canDelete: false,
                      canApprove: false,
                      canExportPdf: true,
                      canManageSalary: false,
                      canManageExpense: false,
                      canManageTimesheet: false,
                    },
                  });
                  setPrivModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Custom Privilege</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customPrivileges.map((priv) => (
              <div
                key={priv.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{priv.name}</h4>
                    <span className="font-mono text-[10px] text-slate-400">{priv.id}</span>
                  </div>
                  {canPerformAdminAction && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPrivId(priv.id);
                          setPrivForm({ ...priv });
                          setPrivModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Edit Privilege"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete privilege ${priv.name}?`)) {
                            deleteCustomPrivilege(priv.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete Privilege"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-slate-600 text-xs line-clamp-2">{priv.description}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span>View Records:</span>
                    <strong className={priv.permissions.canView ? 'text-emerald-700' : 'text-slate-400'}>
                      {priv.permissions.canView ? 'Granted' : 'Denied'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Edit / Update:</span>
                    <strong className={priv.permissions.canEdit ? 'text-emerald-700' : 'text-slate-400'}>
                      {priv.permissions.canEdit ? 'Granted' : 'Denied'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete Authority:</span>
                    <strong className={priv.permissions.canDelete ? 'text-rose-700' : 'text-slate-400'}>
                      {priv.permissions.canDelete ? 'Granted' : 'Denied'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Authority:</span>
                    <strong className={priv.permissions.canApprove ? 'text-blue-700' : 'text-slate-400'}>
                      {priv.permissions.canApprove ? 'Granted' : 'Denied'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Timesheet Management:</span>
                    <strong className={priv.permissions.canManageTimesheet ? 'text-emerald-700' : 'text-slate-400'}>
                      {priv.permissions.canManageTimesheet ? 'Granted' : 'Denied'}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Custom Privilege */}
      {privModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPrivId ? 'Edit Custom Privilege' : 'Create Custom Privilege'}
              </h3>
              <button onClick={() => setPrivModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSavePrivilege} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Privilege Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal & Iqama Compliance Auditor"
                  value={privForm.name}
                  onChange={(e) => setPrivForm({ ...privForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Scope of privilege and regulatory context..."
                  value={privForm.description}
                  onChange={(e) => setPrivForm({ ...privForm, description: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-semibold text-slate-800 block uppercase tracking-wider text-[11px]">
                  Granular Permission Switches
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canView}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canView: e.target.checked },
                        })
                      }
                    />
                    <span>Can View Data</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canEdit}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canEdit: e.target.checked },
                        })
                      }
                    />
                    <span>Can Edit Data</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canDelete}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canDelete: e.target.checked },
                        })
                      }
                    />
                    <span>Can Delete</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canApprove}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canApprove: e.target.checked },
                        })
                      }
                    />
                    <span>Can Approve</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canExportPdf}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canExportPdf: e.target.checked },
                        })
                      }
                    />
                    <span>Export PDF</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privForm.permissions.canManageTimesheet}
                      onChange={(e) =>
                        setPrivForm({
                          ...privForm,
                          permissions: { ...privForm.permissions, canManageTimesheet: e.target.checked },
                        })
                      }
                    />
                    <span>Manage Timesheet</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrivModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Privilege Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
