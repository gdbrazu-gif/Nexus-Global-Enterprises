export type RoleTier = 'super_admin' | 'hr_manager' | 'finance_officer' | 'project_manager' | 'employee';

export type LanguageCode = 'en' | 'ar' | 'fr' | 'es' | 'ur' | 'hi';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToSAR: number; // 1 Currency = X SAR
}

export interface CorporateLegalEntity {
  companyName: string;
  legalName: string;
  logoUrl: string;
  crNumber: string; // Commercial Registration
  vatNumber: string; // Tax / VAT ID
  email: string;
  phone: string;
  address: string;
  bankName: string;
  accountTitle: string;
  iban: string;
  swiftCode: string;
  baseCurrency: string; // 'SAR' default
}

export interface CustomPrivilege {
  id: string;
  name: string;
  description: string;
  assignedUsersCount: number;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExportPdf: boolean;
    canManageSalary: boolean;
    canManageExpense: boolean;
    canManageTimesheet: boolean;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  operatingUnit: string;
  headEmployeeId: string;
  headEmployeeName: string;
  location: string;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
  gradeLevel: string;
  minSalary: number;
  maxSalary: number;
}

export interface Employee {
  id: string; // e.g. "EMP-1041"
  fullName: string;
  email: string;
  phone: string;
  profileImage: string;
  department: string;
  operatingDepartment: string;
  designation: string;
  roleTier: RoleTier;
  nationality: string;
  iqamaNationalId: string;
  passportNumber: string;
  passportExpiry: string;
  joiningDate: string;
  status: 'active' | 'on_leave' | 'probation' | 'inactive';
  employmentType: 'Full-time' | 'Contract' | 'Remote' | 'Part-time';
  monthlyBaseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  annualBaseSalary: number; // monthlyBaseSalary * 12
  totalMonthlyPackage: number;
  managerName?: string;
  bankIban?: string;
}

export type TimesheetStatus = 'present' | 'overtime' | 'annual_leave' | 'sick_leave' | 'absent' | 'weekend' | 'holiday';

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  regularHours: number; // standard 8
  overtimeHours: number; // 0, 1, 2...
  status: TimesheetStatus;
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: 'Annual Vacation' | 'Sick Leave' | 'Emergency Leave' | 'Hajj Pilgrimage' | 'Paternity / Maternity';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: string;
  rejectionReason?: string;
}

export interface AccountingCategory {
  id: string;
  code: string;
  name: string;
  type: 'Operating Expense' | 'Payroll & Compensation' | 'Direct Project Cost' | 'Administrative' | 'Capital Asset';
  description: string;
  budgetCapSAR: number;
  status: 'active' | 'archived';
}

export interface Expense {
  id: string;
  expenseNumber: string;
  categoryId: string;
  categoryName: string;
  title: string;
  amountSAR: number; // Stored in base currency SAR
  vendor: string;
  date: string;
  projectId?: string;
  projectName?: string;
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptRef?: string;
  notes?: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  department: string;
  budgetSAR: number;
  spentSAR: number;
  startDate: string;
  endDate: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  leadName: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  assetsCount: number;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  categoryName: string;
  serialNumber: string;
  assignedToEmployeeId?: string;
  assignedToEmployeeName?: string;
  purchaseDate: string;
  costSAR: number;
  warrantyExpiry: string;
  status: 'in_use' | 'available' | 'maintenance' | 'decommissioned';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorRole: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'ROLE_SWITCH' | 'SALARY_EDIT' | 'TIMESHEET_LOG';
  entityType: 'Employee' | 'Timesheet' | 'Leave' | 'Expense' | 'Salary' | 'Category' | 'Asset' | 'Project' | 'Settings';
  details: string;
}

export type TemplateType = 'payslip' | 'offer_letter' | 'experience_cert' | 'timesheet_ledger' | 'expense_voucher' | 'asset_handover';

export interface TemplateCustomization {
  title: string;
  subtitle: string;
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  accentColor: string; // hex
  showWatermark: boolean;
  watermarkText: string;
  showLegalEntity: boolean;
  showSignatures: boolean;
  showQrStamp: boolean;
  footerNote: string;
}
