/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { EmployeesDirectory } from './components/employees/EmployeesDirectory';
import { AttendanceTimesheetMatrix } from './components/timesheet/AttendanceTimesheetMatrix';
import { LeaveManagement } from './components/leaves/LeaveManagement';
import { PayrollCompensation } from './components/payroll/PayrollCompensation';
import { AccountingExpenses } from './components/finance/AccountingExpenses';
import { ProjectsAssets } from './components/projects/ProjectsAssets';
import { DepartmentsDesignations } from './components/departments/DepartmentsDesignations';
import { TemplateStudio } from './components/templates/TemplateStudio';
import { AnalyticsReporting } from './components/reports/AnalyticsReporting';
import { OrganizationSettings } from './components/settings/OrganizationSettings';
import { EmployeeSelfService } from './components/employee-portal/EmployeeSelfService';
import { ShareAccessModal } from './components/common/ShareAccessModal';
import { AuditTrailModal } from './components/common/AuditTrailModal';

function MainApp() {
  const { currentRole, isEmployeeViewOnly, setAuditModalOpen } = useHRMS();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If switched to employee role and current tab is an admin tab, redirect to employee profile
  React.useEffect(() => {
    if (isEmployeeViewOnly && !currentTab.startsWith('employee-')) {
      setCurrentTab('employee-profile');
    } else if (!isEmployeeViewOnly && currentTab.startsWith('employee-')) {
      setCurrentTab('dashboard');
    }
  }, [isEmployeeViewOnly]);

  const renderContent = () => {
    if (isEmployeeViewOnly || currentTab.startsWith('employee-')) {
      return (
        <EmployeeSelfService
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
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
      case 'expenses':
        return <AccountingExpenses />;
      case 'projects':
      case 'assets':
        return <ProjectsAssets />;
      case 'templates':
        return <TemplateStudio />;
      case 'reports':
        return <AnalyticsReporting />;
      case 'settings':
        return <OrganizationSettings />;
      case 'audit-trail':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Compliance Audit Trail & Governance Log
                </h1>
                <p className="text-xs text-slate-500">
                  Full chronological record of operational changes across workforce, salaries, timesheets, and roles.
                </p>
              </div>
              <button
                onClick={() => setAuditModalOpen(true)}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Open Full Screen Audit Modal
              </button>
            </div>
            <OrganizationSettings />
          </div>
        );
      default:
        return <OverviewDashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>

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
