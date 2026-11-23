import React, { useState, useEffect } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  CalendarDays,
  Banknote,
  Wallet,
  FolderGit2,
  Laptop,
  FileText,
  BarChart3,
  Settings,
  Shield,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Send,
  X,
  Truck,
  Boxes,
  Home,
  HardHat,
  Wrench,
  ClipboardList,
  Database,
  Receipt,
  RefreshCw,
  MapPin,
  Cloud,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onToggleDrawer?: () => void;
}

const TAB_TO_SECTION: Record<string, string> = {
  employees: 'coreHr',
  onboarding: 'coreHr',
  departments: 'coreHr',
  designations: 'coreHr',
  'timesheet-matrix': 'attendance',
  leaves: 'attendance',
  payroll: 'payroll',
  expenses: 'finance',
  'accounting-categories': 'finance',
  projects: 'operations',
  assets: 'operations',
  'daily-work': 'operations',
  'daily-work-entities': 'operations',
  inventory: 'inventoryStock',
  'inventory-catalog': 'inventoryStock',
  'inventory-invoices': 'inventoryStock',
  'inventory-movements': 'inventoryStock',
  'manpower-suppliers': 'manpowerPos',
  'manpower-workers': 'manpowerPos',
  'manpower-pos': 'manpowerPos',
  templates: 'studio',
  reports: 'studio',
  settings: 'governance',
  branches: 'governance',
  'users-devices': 'governance',
  rbac: 'governance',
  'audit-trail': 'governance',
  'backup-data': 'governance',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  drawerOpen,
  onCloseDrawer,
  onToggleDrawer,
}) => {
  const {
    corporateEntity,
    t,
    isEmployeeViewOnly,
    currentEmployeeUser,
    activeBranchId,
    branches,
    hasModulePermission,
  } = useHRMS();

  const canCoreHr =
    hasModulePermission('employees', 'read') || hasModulePermission('departments', 'read');
  const canAttendance =
    hasModulePermission('attendance', 'read') || hasModulePermission('leaves', 'read');
  const canPayroll = hasModulePermission('payroll', 'read');
  const canFinance = hasModulePermission('accounting', 'read');
  const canOperations =
    hasModulePermission('projects', 'read') || hasModulePermission('villas', 'read');
  const canInventory = hasModulePermission('inventory', 'read');
  const canManpower = hasModulePermission('manpower', 'read');
  const canStudio =
    hasModulePermission('templates', 'read') || hasModulePermission('analytics', 'read');
  const canGovernance =
    hasModulePermission('settings', 'read') ||
    hasModulePermission('branches', 'read') ||
    hasModulePermission('users', 'read') ||
    hasModulePermission('rbac', 'read') ||
    hasModulePermission('audit_logs', 'read');

  // Independent manual section toggles (opening one does NOT auto-close others,
  // and closing/reopening the Drawer preserves manual section states)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial = TAB_TO_SECTION[currentTab];
    return initial ? { [initial]: true } : {};
  });

  // Close mobile overlay drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && typeof window !== 'undefined' && window.innerWidth < 768) {
        onCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, onCloseDrawer]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Manual Drawer control: navigating does NOT auto-open or auto-close the Drawer on desktop/tablet.
  // Only mobile overlay (< 768px) dismisses so content is accessible.
  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onCloseDrawer();
    }
  };

  const activeBranchCode =
    activeBranchId === 'all'
      ? 'ALL'
      : branches.find((b) => b.id === activeBranchId)?.code || activeBranchId;

  const railBtnClass = (active: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
      active
        ? 'bg-slate-900 text-white shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile-Only Drawer Backdrop Scrim */}
      <div
        onClick={onCloseDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 md:hidden no-print ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Collapsible Mini-Variant Drawer Layout (Icon Rail when closed on md+, Full Drawer when open) */}
      <aside
        aria-label="Main Navigation Drawer"
        className={`fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[300px] ${
          drawerOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        } md:sticky md:top-0 md:h-screen md:z-20 md:translate-x-0 md:pointer-events-auto md:shadow-none ${
          drawerOpen ? 'md:w-72' : 'md:w-16'
        } flex flex-col border-r border-slate-200 bg-white shadow-2xl transition-[width,transform] duration-200 ease-out shrink-0 no-print`}
      >
        {/* Brand Lockup & Manual Drawer Toggle */}
        {drawerOpen ? (
          <div className="flex h-14 md:h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-5 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={corporateEntity.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-md object-contain bg-slate-900 p-1 shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
                  {corporateEntity.companyName || 'AKASH GLOBAL'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium leading-none truncate mt-0.5">
                  {corporateEntity.legalName || 'Corporate Entity'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseDrawer}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close navigation drawer"
              title="Close Drawer (Show Icons Only)"
            >
              <X className="h-5 w-5 md:hidden" />
              <PanelLeftClose className="hidden md:block h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex h-16 shrink-0 flex-col items-center justify-center border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => (onToggleDrawer ? onToggleDrawer() : undefined)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open navigation drawer"
              title={`${corporateEntity.companyName || 'AKASH GLOBAL'} — Open Drawer`}
            >
              <img
                src={corporateEntity.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-md object-contain bg-slate-900 p-1"
              />
            </button>
          </div>
        )}

        {/* COLLAPSED ICON RAIL VIEW (Desktop/Tablet when Drawer is closed: "show to the icon") */}
        {!drawerOpen && (
          <div className="hidden md:flex flex-1 flex-col items-center overflow-y-auto overscroll-contain py-3 px-2 gap-1 sidebar-scroll">
            {/* Explicit Open Drawer Icon Button */}
            {onToggleDrawer && (
              <>
                <button
                  type="button"
                  onClick={onToggleDrawer}
                  className="flex h-9 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Open Navigation Drawer"
                  title="Open Drawer"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
              </>
            )}

            {isEmployeeViewOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('employee-profile')}
                  title="My Profile"
                  aria-label="My Profile"
                  className={railBtnClass(currentTab === 'employee-profile')}
                >
                  <User className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('employee-timesheet')}
                  title="My Attendance & Timesheet"
                  aria-label="My Attendance & Timesheet"
                  className={railBtnClass(currentTab === 'employee-timesheet')}
                >
                  <Clock className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('employee-leaves')}
                  title="Request Leave / Time-Off"
                  aria-label="Request Leave / Time-Off"
                  className={railBtnClass(currentTab === 'employee-leaves')}
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('employee-payslip')}
                  title="My Salary & Payslip"
                  aria-label="My Salary & Payslip"
                  className={railBtnClass(currentTab === 'employee-payslip')}
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('employee-assets')}
                  title="Assigned Custody Assets"
                  aria-label="Assigned Custody Assets"
                  className={railBtnClass(currentTab === 'employee-assets')}
                >
                  <Laptop className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {/* Executive Overview */}
                <button
                  type="button"
                  onClick={() => handleNavClick('dashboard')}
                  title={t.navDashboard}
                  aria-label={t.navDashboard}
                  className={railBtnClass(currentTab === 'dashboard')}
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>

                {/* Core HR */}
                {canCoreHr && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {hasModulePermission('employees', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('employees')}
                        title={t.navEmployees}
                        aria-label={t.navEmployees}
                        className={railBtnClass(currentTab === 'employees' || currentTab === 'onboarding')}
                      >
                        <Users className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('departments', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('departments')}
                        title={t.navDepartments}
                        aria-label={t.navDepartments}
                        className={railBtnClass(currentTab === 'departments' || currentTab === 'designations')}
                      >
                        <Building2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}

                {/* Attendance & Leaves */}
                {canAttendance && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {hasModulePermission('attendance', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('timesheet-matrix')}
                        title={t.navAttendance}
                        aria-label={t.navAttendance}
                        className={railBtnClass(currentTab === 'timesheet-matrix')}
                      >
                        <CalendarCheck className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('leaves', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('leaves')}
                        title={t.navLeaves}
                        aria-label={t.navLeaves}
                        className={railBtnClass(currentTab === 'leaves')}
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}

                {/* Payroll & Finance */}
                {(canPayroll || canFinance) && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {canPayroll && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('payroll')}
                        title="Salary Structure & Base"
                        aria-label="Salary Structure & Base"
                        className={railBtnClass(currentTab === 'payroll')}
                      >
                        <Banknote className="h-4 w-4" />
                      </button>
                    )}
                    {canFinance && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('expenses')}
                        title={t.navExpenses}
                        aria-label={t.navExpenses}
                        className={railBtnClass(currentTab === 'expenses' || currentTab === 'accounting-categories')}
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}

                {/* Operations & Projects */}
                {canOperations && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {hasModulePermission('projects', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('projects')}
                        title={t.navProjects}
                        aria-label={t.navProjects}
                        className={railBtnClass(currentTab === 'projects')}
                      >
                        <FolderGit2 className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('villas', 'read') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNavClick('assets')}
                          title="Villas & Units Ledger"
                          aria-label="Villas & Units Ledger"
                          className={railBtnClass(currentTab === 'assets')}
                        >
                          <Home className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick('daily-work')}
                          title="Daily Work Entity Data"
                          aria-label="Daily Work Entity Data"
                          className={railBtnClass(currentTab === 'daily-work' || currentTab === 'daily-work-entities')}
                        >
                          <Wrench className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Inventory Invoices & Stock */}
                {canInventory && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleNavClick('inventory-catalog')}
                      title="Stock Catalog & Warehouse Ledger"
                      aria-label="Stock Catalog & Warehouse Ledger"
                      className={railBtnClass(currentTab === 'inventory-catalog' || currentTab === 'inventory')}
                    >
                      <Boxes className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('inventory-invoices')}
                      title="Invoices & Delivery Vouchers"
                      aria-label="Invoices & Delivery Vouchers"
                      className={railBtnClass(currentTab === 'inventory-invoices')}
                    >
                      <Receipt className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('inventory-movements')}
                      title="Stock In / Out Movement History"
                      aria-label="Stock In / Out Movement History"
                      className={railBtnClass(currentTab === 'inventory-movements')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Manpower & POS */}
                {canManpower && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleNavClick('manpower-suppliers')}
                      title="Suppliers & Contracts"
                      aria-label="Suppliers & Contracts"
                      className={railBtnClass(currentTab === 'manpower-suppliers')}
                    >
                      <Truck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('manpower-workers')}
                      title="Outsourced Workers"
                      aria-label="Outsourced Workers"
                      className={railBtnClass(currentTab === 'manpower-workers')}
                    >
                      <HardHat className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('manpower-pos')}
                      title="Service Orders / POS"
                      aria-label="Service Orders / POS"
                      className={railBtnClass(currentTab === 'manpower-pos')}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Template Studio & Reports */}
                {canStudio && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {hasModulePermission('templates', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('templates')}
                        title={t.navTemplates}
                        aria-label={t.navTemplates}
                        className={railBtnClass(currentTab === 'templates')}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('analytics', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('reports')}
                        title={t.navReports}
                        aria-label={t.navReports}
                        className={railBtnClass(currentTab === 'reports')}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}

                {/* Company Governance */}
                {canGovernance && (
                  <>
                    <div className="w-7 border-t border-slate-200 my-1 shrink-0" />
                    {hasModulePermission('settings', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('settings')}
                        title="Settings"
                        aria-label="Settings"
                        className={railBtnClass(currentTab === 'settings')}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('branches', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('branches')}
                        title="Branches & Locations"
                        aria-label="Branches & Locations"
                        className={railBtnClass(currentTab === 'branches')}
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('users', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('users-devices')}
                        title="Users & Multi-Device Sync"
                        aria-label="Users & Multi-Device Sync"
                        className={railBtnClass(currentTab === 'users-devices')}
                      >
                        <Cloud className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('rbac', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('rbac')}
                        title="Role-Based Permissions (RBAC)"
                        aria-label="Role-Based Permissions (RBAC)"
                        className={railBtnClass(currentTab === 'rbac')}
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('audit_logs', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('audit-trail')}
                        title={t.navAuditTrail}
                        aria-label={t.navAuditTrail}
                        className={railBtnClass(currentTab === 'audit-trail')}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    )}
                    {hasModulePermission('settings', 'read') && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('backup-data')}
                        title="Backup Data"
                        aria-label="Backup Data"
                        className={railBtnClass(currentTab === 'backup-data')}
                      >
                        <Database className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* EXPANDED DRAWER VIEW (Full Navigation with Labels & Manual Section Toggles) */}
        {drawerOpen && (
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1 sidebar-scroll">
            {isEmployeeViewOnly ? (
              /* RESTRICTED SINGLE OWN PROFILE MODE (For standard employees) */
              <div className="space-y-1">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  My Workspace
                </div>

                <button
                  type="button"
                  onClick={() => handleNavClick('employee-profile')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'employee-profile'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('employee-timesheet')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'employee-timesheet'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>My Attendance &amp; Timesheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('employee-leaves')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'employee-leaves'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>Request Leave / Time-Off</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('employee-payslip')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'employee-payslip'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>My Salary &amp; Payslip</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('employee-assets')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'employee-assets'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Laptop className="h-4 w-4" />
                  <span>Assigned Custody Assets</span>
                </button>

                <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block mb-1">
                    Self-Service Portal Active
                  </span>
                  Restricted to own records for {currentEmployeeUser.fullName}. Contact your Super Admin for branch or RBAC policy updates.
                </div>
              </div>
            ) : (
              /* ROLE-BASED ERP / HRMS NAVIGATION (Filtered live by rbacMatrix) */
              <>
                {/* Executive Overview */}
                <button
                  type="button"
                  onClick={() => handleNavClick('dashboard')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t.navDashboard}</span>
                </button>

                {/* DROPDOWN 1: Core HR & Personnel */}
                {canCoreHr && (
                  <div className="pt-2">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.coreHr)}
                      onClick={() => toggleSection('coreHr')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.coreHr
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.coreHrSection}</span>
                      {openSections.coreHr ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.coreHr
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          {hasModulePermission('employees', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('employees')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'employees'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span>{t.navEmployees}</span>
                            </button>
                          )}

                          {hasModulePermission('departments', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('departments')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'departments'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              <span>{t.navDepartments}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 2: Attendance & Time Ledger */}
                {canAttendance && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.attendance)}
                      onClick={() => toggleSection('attendance')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.attendance
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.timeAttendanceSection}</span>
                      {openSections.attendance ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.attendance
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          {hasModulePermission('attendance', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('timesheet-matrix')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'timesheet-matrix'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <CalendarCheck className="h-3.5 w-3.5" />
                              <span>{t.navAttendance}</span>
                            </button>
                          )}

                          {hasModulePermission('leaves', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('leaves')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'leaves'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>{t.navLeaves}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 3: Compensation & Payroll */}
                {canPayroll && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.payroll)}
                      onClick={() => toggleSection('payroll')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.payroll
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.navPayroll}</span>
                      {openSections.payroll ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.payroll
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          <button
                            type="button"
                            onClick={() => handleNavClick('payroll')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'payroll'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            <span>Salary Structure &amp; Base</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 4: Finance & Accounting */}
                {canFinance && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.finance)}
                      onClick={() => toggleSection('finance')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.finance
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.financeSection}</span>
                      {openSections.finance ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.finance
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          <button
                            type="button"
                            onClick={() => handleNavClick('expenses')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'expenses'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            <span>{t.navExpenses}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 5: Operations & Projects */}
                {canOperations && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.operations)}
                      onClick={() => toggleSection('operations')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.operations
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.operationsSection}</span>
                      {openSections.operations ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.operations
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          {hasModulePermission('projects', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('projects')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'projects'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <FolderGit2 className="h-3.5 w-3.5" />
                              <span>{t.navProjects}</span>
                            </button>
                          )}

                          {hasModulePermission('villas', 'read') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleNavClick('assets')}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                  currentTab === 'assets'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <Home className="h-3.5 w-3.5" />
                                <span>Villas &amp; Units Ledger</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleNavClick('daily-work')}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                  currentTab === 'daily-work' || currentTab === 'daily-work-entities'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                <span>Daily Work Entity Data</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 6: Inventory Invoices & Stock */}
                {canInventory && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.inventoryStock)}
                      onClick={() => toggleSection('inventoryStock')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.inventoryStock
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">Inventory Invoices &amp; Stock</span>
                      {openSections.inventoryStock ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.inventoryStock
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          <button
                            type="button"
                            onClick={() => handleNavClick('inventory-catalog')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'inventory-catalog' || currentTab === 'inventory'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Boxes className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Stock Catalog &amp; Warehouse Ledger</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavClick('inventory-invoices')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'inventory-invoices'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Receipt className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Invoices &amp; Delivery Vouchers</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavClick('inventory-movements')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'inventory-movements'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Stock In / Out Movement History</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 7: Manpower & POS */}
                {canManpower && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.manpowerPos)}
                      onClick={() => toggleSection('manpowerPos')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.manpowerPos
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">Manpower &amp; POS</span>
                      {openSections.manpowerPos ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.manpowerPos
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          <button
                            type="button"
                            onClick={() => handleNavClick('manpower-suppliers')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'manpower-suppliers'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Truck className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Suppliers &amp; Contracts</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavClick('manpower-workers')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'manpower-workers'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <HardHat className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Outsourced Workers</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavClick('manpower-pos')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              currentTab === 'manpower-pos'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Service Orders / POS</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 8: Template Studio & Print Engine */}
                {canStudio && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.studio)}
                      onClick={() => toggleSection('studio')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.studio
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.governanceSection}</span>
                      {openSections.studio ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.studio
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          {hasModulePermission('templates', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('templates')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'templates'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>{t.navTemplates}</span>
                            </button>
                          )}

                          {hasModulePermission('analytics', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('reports')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'reports'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                              <span>{t.navReports}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DROPDOWN 9: Name of Company (Settings, Branches, Users, RBAC, Audit Trail, Backup Data) */}
                {canGovernance && (
                  <div className="pt-1">
                    <button
                      type="button"
                      aria-expanded={Boolean(openSections.governance)}
                      onClick={() => toggleSection('governance')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        openSections.governance
                          ? 'bg-slate-100/80 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                      title="Name of Company"
                    >
                      <span className="truncate">{corporateEntity.companyName || 'AKASH GLOBAL'}</span>
                      {openSections.governance ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        openSections.governance
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-0.5 pl-2">
                          {hasModulePermission('settings', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('settings')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'settings'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Settings className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Settings</span>
                            </button>
                          )}

                          {hasModulePermission('branches', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('branches')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'branches'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Branches &amp; Locations</span>
                            </button>
                          )}

                          {hasModulePermission('users', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('users-devices')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'users-devices'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Cloud className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Users &amp; Multi-Device Sync</span>
                            </button>
                          )}

                          {hasModulePermission('rbac', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('rbac')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'rbac'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Shield className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Role-Based Permissions (RBAC)</span>
                            </button>
                          )}

                          {hasModulePermission('audit_logs', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('audit-trail')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'audit-trail'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{t.navAuditTrail}</span>
                            </button>
                          )}

                          {hasModulePermission('settings', 'read') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('backup-data')}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                currentTab === 'backup-data'
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Database className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Backup Data</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer info (Expanded vs Compact Icon Rail) */}
        {drawerOpen ? (
          <div className="border-t border-slate-200 p-4 pb-safe text-[11px] text-slate-500 shrink-0 bg-white">
            <div className="flex items-center justify-between font-mono tabular-nums">
              <span>CR: {corporateEntity.crNumber}</span>
              <span className="text-slate-400">
                {activeBranchId === 'all' ? 'All Branches' : activeBranchCode}
              </span>
            </div>
            <div className="truncate mt-0.5 text-slate-400">
              {corporateEntity.bankName}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex border-t border-slate-200 py-2.5 px-1 items-center justify-center shrink-0 bg-white">
            <span
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 truncate max-w-[52px]"
              title={activeBranchId === 'all' ? 'All Branches' : `Branch: ${activeBranchCode}`}
            >
              {activeBranchCode}
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
