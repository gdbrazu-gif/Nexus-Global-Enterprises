import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FolderGit2,
  Menu,
  User,
  Clock,
  Send,
  FileText,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  drawerOpen,
  onOpenDrawer,
}) => {
  const { isEmployeeViewOnly, hasModulePermission } = useHRMS();

  const adminItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, allowed: true },
    { id: 'employees', label: 'Staff', icon: Users, allowed: hasModulePermission('employees', 'read') },
    {
      id: 'timesheet-matrix',
      label: 'Timesheet',
      icon: CalendarCheck,
      allowed: hasModulePermission('attendance', 'read'),
    },
    { id: 'projects', label: 'Projects', icon: FolderGit2, allowed: hasModulePermission('projects', 'read') },
  ].filter((item) => item.allowed);

  const employeeItems = [
    { id: 'employee-profile', label: 'Profile', icon: User },
    { id: 'employee-timesheet', label: 'Timesheet', icon: Clock },
    { id: 'employee-leaves', label: 'Leaves', icon: Send },
    { id: 'employee-payslip', label: 'Payslip', icon: FileText },
  ];

  const navItems = isEmployeeViewOnly ? employeeItems : adminItems;
  const primaryIds = new Set(navItems.map((i) => i.id));
  const isMoreActive = drawerOpen || !primaryIds.has(currentTab);
  const totalSlots = navItems.length + 1;
  const gridColsClass =
    totalSlots === 2
      ? 'grid-cols-2'
      : totalSlots === 3
      ? 'grid-cols-3'
      : totalSlots === 4
      ? 'grid-cols-4'
      : 'grid-cols-5';

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe no-print"
    >
      <div className={`grid ${gridColsClass} h-16 items-center px-1`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id && !drawerOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-lg px-3 py-1 transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : ''
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span
                className={`text-[10.5px] leading-tight mt-0.5 whitespace-nowrap ${
                  isActive ? 'font-bold text-slate-900' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenDrawer}
          aria-expanded={drawerOpen}
          aria-label="Open All Modules Drawer"
          className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            isMoreActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`flex items-center justify-center rounded-lg px-3 py-1 transition-colors ${
              drawerOpen ? 'bg-slate-900 text-white' : ''
            }`}
          >
            <Menu className="h-[18px] w-[18px]" />
          </div>
          <span
            className={`text-[10.5px] leading-tight mt-0.5 whitespace-nowrap ${
              isMoreActive ? 'font-bold text-slate-900' : 'font-medium'
            }`}
          >
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
