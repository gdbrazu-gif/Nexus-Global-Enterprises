export type RoleTier = 'super_admin' | 'branch_admin' | 'hr_manager' | 'finance_officer' | 'project_manager' | 'employee';

export type LanguageCode =
  | 'en'
  | 'ar'
  | 'ur'
  | 'hi'
  | 'bn'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'tr'
  | 'fa'
  | 'id'
  | 'ms'
  | 'tl'
  | 'vi'
  | 'th'
  | 'nl'
  | 'pl'
  | 'sw'
  | 'el'
  | 'cs'
  | 'ro'
  | 'hu'
  | 'sv'
  | 'uk'
  | 'he';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToSAR: number; // 1 Currency = X SAR
}

export interface Branch {
  id: string; // e.g. "BR-RUH"
  code: string; // e.g. "RUH-HQ"
  name: string;
  city: string;
  region: string;
  country: string;
  address: string;
  phone: string;
  email?: string;
  managerName: string;
  isHeadquarters: boolean;
  status: 'active' | 'inactive' | 'opening_soon';
  createdAt?: string;
  updatedAt?: string;
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface WorkspaceUserAccount {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  role: RoleTier;
  branchId: string; // 'all' or specific Branch.id
  department?: string;
  designation?: string;
  status: 'active' | 'invited' | 'suspended';
  lastDeviceType?: 'Desktop' | 'Tablet' | 'Mobile';
  lastDeviceLabel?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

export interface UserInvite {
  id: string; // normalized lowercase email
  email: string;
  displayName: string;
  role: RoleTier;
  branchId: string;
  department?: string;
  designation?: string;
  status: 'pending' | 'claimed';
  hasAccessPasscode?: boolean;
  accessPasscodeHash?: string;
  invitedByUid: string;
  createdAt?: string;
}

export interface DeviceSession {
  id: string;
  uid: string;
  userName: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  platform?: string;
  browser?: string;
  branchId: string;
  lastSeenAt: string;
  createdAt?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: RoleTier;
  avatar: string;
  department: string;
  designation: string;
  lastLogin: string;
  branchId?: string;
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
  branchId?: string;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
  gradeLevel: string;
  minSalary: number;
  maxSalary: number;
  branchId?: string;
}

export interface EmployeeAdvance {
  hasAdvance: boolean;
  amountSAR: number;
  purpose: string;
  installmentsCount: number;
  monthlyDeductionSAR: number;
  disbursementDate: string;
  disbursementMethod: 'Bank Wire' | 'Corporate Cheque' | 'Cash Disbursal';
  voucherNumber?: string;
  notes?: string;
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
  // Advanced Onboarding Fields
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  bloodGroup?: string;
  workLocation?: string;
  probationPeriodMonths?: number;
  noticePeriodDays?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  bankName?: string;
  advance?: EmployeeAdvance;
  // Outsourced & Contractor Tracking
  isOutsourced?: boolean;
  supplierId?: string;
  supplierName?: string;
  outsourcedWorkerId?: string;
  trade?: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
  branchId?: string;
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
  branchId?: string;
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
  branchId?: string;
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
  branchId?: string;
}

export interface AssignedProjectMember {
  employeeId: string;
  employeeName: string;
  role?: string;
  department?: string;
  assignedDate?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  department: string;
  location?: string;
  budgetSAR: number;
  spentSAR: number;
  startDate: string;
  endDate: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  leadName: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedTeam?: AssignedProjectMember[];
  branchId?: string;
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
  branchId?: string;
}

export interface VillaDailyWorkEntity {
  id: string; // e.g. "DWE-101-01"
  villaId: string;
  date: string; // YYYY-MM-DD
  workStage: string; // "Foundation & Concrete", "Structural Frame", "MEP First Fix", "Finishing & Marble", "Facade & Glazing", "Roofing & Insulation", "Inspection & Snagging", "Handover Preparations"
  workField?: string; // "Primer Paint", "Putty 1st", "Putty 2st", "Paint 1st", "Paint Final" or custom trade
  metersWork?: number; // Quantity of work completed in square meters (m²) / linear meters
  taskSummary: string; // Detailed description of daily work undertaken
  employeeCount: number; // Number of deployed site workers/technicians
  supervisorName?: string; // Lead supervisor / site engineer in charge
  assignedEmployees?: Array<{
    employeeId: string;
    employeeName: string;
    role?: string;
  }>;
  workingHours?: number; // e.g. 8, 9, 10 hours
  equipmentUsed?: string; // e.g. "Tower Crane, Concrete Pump, Laser Levels"
  weatherCondition?: string; // e.g. "Clear 31°C"
  workProgress?: number; // 0 to 100 percentage
  status: 'in_progress' | 'completed' | 'delayed' | 'pending_inspection';
  notes?: string;
}

export interface Villa {
  id: string;
  blockNo: string; // e.g. "Block A", "Block 12"
  villaNo: string; // e.g. "Villa 101", "V-204"
  villaType: string; // e.g. "Standalone Luxury Villa", "Twin Villa", "Townhouse", "Duplex", or custom
  villaQuantity: number; // e.g. 1, 2, 4 units
  customVilla: boolean; // Flag indicating if custom villa
  customVillaSpecification?: string; // Custom architectural specs, floorplan, elevation
  projectId?: string;
  projectName?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  floors?: number;
  bedrooms?: number;
  builtUpAreaSqm?: number;
  plotAreaSqm?: number;
  estimatedCostSAR?: number;
  contractPriceSAR?: number;
  constructionStatus: 'planned' | 'planning' | 'foundation' | 'structure' | 'mep' | 'finishing' | 'handover_ready' | 'completed' | 'handed_over';
  handoverTargetDate?: string;
  clientName?: string;
  contractorName?: string;
  notes?: string;
  dailyWorkEntities?: VillaDailyWorkEntity[];
  branchId?: string;
}

export interface CustomVillaType {
  id: string;
  name: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorRole: string;
  operatorUid?: string;
  branchId?: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'ROLE_SWITCH' | 'SALARY_EDIT' | 'TIMESHEET_LOG' | 'LOGIN' | 'LOGOUT';
  entityType: 'Employee' | 'Timesheet' | 'Leave' | 'Expense' | 'Salary' | 'Category' | 'Asset' | 'Project' | 'Settings' | 'User' | 'Manpower' | 'Inventory' | 'Villa' | 'Branch' | 'Device';
  details: string;
}

export type TemplateType =
  | 'letterhead'
  | 'payslip'
  | 'offer_letter'
  | 'experience_cert'
  | 'timesheet_ledger'
  | 'expense_voucher'
  | 'asset_handover';

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
  // Editable Letterhead & Stationery Fields
  letterheadHeaderStyle?: 'classic' | 'executive' | 'bordered' | 'minimal';
  headerCompanyName?: string;
  headerLegalName?: string;
  headerCrNumber?: string;
  headerVatNumber?: string;
  headerAddress?: string;
  headerPhone?: string;
  headerEmail?: string;
  headerWebsite?: string;
  customLogoUrl?: string;
  showContactFooterBar?: boolean;
  // Editable Letter Content & Signatory
  refNumber?: string;
  documentDate?: string;
  showRecipientBlock?: boolean;
  recipientName?: string;
  recipientTitle?: string;
  recipientOrganization?: string;
  subjectLine?: string;
  bodyContent?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  recipientSignatoryLabel?: string;
}

// ==========================================
// MANPOWER SUPPLIER MODULE TYPES
// ==========================================
export interface SuppliedWorker {
  id: string; // e.g. "WRK-301"
  supplierId: string;
  supplierName: string;
  fullName: string;
  designation: string;
  trade: string; // e.g. "Civil Structural Inspector", "Heavy Equipment Operator", "Scaffolding Supervisor"
  assignedProjectId?: string;
  assignedProjectName?: string;
  iqamaOrWorkPermit: string;
  hourlyRateSAR: number;
  monthlyHoursLogged: number;
  status: 'active' | 'demobilized' | 'on_standby';
  joiningDate: string;
  contactPhone?: string;
  linkedEmployeeId?: string;
  isAddedToDirectory?: boolean;
  branchId?: string;
}

export interface ManpowerSupplier {
  id: string; // e.g. "SUP-101"
  code: string; // e.g. "MPS-01"
  name: string;
  legalEntityName: string;
  crNumber: string;
  vatNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  agreementStartDate: string;
  agreementEndDate: string;
  status: 'active' | 'under_review' | 'expired' | 'suspended';
  suppliedTrades: string[]; // e.g. ["Engineering", "Technicians", "Heavy Drivers", "Safety Officers"]
  deployedWorkersCount: number;
  paymentTerms: string; // "Net 30", "Net 15", "Monthly Timesheet Claim"
  complianceScore: number; // e.g. 96 (out of 100)
  totalInvoicedSAR: number;
  notes?: string;
  branchId?: string;
}

export interface ManpowerPOSLineItem {
  id: string;
  tradeOrSkill: string;
  designation: string;
  workerName?: string;
  headcount: number;
  hoursPerWorker: number;
  totalHours: number;
  hourlyRateSAR: number;
  totalSAR: number;
}

export interface ManpowerPOS {
  id: string; // e.g. "POS-2026-001"
  posNumber: string; // e.g. "POS-MPS-8801"
  supplierId: string;
  supplierName: string;
  issueDate: string;
  commencementDate: string;
  completionDate: string;
  projectId?: string;
  projectName: string;
  scopeOfWork: string;
  lineItems: ManpowerPOSLineItem[];
  subtotalSAR: number;
  vatRate: number; // 15 for 15%
  vatAmountSAR: number;
  grandTotalSAR: number;
  paymentTerms: string;
  status: 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
  authorizedBy: string;
  notes?: string;
  branchId?: string;
}

// ==========================================
// INVENTORY MODULE TYPES
// ==========================================
export type InventoryCategory = string;

export interface InventoryItem {
  id: string; // e.g. "INV-101"
  sku: string; // e.g. "SKU-MON-02"
  name: string;
  category: InventoryCategory;
  description: string;
  warehouseLocation: string; // e.g. "Riyadh Central HQ - Bin A-12"
  quantityOnHand: number;
  minReorderLevel: number;
  maxStockLevel: number;
  unitOfMeasure: string; // Supports standard and custom UOMs
  unitCostSAR: number;
  supplierName?: string;
  lastRestockedDate: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  branchId?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  date: string;
  referenceDoc?: string; // e.g. "PO-8291" or "Custody Issuance to EMP-1004"
  operatorName: string;
  notes?: string;
  branchId?: string;
}

export interface InvoiceLineItem {
  itemId: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  quantity: number;
  unitPriceSAR: number;
  totalSAR: number;
}

export interface InventoryInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  type: 'Purchase' | 'Sales' | 'Material_Issue';
  clientOrVendor: string;
  contactPerson?: string;
  referenceDoc?: string;
  lineItems: InvoiceLineItem[];
  subtotalSAR: number;
  vatRate: number; // e.g. 15 for 15%
  vatAmountSAR: number;
  grandTotalSAR: number;
  paymentTerms: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  notes?: string;
  branchId?: string;
}
