import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { SUPPORTED_CURRENCIES } from '../../data/initialData';
import { ROLE_DISPLAY_LABELS } from '../../data/rbacDefaults';
import { FIREBASE_BOOTSTRAP_ADMIN_EMAIL } from '../../firebase';
import { RoleTier, LanguageCode } from '../../types';
import { ALL_SUPPORTED_LANGUAGES } from '../../i18n/languages';
import {
  ShieldCheck,
  Globe,
  Coins,
  Menu,
  UserCheck,
  SlidersHorizontal,
  X,
  MapPin,
  Cloud,
  CloudOff,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  drawerOpen,
  onToggleDrawer,
  onNavigate,
}) => {
  const {
    corporateEntity,
    baseCurrency,
    setBaseCurrency,
    currentRole,
    switchRole,
    canPerformAdminAction,
    language,
    setLanguage,
    setAuditModalOpen,
    isEmployeeViewOnly,
    currentEmployeeUser,
    branches,
    activeBranchId,
    setActiveBranchId,
    firebaseUser,
    cloudAuthorized,
    signInWithGoogle,
    signOutCloud,
  } = useHRMS();

  const [mobilePrefsOpen, setMobilePrefsOpen] = useState(false);

  const headOfficeBranch = branches.find(
    (b) => b.name.trim().toLowerCase() === 'head office'
  );
  const activeBranchObj = branches.find((b) => b.id === activeBranchId);
  const activeBranchLabel =
    activeBranchId === 'all'
      ? 'All Branches'
      : activeBranchId === 'HEAD_OFFICE'
      ? 'Head Office'
      : activeBranchObj?.code || activeBranchId;
  const activeRoleLabel = ROLE_DISPLAY_LABELS[currentRole] || currentRole;

  const canExitUserPreview =
    !cloudAuthorized ||
    (firebaseUser?.email || '').trim().toLowerCase() === FIREBASE_BOOTSTRAP_ADMIN_EMAIL;

  const pageTitle =
    currentTab === 'projects'
      ? 'Projects & Master Contracts'
      : currentTab === 'assets'
      ? 'Villas & Units Ledger'
      : currentTab === 'inventory' || currentTab === 'inventory-catalog'
      ? 'Stock Catalog & Warehouse Ledger'
      : currentTab === 'inventory-invoices'
      ? 'Invoices & Delivery Vouchers'
      : currentTab === 'inventory-movements'
      ? 'Stock In / Out Movement History'
      : currentTab === 'manpower-suppliers'
      ? 'Suppliers & Contracts'
      : currentTab === 'manpower-workers'
      ? 'Outsourced Workers'
      : currentTab === 'manpower-pos'
      ? 'Service Orders / POS'
      : currentTab === 'branches'
      ? 'Branches & Multi-Branch Network'
      : currentTab === 'users-devices'
      ? 'Multi-User Access & Multi-Device Sync'
      : currentTab === 'rbac'
      ? 'Role-Based Permissions (RBAC)'
      : currentTab === 'settings'
      ? 'Corporate Identity & Legal Entity'
      : currentTab === 'backup-data'
      ? 'Backup Data & Restore Center'
      : currentTab === 'audit-trail'
      ? 'Audit Trail & Compliance'
      : currentTab.replace(/-/g, ' ');

  const handleCloudAction = () => {
    if (!firebaseUser) {
      void signInWithGoogle();
    } else if (onNavigate) {
      onNavigate('users-devices');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 md:h-16 w-full items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 md:px-6 backdrop-blur no-print">
        {/* Left: DrawerLayout Toggle & Truncated Page Title */}
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
            title={drawerOpen ? 'Close Drawer (Collapse to Icons)' : 'Open Navigation Drawer'}
            className="inline-flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="h-4 w-4 md:hidden" />
            {drawerOpen ? (
              <PanelLeftClose className="hidden md:block h-4 w-4" />
            ) : (
              <PanelLeftOpen className="hidden md:block h-4 w-4" />
            )}
          </button>

          <div className="flex flex-col min-w-0">
            <span className="text-sm md:text-[15px] font-semibold text-slate-900 capitalize truncate leading-tight">
              {pageTitle}
            </span>
            <span className="md:hidden text-[10.5px] font-mono text-slate-500 truncate leading-tight">
              {canPerformAdminAction
                ? `${corporateEntity.companyName} · ${activeBranchLabel} · ${baseCurrency}`
                : `${corporateEntity.companyName} · ${activeBranchLabel} · ${activeRoleLabel}`}
            </span>
          </div>
        </div>

        {/* Mobile Quick Controls (< 768px) */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {canPerformAdminAction ? (
            <button
              type="button"
              onClick={() => setMobilePrefsOpen(true)}
              aria-label="Open Workspace Controls"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span className="font-mono max-w-[78px] truncate">{activeBranchLabel}</span>
            </button>
          ) : (
            canExitUserPreview && (
              <button
                type="button"
                onClick={() => switchRole('super_admin')}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                title="Return to Super Admin View"
              >
                Super Admin
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => void signOutCloud()}
            title="Sign Out"
            aria-label="Sign Out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <img
            src={
              firebaseUser?.photoURL
                ? firebaseUser.photoURL
                : isEmployeeViewOnly
                ? currentEmployeeUser.profileImage
                : corporateEntity.logoUrl
            }
            alt="Profile Avatar"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full border border-slate-200 object-cover bg-slate-100 shrink-0"
          />
        </div>

        {/* Desktop & Tablet Controls (>= 768px) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {canPerformAdminAction ? (
            <>
              {/* Switch Active Branch Dropdown (Super Admin Only) */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  aria-label="Switch Active Branch"
                  title="Switch Active Branch"
                  className="cursor-pointer bg-transparent font-semibold text-slate-800 outline-none max-w-[140px] lg:max-w-[175px] truncate"
                >
                  <option value="all">All Branches</option>
                  {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operating Currency Selector with SAR Icon */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 shrink-0">
                <span className="flex items-center gap-1 font-semibold text-slate-900">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                  <span className="hidden xl:inline font-mono">SAR</span>
                </span>
                <span className="hidden xl:inline text-slate-300">|</span>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="cursor-pointer bg-transparent font-medium text-slate-800 outline-none hover:text-slate-900"
                  title="Base Operating Currency (auto-updates compensation, expenses and templates)"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:border-slate-300 shadow-2xs shrink-0">
                <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="cursor-pointer bg-transparent text-xs font-semibold outline-none max-w-[100px] lg:max-w-[120px] truncate"
                  title="Select Application Language"
                >
                  {Array.from(new Set(ALL_SUPPORTED_LANGUAGES.map((l) => l.region))).map((region) => (
                    <optgroup key={region} label={region}>
                      {ALL_SUPPORTED_LANGUAGES.filter((l) => l.region === region).map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Switch Role Tier / Operational Persona Dropdown (Super Admin Only) */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs font-medium text-slate-800 shrink-0">
                <UserCheck className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                <select
                  value={currentRole}
                  onChange={(e) => switchRole(e.target.value as RoleTier)}
                  aria-label="Switch Role Tier"
                  title="Switch Operational Persona: Role-Based Permissions"
                  className="cursor-pointer bg-transparent font-semibold text-slate-900 outline-none max-w-[145px] truncate"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="branch_admin">Branch Admin</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="finance_officer">Finance Officer</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="employee">Standard Employee</option>
                </select>
              </div>

              {/* Cloud Multi-User Sync Trigger */}
              <button
                type="button"
                onClick={handleCloudAction}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  cloudAuthorized
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title={
                  firebaseUser
                    ? `Connected as ${firebaseUser.email} · Manage Multi-User & Multi-Device Sync`
                    : 'Sign In with Google to enable Multi-Device & Multi-User Cloud Sync'
                }
              >
                {cloudAuthorized ? (
                  <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="hidden xl:inline">
                  {cloudAuthorized ? 'Cloud Synced' : firebaseUser ? 'Pending Access' : 'Cloud Sign-In'}
                </span>
              </button>

              {/* Compliance Audit Trail Modal Trigger */}
              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="View Live Governance & Audit Trail"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden 2xl:inline">Audit Trail</span>
              </button>
            </>
          ) : (
            /* Non-Admin Users: Read-Only Assigned Scope Text (No Switch Active Branch or Switch Role Tier dropdowns) */
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 whitespace-nowrap">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{activeBranchLabel}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 whitespace-nowrap">
                <UserCheck className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                <span>{activeRoleLabel}</span>
              </div>
              {canExitUserPreview && (
                <button
                  type="button"
                  onClick={() => switchRole('super_admin')}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                  title="Return to Super Admin View"
                >
                  Super Admin
                </button>
              )}
            </div>
          )}

          {/* Active Profile Avatar & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
            <img
              src={
                firebaseUser?.photoURL
                  ? firebaseUser.photoURL
                  : isEmployeeViewOnly
                  ? currentEmployeeUser.profileImage
                  : corporateEntity.logoUrl
              }
              alt="Profile Avatar"
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full border border-slate-200 object-cover bg-slate-100"
            />
            <button
              type="button"
              onClick={() => void signOutCloud()}
              title="Sign Out of App"
              aria-label="Sign Out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Sheet: Super Admin Workspace Controls Only */}
      {mobilePrefsOpen && canPerformAdminAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden no-print">
          <div
            onClick={() => setMobilePrefsOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace Preferences"
            className="relative w-full rounded-t-3xl bg-white border-t border-slate-200 shadow-2xl px-5 pt-3 pb-safe max-h-[85vh] overflow-y-auto space-y-4"
          >
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Workspace Controls</h2>
                <p className="text-[11px] text-slate-500">
                  Branch scope, multi-device sync, currency, language &amp; role tier
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePrefsOpen(false)}
                aria-label="Close Workspace Controls"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs pb-4">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  <span>Switch Active Branch</span>
                </label>
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="all">All Branches (Consolidated View)</option>
                  {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                  <span>Base Operating Currency</span>
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>Portal Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                >
                  {Array.from(new Set(ALL_SUPPORTED_LANGUAGES.map((l) => l.region))).map(
                    (region) => (
                      <optgroup key={region} label={region}>
                        {ALL_SUPPORTED_LANGUAGES.filter((l) => l.region === region).map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-blue-700" />
                  <span>Switch Role Tier</span>
                </label>
                <select
                  value={currentRole}
                  onChange={(e) => switchRole(e.target.value as RoleTier)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="branch_admin">Branch Admin</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="finance_officer">Finance Officer</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="employee">Standard Employee</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobilePrefsOpen(false);
                  handleCloudAction();
                }}
                className={`w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                  cloudAuthorized
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {cloudAuthorized ? (
                  <Cloud className="h-4 w-4 text-emerald-600" />
                ) : (
                  <CloudOff className="h-4 w-4 text-slate-600" />
                )}
                <span>
                  {cloudAuthorized
                    ? 'Manage Users & Multi-Device Sync'
                    : 'Sign In with Google Cloud Sync'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobilePrefsOpen(false);
                  setAuditModalOpen(true);
                }}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Open Compliance Audit Trail</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobilePrefsOpen(false);
                  void signOutCloud();
                }}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of App</span>
              </button>

              <button
                type="button"
                onClick={() => setMobilePrefsOpen(false)}
                className="w-full min-h-[46px] rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
