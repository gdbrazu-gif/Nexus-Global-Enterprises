import React, { useState, useEffect } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee, RoleTier, TimesheetStatus } from '../../types';
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
  List,
  LayoutGrid,
  Mail,
  User,
  CheckCircle2,
  Zap,
  Sparkles,
  Check,
  FileCheck,
  Briefcase,
  Landmark,
  HeartHandshake,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Layers,
  HelpCircle,
  Clock,
  HardHat,
  Truck,
  UserCheck,
  ArrowLeft,
  Laptop,
  CalendarCheck,
  CalendarDays,
  MapPin,
  FileSpreadsheet,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  downloadWorkforceDirectoryPDF,
  downloadEmployeeDossierPDF,
  downloadEmployeeIDBadgePDF,
  downloadEmployeeTimesheetPDF,
  downloadEmployeePayslipPDF,
} from '../../utils/pdfGenerator';

export const EmployeesDirectory: React.FC = () => {
  const {
    corporateEntity,
    employees,
    branches,
    departments,
    designations,
    projects,
    timesheetEntries,
    leaveRequests,
    assets,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateTimesheetCell,
    clearEmployeeTimesheetForMonth,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    canPerformBranchAdminAction,
    canPerformHrAction,
    hasModulePermission,
    suppliedWorkers,
    addSuppliedWorkerToEmployeeDirectory,
    addAllSuppliedWorkersToEmployeeDirectory,
    activeBranchId,
    t,
  } = useHRMS();

  const canCreateEmployee = canPerformAdminAction || canPerformBranchAdminAction || canPerformHrAction || hasModulePermission('employees', 'create');
  const canEditEmployee = canPerformAdminAction || canPerformBranchAdminAction || canPerformHrAction || hasModulePermission('employees', 'update');
  const canDeleteEmployee = canPerformAdminAction;
  const canExportEmployeePdf = canPerformAdminAction || canPerformBranchAdminAction || canPerformHrAction || hasModulePermission('employees', 'pdf');
  const headOfficeBranch = branches.find((b) => b.name.trim().toLowerCase() === 'head office');
  const headOfficeBranchId = headOfficeBranch?.id || 'HEAD_OFFICE';
  const defaultBranchForNew =
    activeBranchId !== 'all'
      ? activeBranchId
      : headOfficeBranchId;

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleTierFilter, setRoleTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Employee['status']>('all');
  const [workforceTypeFilter, setWorkforceTypeFilter] = useState<'all' | 'permanent' | 'outsourced'>('all');

  // View Mode: 'list' (List View table) or 'grid' (Grid View cards)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals state
  const [importOutsourcedModalOpen, setImportOutsourcedModalOpen] = useState(false);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [viewDossierModal, setViewDossierModal] = useState<Employee | null>(null);
  const [dossierProfileTab, setDossierProfileTab] = useState<'overview' | 'timesheet' | 'leaves' | 'payslip' | 'assets'>('overview');
  const [profileLedgerYear, setProfileLedgerYear] = useState<number>(2026);
  const [profileLedgerMonth, setProfileLedgerMonth] = useState<number>(10);
  const [profilePayslipMode, setProfilePayslipMode] = useState<'timesheet' | 'contract'>('timesheet');
  const [profileCellEditModal, setProfileCellEditModal] = useState<{
    day: number;
    dateString: string;
    dayName: string;
    isWeekend: boolean;
    regularHours: number;
    overtimeHours: number;
    status: TimesheetStatus;
    notes: string;
  } | null>(null);
  const [deletedPayrollKeys, setDeletedPayrollKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('apex_deleted_payrolls');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editFullProfileEmp, setEditFullProfileEmp] = useState<Employee | null>(null);
  const [editProfileActiveTab, setEditProfileActiveTab] = useState<'personal' | 'legal' | 'job' | 'salary' | 'emergency'>('personal');
  const [printDirectoryModalOpen, setPrintDirectoryModalOpen] = useState(false);
  const [printPageNumber, setPrintPageNumber] = useState<number>(1);
  const [printRosterViewMode, setPrintRosterViewMode] = useState<'stacked' | 'single'>('stacked');
  const [printDossierTarget, setPrintDossierTarget] = useState<Employee | null>(null);
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<Employee | null>(null);
  const [idBadgeModalEmp, setIdBadgeModalEmp] = useState<Employee | null>(null);
  const [badgeQrDataUrl, setBadgeQrDataUrl] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const PROFILE_MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handleViewEmployeeProfile = (emp: Employee) => {
    setDossierProfileTab('overview');
    try {
      const saved = localStorage.getItem('apex_deleted_payrolls');
      setDeletedPayrollKeys(saved ? JSON.parse(saved) : []);
    } catch {
      setDeletedPayrollKeys([]);
    }
    setViewDossierModal(emp);
  };

  const handleRestoreOrAddEmployeeToPayroll = (emp: Employee, year: number, month: number) => {
    const periodPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const targetKey = `${periodPrefix}_${emp.id}`;

    if (emp.status !== 'active') {
      updateEmployee(emp.id, { status: 'active' });
    }

    const updatedKeys = deletedPayrollKeys.filter((k) => k !== targetKey);
    setDeletedPayrollKeys(updatedKeys);
    try {
      localStorage.setItem('apex_deleted_payrolls', JSON.stringify(updatedKeys));
    } catch (err) {
      console.error(err);
    }

    setPdfSuccessMessage(
      `${emp.fullName} is now active and added to Employee Payroll for ${PROFILE_MONTH_NAMES[month - 1]} ${year}.`
    );
    setTimeout(() => setPdfSuccessMessage(null), 4000);
  };

  // Edit Full Profile Form State
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({
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
    joiningDate: '2025-01-01',
    status: 'active' as Employee['status'],
    employmentType: 'Full-time' as Employee['employmentType'],
    monthlyBaseSalary: 15000,
    housingAllowance: 3750,
    transportAllowance: 1200,
    otherAllowances: 500,
    managerName: '',
    bankName: 'Al Rajhi Bank',
    bankIban: 'SA44 1000 0001 2345 6789 0123',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '1992-05-18',
    bloodGroup: 'O+',
    workLocation: 'Riyadh Corporate HQ - Tower A',
    probationPeriodMonths: 3,
    noticePeriodDays: 60,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    assignedProjectId: '',
    assignedProjectName: '',
    branchId: defaultBranchForNew,
    isOutsourced: false,
    supplierName: '',
    trade: '',
    outsourcedWorkerId: '',
  });

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
    status: 'active' as Employee['status'],
    employmentType: 'Full-time' as const,
    monthlyBaseSalary: 15000,
    housingAllowance: 3750,
    transportAllowance: 1200,
    otherAllowances: 500,
    bankIban: 'SA44 1000 0001 2345 6789 0123',
    // Advanced Dossier Fields
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '1992-05-18',
    bloodGroup: 'O+',
    workLocation: defaultBranchForNew === 'HEAD_OFFICE' ? 'Head Office' : 'Riyadh Corporate HQ - Tower A',
    managerName: 'Khalid Al-Fassi',
    probationPeriodMonths: 3,
    noticePeriodDays: 60,
    emergencyContactName: '',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '',
    bankName: 'Saudi National Bank (SNB)',
    assignedProjectId: '',
    assignedProjectName: '',
    branchId: defaultBranchForNew,
  });

  const [onboardFormError, setOnboardFormError] = useState<string | null>(null);

  const DEFAULT_AVATAR_FALLBACK = '/src/assets/images/avatar_super_admin_1791900624722.jpg';

  const compressAvatarDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = () => {
        const rawResult = reader.result;
        if (typeof rawResult !== 'string') {
          reject(new Error('Unsupported image data.'));
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawResult);
        img.onload = () => {
          try {
            const maxDim = 240;
            const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
            const targetW = Math.max(1, Math.round((img.width || maxDim) * scale));
            const targetH = Math.max(1, Math.round((img.height || maxDim) * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawResult);
              return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            let out = canvas.toDataURL('image/jpeg', 0.78);
            if (out.length > 55000) {
              out = canvas.toDataURL('image/jpeg', 0.52);
            }
            resolve(out);
          } catch {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenOnboardModal = () => {
    setOnboardFormError(null);
    const defaultDept = departments[0];
    const defaultDesig = designations[0];
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      profileImage: DEFAULT_AVATAR_FALLBACK,
      department: defaultDept?.name || 'Engineering & Technology',
      operatingDepartment: defaultDept?.operatingUnit || 'Digital Cloud Platforms & Systems',
      designation: defaultDesig?.title || 'Senior Solutions Architect',
      roleTier: 'employee',
      nationality: 'Saudi Arabia',
      iqamaNationalId: '',
      passportNumber: '',
      passportExpiry: '2029-12-31',
      joiningDate: new Date().toISOString().substring(0, 10),
      status: 'active',
      employmentType: 'Full-time',
      monthlyBaseSalary: 15000,
      housingAllowance: 3750,
      transportAllowance: 1200,
      otherAllowances: 500,
      bankIban: 'SA44 1000 0001 2345 6789 0123',
      gender: 'Male',
      dateOfBirth: '1992-05-18',
      bloodGroup: 'O+',
      workLocation:
        defaultBranchForNew === 'HEAD_OFFICE'
          ? 'Head Office'
          : (() => {
              const activeBr = branches.find((b) => b.id === defaultBranchForNew);
              return activeBr ? `${activeBr.name} (${activeBr.city})` : 'Head Office';
            })(),
      managerName: employees[0]?.fullName || '',
      probationPeriodMonths: 3,
      noticePeriodDays: 60,
      emergencyContactName: '',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '',
      bankName: 'Saudi National Bank (SNB)',
      assignedProjectId: '',
      assignedProjectName: '',
      branchId: defaultBranchForNew,
    });
    setOnboardModalOpen(true);
  };

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

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAvatarDataUrl(file);
        setFormData((prev) => ({ ...prev, profileImage: compressed }));
      } catch (err) {
        console.error('Failed to process profile image:', err);
      }
    }
  };

  const branchScopedEmployees = employees.filter(
    (emp) => activeBranchId === 'all' || (emp.branchId || 'BR-RUH') === activeBranchId
  );

  const branchScopedSuppliedWorkers = suppliedWorkers.filter(
    (w) => activeBranchId === 'all' || (w.branchId || 'BR-RUH') === activeBranchId
  );

  const filteredEmployees = branchScopedEmployees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (emp.fullName || '').toLowerCase().includes(q) ||
      (emp.id || '').toLowerCase().includes(q) ||
      (emp.designation || '').toLowerCase().includes(q) ||
      (emp.iqamaNationalId || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.supplierName && emp.supplierName.toLowerCase().includes(q)) ||
      (emp.trade && emp.trade.toLowerCase().includes(q));

    const matchesDept =
      departmentFilter === 'all' || emp.department === departmentFilter;

    const matchesRole =
      roleTierFilter === 'all' || emp.roleTier === roleTierFilter;

    const matchesStatus =
      statusFilter === 'all' || emp.status === statusFilter;

    const matchesWorkforceType =
      workforceTypeFilter === 'all' ||
      (workforceTypeFilter === 'outsourced' && emp.isOutsourced) ||
      (workforceTypeFilter === 'permanent' && !emp.isOutsourced);

    return matchesSearch && matchesDept && matchesRole && matchesStatus && matchesWorkforceType;
  });

  const getStatusBadgeClasses = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'on_leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'probation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusDotClass = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      case 'on_leave':
        return 'bg-amber-500';
      case 'probation':
        return 'bg-blue-500';
      case 'inactive':
        return 'bg-slate-400';
      default:
        return 'bg-emerald-500';
    }
  };

  const getStatusLabel = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'on_leave':
        return 'On Leave';
      case 'probation':
        return 'Probation';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  const handleQuickStatusChange = (emp: Employee, newStatus: Employee['status']) => {
    updateEmployee(emp.id, { status: newStatus });
    setPdfSuccessMessage(`Updated status for ${emp.fullName} (${emp.id}) to ${getStatusLabel(newStatus)}`);
    setTimeout(() => setPdfSuccessMessage(null), 3000);
  };

  // Handlers for Edit Full Profile
  const handleOpenEditFullProfile = (emp: Employee) => {
    setEditProfileError(null);
    setEditProfileForm({
      fullName: emp.fullName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      profileImage: emp.profileImage || '/src/assets/images/avatar_super_admin_1791900624722.jpg',
      department: emp.department || 'Engineering & Technology',
      operatingDepartment: emp.operatingDepartment || emp.department || '',
      designation: emp.designation || '',
      roleTier: emp.roleTier || 'employee',
      nationality: emp.nationality || 'Saudi Arabia',
      iqamaNationalId: emp.iqamaNationalId || '',
      passportNumber: emp.passportNumber || '',
      passportExpiry: emp.passportExpiry || '',
      joiningDate: emp.joiningDate || '',
      status: emp.status || 'active',
      employmentType: emp.employmentType || 'Full-time',
      monthlyBaseSalary: emp.monthlyBaseSalary || 0,
      housingAllowance: emp.housingAllowance || 0,
      transportAllowance: emp.transportAllowance || 0,
      otherAllowances: emp.otherAllowances || 0,
      managerName: emp.managerName || '',
      bankName: emp.bankName || 'Al Rajhi Bank',
      bankIban: emp.bankIban || 'SA44 1000 0001 2345 6789 0123',
      gender: emp.gender || 'Male',
      dateOfBirth: emp.dateOfBirth || '',
      bloodGroup: emp.bloodGroup || 'O+',
      workLocation: emp.workLocation || 'Riyadh Corporate HQ - Tower A',
      probationPeriodMonths: emp.probationPeriodMonths ?? 3,
      noticePeriodDays: emp.noticePeriodDays ?? 60,
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
      emergencyContactRelationship: emp.emergencyContactRelationship || '',
      assignedProjectId: emp.assignedProjectId || '',
      assignedProjectName: emp.assignedProjectName || '',
      branchId: emp.branchId || defaultBranchForNew,
      isOutsourced: !!emp.isOutsourced,
      supplierName: emp.supplierName || '',
      trade: emp.trade || '',
      outsourcedWorkerId: emp.outsourcedWorkerId || '',
    });
    setEditProfileActiveTab('personal');
    setEditFullProfileEmp(emp);
  };

  const handleEditProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAvatarDataUrl(file);
        setEditProfileForm((prev) => ({ ...prev, profileImage: compressed }));
      } catch (err) {
        console.error('Failed to process edit profile image:', err);
      }
    }
  };

  const handleSaveFullProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullProfileEmp) return;

    if (!editProfileForm.fullName || !editProfileForm.fullName.trim()) {
      setEditProfileActiveTab('personal');
      setEditProfileError('Please enter the employee\'s Full Legal Name.');
      return;
    }

    setEditProfileError(null);

    const base = Math.max(0, Number(editProfileForm.monthlyBaseSalary) || 0);
    const housing = Math.max(0, Number(editProfileForm.housingAllowance) || 0);
    const transport = Math.max(0, Number(editProfileForm.transportAllowance) || 0);
    const other = Math.max(0, Number(editProfileForm.otherAllowances) || 0);
    const totalMonthly = base + housing + transport + other;
    const annualBase = base * 12;

    const updatedEmployeePayload: Partial<Employee> = {
      ...editProfileForm,
      fullName: editProfileForm.fullName.trim(),
      monthlyBaseSalary: base,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      totalMonthlyPackage: totalMonthly,
      annualBaseSalary: annualBase,
      probationPeriodMonths: Number(editProfileForm.probationPeriodMonths) || 0,
      noticePeriodDays: Number(editProfileForm.noticePeriodDays) || 0,
    };

    updateEmployee(editFullProfileEmp.id, updatedEmployeePayload);

    // If currently viewing dossier of this employee, update view state live
    if (viewDossierModal && viewDossierModal.id === editFullProfileEmp.id) {
      setViewDossierModal((prev) => (prev ? ({ ...prev, ...updatedEmployeePayload } as Employee) : null));
    }

    setPdfSuccessMessage(`Successfully updated full profile for ${editProfileForm.fullName.trim()} (${editFullProfileEmp.id})`);
    setTimeout(() => setPdfSuccessMessage(null), 3500);
    setEditFullProfileEmp(null);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setOnboardFormError('Full Legal Name is required.');
      return;
    }
    if (!formData.phone.trim() || !formData.iqamaNationalId.trim()) {
      setOnboardFormError('Contact Phone Number and Iqama / National ID are required.');
      return;
    }
    setOnboardFormError(null);

    const newEmpData: Omit<Employee, 'id' | 'annualBaseSalary' | 'totalMonthlyPackage'> = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      profileImage: formData.profileImage || DEFAULT_AVATAR_FALLBACK,
      department: formData.department,
      operatingDepartment: formData.operatingDepartment,
      designation: formData.designation,
      roleTier: formData.roleTier,
      nationality: formData.nationality,
      iqamaNationalId: formData.iqamaNationalId.trim(),
      passportNumber: formData.passportNumber.trim(),
      passportExpiry: formData.passportExpiry,
      joiningDate: formData.joiningDate,
      status: formData.status,
      employmentType: formData.employmentType,
      monthlyBaseSalary: Number(formData.monthlyBaseSalary) || 0,
      housingAllowance: Number(formData.housingAllowance) || 0,
      transportAllowance: Number(formData.transportAllowance) || 0,
      otherAllowances: Number(formData.otherAllowances) || 0,
      bankIban: formData.bankIban,
      managerName: formData.managerName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      bloodGroup: formData.bloodGroup,
      workLocation: formData.workLocation,
      probationPeriodMonths: Number(formData.probationPeriodMonths) || 0,
      noticePeriodDays: Number(formData.noticePeriodDays) || 0,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      bankName: formData.bankName,
      assignedProjectId: formData.assignedProjectId || undefined,
      assignedProjectName: formData.assignedProjectName || undefined,
      branchId: formData.branchId || defaultBranchForNew,
    };

    addEmployee(newEmpData);
    setOnboardModalOpen(false);
    setPdfSuccessMessage(`Successfully onboarded ${newEmpData.fullName}`);
    setTimeout(() => setPdfSuccessMessage(null), 3500);
  };

  const confirmDeleteEmployee = () => {
    if (deleteEmployeeTarget) {
      const targetId = deleteEmployeeTarget.id;
      const targetName = deleteEmployeeTarget.fullName;
      deleteEmployee(targetId);
      if (viewDossierModal && viewDossierModal.id === targetId) {
        setViewDossierModal(null);
      }
      setDeleteEmployeeTarget(null);
      setPdfSuccessMessage(`Removed ${targetName} (${targetId}) from Employee Directory.`);
      setTimeout(() => setPdfSuccessMessage(null), 3500);
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

  useEffect(() => {
    if (!idBadgeModalEmp) {
      setBadgeQrDataUrl('');
      return;
    }
    const payload = JSON.stringify({
      company: corporateEntity.companyName,
      employeeId: idBadgeModalEmp.id,
      fullName: idBadgeModalEmp.fullName,
      designation: idBadgeModalEmp.designation,
      department: idBadgeModalEmp.department,
      iqamaNationalId: idBadgeModalEmp.iqamaNationalId,
      verified: true,
    });
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 180,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setBadgeQrDataUrl).catch(console.error);
  }, [idBadgeModalEmp, corporateEntity]);

  const handleDownloadBadge = async (emp: Employee) => {
    try {
      setPdfGenerating(true);
      await downloadEmployeeIDBadgePDF(emp, corporateEntity);
      setPdfSuccessMessage(
        `Downloaded One-Sided ID Badge (54 × 85.6 mm / CR80) for ${emp.fullName}`
      );
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error generating ID Badge PDF:', err);
    } finally {
      setPdfGenerating(false);
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
      {!viewDossierModal && (
        <>
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

        <div className="flex flex-wrap items-center gap-2">
          {canExportEmployeePdf && (
            <>
              {/* Download A4 PDF Button */}
              <button
                type="button"
                onClick={handleDownloadDirectoryPDF}
                disabled={pdfGenerating}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                title="Download workforce directory roster as ISO A4 Landscape PDF"
              >
                <Download className="h-4 w-4 text-rose-600" />
                <span>{pdfGenerating ? 'Generating...' : 'Export PDF'}</span>
              </button>

              {/* Print Complete Employee Directory Roster Button */}
              <button
                type="button"
                onClick={() => setPrintDirectoryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                title="Print Employee Directory Roster"
              >
                <Printer className="h-4 w-4 text-slate-700" />
                <span>Print Roster</span>
              </button>
            </>
          )}

          {/* Outsourced Roster Modal Trigger */}
          {canCreateEmployee && (
            <button
              type="button"
              onClick={() => setImportOutsourcedModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
              title="View and import outsourced contractors from manpower suppliers into the employee directory"
            >
              <HardHat className="h-4 w-4 text-indigo-600" />
              <span>Outsourced ({branchScopedSuppliedWorkers.length})</span>
            </button>
          )}

          {canCreateEmployee && (
            <button
              type="button"
              onClick={handleOpenOnboardModal}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>New Employee</span>
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
              placeholder="Search by name, ID, Iqama, title, agency or trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-slate-400"
            />
          </div>

          {/* Workforce Type Filter (All / Direct Staff / Outsourced Contractors) */}
          <select
            value={workforceTypeFilter}
            onChange={(e) => setWorkforceTypeFilter(e.target.value as any)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none bg-white font-medium text-slate-700"
          >
            <option value="all">All Workforce ({branchScopedEmployees.length})</option>
            <option value="permanent">Direct Staff ({branchScopedEmployees.filter((e) => !e.isOutsourced).length})</option>
            <option value="outsourced">Outsourced Contractors ({branchScopedEmployees.filter((e) => e.isOutsourced).length})</option>
          </select>

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
            <option value="branch_admin">Branch Admin</option>
            <option value="hr_manager">HR Manager</option>
            <option value="finance_officer">Finance Officer</option>
            <option value="project_manager">Project Manager</option>
            <option value="employee">Employee</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none bg-white font-medium text-slate-700"
          >
            <option value="all">All Status ({branchScopedEmployees.length})</option>
            <option value="active">Active ({branchScopedEmployees.filter((e) => e.status === 'active').length})</option>
            <option value="on_leave">On Leave ({branchScopedEmployees.filter((e) => e.status === 'on_leave').length})</option>
            <option value="probation">Probation ({branchScopedEmployees.filter((e) => e.status === 'probation').length})</option>
            <option value="inactive">Inactive ({branchScopedEmployees.filter((e) => e.status === 'inactive').length})</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* List View / Grid View Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === 'list'
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
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing <span className="font-semibold text-slate-800">{filteredEmployees.length}</span> of {branchScopedEmployees.length}
          </div>
        </div>
      </div>

      {/* 1. LIST VIEW (Data Table) */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">Employee & ID</th>
                <th className="px-4 py-3">Department & Designation</th>
                <th className="px-4 py-3">Iqama / Passport</th>
                <th className="px-4 py-3">Role Tier</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Monthly Base ({baseCurrency})</th>
                <th className="px-4 py-3 text-right">Annual Base ({baseCurrency})</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="text-sm font-semibold text-slate-700">No employees match the current filters</p>
                      <p className="text-xs text-slate-500">
                        Try clearing your search or switching branch/status filters to view personnel records.
                      </p>
                      {(searchQuery || departmentFilter !== 'all' || roleTierFilter !== 'all' || statusFilter !== 'all' || workforceTypeFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setDepartmentFilter('all');
                            setRoleTierFilter('all');
                            setStatusFilter('all');
                            setWorkforceTypeFilter('all');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Employee Name, Photo & ID */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profileImage || DEFAULT_AVATAR_FALLBACK}
                        alt={emp.fullName}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR_FALLBACK;
                        }}
                        className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => handleViewEmployeeProfile(emp)}
                            className="font-semibold text-slate-900 leading-tight hover:text-blue-600 cursor-pointer"
                            title="Click to View Profile"
                          >
                            {emp.fullName}
                          </span>
                          {emp.isOutsourced && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 text-violet-700 px-1.5 py-0.2 text-[10px] font-semibold"
                              title={`Outsourced contractor supplied by ${emp.supplierName || 'Agency'}`}
                            >
                              <HardHat className="h-2.5 w-2.5 text-violet-600" />
                              Agency · {emp.supplierName || 'Contractor'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{emp.id} · {emp.nationality}</span>
                          {emp.trade && (
                            <span className="font-sans font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded px-1 text-[10px]">
                              {emp.trade}
                            </span>
                          )}
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
                      <span className="text-slate-400">ID:</span> {emp.iqamaNationalId || '-'}
                    </div>
                    <div className="text-slate-500">
                      <span className="text-slate-400">Pass:</span> {emp.passportNumber || '-'}
                    </div>
                  </td>

                  {/* Role Tier */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-medium text-xs text-slate-700 capitalize font-mono">
                      <Shield className="h-3 w-3 text-slate-400" />
                      {emp.roleTier.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {canEditEmployee ? (
                      <select
                        value={emp.status}
                        onChange={(e) => handleQuickStatusChange(emp, e.target.value as Employee['status'])}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer transition-colors ${getStatusBadgeClasses(emp.status)}`}
                        title="Change Employee Status"
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="probation">Probation</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClasses(emp.status)}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(emp.status)}`}></span>
                        {getStatusLabel(emp.status)}
                      </span>
                    )}
                  </td>

                  {/* Monthly Base Salary */}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(emp.monthlyBaseSalary)}
                  </td>

                  {/* Annual Base Salary */}
                  <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                    {formatCurrency(emp.annualBaseSalary)}
                  </td>

                  {/* Actions: Icon buttons */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleViewEmployeeProfile(emp)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                        title="View Full Profile Dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIdBadgeModalEmp(emp)}
                        className="rounded-lg p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                        title="Official ID Badge (54 × 85.6 mm)"
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>

                      {canEditEmployee && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditFullProfile(emp)}
                          className="rounded-lg p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                          title="Edit Full Profile"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      {canDeleteEmployee && (
                        <button
                          type="button"
                          onClick={() => setDeleteEmployeeTarget(emp)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. GRID VIEW (Card View) */}
      {viewMode === 'grid' && (
        filteredEmployees.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-700">No employees match the current filters</p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your search or switching branch/status filters to view personnel records.
            </p>
            {(searchQuery || departmentFilter !== 'all' || roleTierFilter !== 'all' || statusFilter !== 'all' || workforceTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('all');
                  setRoleTierFilter('all');
                  setStatusFilter('all');
                  setWorkforceTypeFilter('all');
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200 font-mono">
                    {emp.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {emp.isOutsourced && (
                      <span className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5 text-[10px] font-semibold">
                        <HardHat className="h-2.5 w-2.5 text-violet-600" />
                        <span>Outsourced</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 font-mono capitalize">
                      <Shield className="h-3 w-3 text-slate-400" />
                      {emp.roleTier.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-semibold ${getStatusBadgeClasses(emp.status)}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(emp.status)}`}></span>
                      {getStatusLabel(emp.status)}
                    </span>
                  </div>
                </div>

                {/* Profile Lockup */}
                <div className="mt-3 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={emp.profileImage || DEFAULT_AVATAR_FALLBACK}
                      alt={emp.fullName}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR_FALLBACK;
                      }}
                      className="h-12 w-12 rounded-full object-cover border-2 border-slate-200 bg-slate-100 shadow-2xs"
                    />
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusDotClass(emp.status)}`}
                      title={getStatusLabel(emp.status)}
                    ></span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      onClick={() => handleViewEmployeeProfile(emp)}
                      className="font-bold text-slate-900 text-sm truncate hover:text-blue-600 cursor-pointer"
                      title="Click to View Profile"
                    >
                      {emp.fullName}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 truncate">
                      {emp.designation}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {emp.department}
                    </p>
                    {emp.isOutsourced && (
                      <p className="text-[10.5px] font-medium text-violet-700 truncate mt-0.5">
                        Agency: {emp.supplierName || 'Contractor'}
                        {emp.trade ? ` · ${emp.trade}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="mt-3.5 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-100 font-sans">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Nationality:
                    </span>
                    <span className="font-medium text-slate-800">{emp.nationality}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone:
                    </span>
                    <span className="font-mono text-[11px] text-slate-800">{emp.phone}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Monthly Base:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(emp.monthlyBaseSalary)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleViewEmployeeProfile(emp)}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="View Profile Dossier"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIdBadgeModalEmp(emp)}
                    className="rounded-lg p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                    title="Official ID Badge (54 × 85.6 mm)"
                  >
                    <CreditCard className="h-4 w-4" />
                  </button>

                  {canEditEmployee && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditFullProfile(emp)}
                      className="rounded-lg p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                      title="Edit Full Profile"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}

                  {canDeleteEmployee && (
                    <button
                      type="button"
                      onClick={() => setDeleteEmployeeTarget(emp)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      )}
        </>
      )}

      {/* MODAL 1: Onboard New Workforce Member */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Onboard New Workforce Member
                  </h3>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    DOSSIER
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete workforce dossier, Iqama & passport compliance, and compensation matrix.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnboardModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleOnboardSubmit} noValidate className="mt-4 space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {onboardFormError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{onboardFormError}</span>
                </div>
              )}
              {/* SECTION 1: PROFILE IMAGE & IDENTIFICATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-1">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                  <span>1. Personnel Identity & Documentation</span>
                </div>

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
                          <span>Upload Photo</span>
                        </label>
                        <input
                          id="onboard-avatar-file"
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Particulars: Name, Email, Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Frilde Rahman"
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1"> Email</label>
                    <input
                      type="email"
                      
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email@Employee.com"
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500 bg-white"
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
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                </div>

                {/* Nationality, Iqama, Passport */}
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
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Passport Number</label>
                    <input
                      type="text"
                      
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      placeholder="e.g. BGD-829104"
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                </div>

                {/* Dates & Role Tier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Passport Expiry</label>
                    <input
                      type="date"
                      required
                      value={formData.passportExpiry}
                      onChange={(e) => setFormData({ ...formData, passportExpiry: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
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
                      <option value="branch_admin">Branch Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>

                {/* Bio-data particulars: Gender, Date of Birth, Blood Group */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      <option value="O+">O+ (Universal Donor)</option>
                      <option value="A+">A+</option>
                      <option value="B+">B+</option>
                      <option value="AB+">AB+</option>
                      <option value="O-">O-</option>
                      <option value="A-">A-</option>
                      <option value="B-">B-</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PLACEMENT & ORG */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-1">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>2. Department, Designation & Placement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Assigned Project <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={formData.assignedProjectId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const proj = projects.find((p) => p.id === pid);
                        setFormData({
                          ...formData,
                          assignedProjectId: pid,
                          assignedProjectName: proj ? proj.name : '',
                        });
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      <option value="">General Corporate / Central HQ (Unassigned)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code}) — {p.client}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Employment Contract Type</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      <option value="Full-time">Full-time Regular</option>
                      <option value="Contract">Fixed-term Contract</option>
                      <option value="Remote">Remote Distributed</option>
                      <option value="Part-time">Part-time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Employment Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-semibold"
                    >
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Reporting Line / Manager</label>
                    <select
                      value={formData.managerName}
                      onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      <option value="">-- Select Reporting Line / Manager --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.fullName}>
                          {emp.fullName} — {emp.designation} ({emp.id})
                        </option>
                      ))}
                      {formData.managerName &&
                        !employees.some((emp) => emp.fullName === formData.managerName) && (
                          <option value={formData.managerName}>{formData.managerName}</option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Assigned Branch</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedBranch = branches.find((b) => b.id === val);
                        setFormData({
                          ...formData,
                          branchId: val,
                          workLocation:
                            val === 'HEAD_OFFICE'
                              ? 'Head Office'
                              : selectedBranch
                              ? `${selectedBranch.name} (${selectedBranch.city})`
                              : formData.workLocation,
                        });
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    >
                      {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Work Location / Hub</label>
                    <input
                      type="text"
                      value={formData.workLocation}
                      onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                      placeholder="e.g. Riyadh Corporate HQ - Tower A"
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: COMPENSATION & BANKING */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-1">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                  <span>3. Compensation Package & Bank Account</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      Compensation Matrix (Base Currency: {baseCurrency})
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      Annual Base = Monthly × 12
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Monthly Base ({baseCurrency})</label>
                      <input
                        type="number"
                        required
                        min={100}
                        step={50}
                        value={formData.monthlyBaseSalary}
                        onChange={(e) =>
                          setFormData({ ...formData, monthlyBaseSalary: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Housing ({baseCurrency})</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={formData.housingAllowance}
                        onChange={(e) =>
                          setFormData({ ...formData, housingAllowance: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Transport ({baseCurrency})</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={formData.transportAllowance}
                        onChange={(e) =>
                          setFormData({ ...formData, transportAllowance: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Other ({baseCurrency})</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={formData.otherAllowances}
                        onChange={(e) =>
                          setFormData({ ...formData, otherAllowances: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Disbursement Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="e.g. Saudi National Bank (SNB) or Al Rajhi"
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Payroll Bank IBAN</label>
                      <input
                        type="text"
                        value={formData.bankIban}
                        onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
                        placeholder="SA44 1000 0001 2345 6789 0123"
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono">
                    <span>
                      Annual Base Salary:{' '}
                      <strong className="text-slate-900 font-bold">
                        {formatCurrency(formData.monthlyBaseSalary * 12)}
                      </strong>
                    </span>
                    <span>
                      Total Package / Mo:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {formatCurrency(
                          formData.monthlyBaseSalary +
                          formData.housingAllowance +
                          formData.transportAllowance +
                          formData.otherAllowances
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: EMERGENCY CONTACTS */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-1">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  <span>4. Emergency Next-of-Kin Contact</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName}
                        onChange={(e) =>
                          setFormData({ ...formData, emergencyContactName: e.target.value })
                        }
                        placeholder="e.g. Kamal Rahman"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Relationship</label>
                      <select
                        value={formData.emergencyContactRelationship}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContactRelationship: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Relative">Relative / Friend</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, emergencyContactPhone: e.target.value })
                        }
                        placeholder="e.g. +880 1711 998877"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t.cancel}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Onboard & Save Dossier</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: Employee's Own Profile View (Triggered from Employee List) */}
      {viewDossierModal && (() => {
        const activeEmp = employees.find((e) => e.id === viewDossierModal.id) || viewDossierModal;
        const empTimesheets = timesheetEntries
          .filter((entry) => entry.employeeId === activeEmp.id)
          .sort((a, b) => b.date.localeCompare(a.date));
        const empLeaves = leaveRequests.filter((req) => req.employeeId === activeEmp.id);
        const empAssets = assets.filter((asset) => asset.assignedToEmployeeId === activeEmp.id);

        const activeMonthName = PROFILE_MONTH_NAMES[profileLedgerMonth - 1];
        const periodPrefix = `${profileLedgerYear}-${String(profileLedgerMonth).padStart(2, '0')}`;
        const daysInMonth = new Date(profileLedgerYear, profileLedgerMonth, 0).getDate();
        const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const d = new Date(profileLedgerYear, profileLedgerMonth - 1, day);
          const dayOfWeek = d.getDay();
          const dayNameShort = d.toLocaleDateString('en-US', { weekday: 'short' });
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          const dateString = `${periodPrefix}-${String(day).padStart(2, '0')}`;
          return { day, dayNameShort, isWeekend, dateString };
        });

        const empMonthEntriesMap = new Map(
          empTimesheets
            .filter((entry) => entry.date.startsWith(periodPrefix))
            .map((entry) => [entry.date, entry])
        );

        let monthlyRegHours = 0;
        let monthlyOtHours = 0;
        let monthlyPresentDays = 0;
        let monthlyLeaves = 0;
        let monthlyAbsences = 0;
        let workingDaysCount = 0;

        daysArray.forEach((d) => {
          if (!d.isWeekend) workingDaysCount++;
          const entry = empMonthEntriesMap.get(d.dateString);
          if (entry) {
            monthlyRegHours += entry.regularHours || 0;
            monthlyOtHours += entry.overtimeHours || 0;
            if (entry.status === 'present' || entry.status === 'overtime') {
              monthlyPresentDays++;
            } else if (entry.status === 'annual_leave' || entry.status === 'sick_leave') {
              monthlyLeaves++;
            } else if (entry.status === 'absent') {
              monthlyAbsences++;
            }
          }
        });

        const monthlyTotalHours = monthlyRegHours + monthlyOtHours;
        const monthlyAttendanceRate =
          workingDaysCount > 0
            ? Math.min(100, Math.round((monthlyPresentDays / workingDaysCount) * 100))
            : 0;

        // Monthly Payroll Calculation (mirrors PayrollCompensation default: Statutory WPS 260 hrs, 1.0x OT)
        let payrollRegHours = 0;
        let payrollOtHours = 0;
        let payrollPresentDays = 0;
        let payrollLeaveDays = 0;
        let payrollAbsentDays = 0;
        empMonthEntriesMap.forEach((entry) => {
          payrollRegHours += entry.regularHours || 0;
          payrollOtHours += entry.overtimeHours || 0;
          if (entry.status === 'present' || entry.status === 'overtime') {
            payrollPresentDays++;
          } else if (entry.status === 'annual_leave' || entry.status === 'sick_leave') {
            payrollLeaveDays++;
          } else if (entry.status === 'absent') {
            payrollAbsentDays++;
          }
        });

        const expectedHours = 260; // Statutory WPS (260 hrs)
        const hourlyBaseRate = activeEmp.monthlyBaseSalary / expectedHours;
        const effectiveOvertimeMultiplier = 1.0;
        const hourlyOvertimeRate = hourlyBaseRate * effectiveOvertimeMultiplier;
        const timesheetRegularPay =
          Math.round((payrollRegHours / expectedHours) * activeEmp.monthlyBaseSalary * 100) / 100;
        const timesheetOvertimePay =
          Math.round(payrollOtHours * hourlyOvertimeRate * 100) / 100;
        const timesheetEarnedBase =
          Math.round((timesheetRegularPay + timesheetOvertimePay) * 100) / 100;
        const totalAllowances =
          activeEmp.housingAllowance + activeEmp.transportAllowance + activeEmp.otherAllowances;
        const timesheetTotalPayable =
          Math.round((timesheetEarnedBase + totalAllowances) * 100) / 100;
        const contractTotalPackage = activeEmp.totalMonthlyPackage;
        const varianceSAR =
          Math.round((timesheetTotalPayable - contractTotalPackage) * 100) / 100;

        const isIncludedInTimesheetLedger = activeEmp.status !== 'inactive';
        const isDeletedFromPayrollPeriod = deletedPayrollKeys.includes(`${periodPrefix}_${activeEmp.id}`);
        const isIncludedInEmployeePayroll = activeEmp.status === 'active' && !isDeletedFromPayrollPeriod;

        const handleDownloadProfileTimesheetPDF = () => {
          const dailyRows = daysArray.map((d) => {
            const entry = empMonthEntriesMap.get(d.dateString);
            let status = 'present';
            let reg = 0;
            let ot = 0;
            let notes = '';

            if (entry) {
              status = entry.status;
              reg = entry.regularHours;
              ot = entry.overtimeHours;
              notes = entry.notes || '';
            } else if (d.isWeekend) {
              status = 'weekend';
              reg = 0;
              ot = 0;
            }

            return {
              day: d.day,
              dateString: d.dateString,
              dayName: d.dayNameShort,
              isWeekend: d.isWeekend,
              status,
              regularHours: reg,
              overtimeHours: ot,
              notes,
            };
          });

          downloadEmployeeTimesheetPDF(
            activeEmp,
            activeMonthName,
            profileLedgerYear,
            dailyRows,
            {
              regular: monthlyRegHours,
              overtime: monthlyOtHours,
              totalHours: monthlyTotalHours,
              presentDays: monthlyPresentDays,
              leaves: monthlyLeaves,
              absences: monthlyAbsences,
            },
            corporateEntity,
            baseCurrency
          );

          setPdfSuccessMessage(
            `Downloaded Monthly Timesheet PDF for ${activeEmp.fullName} (${activeMonthName} ${profileLedgerYear}).`
          );
          setTimeout(() => setPdfSuccessMessage(null), 4000);
        };

        const handleDownloadProfilePayslipPDF = () => {
          downloadEmployeePayslipPDF(
            {
              employee: activeEmp,
              monthName: activeMonthName,
              year: profileLedgerYear,
              payslipMode: profilePayslipMode,
              timesheet: {
                expectedHours,
                regularHours: payrollRegHours,
                overtimeHours: payrollOtHours,
                totalHours: payrollRegHours + payrollOtHours,
                hourlyBaseRate,
                hourlyOvertimeRate,
                effectiveOvertimeMultiplier,
                timesheetRegularPay,
                timesheetOvertimePay,
                timesheetEarnedBase,
                totalAllowances,
                timesheetTotalPayable,
                contractTotalPackage,
                varianceSAR,
              },
              divisorMethodName: 'Statutory WPS (260 hrs)',
              isHolidayRateActive: false,
            },
            corporateEntity,
            baseCurrency
          );

          setPdfSuccessMessage(
            `Downloaded official Payroll Payslip PDF for ${activeEmp.fullName} (${activeMonthName} ${profileLedgerYear}).`
          );
          setTimeout(() => setPdfSuccessMessage(null), 4000);
        };

        const handleSaveProfileCellEdit = (e: React.FormEvent) => {
          e.preventDefault();
          if (!profileCellEditModal) return;
          if (activeEmp.status === 'inactive') {
            updateEmployee(activeEmp.id, { status: 'active' });
          }
          updateTimesheetCell(
            activeEmp.id,
            profileCellEditModal.dateString,
            Number(profileCellEditModal.regularHours),
            Number(profileCellEditModal.overtimeHours),
            profileCellEditModal.status,
            profileCellEditModal.notes
          );
          setProfileCellEditModal(null);
          setPdfSuccessMessage(
            `Updated Monthly Workforce Timesheet Ledger for ${activeEmp.fullName} on ${profileCellEditModal.dateString}.`
          );
          setTimeout(() => setPdfSuccessMessage(null), 3500);
        };

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Return & Breadcrumb Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewDossierModal(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Employee List</span>
                </button>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>Employee Directory</span>
                  <span>/</span>
                  <span className="font-semibold text-slate-900">{activeEmp.fullName}&apos;s Own Profile</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {canEditEmployee && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditFullProfile(activeEmp)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                    title="Edit Full Employee Profile & Compensation"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                    <span>Edit Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIdBadgeModalEmp(activeEmp)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                  title="Official ID Badge & QR Code (2.125 x 3.375 inches / 54 x 85.6 mm)"
                >
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ID Badge</span>
                </button>

                {canExportEmployeePdf && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPrintDossierTarget(activeEmp)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Print Profile Sheet"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadSingleDossierPDF(activeEmp)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                      title="Download Profile as PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PDF / Action Feedback Banner */}
            {pdfSuccessMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-medium text-emerald-800 shadow-xs animate-in fade-in duration-200">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{pdfSuccessMessage}</span>
              </div>
            )}

            {/* Employee's Own Profile Banner (Self-Service Dossier Card) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={activeEmp.profileImage || DEFAULT_AVATAR_FALLBACK}
                    alt={activeEmp.fullName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR_FALLBACK;
                    }}
                    className="h-16 w-16 rounded-full object-cover border-2 border-slate-200 shadow-xs"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${getStatusDotClass(activeEmp.status)}`}
                    title={getStatusLabel(activeEmp.status)}
                  ></span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900">{activeEmp.fullName}</h1>
                    <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                      Employee&apos;s Own Profile
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusBadgeClasses(activeEmp.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(activeEmp.status)}`}></span>
                      {getStatusLabel(activeEmp.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Emp ID: {activeEmp.id} · {activeEmp.designation} ({activeEmp.department})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reporting Manager: <strong className="text-slate-600">{activeEmp.managerName || 'Not Assigned'}</strong> · Joined: {activeEmp.joiningDate}
                    {activeEmp.workLocation ? ` · ${activeEmp.workLocation}` : ''}
                  </p>
                  {activeEmp.assignedProjectName && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Project: {activeEmp.assignedProjectName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-right">
                  <span className="text-slate-400 text-[10px] block uppercase">Monthly Package</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {formatCurrency(activeEmp.totalMonthlyPackage)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDossierProfileTab('payslip')}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>View &amp; Print Payslip</span>
                </button>
              </div>
            </div>

            {/* Outsourced Contractor Banner if applicable */}
            {activeEmp.isOutsourced && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 shrink-0">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-violet-900 text-xs">
                        Outsourced Contractor Personnel
                      </span>
                      <span className="rounded bg-violet-200/70 px-1.5 py-0.2 text-[10px] font-bold text-violet-800">
                        Labor Contracting
                      </span>
                    </div>
                    <p className="text-[11px] text-violet-700 mt-0.5">
                      Agency: <strong className="font-semibold">{activeEmp.supplierName || 'Contractor Agency'}</strong>
                      {activeEmp.trade ? ` · Skill / Trade: ${activeEmp.trade}` : ''}
                      {activeEmp.outsourcedWorkerId ? ` · Ref: ${activeEmp.outsourcedWorkerId}` : ''}
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-violet-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-800 shadow-2xs">
                  Contract Basis
                </span>
              </div>
            )}

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setDossierProfileTab('overview')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  dossierProfileTab === 'overview'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dossier &amp; Legal Identity
              </button>
              <button
                type="button"
                onClick={() => setDossierProfileTab('timesheet')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  dossierProfileTab === 'timesheet'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Attendance &amp; Timesheet</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-700">
                  {empTimesheets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDossierProfileTab('leaves')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  dossierProfileTab === 'leaves'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Leave Requests</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-700">
                  {empLeaves.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDossierProfileTab('payslip')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  dossierProfileTab === 'payslip'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Salary Statement &amp; Payslip
              </button>
              <button
                type="button"
                onClick={() => setDossierProfileTab('assets')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  dossierProfileTab === 'assets'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Custody Assets</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-700">
                  {empAssets.length}
                </span>
              </button>
            </div>

            {/* TAB 1: Dossier & Legal Identity */}
            {dossierProfileTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Identification & Legal Credentials */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 font-mono">
                    <h3 className="font-bold text-slate-900 text-sm font-sans border-b border-slate-100 pb-2">
                      National ID, Iqama &amp; Passport Credentials
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Iqama / National ID:</span>
                        <span className="font-bold text-slate-900">{activeEmp.iqamaNationalId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Passport Number:</span>
                        <span className="font-bold text-slate-900">{activeEmp.passportNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Passport Expiry:</span>
                        <span className="text-slate-800">{activeEmp.passportExpiry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nationality:</span>
                        <span className="text-slate-800 font-sans font-medium">{activeEmp.nationality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Official Corporate Email:</span>
                        <span className="text-slate-800">{activeEmp.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Registered Phone:</span>
                        <span className="text-slate-800">{activeEmp.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gender / Blood Group:</span>
                        <span className="text-slate-800 font-sans">
                          {activeEmp.gender || 'Male'} · {activeEmp.bloodGroup || 'O+'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date of Birth:</span>
                        <span className="text-slate-800">{activeEmp.dateOfBirth || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Banking & Compensation Particulars */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-sm font-sans">
                        Banking &amp; Compensation Particulars
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly Base Salary:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(activeEmp.monthlyBaseSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Annual Base (×12):</span>
                        <span className="font-bold text-slate-900">{formatCurrency(activeEmp.annualBaseSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Housing Allowance:</span>
                        <span>{formatCurrency(activeEmp.housingAllowance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Transport Allowance:</span>
                        <span>{formatCurrency(activeEmp.transportAllowance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Other Subsidies:</span>
                        <span>{formatCurrency(activeEmp.otherAllowances)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-emerald-800 text-xs">
                        <span>Total Monthly Package:</span>
                        <span>{formatCurrency(activeEmp.totalMonthlyPackage)}</span>
                      </div>
                      <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                        <div>
                          <span>Disbursement Bank: </span>
                          <span className="text-slate-800 font-semibold font-sans">{activeEmp.bankName || 'N/A'}</span>
                        </div>
                        <div>
                          <span>Disbursement IBAN: </span>
                          <span className="text-slate-800 font-semibold">{activeEmp.bankIban}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organizational Placement & Emergency Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                      Organizational Placement &amp; Reporting Line
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Operating Unit</span>
                        <span className="font-semibold text-slate-800">{activeEmp.operatingDepartment}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Reporting Manager</span>
                        <span className="font-semibold text-slate-900">{activeEmp.managerName || 'Not Assigned'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Employment Type</span>
                        <span className="font-semibold text-slate-800">{activeEmp.employmentType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">System Role Tier</span>
                        <span className="font-mono font-semibold text-slate-800 capitalize">
                          {activeEmp.roleTier.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Work Location / Hub</span>
                        <span className="font-medium text-slate-800">{activeEmp.workLocation || 'Central HQ'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Project</span>
                        <span className="font-semibold text-indigo-700">
                          {activeEmp.assignedProjectName || 'Central HQ (Unassigned)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <HeartHandshake className="h-4 w-4 text-rose-500" />
                      <span>Emergency Next-of-Kin Contact</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Contact Name</span>
                        <span className="font-semibold text-slate-900">
                          {activeEmp.emergencyContactName || 'Not Specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Relationship</span>
                        <span className="font-medium text-slate-800">
                          {activeEmp.emergencyContactRelationship || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Phone Number</span>
                        <span className="font-mono font-medium text-slate-900">
                          {activeEmp.emergencyContactPhone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Attendance & Timesheet -> Monthly Workforce Timesheet Ledger Integration */}
            {dossierProfileTab === 'timesheet' && (
              <div className="space-y-4">
                {/* Ledger Status & Period Controls Bar */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                          <span>Monthly Workforce Timesheet Ledger — {activeEmp.fullName}</span>
                        </h3>
                        {isIncludedInTimesheetLedger ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Active in Monthly Ledger
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <AlertCircle className="h-3 w-3" />
                            Excluded from Monthly Ledger (Status: Inactive)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Synced directly with Attendance &amp; Timesheet Monthly Workforce Timesheet Ledger ({activeMonthName} {profileLedgerYear}).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Month & Year Picker */}
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <select
                          value={profileLedgerMonth}
                          onChange={(e) => setProfileLedgerMonth(Number(e.target.value))}
                          className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                        >
                          {PROFILE_MONTH_NAMES.map((mName, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {mName}
                            </option>
                          ))}
                        </select>
                        <select
                          value={profileLedgerYear}
                          onChange={(e) => setProfileLedgerYear(Number(e.target.value))}
                          className="bg-transparent font-mono font-semibold text-slate-800 outline-none cursor-pointer"
                        >
                          <option value={2025}>2025</option>
                          <option value={2026}>2026</option>
                          <option value={2027}>2027</option>
                        </select>
                      </div>

                      {canExportEmployeePdf && (
                        <button
                          type="button"
                          onClick={handleDownloadProfileTimesheetPDF}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Timesheet PDF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Monthly Workforce Timesheet Ledger Summary Row (Mirrors Attendance & Timesheet Ledger) */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          <th className="px-3 py-2.5">Employee</th>
                          <th className="px-3 py-2.5">Department &amp; Designation</th>
                          <th className="px-3 py-2.5 text-right">Regular (h)</th>
                          <th className="px-3 py-2.5 text-right">Overtime (h)</th>
                          <th className="px-3 py-2.5 text-right">Total Hours</th>
                          <th className="px-3 py-2.5 text-center">Present</th>
                          <th className="px-3 py-2.5 text-center">Leave</th>
                          <th className="px-3 py-2.5 text-center">Absence</th>
                          <th className="px-3 py-2.5 text-center">Rate</th>
                          <th className="px-3 py-2.5 text-center">Ledger Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900">{activeEmp.fullName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{activeEmp.id}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-slate-800">{activeEmp.department}</div>
                            <div className="text-[11px] text-slate-500">{activeEmp.designation}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                            {monthlyRegHours}h
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">
                            {monthlyOtHours > 0 ? `+${monthlyOtHours}h` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {monthlyTotalHours}h
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono">
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 font-semibold border border-emerald-200">
                              {monthlyPresentDays} d
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono">
                            {monthlyLeaves > 0 ? (
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800 font-semibold border border-blue-200">
                                {monthlyLeaves} d
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono">
                            {monthlyAbsences > 0 ? (
                              <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-800 font-semibold border border-rose-200">
                                {monthlyAbsences} d
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                            {monthlyAttendanceRate}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {!isIncludedInTimesheetLedger ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                                Inactive
                              </span>
                            ) : monthlyTotalHours === 0 ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                Default 0h
                              </span>
                            ) : monthlyOtHours > 0 ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                                Overtime
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                                Logged
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Day-by-Day Monthly Timesheet Log */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-700">
                      Day-by-Day Attendance Sheet — {activeMonthName} {profileLedgerYear} ({daysInMonth} Days)
                    </span>
                    {canEditEmployee && empMonthEntriesMap.size > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearEmployeeTimesheetForMonth(activeEmp.id, profileLedgerYear, profileLedgerMonth);
                          setPdfSuccessMessage(
                            `Cleared ${activeMonthName} ${profileLedgerYear} timesheet logs for ${activeEmp.fullName}.`
                          );
                          setTimeout(() => setPdfSuccessMessage(null), 3500);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset Month Logs</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
                    <table className="w-full border-collapse text-left text-xs font-mono">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] uppercase text-slate-600 font-sans font-semibold">
                        <tr>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Weekday</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Regular (h)</th>
                          <th className="px-3 py-2 text-right">Overtime (h)</th>
                          <th className="px-3 py-2">Notes</th>
                          {canEditEmployee && (
                            <th className="px-3 py-2 text-center">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daysArray.map((d) => {
                          const entry = empMonthEntriesMap.get(d.dateString);
                          let statusText = d.isWeekend ? 'WEEKEND OFF' : 'PRESENT';
                          let regHours = 0;
                          let otHours = 0;
                          let notesText = '-';

                          if (entry) {
                            statusText = entry.status.replace('_', ' ').toUpperCase();
                            regHours = entry.regularHours;
                            otHours = entry.overtimeHours;
                            notesText = entry.notes || '-';
                          }

                          return (
                            <tr
                              key={d.day}
                              className={d.isWeekend ? 'bg-slate-50/80 text-slate-500' : 'hover:bg-slate-50/70'}
                            >
                              <td className="px-3 py-2 font-bold text-slate-800">{d.day}</td>
                              <td className="px-3 py-2 text-slate-600">{d.dateString}</td>
                              <td className="px-3 py-2 font-sans font-medium">{d.dayNameShort}</td>
                              <td className="px-3 py-2 font-sans">
                                {d.isWeekend && otHours === 0 && !entry ? (
                                  <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 font-medium">
                                    WEEKEND OFF
                                  </span>
                                ) : entry?.status === 'overtime' ? (
                                  <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                    OVERTIME
                                  </span>
                                ) : entry?.status === 'annual_leave' || entry?.status === 'sick_leave' ? (
                                  <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                    {statusText}
                                  </span>
                                ) : entry?.status === 'absent' ? (
                                  <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                                    ABSENT
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    {statusText}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums">{regHours}h</td>
                              <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-bold">
                                {otHours > 0 ? `+${otHours}h` : '-'}
                              </td>
                              <td className="px-3 py-2 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                                {notesText}
                              </td>
                              {canEditEmployee && (
                                <td className="px-3 py-2 text-center font-sans">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProfileCellEditModal({
                                        day: d.day,
                                        dateString: d.dateString,
                                        dayName: d.dayNameShort,
                                        isWeekend: d.isWeekend,
                                        regularHours: entry ? entry.regularHours : 0,
                                        overtimeHours: entry ? entry.overtimeHours : 0,
                                        status: entry ? entry.status : d.isWeekend ? 'weekend' : 'present',
                                        notes: entry?.notes || (d.isWeekend ? 'Weekend rest' : 'Standard shift'),
                                      })
                                    }
                                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                                  >
                                    {entry ? 'Edit' : 'Log'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Leave Requests */}
            {dossierProfileTab === 'leaves' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Leave &amp; Time-Off History — {activeEmp.fullName}
                </h3>
                {empLeaves.length === 0 ? (
                  <div className="text-slate-400 py-8 text-center">No leave applications on file for this employee.</div>
                ) : (
                  <div className="space-y-2">
                    {empLeaves.map((l) => (
                      <div key={l.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{l.leaveType}</span>
                          <span
                            className={`text-[11px] font-semibold uppercase ${
                              l.status === 'approved'
                                ? 'text-emerald-700'
                                : l.status === 'rejected'
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {l.startDate} to {l.endDate} ({l.totalDays} Days)
                        </div>
                        <div className="text-slate-600">{l.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Salary Statement & Payslip -> Synced with Employee Payroll */}
            {dossierProfileTab === 'payslip' && (
              <div className="space-y-4">
                {/* Employee Payroll Eligibility & Sync Toolbar */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <span>Salary Statement &amp; Employee Payroll — {activeMonthName} {profileLedgerYear}</span>
                      </h3>
                      {isIncludedInEmployeePayroll ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Included in Employee Payroll
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          <AlertCircle className="h-3 w-3" />
                          {activeEmp.status !== 'active'
                            ? `Not in Employee Payroll (Status: ${getStatusLabel(activeEmp.status)})`
                            : `Removed from ${activeMonthName} ${profileLedgerYear} Payroll`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time calculation linked to Workforce Compensation &amp; Timesheet Payroll ({expectedHours}h monthly basis).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Month & Year Picker */}
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <select
                        value={profileLedgerMonth}
                        onChange={(e) => setProfileLedgerMonth(Number(e.target.value))}
                        className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        {PROFILE_MONTH_NAMES.map((mName, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {mName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={profileLedgerYear}
                        onChange={(e) => setProfileLedgerYear(Number(e.target.value))}
                        className="bg-transparent font-mono font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>

                    {/* Payslip Calculation Mode Toggle */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setProfilePayslipMode('timesheet')}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                          profilePayslipMode === 'timesheet'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Timesheet Payroll
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfilePayslipMode('contract')}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                          profilePayslipMode === 'contract'
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fixed Contract
                      </button>
                    </div>

                    {!isIncludedInEmployeePayroll && canEditEmployee && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRestoreOrAddEmployeeToPayroll(activeEmp, profileLedgerYear, profileLedgerMonth)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Add to Employee Payroll</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Official Payslip Voucher */}
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={corporateEntity.logoUrl}
                          alt="Logo"
                          className="h-12 w-12 object-contain"
                        />
                        <div>
                          <h2 className="text-base font-bold text-slate-900">{corporateEntity.companyName}</h2>
                          <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="font-bold uppercase text-slate-900 block">EMPLOYEE PAYROLL PAYSLIP</span>
                        <span className="font-mono text-slate-700 block">
                          {activeMonthName} {profileLedgerYear}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Basis: {profilePayslipMode === 'timesheet' ? 'Timesheet Logged Hours' : 'Fixed Monthly Contract'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">EMPLOYEE NAME</span>
                        <span className="font-bold text-slate-900 font-sans text-sm">{activeEmp.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">EMPLOYEE ID / IQAMA</span>
                        <span>{activeEmp.id} / {activeEmp.iqamaNationalId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">DESIGNATION &amp; DEPT</span>
                        <span className="font-sans text-slate-800">{activeEmp.designation} ({activeEmp.department})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {profilePayslipMode === 'timesheet' ? 'TIMESHEET NET PAYABLE' : 'NET MONTHLY PACKAGE'}
                        </span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {formatCurrency(
                            profilePayslipMode === 'timesheet'
                              ? timesheetTotalPayable
                              : contractTotalPackage
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Timesheet Audit Strip when in Timesheet Payroll mode */}
                    {profilePayslipMode === 'timesheet' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 space-y-2 text-xs font-mono">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-blue-950 font-bold border-b border-blue-200/80 pb-1.5 font-sans gap-1">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            <span>Timesheet Hours Audit &amp; Rate Schedule</span>
                          </span>
                          <span className="text-[11px] font-mono text-blue-800">
                            Expected Standard: {expectedHours}h (Statutory WPS)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                          <div>
                            <span className="text-slate-500 block font-sans text-[10px]">Regular Hours:</span>
                            <strong className="text-slate-900">{payrollRegHours.toFixed(1)} hrs</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-sans text-[10px]">Overtime Hours:</span>
                            <strong className="text-amber-700">+{payrollOtHours.toFixed(1)} hrs</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-sans text-[10px]">Total Logged:</span>
                            <strong className="text-blue-900">{(payrollRegHours + payrollOtHours).toFixed(1)} hrs</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-sans text-[10px]">Hourly Base Rate:</span>
                            <strong className="text-slate-900">{hourlyBaseRate.toFixed(2)} {baseCurrency}/h</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Itemized Remuneration Table */}
                    <table className="w-full border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-700">
                          <th className="px-3 py-2 text-left">Compensation Element</th>
                          <th className="px-3 py-2 text-right">Basis</th>
                          <th className="px-3 py-2 text-right">Amount ({baseCurrency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profilePayslipMode === 'timesheet' ? (
                          <>
                            <tr>
                              <td className="px-3 py-2 font-sans font-medium text-slate-900">
                                Regular Working Hours Pay
                              </td>
                              <td className="px-3 py-2 text-right text-slate-500 text-[11px]">
                                {payrollRegHours}h @ {hourlyBaseRate.toFixed(2)}/h
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                {formatCurrency(timesheetRegularPay)}
                              </td>
                            </tr>
                            {payrollOtHours > 0 && (
                              <tr className="bg-amber-50/40">
                                <td className="px-3 py-2 font-sans font-medium text-amber-950">
                                  Overtime Remuneration
                                </td>
                                <td className="px-3 py-2 text-right text-amber-800 text-[11px]">
                                  {payrollOtHours}h @ {effectiveOvertimeMultiplier.toFixed(1)}× ({hourlyOvertimeRate.toFixed(2)}/h)
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-amber-900">
                                  +{formatCurrency(timesheetOvertimePay)}
                                </td>
                              </tr>
                            )}
                          </>
                        ) : (
                          <tr>
                            <td className="px-3 py-2 font-sans font-medium text-slate-900">Monthly Base Salary</td>
                            <td className="px-3 py-2 text-right text-slate-500 text-[11px]">Contractual</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {formatCurrency(activeEmp.monthlyBaseSalary)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3 py-2 font-sans">Housing Allowance</td>
                          <td className="px-3 py-2 text-right text-slate-500 text-[11px]">Fixed Monthly</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(activeEmp.housingAllowance)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-sans">Transport Allowance</td>
                          <td className="px-3 py-2 text-right text-slate-500 text-[11px]">Fixed Monthly</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(activeEmp.transportAllowance)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-sans">Other Allowances</td>
                          <td className="px-3 py-2 text-right text-slate-500 text-[11px]">Corporate Subsidies</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(activeEmp.otherAllowances)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-sm text-emerald-800">
                          <td colSpan={2} className="px-3 py-2.5 font-sans">
                            NET SALARY PAYABLE ({activeMonthName} {profileLedgerYear})
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {formatCurrency(
                              profilePayslipMode === 'timesheet'
                                ? timesheetTotalPayable
                                : contractTotalPackage
                            )}
                          </td>
                        </tr>
                        {profilePayslipMode === 'timesheet' && (
                          <tr className="bg-slate-50/60 text-[11px] text-slate-500">
                            <td colSpan={2} className="px-3 py-1.5 font-sans">
                              Contract Package Benchmark: {formatCurrency(contractTotalPackage)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold">
                              Variance: {varianceSAR >= 0 ? '+' : ''}
                              {formatCurrency(varianceSAR)}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>

                    <div className="flex flex-wrap justify-end gap-2 no-print">
                      {canExportEmployeePdf && (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadProfilePayslipPDF}
                            className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Payslip PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintDossierTarget(activeEmp)}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                            <span>Print Dossier</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Custody Assets */}
            {dossierProfileTab === 'assets' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Corporate Assets in Custody — {activeEmp.fullName}
                </h3>
                {empAssets.length === 0 ? (
                  <div className="text-slate-400 py-8 text-center">No assigned corporate assets currently in custody.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {empAssets.map((asset) => (
                      <div key={asset.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{asset.name}</span>
                          <span className="font-mono text-slate-500 font-bold">{asset.assetTag}</span>
                        </div>
                        <div className="text-slate-600">Category: {asset.categoryName}</div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          Serial: {asset.serialNumber} · Warranty to: {asset.warrantyExpiry}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inline Single-Day Timesheet Cell Edit Modal */}
            {profileCellEditModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
                <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Log / Adjust Day Hours
                      </h3>
                      <p className="text-xs text-slate-500">
                        {activeEmp.fullName} ({activeEmp.id}) · {profileCellEditModal.dateString} ({profileCellEditModal.dayName})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileCellEditModal(null)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProfileCellEdit} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Attendance Status</label>
                      <select
                        value={profileCellEditModal.status}
                        onChange={(e) => {
                          const st = e.target.value as TimesheetStatus;
                          setProfileCellEditModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  status: st,
                                  regularHours:
                                    st === 'weekend' || st === 'annual_leave' || st === 'sick_leave' || st === 'absent'
                                      ? 0
                                      : prev.regularHours || 8,
                                }
                              : null
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none bg-white"
                      >
                        <option value="present">Present (Standard Shift)</option>
                        <option value="overtime">Present + Overtime Hours</option>
                        <option value="annual_leave">Annual Leave</option>
                        <option value="sick_leave">Sick Leave</option>
                        <option value="absent">Unexcused Absence</option>
                        <option value="weekend">Weekend Off</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Regular Hours</label>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          step={0.5}
                          value={profileCellEditModal.regularHours}
                          onChange={(e) =>
                            setProfileCellEditModal((prev) =>
                              prev ? { ...prev, regularHours: Number(e.target.value) } : null
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Overtime Hours (+OT)</label>
                        <input
                          type="number"
                          min={0}
                          max={8}
                          step={0.5}
                          value={profileCellEditModal.overtimeHours}
                          onChange={(e) =>
                            setProfileCellEditModal((prev) =>
                              prev ? { ...prev, overtimeHours: Number(e.target.value) } : null
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Audit Notes</label>
                      <input
                        type="text"
                        value={profileCellEditModal.notes}
                        onChange={(e) =>
                          setProfileCellEditModal((prev) =>
                            prev ? { ...prev, notes: e.target.value } : null
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setProfileCellEditModal(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800"
                      >
                        Save to Monthly Ledger
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL 4: Full Printable Employee Directory Roster (A4 Landscape Multi-Page) */}
      {printDirectoryModalOpen && (() => {
        const PAGE_1_CAPACITY = 8;
        const OTHER_PAGE_CAPACITY = 10;

        const directoryPages: Employee[][] = [];
        if (filteredEmployees.length === 0) {
          directoryPages.push([]);
        } else {
          directoryPages.push(filteredEmployees.slice(0, PAGE_1_CAPACITY));
          let startIdx = PAGE_1_CAPACITY;
          while (startIdx < filteredEmployees.length) {
            directoryPages.push(filteredEmployees.slice(startIdx, startIdx + OTHER_PAGE_CAPACITY));
            startIdx += OTHER_PAGE_CAPACITY;
          }
        }
        const totalDirectoryPages = directoryPages.length;
        const currentActivePage = Math.min(Math.max(1, printPageNumber), totalDirectoryPages);

        const totalMonthlyPayroll = filteredEmployees.reduce((sum, e) => sum + e.monthlyBaseSalary, 0);
        const totalAnnualPayroll = filteredEmployees.reduce((sum, e) => sum + e.annualBaseSalary, 0);

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm overflow-hidden printable-modal-overlay">
            {/* Top Toolbar (Fixed & Interactive on Screen, Hidden during Print) */}
            <div className="no-print bg-slate-900 text-white px-4 py-3 border-b border-slate-800 shrink-0 shadow-lg z-20">
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
                {/* Document Branding & Type */}
                <div className="flex items-center gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt={corporateEntity.companyName}
                    className="h-9 w-9 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Complete Employee Directory & Workforce Roster
                      </h3>
                      <span className="rounded bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-300 font-mono">
                        ISO A4 Landscape
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {corporateEntity.companyName} · {filteredEmployees.length} Total Workforce Records · {totalDirectoryPages} A4 Sheets
                    </p>
                  </div>
                </div>

                {/* Multi-Page Viewing & Navigation Controls */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {/* View Mode Segmented Switch */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setPrintRosterViewMode('stacked')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        printRosterViewMode === 'stacked'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="View all A4 pages stacked sequentially"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Stacked View ({totalDirectoryPages} Pages)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintRosterViewMode('single')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        printRosterViewMode === 'single'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="Inspect one page at a time with page switcher"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Single Page View</span>
                    </button>
                  </div>

                  {/* Page Jump Selector & Prev / Next */}
                  <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-2 py-1 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setPrintPageNumber((p) => Math.max(1, p - 1))}
                      disabled={currentActivePage <= 1}
                      className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <select
                      value={currentActivePage}
                      onChange={(e) => setPrintPageNumber(Number(e.target.value))}
                      className="bg-slate-900 text-white font-mono text-xs rounded border border-slate-700 px-2 py-0.5 outline-none cursor-pointer"
                    >
                      {directoryPages.map((_, i) => {
                        const start = i === 0 ? 1 : PAGE_1_CAPACITY + (i - 1) * OTHER_PAGE_CAPACITY + 1;
                        const countOnSheet = directoryPages[i].length;
                        const end = start + countOnSheet - 1;
                        return (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1} of {totalDirectoryPages} {countOnSheet > 0 ? `(Rec. ${start}–${end})` : '(Empty)'}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => setPrintPageNumber((p) => Math.min(totalDirectoryPages, p + 1))}
                      disabled={currentActivePage >= totalDirectoryPages}
                      className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Download PDF, Direct Print (A4), Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadDirectoryPDF}
                    disabled={pdfGenerating}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                    title="Download ISO A4 Landscape Vector PDF"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-400" />
                    <span>{pdfGenerating ? 'Generating A4...' : 'Download A4 PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintDirectory}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
                    title="Print All Pages to Landscape"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print All Pages</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintDirectoryModalOpen(false)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Document Canvas (Renders Real ISO A4 Landscape Sheets) */}
            <div className="flex-1 overflow-y-auto bg-slate-900/40 p-4 md:p-8 space-y-8 print:p-0 print:space-y-0 print:bg-white print:overflow-visible">
              {directoryPages.map((pageEmployees, pageIndex) => {
                const isFirstPage = pageIndex === 0;
                const isLastPage = pageIndex === totalDirectoryPages - 1;
                const pageNumber = pageIndex + 1;
                const pageStartIndex = isFirstPage ? 0 : PAGE_1_CAPACITY + (pageIndex - 1) * OTHER_PAGE_CAPACITY;

                const isSheetVisibleOnScreen =
                  printRosterViewMode === 'stacked' || currentActivePage === pageNumber;

                return (
                  <div
                    key={pageIndex}
                    className={`w-full max-w-[297mm] min-h-[210mm] bg-white rounded-xl shadow-2xl p-7 md:p-9 mx-auto border border-slate-300 print:shadow-none print:m-0 print:p-0 print:border-none print:max-w-none print:w-full print:rounded-none flex flex-col justify-between ${
                      !isLastPage ? 'print-page-break' : ''
                    } ${isSheetVisibleOnScreen ? 'flex' : 'hidden print:flex'}`}
                    style={{ minHeight: '210mm' }}
                  >
                    {/* Screen Sheet Indicator Bar */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-2 mb-3 border-b border-slate-200 no-print">
                      <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        ISO A4 Landscape Sheet · Page {pageNumber} of {totalDirectoryPages}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">
                          {filteredEmployees.length === 0
                            ? '0 Records'
                            : `Displaying Records ${pageStartIndex + 1} - ${pageStartIndex + pageEmployees.length} of ${filteredEmployees.length}`}
                        </span>
                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-mono">
                          297 × 210 mm
                        </span>
                      </div>
                    </div>

                    {/* TOP SECTION: Page Header */}
                    <div>
                      {isFirstPage ? (
                        /* Page 1 Official Letterhead & KPI Summary Strip */
                        <div className="space-y-4 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-slate-900 pb-4 gap-3">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={corporateEntity.logoUrl}
                                alt={corporateEntity.companyName}
                                className="h-12 w-12 rounded-lg object-contain bg-slate-900 p-1.5 border border-slate-300 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                    Official Complete Employee Directory & Workforce Roster
                                  </h2>
                                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 font-mono">
                                    ISO A4 Landscape
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                  {corporateEntity.companyName} · CR: {corporateEntity.crNumber} · VAT: {corporateEntity.vatNumber} · Base Currency: {baseCurrency}
                                </p>
                              </div>
                            </div>

                            <div className="text-right font-mono text-xs text-slate-500">
                              <div>Document Ref: <strong className="text-slate-800">HR-DIR-{new Date().getFullYear()}-A4</strong></div>
                              <div>Certified Date: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong></div>
                            </div>
                          </div>

                          {/* Executive KPI Summary Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Workforce</span>
                              <span className="text-sm font-bold text-slate-900 font-mono">{filteredEmployees.length} Personnel</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Monthly Payroll</span>
                              <span className="text-sm font-bold text-slate-900 font-mono">
                                {formatCurrency(totalMonthlyPayroll)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Annual Payroll</span>
                              <span className="text-sm font-bold text-slate-900 font-mono">
                                {formatCurrency(totalAnnualPayroll)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roster Format</span>
                              <span className="text-sm font-bold text-indigo-700 font-mono">
                                Page {pageNumber} of {totalDirectoryPages} (A4)
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Pages 2..N Compact Running Header */
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3 text-xs">
                          <div className="flex items-center gap-2">
                            <img
                              src={corporateEntity.logoUrl}
                              alt=""
                              className="h-6 w-6 rounded object-contain bg-slate-900 p-0.5"
                            />
                            <span className="font-bold text-slate-900">{corporateEntity.companyName}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 font-medium">Workforce Directory & Ledger</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                            <span>Audit Date: {new Date().toLocaleDateString()}</span>
                            <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-700 font-bold">
                              Page {pageNumber} of {totalDirectoryPages}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Printable Workforce Table */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-white">
                              <th className="px-3 py-2">ID</th>
                              <th className="px-3 py-2">Employee Name & Placement</th>
                              <th className="px-3 py-2">Department & Operating Unit</th>
                              <th className="px-3 py-2">Designation</th>
                              <th className="px-3 py-2">Nationality</th>
                              <th className="px-3 py-2">Contact Phone</th>
                              <th className="px-3 py-2">Iqama / Passport</th>
                              <th className="px-3 py-2 text-right">Monthly Base ({baseCurrency})</th>
                              <th className="px-3 py-2 text-right">Annual Base ({baseCurrency})</th>
                              <th className="px-3 py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {pageEmployees.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                                  No employee records found matching current filters.
                                </td>
                              </tr>
                            ) : (
                              pageEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50/60">
                                  <td className="px-3 py-2 font-mono font-bold text-slate-900">{emp.id}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={emp.profileImage}
                                        alt=""
                                        className="h-6 w-6 rounded-full object-cover border border-slate-200 shrink-0"
                                      />
                                      <div>
                                        <span className="font-semibold text-slate-900 block">{emp.fullName}</span>
                                        {emp.isOutsourced ? (
                                          <span className="text-[10px] font-medium text-violet-700 font-mono block">
                                            Agency: {emp.supplierName || 'Contractor'}{emp.trade ? ` · ${emp.trade}` : ''}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 font-mono block">{emp.email}</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">
                                    <span className="font-medium text-slate-900 block">{emp.department}</span>
                                    <span className="text-[10px] text-slate-500 block">{emp.operatingDepartment}</span>
                                    {emp.assignedProjectName && (
                                      <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                        Proj: {emp.assignedProjectName}
                                      </span>
                                    )}
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
                              ))
                            )}
                          </tbody>
                          {isLastPage && (
                            <tfoot>
                              <tr className="border-t-2 border-slate-300 bg-slate-900 text-white font-mono text-xs font-bold">
                                <td className="px-3 py-2">TOTALS</td>
                                <td className="px-3 py-2 font-sans" colSpan={6}>
                                  {filteredEmployees.length} Total Workforce Records
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold">
                                  {formatCurrency(totalMonthlyPayroll)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold">
                                  {formatCurrency(totalAnnualPayroll)}
                                </td>
                                <td className="px-3 py-2 text-center text-emerald-400 font-bold">VERIFIED</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* Official Certification & Signature Blocks (Appears on Final Page) */}
                      {isLastPage && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 mt-4 border-t border-slate-200 text-xs">
                          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Prepared By</div>
                            <div className="text-[11px] text-slate-500">People Operations & Registry Officer</div>
                            <div className="pt-6 border-b border-slate-400"></div>
                            <div className="text-[10px] text-slate-400 font-mono">Signature: _______________________</div>
                          </div>

                          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Verified By</div>
                            <div className="text-[11px] text-slate-500">HR & Compliance Division Director</div>
                            <div className="pt-6 border-b border-slate-400"></div>
                            <div className="text-[10px] text-slate-400 font-mono">Signature: _______________________</div>
                          </div>

                          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Approved for Payroll</div>
                            <div className="text-[11px] text-slate-500">Chief Financial Officer (CFO)</div>
                            <div className="pt-6 border-b border-slate-400"></div>
                            <div className="text-[10px] text-slate-400 font-mono">Signature: _______________________</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official Running Sheet Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-3 mt-4 text-[11px] text-slate-500 gap-2">
                      <span>{corporateEntity.companyName} — Human Resources & Workforce Operations Division</span>
                      <span className="font-mono text-center">
                        Official System Report · ISO A4 Landscape Certified · Confidential
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        Page {pageNumber} of {totalDirectoryPages}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                  className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
                  title="Download vector PDF dossier sheet"
                >
                  <Download className="h-4 w-4 text-rose-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Sheet</span>
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
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEmployee}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs cursor-pointer"
              >
                Confirm & Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUESTED: MODAL 7: EDIT FULL PROFILE MODAL */}
      {editFullProfileEmp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto no-print animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={editProfileForm.profileImage || editFullProfileEmp.profileImage}
                  alt={editProfileForm.fullName}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover border-2 border-slate-300 shadow-2xs bg-slate-100 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Edit Full Employee Profile
                    </h3>
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-slate-800">
                      {editFullProfileEmp.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Update personal details, legal documents, organizational role, salary package, and WPS settings.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditFullProfileEmp(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Alert Banner */}
            {editProfileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span className="font-medium">{editProfileError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditProfileError(null)}
                  className="text-red-400 hover:text-red-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
              <button
                type="button"
                onClick={() => setEditProfileActiveTab('personal')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  editProfileActiveTab === 'personal'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>1. Personal & Contact</span>
              </button>

              <button
                type="button"
                onClick={() => setEditProfileActiveTab('legal')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  editProfileActiveTab === 'legal'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>2. Iqama & Documents</span>
              </button>

              <button
                type="button"
                onClick={() => setEditProfileActiveTab('job')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  editProfileActiveTab === 'job'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>3. Job & Role</span>
              </button>

              <button
                type="button"
                onClick={() => setEditProfileActiveTab('salary')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  editProfileActiveTab === 'salary'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                <span>4. Salary & WPS</span>
              </button>

              <button
                type="button"
                onClick={() => setEditProfileActiveTab('emergency')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  editProfileActiveTab === 'emergency'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>5. Emergency</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFullProfile} noValidate className="space-y-4 text-xs font-sans">
              {/* TAB 1: Personal & Contact */}
              {editProfileActiveTab === 'personal' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Full Legal Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editProfileForm.fullName}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500 bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Nationality <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editProfileForm.nationality}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, nationality: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        {NATIONALITIES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Profile Picture & Presets */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <label className="block font-semibold text-slate-800 text-[11px]">
                      Profile Photo Selection
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <img
                        src={editProfileForm.profileImage}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-xs shrink-0 bg-white"
                      />
                      <div className="flex-1 w-full space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editProfileForm.profileImage}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, profileImage: e.target.value })}
                            placeholder="Image URL or choose preset below"
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-mono outline-none bg-white"
                          />
                          <label className="shrink-0 flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                            <Upload className="h-3 w-3" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleEditProfileImageUpload}
                            />
                          </label>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Presets:</span>
                          {[
                            { name: 'Admin', url: '/src/assets/images/avatar_super_admin_1791900624722.jpg' },
                            { name: 'HR', url: '/src/assets/images/avatar_hr_director_1791900625332.jpg' },
                            { name: 'Tariq', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
                            { name: 'Sara', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
                            { name: 'Omar', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setEditProfileForm({ ...editProfileForm, profileImage: preset.url })}
                              className="text-[10px] rounded px-1.5 py-0.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Corporate Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={editProfileForm.email}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500 bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={editProfileForm.phone}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-500 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Gender, DOB, Blood Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        value={editProfileForm.gender}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, gender: e.target.value as any })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editProfileForm.dateOfBirth}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, dateOfBirth: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
                      <select
                        value={editProfileForm.bloodGroup}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, bloodGroup: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-mono"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Iqama & Documents */}
              {editProfileActiveTab === 'legal' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                      Saudi Legal & Regulatory Identification
                    </span>
                    <p className="text-[11px] text-blue-700">
                      These details are encoded onto the official ID badge QR code and synchronized with the Wage Protection System (WPS) portal.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Iqama / National ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editProfileForm.iqamaNationalId}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, iqamaNationalId: e.target.value })}
                        placeholder="10-digit Saudi ID/Iqama"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500 bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Passport Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editProfileForm.passportNumber}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, passportNumber: e.target.value })}
                        placeholder="e.g. BGD-829104"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-500 bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Passport Expiry Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editProfileForm.passportExpiry}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, passportExpiry: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Job & Role */}
              {editProfileActiveTab === 'job' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Department</label>
                      <select
                        value={editProfileForm.department}
                        onChange={(e) => {
                          const dept = e.target.value;
                          setEditProfileForm({
                            ...editProfileForm,
                            department: dept,
                            operatingDepartment: dept,
                          });
                        }}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Operating Unit</label>
                      <input
                        type="text"
                        value={editProfileForm.operatingDepartment}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, operatingDepartment: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Assigned Project</label>
                      <select
                        value={editProfileForm.assignedProjectId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const proj = projects.find((p) => p.id === pid);
                          setEditProfileForm({
                            ...editProfileForm,
                            assignedProjectId: pid,
                            assignedProjectName: proj ? proj.name : '',
                          });
                        }}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        <option value="">General Corporate / Central HQ (Unassigned)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — {p.client}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Designation</label>
                      <input
                        type="text"
                        required
                        value={editProfileForm.designation}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, designation: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">System Role Tier</label>
                      <select
                        value={editProfileForm.roleTier}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, roleTier: e.target.value as RoleTier })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-mono"
                      >
                        <option value="employee">Employee</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="finance_officer">Finance Officer</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="branch_admin">Branch Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Employment Status</label>
                      <select
                        value={editProfileForm.status}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, status: e.target.value as any })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-semibold"
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="probation">Probation</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={editProfileForm.employmentType}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, employmentType: e.target.value as any })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Remote">Remote</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Joining Date</label>
                      <input
                        type="date"
                        required
                        value={editProfileForm.joiningDate}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, joiningDate: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Assigned Branch</label>
                      <select
                        value={editProfileForm.branchId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedBranch = branches.find((b) => b.id === val);
                          setEditProfileForm({
                            ...editProfileForm,
                            branchId: val,
                            workLocation:
                              val === 'HEAD_OFFICE'
                                ? 'Head Office'
                                : selectedBranch
                                ? `${selectedBranch.name} (${selectedBranch.city})`
                                : editProfileForm.workLocation,
                          });
                        }}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Work Location</label>
                      <input
                        type="text"
                        value={editProfileForm.workLocation}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, workLocation: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Reporting Manager</label>
                      <select
                        value={editProfileForm.managerName}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, managerName: e.target.value })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      >
                        <option value="">-- Select Reporting Manager --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.fullName}>
                            {emp.fullName} — {emp.designation} ({emp.id})
                          </option>
                        ))}
                        {editProfileForm.managerName &&
                          !employees.some((emp) => emp.fullName === editProfileForm.managerName) && (
                            <option value={editProfileForm.managerName}>{editProfileForm.managerName}</option>
                          )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Probation Period (Months)</label>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={editProfileForm.probationPeriodMonths}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, probationPeriodMonths: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={editProfileForm.noticePeriodDays}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, noticePeriodDays: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Contractor / Manpower Agency section */}
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-violet-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editProfileForm.isOutsourced}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, isOutsourced: e.target.checked })}
                          className="rounded border-violet-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                        />
                        <span>Outsourced Contractor / Manpower Agency Personnel</span>
                      </label>
                      {editProfileForm.isOutsourced && (
                        <span className="rounded bg-violet-200/70 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                          Contractor Staff
                        </span>
                      )}
                    </div>

                    {editProfileForm.isOutsourced && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-violet-200/60 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-violet-900 mb-1">Contractor / Supplier Agency</label>
                          <input
                            type="text"
                            value={editProfileForm.supplierName}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, supplierName: e.target.value })}
                            placeholder="e.g. Al-Bawani Contracting"
                            className="w-full rounded-md border border-violet-200 bg-white px-2.5 py-1 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-violet-900 mb-1">Trade / Skill Category</label>
                          <input
                            type="text"
                            value={editProfileForm.trade}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, trade: e.target.value })}
                            placeholder="e.g. Master Painter, Civil Lead"
                            className="w-full rounded-md border border-violet-200 bg-white px-2.5 py-1 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-violet-900 mb-1">Agency Worker Ref ID</label>
                          <input
                            type="text"
                            value={editProfileForm.outsourcedWorkerId}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, outsourcedWorkerId: e.target.value })}
                            placeholder="e.g. MC-0842"
                            className="w-full rounded-md border border-violet-200 bg-white px-2.5 py-1 text-xs font-mono outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Salary & WPS */}
              {editProfileActiveTab === 'salary' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Monthly Base Salary ({baseCurrency}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={editProfileForm.monthlyBaseSalary}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, monthlyBaseSalary: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none focus:border-slate-500 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-medium text-slate-700">Housing Allowance</label>
                        <button
                          type="button"
                          onClick={() => setEditProfileForm({ ...editProfileForm, housingAllowance: Math.round(Number(editProfileForm.monthlyBaseSalary) * 0.25) })}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          Auto 25% ({(Number(editProfileForm.monthlyBaseSalary) * 0.25).toLocaleString()})
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={editProfileForm.housingAllowance}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, housingAllowance: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-medium text-slate-700">Transport Allowance</label>
                        <button
                          type="button"
                          onClick={() => setEditProfileForm({ ...editProfileForm, transportAllowance: Math.round(Number(editProfileForm.monthlyBaseSalary) * 0.10) })}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          Auto 10% ({(Number(editProfileForm.monthlyBaseSalary) * 0.10).toLocaleString()})
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={editProfileForm.transportAllowance}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, transportAllowance: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Other Allowances</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={editProfileForm.otherAllowances}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, otherAllowances: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Live Package Card */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-emerald-700" />
                        Total Monthly Package Breakdown
                      </span>
                      <span className="text-base font-bold text-emerald-950 font-mono">
                        {(Number(editProfileForm.monthlyBaseSalary) + Number(editProfileForm.housingAllowance) + Number(editProfileForm.transportAllowance) + Number(editProfileForm.otherAllowances)).toLocaleString()} {baseCurrency}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-emerald-800 pt-1 border-t border-emerald-200/60">
                      <div>
                        Base: <strong>{Number(editProfileForm.monthlyBaseSalary).toLocaleString()} {baseCurrency}</strong>
                      </div>
                      <div>
                        Allowances: <strong>{(Number(editProfileForm.housingAllowance) + Number(editProfileForm.transportAllowance) + Number(editProfileForm.otherAllowances)).toLocaleString()} {baseCurrency}</strong>
                      </div>
                      <div className="col-span-2 text-slate-600 font-sans text-[10.5px]">
                        Annualized Base (×12): <strong className="font-mono text-slate-800">{(Number(editProfileForm.monthlyBaseSalary) * 12).toLocaleString()} {baseCurrency}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Bank & IBAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Disbursement Bank</label>
                      <input
                        type="text"
                        value={editProfileForm.bankName}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, bankName: e.target.value })}
                        placeholder="e.g. Al Rajhi Bank, SNB"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Bank IBAN (WPS Standard)</label>
                      <input
                        type="text"
                        value={editProfileForm.bankIban}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, bankIban: e.target.value })}
                        placeholder="SA..."
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Emergency */}
              {editProfileActiveTab === 'emergency' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5 text-slate-900">
                      <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
                      Emergency Point of Contact
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Designated next of kin or emergency contact in case of workplace incident or corporate notification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={editProfileForm.emergencyContactName}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContactName: e.target.value })}
                        placeholder="Full Name"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={editProfileForm.emergencyContactRelationship}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContactRelationship: e.target.value })}
                        placeholder="e.g. Spouse, Sibling, Parent"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={editProfileForm.emergencyContactPhone}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContactPhone: e.target.value })}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-start">
                  {editProfileActiveTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabOrder: Array<'personal' | 'legal' | 'job' | 'salary' | 'emergency'> = [
                          'personal',
                          'legal',
                          'job',
                          'salary',
                          'emergency',
                        ];
                        const currentIndex = tabOrder.indexOf(editProfileActiveTab);
                        if (currentIndex > 0) setEditProfileActiveTab(tabOrder[currentIndex - 1]);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </button>
                  )}
                  {editProfileActiveTab !== 'emergency' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabOrder: Array<'personal' | 'legal' | 'job' | 'salary' | 'emergency'> = [
                          'personal',
                          'legal',
                          'job',
                          'salary',
                          'emergency',
                        ];
                        const currentIndex = tabOrder.indexOf(editProfileActiveTab);
                        if (currentIndex < tabOrder.length - 1) setEditProfileActiveTab(tabOrder[currentIndex + 1]);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span>Next Tab</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditFullProfileEmp(null)}
                    className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Full Profile</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL ID BADGE & QR CODE PREVIEW (2.125 x 3.375 INCHES / 54 x 85.6 MM) */}
      {idBadgeModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Official ID Badge (54 × 85.6 mm)</span>
              </h3>
              <button
                onClick={() => setIdBadgeModalEmp(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Visual Portrait Badge Card Preview Container formatted to exact 2.125 x 3.375 aspect ratio (1 : 1.588) */}
            <div className="flex justify-center py-2">
              <div
                style={{ width: '270px', height: '429px' }}
                className="rounded-2xl border-2 border-slate-900 bg-white shadow-xl flex flex-col justify-between overflow-hidden relative select-none"
              >
                {/* Lanyard Slot Cutout Graphic at Top Center */}
                <div className="bg-slate-900 pt-2 pb-1 flex flex-col items-center">
                  <div className="w-12 h-1.5 rounded-full bg-slate-700 border border-slate-600"></div>
                </div>

                {/* Header Navy Brand Strip */}
                <div className="bg-slate-900 px-3 pb-2.5 text-center border-b-2 border-blue-600">
                  <span className="font-extrabold text-[11px] tracking-wider uppercase block text-white truncate">
                    {corporateEntity.companyName}
                  </span>
                  <span className="text-[7.5px] text-blue-300 font-mono tracking-widest block uppercase mt-0.5">
                    Security Identification · CR80
                  </span>
                </div>

                {/* Card Main Body */}
                <div className="px-3.5 py-2 flex flex-col items-center justify-between flex-1 bg-gradient-to-b from-white via-slate-50/60 to-blue-50/30">
                  {/* Photo Frame + Dynamic Status */}
                  <div className="relative mt-0.5">
                    <img
                      src={idBadgeModalEmp.profileImage || DEFAULT_AVATAR_FALLBACK}
                      alt={idBadgeModalEmp.fullName}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR_FALLBACK;
                      }}
                      className="h-20 w-20 rounded-xl object-cover border-2 border-slate-900 shadow-md bg-slate-100"
                    />
                    <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${getStatusDotClass(idBadgeModalEmp.status)}`}></span>
                  </div>

                  {/* Employee Name, Designation, Department */}
                  <div className="text-center w-full mt-1.5 px-1">
                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                      {idBadgeModalEmp.fullName}
                    </h4>
                    <div className="text-blue-700 font-semibold text-[11px] truncate mt-0.5">
                      {idBadgeModalEmp.designation}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate">
                      {idBadgeModalEmp.department}
                    </div>
                  </div>

                  {/* Centered Employee ID Pill */}
                  <div className="my-1 rounded-full bg-slate-900 px-3 py-0.5 text-center text-[10px] font-mono font-bold text-white tracking-widest shadow-2xs">
                    ID: {idBadgeModalEmp.id}
                  </div>

                  {/* Compact Credentials Grid */}
                  <div className="w-full bg-slate-100/90 rounded-lg p-1.5 border border-slate-200 text-[9px] text-slate-700 font-mono grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <div>
                      <span className="text-slate-400 block text-[7.5px] uppercase">Iqama / ID</span>
                      <strong className="truncate block text-slate-900">{idBadgeModalEmp.iqamaNationalId || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7.5px] uppercase">Status</span>
                      <strong className={`block ${idBadgeModalEmp.status === 'active' ? 'text-emerald-700' : idBadgeModalEmp.status === 'on_leave' ? 'text-amber-700' : idBadgeModalEmp.status === 'probation' ? 'text-blue-700' : 'text-slate-600'}`}>
                        {getStatusLabel(idBadgeModalEmp.status).toUpperCase()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7.5px] uppercase">Nationality</span>
                      <span className="truncate block">{idBadgeModalEmp.nationality}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7.5px] uppercase">Joined</span>
                      <span className="truncate block">{idBadgeModalEmp.joiningDate}</span>
                    </div>
                  </div>

                  {/* Authentic Scannable QR Code */}
                  <div className="flex flex-col items-center mt-1">
                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                      {badgeQrDataUrl ? (
                        <img
                          src={badgeQrDataUrl}
                          alt="ID Verification QR"
                          className="h-20 w-20 object-contain"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                          QR CODE
                        </div>
                      )}
                    </div>
                    <span className="text-[7.5px] font-bold text-emerald-700 uppercase tracking-wider font-mono mt-0.5">
                      ● Scan QR Code to Verify
                    </span>
                  </div>
                </div>

                {/* Micro Security Footer */}
                <div className="bg-slate-900 text-white px-3 py-1 flex items-center justify-between text-[6px] font-mono tracking-wider">
                  <span className="text-emerald-400">VERIFIED PERSONNEL</span>
                  <span className="text-slate-400">CR80 PORTRAIT</span>
                </div>
              </div>
            </div>

            {/* Spec Highlights */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Physical Dimension:</span>
                <strong className="text-slate-900">2.125 × 3.375 inches (54 × 85.6 mm)</strong>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Form Standard:</span>
                <strong className="text-slate-900">ISO/IEC 7810 ID-1 CR80 Portrait Card</strong>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Verification:</span>
                <strong className="text-emerald-700">Live Scannable QR Code Embedded</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIdBadgeModalEmp(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadBadge(idBadgeModalEmp)}
                  disabled={pdfGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {pdfGenerating
                      ? 'Rendering...'
                      : 'Download ID Badge (PDF)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Import / Manage Outsourced Workers into Directory */}
      {importOutsourcedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-6 max-h-[92vh] flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Outsourced Workforce Roster & Directory Enrollment
                    </h3>
                    <p className="text-xs text-slate-500">
                      Enroll outsourced contractors from registered Manpower Suppliers into the Corporate Employee Directory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImportOutsourcedModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Stats Banner & Quick Batch Sync */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                    Total Supplied Workers
                  </span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {branchScopedSuppliedWorkers.length}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider block">
                    In Employee Directory
                  </span>
                  <span className="text-lg font-bold text-emerald-800 mt-0.5 block">
                    {branchScopedSuppliedWorkers.filter((w) => w.isAddedToDirectory || w.linkedEmployeeId).length}
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider block">
                    Pending Enrollment
                  </span>
                  <span className="text-lg font-bold text-amber-800 mt-0.5 block">
                    {branchScopedSuppliedWorkers.filter((w) => !w.isAddedToDirectory && !w.linkedEmployeeId).length}
                  </span>
                </div>
                <div className="flex items-center">
                  {canCreateEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        const count = addAllSuppliedWorkersToEmployeeDirectory();
                        if (count > 0) {
                          setPdfSuccessMessage(`Enrolled ${count} outsourced contractors into the Employee Directory.`);
                          setTimeout(() => setPdfSuccessMessage(null), 4000);
                        }
                      }}
                      disabled={branchScopedSuppliedWorkers.every((w) => w.isAddedToDirectory || w.linkedEmployeeId)}
                      className={`w-full h-full flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                        branchScopedSuppliedWorkers.some((w) => !w.isAddedToDirectory && !w.linkedEmployeeId)
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4" />
                        <span>Batch Enroll All</span>
                      </div>
                      <span className="text-[10px] opacity-80 mt-0.5">
                        {branchScopedSuppliedWorkers.filter((w) => !w.isAddedToDirectory && !w.linkedEmployeeId).length} Pending
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Workers Table */}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                      <tr>
                        <th className="px-3.5 py-2.5">Worker & Supplier Agency</th>
                        <th className="px-3.5 py-2.5">Trade / Skill</th>
                        <th className="px-3.5 py-2.5">Designation Title</th>
                        <th className="px-3.5 py-2.5">Iqama / Permit #</th>
                        <th className="px-3.5 py-2.5 text-right">Hourly Rate</th>
                        <th className="px-3.5 py-2.5 text-center">Directory Status</th>
                        <th className="px-3.5 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchScopedSuppliedWorkers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No supplied workers registered in Manpower Supplier module for the selected branch.
                          </td>
                        </tr>
                      ) : (
                        branchScopedSuppliedWorkers.map((w) => {
                          const isEnrolled = w.isAddedToDirectory || !!w.linkedEmployeeId;
                          return (
                            <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3.5 py-2.5">
                                <div className="font-bold text-slate-900">{w.fullName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {w.supplierName} · {w.id}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-blue-700">
                                  {w.trade}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-medium text-slate-800">
                                {w.designation}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-700">
                                {w.iqamaOrWorkPermit}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-900">
                                {w.hourlyRateSAR} {baseCurrency}/h
                              </td>
                              <td className="px-3.5 py-2.5 text-center">
                                {isEnrolled ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {w.linkedEmployeeId || 'Enrolled'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-medium text-amber-700">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                {isEnrolled ? (
                                  <span className="text-[11px] text-slate-400 font-medium">In Directory</span>
                                ) : canCreateEmployee ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const emp = addSuppliedWorkerToEmployeeDirectory(w.id);
                                      if (emp) {
                                        setPdfSuccessMessage(
                                          `Enrolled "${w.fullName}" into Employee Directory as ${emp.id}.`
                                        );
                                        setTimeout(() => setPdfSuccessMessage(null), 4000);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">View Only</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Outsourced workers added to the Directory can log timesheets, generate CR80 badges, and be filtered under Workforce Type.
              </span>
              <button
                type="button"
                onClick={() => setImportOutsourcedModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
