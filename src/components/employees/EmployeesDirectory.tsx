import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee, RoleTier } from '../../types';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  X,
  CreditCard,
  FileText,
  Building2,
  Calendar,
  Globe,
  DollarSign,
  Coins,
  Shield,
  Upload,
  Phone,
  Camera,
  Printer,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  downloadWorkforceDirectoryPDF,
  downloadEmployeeDossierPDF,
} from '../../utils/pdfGenerator';

export const EmployeesDirectory: React.FC = () => {
  const {
    corporateEntity,
    employees,
    departments,
    designations,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateSalary,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    canPerformHrAction,
    t,
  } = useHRMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleTierFilter, setRoleTierFilter] = useState('all');

  // Modals state
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [viewDossierModal, setViewDossierModal] = useState<Employee | null>(null);
  const [editSalaryModal, setEditSalaryModal] = useState<Employee | null>(null);
  const [printDirectoryModalOpen, setPrintDirectoryModalOpen] = useState(false);
  const [printDossierTarget, setPrintDossierTarget] = useState<Employee | null>(null);
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<Employee | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Salary editing form state
  const [newMonthlyBase, setNewMonthlyBase] = useState<number>(0);
  const [newHousing, setNewHousing] = useState<number>(0);
  const [newTransport, setNewTransport] = useState<number>(0);
  const [newOther, setNewOther] = useState<number>(0);
  const [salaryEditReason, setSalaryEditReason] = useState<string>('');

  // Onboard Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    profileImage: '/src/assets/images/avatar_super_admin_1791900624722.jpg',
    department: 'Engineering & Technology',
    operatingDepartment: 'Digital Cloud Platforms & Systems',
    designation: 'Senior Solutions Architect',
    roleTier: 'employee' as RoleTier,
    nationality: 'Saudi Arabia',
    iqamaNationalId: '',
    passportNumber: '',
    passportExpiry: '2029-12-31',
    joiningDate: new Date().toISOString().substring(0, 10),
    status: 'active' as const,
    employmentType: 'Full-time' as const,
    monthlyBaseSalary: 15000,
    housingAllowance: 3750,
    transportAllowance: 1200,
    otherAllowances: 500,
    bankIban: 'SA44 1000 0001 2345 6789 0123',
  });

  const NATIONALITIES = [
    'Bangladesh',
    'Saudi Arabia',
    'United Arab Emirates',
    'Jordan',
    'Egypt',
    'Pakistan',
    'India',
    'Philippines',
    'United Kingdom',
    'United States',
    'Lebanon',
    'Tunisia',
    'Morocco',
    'Canada',
    'Germany',
  ];

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, profileImage: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.iqamaNationalId.includes(searchQuery);

    const matchesDept =
      departmentFilter === 'all' || emp.department === departmentFilter;

    const matchesRole =
      roleTierFilter === 'all' || emp.roleTier === roleTierFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  const handleOpenSalaryEdit = (emp: Employee) => {
    setEditSalaryModal(emp);
    setNewMonthlyBase(emp.monthlyBaseSalary);
    setNewHousing(emp.housingAllowance);
    setNewTransport(emp.transportAllowance);
    setNewOther(emp.otherAllowances);
    setSalaryEditReason('Annual performance merit increment and market adjustment');
  };

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSalaryModal) return;
    updateSalary(
      editSalaryModal.id,
      Number(newMonthlyBase),
      Number(newHousing),
      Number(newTransport),
      Number(newOther),
      salaryEditReason
    );
    setEditSalaryModal(null);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee(formData);
    setOnboardModalOpen(false);
  };

  const handleQuickFillFrilde = () => {
    setFormData({
      fullName: 'Frilde Rahman',
      email: 'frilde.rahman@nexusglobal.corp',
      phone: '+880 1711 234567',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      department: 'Engineering & Technology',
      operatingDepartment: 'Digital Cloud Platforms & Systems',
      designation: 'Senior Solutions Architect',
      roleTier: 'employee' as RoleTier,
      nationality: 'Bangladesh',
      iqamaNationalId: '2491028475',
      passportNumber: 'BGD-829104',
      passportExpiry: '2030-04-15',
      joiningDate: new Date().toISOString().substring(0, 10),
      status: 'active' as const,
      employmentType: 'Full-time' as const,
      monthlyBaseSalary: 17500,
      housingAllowance: 4375,
      transportAllowance: 1500,
      otherAllowances: 600,
      bankIban: 'SA88 9000 0009 1827 3645 1029',
    });
  };

  const confirmDeleteEmployee = () => {
    if (deleteEmployeeTarget) {
      deleteEmployee(deleteEmployeeTarget.id);
      setDeleteEmployeeTarget(null);
    }
  };

  const handleDownloadDirectoryPDF = () => {
    try {
      setPdfGenerating(true);
      downloadWorkforceDirectoryPDF(filteredEmployees, corporateEntity, baseCurrency, {
        department: departmentFilter,
        roleTier: roleTierFilter,
        search: searchQuery,
      });
      setPdfSuccessMessage(`Downloaded vector PDF directory (${filteredEmployees.length} employees)`);
      setTimeout(() => setPdfSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Error generating Directory PDF:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadSingleDossierPDF = (emp: Employee) => {
    try {
      downloadEmployeeDossierPDF(emp, corporateEntity, baseCurrency);
      setPdfSuccessMessage(`Downloaded official PDF dossier for ${emp.fullName} (${emp.id})`);
      setTimeout(() => setPdfSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Error generating Dossier PDF:', err);
    }
  };

  const handlePrintDirectory = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct print interrupted or blocked by iframe, downloading PDF:', err);
      handleDownloadDirectoryPDF();
    }
  };

  const handlePrintDossier = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct print interrupted or blocked by iframe, downloading PDF:', err);
      if (printDossierTarget) {
        handleDownloadSingleDossierPDF(printDossierTarget);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Onboarding Trigger */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.navEmployees}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active workforce dossier, Iqama/Passport credentials, and salary governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF Button */}
          <button
            onClick={handleDownloadDirectoryPDF}
            disabled={pdfGenerating}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
            title="Download workforce directory roster as high-resolution PDF"
          >
            <Download className="h-4 w-4 text-rose-600" />
            <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          {/* Print Directory Button */}
          <button
            onClick={() => setPrintDirectoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="Print Complete Employee Directory Roster"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print Directory</span>
          </button>

          {canPerformHrAction && (
            <button
              onClick={() => setOnboardModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Onboard New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Success Feedback Banner */}
      {pdfSuccessMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-medium text-emerald-800 shadow-xs animate-in fade-in duration-200">
          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, Iqama or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            value={roleTierFilter}
            onChange={(e) => setRoleTierFilter(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none bg-white font-mono"
          >
            <option value="all">All Role Tiers</option>
            <option value="super_admin">Super Admin</option>
            <option value="hr_manager">HR Manager</option>
            <option value="finance_officer">Finance Officer</option>
            <option value="project_manager">Project Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filteredEmployees.length}</span> of {employees.length} personnel
        </div>
      </div>

      {/* Employees Table Grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <th className="px-4 py-3">Employee & ID</th>
              <th className="px-4 py-3">Department & Designation</th>
              <th className="px-4 py-3">Iqama / Passport</th>
              <th className="px-4 py-3">Role Tier</th>
              <th className="px-4 py-3 text-right">Monthly Base ({baseCurrency})</th>
              <th className="px-4 py-3 text-right">Annual Base ({baseCurrency})</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Employee Name, Photo & ID */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.profileImage}
                      alt={emp.fullName}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 leading-tight">
                        {emp.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {emp.id} · {emp.nationality}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Department & Designation */}
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{emp.designation}</div>
                  <div className="text-[11px] text-slate-500">{emp.department}</div>
                </td>

                {/* Iqama / National ID & Passport */}
                <td className="px-4 py-3 font-mono text-[11px]">
                  <div className="text-slate-800">
                    <span className="text-slate-400">ID:</span> {emp.iqamaNationalId}
                  </div>
                  <div className="text-slate-500">
                    <span className="text-slate-400">Pass:</span> {emp.passportNumber}
                  </div>
                </td>

                {/* Role Tier */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 font-medium text-xs text-slate-700 capitalize font-mono">
                    <Shield className="h-3 w-3 text-slate-400" />
                    {emp.roleTier.replace('_', ' ')}
                  </span>
                </td>

                {/* Monthly Base Salary (with Auto Currency recalculation) */}
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(emp.monthlyBaseSalary)}
                </td>

                {/* Annual Base Salary (monthly * 12) */}
                <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                  {formatCurrency(emp.annualBaseSalary)}
                </td>

                {/* Actions: View Dossier, Edit Salary, Delete */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setViewDossierModal(emp)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="View Full Dossier"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setPrintDossierTarget(emp)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="Print Employee Dossier Sheet"
                    >
                      <Printer className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDownloadSingleDossierPDF(emp)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
                      title="Download Employee Dossier (PDF)"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {canPerformAdminAction && (
                      <button
                        onClick={() => handleOpenSalaryEdit(emp)}
                        className="rounded p-1 text-amber-600 hover:bg-amber-50"
                        title="Edit Salary Structure"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}

                    {canPerformAdminAction && (
                      <button
                        onClick={() => setDeleteEmployeeTarget(emp)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                        title="Delete Employee"
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

      {/* MODAL 1: Onboard New Employee (Iqama, Passport, Nationality, Salary, Department, Role) */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Onboard New Workforce Member
                </h3>
                <p className="text-xs text-slate-500">
                  Enter legal dossier, Iqama, passport, salary compensation package and role tier.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickFillFrilde}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Auto-fill sample data for Frilde (Bangladesh phone number, photo, and nationality)"
                >
                  <span>⚡ Quick-Fill Frilde (Bangladesh)</span>
                </button>
                <button
                  onClick={() => setOnboardModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleOnboardSubmit} className="mt-4 space-y-4 text-xs">
              {/* Profile Image & Avatar Upload Section */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <label className="block font-medium text-slate-800">
                  Profile Image & Personnel Photo
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative group shrink-0">
                    <img
                      src={formData.profileImage}
                      alt="Avatar preview"
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-full object-cover border-2 border-slate-300 bg-white shadow-xs"
                    />
                    <label
                      htmlFor="onboard-avatar-file"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                      title="Upload custom photo"
                    >
                      <Camera className="h-5 w-5" />
                    </label>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="onboard-avatar-file"
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        <span>Upload Photo File</span>
                      </label>
                      <input
                        id="onboard-avatar-file"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                      <span className="text-[11px] text-slate-400">or enter image URL below</span>
                    </div>

                    <input
                      type="text"
                      value={formData.profileImage}
                      onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                      placeholder="Paste image URL (https://...)"
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Particulars: Name, Email, Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Mohammad Rahim"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@nexusglobal.corp"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-500" />
                    <span>Contact Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +880 1711 234567"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nationality</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Iqama / National ID</label>
                  <input
                    type="text"
                    required
                    value={formData.iqamaNationalId}
                    onChange={(e) => setFormData({ ...formData, iqamaNationalId: e.target.value })}
                    placeholder="10-digit Saudi ID/Iqama"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    required
                    value={formData.passportNumber}
                    onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                    placeholder="e.g. KSA-994102"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Passport Expiry</label>
                  <input
                    type="date"
                    required
                    value={formData.passportExpiry}
                    onChange={(e) => setFormData({ ...formData, passportExpiry: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">System Role Tier</label>
                  <select
                    value={formData.roleTier}
                    onChange={(e) => setFormData({ ...formData, roleTier: e.target.value as RoleTier })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-mono"
                  >
                    <option value="employee">Employee</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="finance_officer">Finance Officer</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const dept = departments.find((d) => d.name === e.target.value);
                      setFormData({
                        ...formData,
                        department: e.target.value,
                        operatingDepartment: dept?.operatingUnit || formData.operatingDepartment,
                      });
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Designation & Job Title</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {designations.map((des) => (
                      <option key={des.id} value={des.title}>
                        {des.title} ({des.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compensation Breakdown in SAR */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-600" />
                    Compensation & Allowances (Base Currency: SAR)
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Annual Base = Monthly × 12
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Monthly Base (SAR)</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={formData.monthlyBaseSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, monthlyBaseSalary: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Housing (SAR)</label>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      value={formData.housingAllowance}
                      onChange={(e) =>
                        setFormData({ ...formData, housingAllowance: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Transport (SAR)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={formData.transportAllowance}
                      onChange={(e) =>
                        setFormData({ ...formData, transportAllowance: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Other (SAR)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={formData.otherAllowances}
                      onChange={(e) =>
                        setFormData({ ...formData, otherAllowances: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono">
                  <span>
                    Annual Base Salary:{' '}
                    <strong className="text-slate-900 font-bold">
                      {(formData.monthlyBaseSalary * 12).toLocaleString()} SAR
                    </strong>
                  </span>
                  <span>
                    Total Package / Mo:{' '}
                    <strong className="text-emerald-700 font-bold">
                      {(
                        formData.monthlyBaseSalary +
                        formData.housingAllowance +
                        formData.transportAllowance +
                        formData.otherAllowances
                      ).toLocaleString()}{' '}
                      SAR
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
                >
                  Onboard & Save Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Full Employee Dossier */}
      {viewDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={viewDossierModal.profileImage}
                  alt={viewDossierModal.fullName}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full object-cover border-2 border-slate-200"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewDossierModal.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {viewDossierModal.id} · {viewDossierModal.designation}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {viewDossierModal.department} ({viewDossierModal.operatingDepartment})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDossierModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block">Iqama / National ID</span>
                  <span className="font-semibold text-slate-900">
                    {viewDossierModal.iqamaNationalId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Passport No.</span>
                  <span className="font-semibold text-slate-900">
                    {viewDossierModal.passportNumber} (exp: {viewDossierModal.passportExpiry})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Nationality</span>
                  <span className="text-slate-900 font-sans font-medium">
                    {viewDossierModal.nationality}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Joining Date</span>
                  <span className="text-slate-900">{viewDossierModal.joiningDate}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Compensation Package Breakdown ({baseCurrency})
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Monthly Base:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(viewDossierModal.monthlyBaseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Annual Base:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(viewDossierModal.annualBaseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Housing Allowance:</span>
                    <span>{formatCurrency(viewDossierModal.housingAllowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transport Allowance:</span>
                    <span>{formatCurrency(viewDossierModal.transportAllowance)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-mono font-bold text-xs">
                  <span>Total Monthly Remuneration:</span>
                  <span className="text-emerald-700">
                    {formatCurrency(viewDossierModal.totalMonthlyPackage)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] font-mono text-slate-600">
                <span className="text-slate-400 block">Corporate Payroll IBAN</span>
                <span className="text-slate-800 font-semibold">{viewDossierModal.bankIban}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewDossierModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Salary Structure (with Audit Trail Logging) */}
      {editSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Compensation & Base Salary
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editSalaryModal.fullName} ({editSalaryModal.id})
                </p>
              </div>
              <button
                onClick={() => setEditSalaryModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  New Monthly Base Salary (SAR)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={newMonthlyBase}
                  onChange={(e) => setNewMonthlyBase(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  New Annual Base = {(newMonthlyBase * 12).toLocaleString()} SAR
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Housing</label>
                  <input
                    type="number"
                    min={0}
                    step={250}
                    value={newHousing}
                    onChange={(e) => setNewHousing(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Transport</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={newTransport}
                    onChange={(e) => setNewTransport(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Other</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={newOther}
                    onChange={(e) => setNewOther(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Reason for Salary Adjustment (Audit Log Entry)
                </label>
                <textarea
                  required
                  rows={2}
                  value={salaryEditReason}
                  onChange={(e) => setSalaryEditReason(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditSalaryModal(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save & Log to Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Full Printable Employee Directory Roster */}
      {printDirectoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto printable-modal-overlay">
          <div id="printable-directory-document" className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 my-8 printable-modal-content">
            {/* Modal Header & Print Trigger */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={corporateEntity.logoUrl}
                  alt={corporateEntity.companyName}
                  className="h-10 w-10 rounded-lg object-contain bg-slate-900 p-1.5 border border-slate-300"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Official Employee Directory & Workforce Roster
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {corporateEntity.companyName} · CR: {corporateEntity.crNumber} · Base Currency: {baseCurrency}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={handleDownloadDirectoryPDF}
                  disabled={pdfGenerating}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
                  title="Download vector PDF"
                >
                  <Download className="h-4 w-4 text-rose-600" />
                  <span>{pdfGenerating ? 'Generating...' : 'Download PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintDirectory}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
                  title="Print official document"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDirectoryModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Meta & Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Personnel</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{filteredEmployees.length} Members</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Monthly Payroll</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatCurrency(filteredEmployees.reduce((sum, e) => sum + e.monthlyBaseSalary, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Annual Payroll</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatCurrency(filteredEmployees.reduce((sum, e) => sum + e.annualBaseSalary, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Generated Date</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Printable Workforce Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Employee Name</th>
                    <th className="px-3 py-2.5">Department & Operating Unit</th>
                    <th className="px-3 py-2.5">Designation</th>
                    <th className="px-3 py-2.5">Nationality</th>
                    <th className="px-3 py-2.5">Contact Phone</th>
                    <th className="px-3 py-2.5">Iqama / Passport</th>
                    <th className="px-3 py-2.5 text-right">Monthly Base ({baseCurrency})</th>
                    <th className="px-3 py-2.5 text-right">Annual Base ({baseCurrency})</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900">{emp.id}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={emp.profileImage}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{emp.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <span className="font-medium text-slate-900 block">{emp.department}</span>
                        <span className="text-[10px] text-slate-500">{emp.operatingDepartment}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-medium">{emp.designation}</td>
                      <td className="px-3 py-2 text-slate-700">{emp.nationality}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{emp.phone}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        <div>ID: {emp.iqamaNationalId}</div>
                        <div className="text-[10px] text-slate-400">Pass: {emp.passportNumber}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(emp.monthlyBaseSalary)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {formatCurrency(emp.annualBaseSalary)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Endorsement Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
              <span>{corporateEntity.companyName} — Human Resources & Workforce Operations Division</span>
              <span className="font-mono">Official System Report · Confidential</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Printable Single Employee Dossier Sheet */}
      {printDossierTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto printable-modal-overlay">
          <div id="printable-dossier-document" className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 my-8 printable-modal-content">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={corporateEntity.logoUrl}
                  alt={corporateEntity.companyName}
                  className="h-10 w-10 rounded-lg object-contain bg-slate-900 p-1.5 border border-slate-300"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Official Personnel Dossier Sheet
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {corporateEntity.companyName} · Employee ID: {printDossierTarget.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleDossierPDF(printDossierTarget)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
                  title="Download vector PDF dossier sheet"
                >
                  <Download className="h-4 w-4 text-rose-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDossierTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Profile Overview */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={printDossierTarget.profileImage}
                alt={printDossierTarget.fullName}
                className="h-20 w-20 rounded-xl object-cover border-2 border-white shadow-xs shrink-0"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900">{printDossierTarget.fullName}</h4>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    {printDossierTarget.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700">{printDossierTarget.designation}</p>
                <p className="text-[11px] text-slate-500">
                  {printDossierTarget.department} · {printDossierTarget.operatingDepartment}
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-1">
                  System Role Tier: <strong className="text-slate-800">{printDossierTarget.roleTier}</strong> · Joined: {printDossierTarget.joiningDate}
                </div>
              </div>
            </div>

            {/* Legal Identification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nationality</span>
                <span className="font-semibold text-slate-800">{printDossierTarget.nationality}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Contact Phone Number</span>
                <span className="font-mono font-semibold text-slate-800">{printDossierTarget.phone}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Corporate Email</span>
                <span className="font-mono text-slate-700 truncate block">{printDossierTarget.email}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Iqama / National ID</span>
                <span className="font-mono font-semibold text-slate-800">{printDossierTarget.iqamaNationalId}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Passport Number</span>
                <span className="font-mono font-semibold text-slate-800">{printDossierTarget.passportNumber}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Passport Expiry</span>
                <span className="font-mono text-slate-700">{printDossierTarget.passportExpiry}</span>
              </div>
            </div>

            {/* Compensation Package (SAR) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-900 border-b border-slate-200 pb-2">
                <span>Compensation Structure (Base Currency: {baseCurrency})</span>
                <span className="font-mono text-[11px] text-slate-500">Official Package Ledger</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Monthly Base</span>
                  <span className="font-bold text-slate-900">{formatCurrency(printDossierTarget.monthlyBaseSalary)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Housing Allowance</span>
                  <span className="font-medium text-slate-700">{formatCurrency(printDossierTarget.housingAllowance)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Transport Allowance</span>
                  <span className="font-medium text-slate-700">{formatCurrency(printDossierTarget.transportAllowance)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Other Allowance</span>
                  <span className="font-medium text-slate-700">{formatCurrency(printDossierTarget.otherAllowances)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-mono text-xs">
                <span>Annual Base Salary (Monthly × 12):</span>
                <strong className="text-slate-900 font-bold">{formatCurrency(printDossierTarget.annualBaseSalary)}</strong>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Bank IBAN: <span className="text-slate-800 font-medium">{printDossierTarget.bankIban}</span>
              </div>
            </div>

            {/* Endorsement Blocks */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
              <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Employee Signature</span>
                <div className="h-8 border-b border-slate-200"></div>
                <span className="text-[10px] text-slate-500">{printDossierTarget.fullName}</span>
              </div>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">HR & Corporate Legal Seal</span>
                <div className="h-8 border-b border-slate-200"></div>
                <span className="text-[10px] text-slate-500">{corporateEntity.legalName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: In-App Delete Employee Confirmation */}
      {deleteEmployeeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Employee: {deleteEmployeeTarget.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {deleteEmployeeTarget.id} · {deleteEmployeeTarget.designation}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <div className="font-semibold">Compliance Warning</div>
              <p>
                Are you sure you want to permanently remove <strong>{deleteEmployeeTarget.fullName}</strong> from the active workforce directory? This action will remove their payroll record and be recorded in the governance audit trail.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteEmployeeTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEmployee}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Confirm & Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
