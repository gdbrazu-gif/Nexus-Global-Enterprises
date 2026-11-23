/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { EmployeesDirectory } from './components/employees/EmployeesDirectory';
import { AttendanceTimesheetMatrix } from './components/timesheet/AttendanceTimesheetMatrix';
import { LeaveManagement } from './components/leaves/LeaveManagement';
import { PayrollCompensation } from './components/payroll/PayrollCompensation';
import { AccountingExpenses } from './components/finance/AccountingExpenses';
import { ProjectsAssets } from './components/projects/ProjectsAssets';
import { ManpowerSuppliers } from './components/manpower/ManpowerSuppliers';
import { InventoryManager } from './components/inventory/InventoryManager';
import { DepartmentsDesignations } from './components/departments/DepartmentsDesignations';
import { TemplateStudio } from './components/templates/TemplateStudio';
import { AnalyticsReporting } from './components/reports/AnalyticsReporting';
import { OrganizationSettings } from './components/settings/OrganizationSettings';
import { RolePermissionMatrix } from './components/settings/RolePermissionMatrix';
import { BackupDataManager } from './components/settings/BackupDataManager';
import { BranchesManager } from './components/settings/BranchesManager';
import { MultiUserDeviceManager } from './components/settings/MultiUserDeviceManager';
import { EmployeeSelfService } from './components/employee-portal/EmployeeSelfService';
import { DailyWorkEntityLedger } from './components/daily-work/DailyWorkEntityLedger';
import { ShareAccessModal } from './components/common/ShareAccessModal';
import { AuditTrailModal } from './components/common/AuditTrailModal';
import { AuthGate } from './components/auth/AuthGate';
import { getRequiredRbacModule } from './utils/rbacNavigation';
import { ShieldAlert } from 'lucide-react';

function MainApp() {
  const {
    authReady,
    firebaseUser,
    cloudAuthorized,
    currentRole,
    isEmployeeViewOnly,
    setAuditModalOpen,
    rbacMatrix,
    hasModulePermission,
  } = useHRMS();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('apex_sidebar_drawer_open') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('apex_sidebar_drawer_open', String(drawerOpen));
    } catch {
      // ignore storage quota errors
    }
  }, [drawerOpen]);

  // Enforce employee persona view & live RBAC module access on role or policy change
  React.useEffect(() => {
    if (isEmployeeViewOnly) {
      if (!currentTab.startsWith('employee-')) {
        setCurrentTab('employee-profile');
      }
      return;
    }

    if (currentTab.startsWith('employee-')) {
      setCurrentTab('dashboard');
      return;
    }

    const requiredModule = getRequiredRbacModule(currentTab);
    if (requiredModule && !hasModulePermission(requiredModule, 'read')) {
      setCurrentTab('dashboard');
    }
  }, [isEmployeeViewOnly, currentRole, rbacMatrix, currentTab, hasModulePermission]);

  if (!authReady || !firebaseUser || !cloudAuthorized) {
    return <AuthGate />;
  }

  const renderContent = () => {
    if (isEmployeeViewOnly || currentTab.startsWith('employee-')) {
      return (
        <EmployeeSelfService
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
      );
    }

    const requiredModule = getRequiredRbacModule(currentTab);
    if (requiredModule && !hasModulePermission(requiredModule, 'read')) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-lg mx-auto my-8 space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Role-Based Access Restricted
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your active Operational Persona does not have view permission for this module under current Role-Based Permissions (RBAC) policy.
          </p>
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <OverviewDashboard onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'employees':
      case 'onboarding':
        return <EmployeesDirectory />;
      case 'departments':
      case 'designations':
        return <DepartmentsDesignations />;
      case 'timesheet-matrix':
        return <AttendanceTimesheetMatrix />;
      case 'leaves':
        return <LeaveManagement />;
      case 'payroll':
        return <PayrollCompensation />;
      case 'accounting-categories':
        return <AccountingExpenses initialTab="categories" />;
      case 'expenses':
        return <AccountingExpenses initialTab="expenses" />;
      case 'projects':
        return <ProjectsAssets mode="projects" />;
      case 'assets':
        return <ProjectsAssets mode="villas" />;
      case 'daily-work':
      case 'daily-work-entities':
        return <DailyWorkEntityLedger />;
      case 'manpower-suppliers':
        return (
          <ManpowerSuppliers
            initialTab="suppliers"
            onTabChange={(t) => setCurrentTab(`manpower-${t}`)}
          />
        );
      case 'manpower-workers':
        return (
          <ManpowerSuppliers
            initialTab="workers"
            onTabChange={(t) => setCurrentTab(`manpower-${t}`)}
          />
        );
      case 'manpower-pos':
        return (
          <ManpowerSuppliers
            initialTab="pos"
            onTabChange={(t) => setCurrentTab(`manpower-${t}`)}
          />
        );
      case 'inventory':
      case 'inventory-catalog':
        return (
          <InventoryManager
            initialTab="catalog"
            onTabChange={(t) => setCurrentTab(`inventory-${t}`)}
          />
        );
      case 'inventory-invoices':
        return (
          <InventoryManager
            initialTab="invoices"
            onTabChange={(t) => setCurrentTab(`inventory-${t}`)}
          />
        );
      case 'inventory-movements':
        return (
          <InventoryManager
            initialTab="movements"
            onTabChange={(t) => setCurrentTab(`inventory-${t}`)}
          />
        );
      case 'templates':
        return <TemplateStudio />;
      case 'reports':
        return <AnalyticsReporting />;
      case 'settings':
        return <OrganizationSettings />;
      case 'branches':
        return <BranchesManager />;
      case 'users-devices':
        return <MultiUserDeviceManager />;
      case 'rbac':
        return <RolePermissionMatrix />;
      case 'backup-data':
        return <BackupDataManager />;
      case 'audit-trail':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Compliance Audit Trail &amp; Governance Log
                </h1>
                <p className="text-xs text-slate-500">
                  Full chronological record of operational changes across workforce, salaries, timesheets, and roles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shrink-0"
              >
                Open Full Screen Audit Modal
              </button>
            </div>
            {hasModulePermission('settings', 'read') && <OrganizationSettings />}
          </div>
        );
      default:
        return <OverviewDashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* DrawerLayout Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
          onNavigate={(tab) => setCurrentTab(tab)}
        />

        <main className="flex-1 px-3 py-4 pb-24 sm:p-5 sm:pb-24 md:p-6 md:pb-8 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {renderContent()}
        </main>
      </div>

      {/* Fixed Thumb-Zone Mobile Bottom Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {/* Global Modals */}
      <div className="no-print">
        <ShareAccessModal />
        <AuditTrailModal />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HRMSProvider>
      <MainApp />
    </HRMSProvider>
  );
}
