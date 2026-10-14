import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { SUPPORTED_CURRENCIES } from '../../data/initialData';
import { RoleTier, LanguageCode } from '../../types';
import {
  ShieldCheck,
  Globe,
  Share2,
  FileSpreadsheet,
  Coins,
  Menu,
  ChevronDown,
  UserCheck,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onMobileMenuToggle }) => {
  const {
    corporateEntity,
    baseCurrency,
    setBaseCurrency,
    currentRole,
    switchRole,
    language,
    setLanguage,
    t,
    setShareAccessModalOpen,
    setAuditModalOpen,
    isEmployeeViewOnly,
    currentEmployeeUser,
  } = useHRMS();

  const roleNames: Record<RoleTier, string> = {
    super_admin: t.roleSuperAdmin,
    hr_manager: t.roleHrManager,
    finance_officer: t.roleFinanceOfficer,
    project_manager: t.roleProjectManager,
    employee: t.roleEmployee,
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur no-print">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs md:text-sm">
          <span className="font-semibold text-slate-900 tracking-tight hidden sm:inline">
            {corporateEntity.companyName}
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-medium text-slate-600 capitalize truncate max-w-[140px] md:max-w-none">
            {currentTab.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Right: Actions, Currency, Language, Role Switcher */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Operating Currency Selector with SAR Icon */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <Coins className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden sm:inline font-mono">SAR</span>
          </span>
          <span className="text-slate-300">|</span>
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
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:border-slate-300">
          <Globe className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="cursor-pointer bg-transparent text-xs font-medium outline-none"
          >
            <option value="en">EN</option>
            <option value="ar">العربية (AR)</option>
            <option value="ur">اردو (UR)</option>
            <option value="hi">हिन्दी (HI)</option>
            <option value="fr">FR</option>
            <option value="es">ES</option>
          </select>
        </div>

        {/* Role Persona Switcher */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs font-medium text-slate-800">
            <UserCheck className="h-3.5 w-3.5 text-blue-700" />
            <span className="hidden md:inline text-slate-500">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => switchRole(e.target.value as RoleTier)}
              className="cursor-pointer bg-transparent font-semibold text-slate-900 outline-none"
              title="Switch Operational Persona (Restricted view for standard employees)"
            >
              <option value="super_admin">Super Admin</option>
              <option value="hr_manager">HR Manager</option>
              <option value="finance_officer">Finance Officer</option>
              <option value="project_manager">Project Manager</option>
              <option value="employee">Standard Employee</option>
            </select>
          </div>
        </div>

        {/* Share Access Link Button */}
        <button
          onClick={() => setShareAccessModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          title="Share user portal access link via email"
        >
          <Share2 className="h-3.5 w-3.5 text-slate-600" />
          <span className="hidden lg:inline">{t.shareAccess}</span>
        </button>

        {/* Compliance Audit Trail Modal Trigger */}
        <button
          onClick={() => setAuditModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          title="View Live Governance & Audit Trail"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="hidden xl:inline">Audit Trail</span>
        </button>

        {/* Active Profile Avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
          <img
            src={
              isEmployeeViewOnly
                ? currentEmployeeUser.profileImage
                : corporateEntity.logoUrl
            }
            alt="Profile Avatar"
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full border border-slate-200 object-cover bg-slate-100"
          />
        </div>
      </div>
    </header>
  );
};
