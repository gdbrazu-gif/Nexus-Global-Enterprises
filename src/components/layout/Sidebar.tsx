import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Banknote,
  Receipt,
  FolderGit2,
  Laptop,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Send,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { corporateEntity, t, isEmployeeViewOnly, currentEmployeeUser } = useHRMS();

  // Dropdown expansion state for menu groups
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    coreHr: true,
    attendance: true,
    finance: true,
    payroll: false,
    operations: false,
    studio: true,
    governance: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden no-print"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Lockup */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <img
              src={corporateEntity.logoUrl}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-md object-contain bg-slate-900 p-1"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                Nexus Global
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-none">
                Enterprise HRMS/ERP
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {isEmployeeViewOnly ? (
            /* RESTRICTED SINGLE OWN PROFILE MODE (For standard employees) */
            <div className="space-y-1">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                My Workspace
              </div>

              <button
                onClick={() => handleNavClick('employee-profile')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  currentTab === 'employee-profile'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => handleNavClick('employee-timesheet')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  currentTab === 'employee-timesheet'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>My Attendance & Timesheet</span>
              </button>

              <button
                onClick={() => handleNavClick('employee-leaves')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  currentTab === 'employee-leaves'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>Request Leave / Time-Off</span>
              </button>

              <button
                onClick={() => handleNavClick('employee-payslip')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  currentTab === 'employee-payslip'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>My Salary & Payslip</span>
              </button>

              <button
                onClick={() => handleNavClick('employee-assets')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
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
                  Single User Persona Active
                </span>
                Restricted to own records for {currentEmployeeUser.fullName}. Switch operational role in the top bar to Super Admin to unlock full ERP control.
              </div>
            </div>
          ) : (
            /* FULL ERP / HRMS ADMIN & MANAGEMENT NAVIGATION */
            <>
              {/* Executive Overview */}
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>{t.navDashboard}</span>
              </button>

              {/* SECTION: Core HR & Personnel */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('coreHr')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.coreHrSection}</span>
                  {openSections.coreHr ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.coreHr && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('employees')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'employees'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{t.navEmployees}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('departments')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'departments'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{t.navDepartments}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('designations')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'designations'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{t.navDesignations}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Attendance & Time Ledger */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('attendance')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.timeAttendanceSection}</span>
                  {openSections.attendance ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.attendance && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('timesheet-matrix')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'timesheet-matrix'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>{t.navAttendance}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('leaves')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'leaves'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{t.navLeaves}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Compensation & Payroll */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('payroll')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.navPayroll}</span>
                  {openSections.payroll ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.payroll && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('payroll')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'payroll'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      <span>Salary Structure & Base</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Finance & Accounting */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('finance')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.financeSection}</span>
                  {openSections.finance ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.finance && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('accounting-categories')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'accounting-categories'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>{t.navAccounting}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('expenses')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'expenses'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      <span>{t.navExpenses}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Operations & Projects */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('operations')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.operationsSection}</span>
                  {openSections.operations ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.operations && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('projects')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'projects'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FolderGit2 className="h-3.5 w-3.5" />
                      <span>{t.navProjects}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('assets')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'assets'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>{t.navAssets}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Template Studio & Print Engine */}
              <div className="pt-2">
                <button
                  onClick={() => toggleSection('studio')}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700"
                >
                  <span>{t.governanceSection}</span>
                  {openSections.studio ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {openSections.studio && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    <button
                      onClick={() => handleNavClick('templates')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'templates'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{t.navTemplates}</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('reports')}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        currentTab === 'reports'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>{t.navReports}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Settings & RBAC */}
              <div className="pt-2">
                <button
                  onClick={() => handleNavClick('settings')}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    currentTab === 'settings'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>{t.navSettings}</span>
                </button>

                <button
                  onClick={() => handleNavClick('audit-trail')}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    currentTab === 'audit-trail'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.navAuditTrail}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-200 p-4 text-[11px] text-slate-500">
          <div className="flex items-center justify-between font-mono">
            <span>CR: {corporateEntity.crNumber}</span>
            <span className="text-slate-400">v2.6 Enterprise</span>
          </div>
          <div className="truncate mt-0.5 text-slate-400">
            {corporateEntity.bankName}
          </div>
        </div>
      </aside>
    </>
  );
};
