import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGooglePopup,
  signOutFirebase,
  getOrCreateDeviceSessionMeta,
} from '../firebase';
import {
  bootstrapAuthenticatedMember,
  createCloudAuditLog,
  deleteCloudWorkspaceUser,
  pushFullWorkspaceToCloud,
  removeCloudDoc,
  subscribeToWorkspaceCollections,
  updateCloudWorkspaceUser,
  upsertCloudDoc,
  upsertCloudInvite,
  upsertCloudRbacMatrix,
  upsertCloudRbacRole,
} from '../utils/cloudSync';
import {
  Branch,
  CorporateLegalEntity,
  RoleTier,
  LanguageCode,
  Department,
  Designation,
  DeviceSession,
  Employee,
  TimesheetEntry,
  TimesheetStatus,
  LeaveRequest,
  AccountingCategory,
  Expense,
  Project,
  AssetCategory,
  Asset,
  CustomPrivilege,
  AuditLog,
  SyncStatus,
  TemplateCustomization,
  AuthUser,
  ManpowerSupplier,
  SuppliedWorker,
  ManpowerPOS,
  InventoryItem,
  StockMovement,
  InventoryInvoice,
  UserInvite,
  Villa,
  VillaDailyWorkEntity,
  WorkspaceUserAccount,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_CORPORATE_ENTITY,
  SUPPORTED_CURRENCIES,
  INITIAL_DEPARTMENTS,
  INITIAL_DESIGNATIONS,
  INITIAL_EMPLOYEES,
  generateInitialTimesheet,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ACCOUNTING_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_PROJECTS,
  INITIAL_ASSET_CATEGORIES,
  INITIAL_ASSETS,
  INITIAL_CUSTOM_PRIVILEGES,
  INITIAL_AUDIT_LOGS,
  DEFAULT_TEMPLATE_CUSTOMIZATIONS,
  INITIAL_MANPOWER_SUPPLIERS,
  INITIAL_SUPPLIED_WORKERS,
  DEFAULT_MANPOWER_TRADES,
  INITIAL_MANPOWER_POS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_STOCK_MOVEMENTS,
  DEFAULT_INVENTORY_CATEGORIES,
  DEFAULT_UOMS,
  DEFAULT_WAREHOUSES,
  INITIAL_INVENTORY_INVOICES,
  INITIAL_VILLAS,
  INITIAL_CUSTOM_VILLA_TYPES,
} from '../data/initialData';
import {
  RbacActionKey,
  RoleMatrixMap,
  buildDefaultRbacMatrix,
  checkRbacPermission,
  countRolePermissions,
  normalizeRbacMatrix,
} from '../data/rbacDefaults';
import { translations, Translations } from '../i18n/translations';

export const DEMO_ACCOUNTS: Record<RoleTier, AuthUser> = {
  super_admin: {
    id: 'USR-001',
    fullName: 'Khalid Al-Fassi',
    email: 'admin@nexusglobal.com',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    department: 'Executive Governance',
    designation: 'Chief Technology Officer & System Overseer',
    lastLogin: 'Today, 08:30 AM',
  },
  branch_admin: {
    id: 'USR-006',
    fullName: 'Faisal Al-Otaibi',
    email: 'branchadmin@nexusglobal.com',
    role: 'branch_admin',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    department: 'Branch Operations',
    designation: 'Regional Branch Administrator',
    lastLogin: 'Today, 08:20 AM',
  },
  hr_manager: {
    id: 'USR-002',
    fullName: 'Mona Al-Hassan',
    email: 'hr@nexusglobal.com',
    role: 'hr_manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    department: 'Human Resources',
    designation: 'Director of Human Capital & Compliance',
    lastLogin: 'Today, 08:45 AM',
  },
  finance_officer: {
    id: 'USR-003',
    fullName: 'Tariq Mansoor',
    email: 'finance@nexusglobal.com',
    role: 'finance_officer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    department: 'Finance & Treasury',
    designation: 'Senior Financial Controller & Payroll Lead',
    lastLogin: 'Today, 09:10 AM',
  },
  project_manager: {
    id: 'USR-004',
    fullName: 'Sarah Jenkins',
    email: 'pm@nexusglobal.com',
    role: 'project_manager',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    department: 'Engineering & Technology',
    designation: 'Principal Delivery Manager',
    lastLogin: 'Yesterday, 04:20 PM',
  },
  employee: {
    id: 'USR-005',
    fullName: 'Omar Farooq',
    email: 'employee@nexusglobal.com',
    role: 'employee',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    department: 'Engineering & Technology',
    designation: 'Senior Cloud Systems Engineer',
    lastLogin: 'Today, 08:15 AM',
  },
};

interface HRMSContextType {
  // Authentication & Multi-User Cloud Session
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  login: (email: string, password?: string, role?: RoleTier) => boolean;
  logout: () => void;
  loginAsPersona: (role: RoleTier) => void;
  firebaseUser: User | null;
  authReady: boolean;
  cloudAuthorized: boolean;
  cloudAccessPending: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  cloudSyncError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutCloud: () => Promise<void>;
  pushWorkspaceToCloudNow: () => Promise<number>;
  userDirectory: WorkspaceUserAccount[];
  userInvites: UserInvite[];
  deviceSessions: DeviceSession[];
  currentDeviceMeta: {
    sessionId: string;
    deviceType: 'Desktop' | 'Tablet' | 'Mobile';
    platform: string;
    browser: string;
  };
  inviteWorkspaceUser: (invite: {
    email: string;
    displayName: string;
    role: RoleTier;
    branchId: string;
    department?: string;
    designation?: string;
    password?: string;
  }) => Promise<void>;
  updateWorkspaceUser: (
    uid: string,
    updates: Partial<Pick<WorkspaceUserAccount, 'role' | 'branchId' | 'status' | 'department' | 'designation'>>
  ) => Promise<void>;
  deleteWorkspaceUser: (uid: string) => Promise<void>;
  revokeUserInvite: (inviteId: string) => Promise<void>;
  removeDeviceSession: (sessionId: string) => Promise<void>;

  // Multi-Branch Architecture
  branches: Branch[];
  activeBranchId: string; // 'all' or specific Branch id
  setActiveBranchId: (branchId: string) => void;
  getBranchName: (branchId?: string) => string;
  addBranch: (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => Branch;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  // Corporate Entity & Currency
  corporateEntity: CorporateLegalEntity;
  updateCorporateEntity: (entity: Partial<CorporateLegalEntity>) => Promise<void>;
  baseCurrency: string;
  setBaseCurrency: (currencyCode: string) => void;
  formatCurrency: (amountInSAR: number, hideSymbol?: boolean) => string;
  getRawConvertedAmount: (amountInSAR: number) => number;
  currentCurrencySymbol: string;

  // Role & Persona (RBAC)
  currentRole: RoleTier;
  switchRole: (role: RoleTier) => void;
  canPerformAdminAction: boolean;
  canPerformBranchAdminAction: boolean;
  canPerformHrAction: boolean;
  canPerformFinanceAction: boolean;
  isEmployeeViewOnly: boolean;
  currentEmployeeUser: Employee;

  // Language & i18n
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: Translations;
  isRTL: boolean;

  // Workforce & Employees
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  addEmployee: (emp: Omit<Employee, 'id' | 'annualBaseSalary' | 'totalMonthlyPackage'>) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  updateSalary: (
    id: string,
    monthlyBase: number,
    housing: number,
    transport: number,
    other: number,
    reasonNotes: string
  ) => void;

  // Departments & Designations
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, dept: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addDesignation: (des: Omit<Designation, 'id'>) => void;
  updateDesignation: (id: string, des: Partial<Designation>) => void;
  deleteDesignation: (id: string) => void;

  // Attendance & Timesheet Ledger
  timesheetEntries: TimesheetEntry[];
  getTimesheetEntry: (empId: string, date: string) => TimesheetEntry | undefined;
  updateTimesheetCell: (
    empId: string,
    date: string,
    regularHours: number,
    overtimeHours: number,
    status: TimesheetStatus,
    notes?: string
  ) => void;
  clearAllTimesheetForMonth: (year: number, month: number) => void;
  clearEmployeeTimesheetForMonth: (employeeId: string, year: number, month: number) => void;
  batchUpdateTimesheetCells: (
    updates: {
      empId: string;
      date: string;
      regularHours: number;
      overtimeHours: number;
      status: TimesheetStatus;
      notes?: string;
    }[],
    auditSummary?: string
  ) => void;

  // Leaves & Time-Off
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => void;
  approveLeaveRequest: (id: string) => void;
  rejectLeaveRequest: (id: string, reason: string) => void;
  deleteLeaveRequest: (id: string) => void;

  // Accounting & Expenses
  accountingCategories: AccountingCategory[];
  addAccountingCategory: (cat: Omit<AccountingCategory, 'id'>) => void;
  updateAccountingCategory: (id: string, cat: Partial<AccountingCategory>) => void;
  deleteAccountingCategory: (id: string) => void;
  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id' | 'expenseNumber' | 'status'>) => void;
  updateExpense: (id: string, exp: Partial<Expense>) => void;
  approveExpense: (id: string) => void;
  rejectExpense: (id: string, notes?: string) => void;
  deleteExpense: (id: string) => void;

  // Projects & Operations
  projects: Project[];
  addProject: (prj: Omit<Project, 'id' | 'spentSAR'>) => void;
  updateProject: (id: string, prj: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Villas & Housing Units Ledger
  villas: Villa[];
  addVilla: (villa: Omit<Villa, 'id'>) => Villa;
  updateVilla: (id: string, updates: Partial<Villa>) => void;
  deleteVilla: (id: string) => void;
  customVillaTypes: string[];
  addCustomVillaType: (typeName: string) => void;
  deleteCustomVillaType: (typeName: string) => void;
  addVillaDailyWorkEntity: (
    villaId: string,
    entity: Omit<VillaDailyWorkEntity, 'id' | 'villaId'>
  ) => VillaDailyWorkEntity;
  addMultipleVillaDailyWorkEntities: (
    villaId: string,
    entities: Array<Omit<VillaDailyWorkEntity, 'id' | 'villaId'>>
  ) => VillaDailyWorkEntity[];
  updateVillaDailyWorkEntity: (
    villaId: string,
    entityId: string,
    updates: Partial<VillaDailyWorkEntity>
  ) => void;
  deleteVillaDailyWorkEntity: (villaId: string, entityId: string) => void;

  // Assets & Categories
  assetCategories: AssetCategory[];
  addAssetCategory: (cat: Omit<AssetCategory, 'id' | 'assetsCount'>) => void;
  updateAssetCategory: (id: string, cat: Partial<AssetCategory>) => void;
  deleteAssetCategory: (id: string) => void;
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // Manpower Suppliers & Outsourced Roster
  manpowerSuppliers: ManpowerSupplier[];
  addManpowerSupplier: (supplier: Omit<ManpowerSupplier, 'id'>) => void;
  updateManpowerSupplier: (id: string, supplier: Partial<ManpowerSupplier>) => void;
  deleteManpowerSupplier: (id: string) => void;
  suppliedWorkers: SuppliedWorker[];
  addSuppliedWorker: (worker: Omit<SuppliedWorker, 'id'>, alsoAddToDirectory?: boolean) => SuppliedWorker;
  updateSuppliedWorker: (id: string, worker: Partial<SuppliedWorker>) => void;
  deleteSuppliedWorker: (id: string) => void;
  addSuppliedWorkerToEmployeeDirectory: (workerId: string) => Employee | null;
  addAllSuppliedWorkersToEmployeeDirectory: () => number;
  postOutsourcedWorkerHoursToTimesheet: (
    workerId: string,
    year: number,
    month: number,
    customHours?: number
  ) => { success: boolean; message: string; employeeId?: string };
  postAllOutsourcedWorkersHoursToTimesheet: (
    year: number,
    month: number
  ) => { postedCount: number; message: string };
  manpowerTrades: string[];
  addManpowerTrade: (tradeName: string) => void;
  deleteManpowerTrade: (tradeName: string) => void;
  manpowerPOSList: ManpowerPOS[];
  addManpowerPOS: (pos: Omit<ManpowerPOS, 'id'>) => void;
  updateManpowerPOS: (id: string, updates: Partial<ManpowerPOS>) => void;
  deleteManpowerPOS: (id: string) => void;

  // Inventory & Stock Ledger
  inventoryItems: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustInventoryStock: (itemId: string, delta: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', notes?: string, reference?: string) => void;
  transferInventoryItem: (params: {
    sourceItemId: string;
    destinationLocation: string;
    quantity: number;
    destinationBranchId?: string;
    reference?: string;
    notes?: string;
  }) => { ok: boolean; error?: string; destinationItemId?: string };
  stockMovements: StockMovement[];
  inventoryCategories: string[];
  addInventoryCategory: (categoryName: string) => void;
  deleteInventoryCategory: (categoryName: string) => void;
  inventoryUOMs: string[];
  addInventoryUOM: (uomName: string) => void;
  deleteInventoryUOM: (uomName: string) => void;
  inventoryWarehouses: string[];
  addInventoryWarehouse: (warehouseName: string) => void;
  deleteInventoryWarehouse: (warehouseName: string) => void;
  inventoryInvoices: InventoryInvoice[];
  addInventoryInvoice: (inv: Omit<InventoryInvoice, 'id'>) => void;
  updateInventoryInvoice: (id: string, updates: Partial<InventoryInvoice>) => void;
  deleteInventoryInvoice: (id: string) => void;

  // Custom Privileges & System Access Roles (RBAC)
  rbacMatrix: RoleMatrixMap;
  saveRbacRolePermissions: (roleId: RoleTier, permissions: Record<string, boolean>) => Promise<void>;
  saveFullRbacMatrix: (matrix: RoleMatrixMap) => Promise<void>;
  resetRbacMatrixToDefaults: () => Promise<void>;
  hasModulePermission: (moduleId: string, action: RbacActionKey) => boolean;
  customPrivileges: CustomPrivilege[];
  addCustomPrivilege: (priv: Omit<CustomPrivilege, 'id'>) => Promise<void>;
  updateCustomPrivilege: (id: string, priv: Partial<CustomPrivilege>) => Promise<void>;
  deleteCustomPrivilege: (id: string) => Promise<void>;

  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (actionType: AuditLog['actionType'], entityType: AuditLog['entityType'], details: string) => void;

  // Template Customizer Studio
  templateConfigs: Record<string, TemplateCustomization>;
  updateTemplateConfig: (type: string, config: Partial<TemplateCustomization>) => void;

  // Global Modals
  shareAccessModalOpen: boolean;
  setShareAccessModalOpen: (open: boolean) => void;
  auditModalOpen: boolean;
  setAuditModalOpen: (open: boolean) => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Multi-Branch State
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem('apex_branches');
      return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
    } catch {
      return INITIAL_BRANCHES;
    }
  });

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem('apex_active_branch') || 'all';
  });

  const setActiveBranchId = (branchId: string) => {
    setActiveBranchIdState(branchId);
    localStorage.setItem('apex_active_branch', branchId);
  };

  // Multi-User & Multi-Device Firebase Cloud State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [cloudAuthorized, setCloudAuthorized] = useState<boolean>(false);
  const [cloudAccessPending, setCloudAccessPending] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [userDirectory, setUserDirectory] = useState<WorkspaceUserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('apex_user_directory');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return Object.values(DEMO_ACCOUNTS).map((acc) => ({
      uid: acc.id,
      email: acc.email,
      displayName: acc.fullName,
      photoURL: acc.avatar,
      role: acc.role,
      branchId: 'all',
      department: acc.department,
      designation: acc.designation,
      status: 'active' as const,
      lastDeviceType: 'Desktop' as const,
      lastDeviceLabel: 'Workspace Profile',
      lastActiveAt: acc.lastLogin,
    }));
  });
  const [userInvites, setUserInvites] = useState<UserInvite[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const currentDeviceMeta = React.useMemo(
    () => getOrCreateDeviceSessionMeta(firebaseUser?.uid),
    [firebaseUser?.uid, cloudAuthorized]
  );
  const hasSeededCloudRef = useRef<boolean>(false);
  const serverOwnProfileRef = useRef<{ role: RoleTier; branchId: string; status: string } | null>(null);
  const [cloudBootRole, setCloudBootRole] = useState<RoleTier | null>(null);

  // State Initialization with LocalStorage fallbacks for persistence
  const [corporateEntity, setCorporateEntity] = useState<CorporateLegalEntity>(() => {
    try {
      const saved = localStorage.getItem('apex_corporate_entity');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CorporateLegalEntity>;
        if (parsed && typeof parsed === 'object') {
          return {
            companyName: parsed.companyName ?? INITIAL_CORPORATE_ENTITY.companyName,
            legalName: parsed.legalName ?? INITIAL_CORPORATE_ENTITY.legalName,
            logoUrl: parsed.logoUrl ?? INITIAL_CORPORATE_ENTITY.logoUrl,
            crNumber: parsed.crNumber ?? INITIAL_CORPORATE_ENTITY.crNumber,
            vatNumber: parsed.vatNumber ?? INITIAL_CORPORATE_ENTITY.vatNumber,
            email: parsed.email ?? INITIAL_CORPORATE_ENTITY.email,
            phone: parsed.phone ?? INITIAL_CORPORATE_ENTITY.phone,
            address: parsed.address ?? INITIAL_CORPORATE_ENTITY.address,
            bankName: parsed.bankName ?? INITIAL_CORPORATE_ENTITY.bankName,
            accountTitle: parsed.accountTitle ?? INITIAL_CORPORATE_ENTITY.accountTitle,
            iban: parsed.iban ?? INITIAL_CORPORATE_ENTITY.iban,
            swiftCode: parsed.swiftCode ?? INITIAL_CORPORATE_ENTITY.swiftCode,
            baseCurrency: parsed.baseCurrency ?? INITIAL_CORPORATE_ENTITY.baseCurrency,
          };
        }
      }
    } catch {
      // Ignore malformed local cache
    }
    return INITIAL_CORPORATE_ENTITY;
  });

  // Auth state: requires Firebase Google Sign-In + workspace authorization
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('apex_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [currentRole, setCurrentRole] = useState<RoleTier>(() => {
    const saved = localStorage.getItem('apex_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.role || 'super_admin';
      } catch {
        return 'super_admin';
      }
    }
    return 'super_admin';
  });
  const [language, setLanguage] = useState<LanguageCode>('en');

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('apex_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('apex_departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [designations, setDesignations] = useState<Designation[]>(() => {
    const saved = localStorage.getItem('apex_designations');
    return saved ? JSON.parse(saved) : INITIAL_DESIGNATIONS;
  });

  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(() => {
    const saved = localStorage.getItem('apex_timesheets');
    return saved ? JSON.parse(saved) : generateInitialTimesheet();
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('apex_leaves');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [accountingCategories, setAccountingCategories] = useState<AccountingCategory[]>(() => {
    const saved = localStorage.getItem('apex_acc_categories');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTING_CATEGORIES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('apex_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('apex_projects');
    if (saved) {
      try {
        const parsed: Project[] = JSON.parse(saved);
        const hasShapoorji = parsed.some(
          (p) =>
            p.client?.toLowerCase().includes('shapoorji') ||
            p.name?.toLowerCase().includes('shapoorji')
        );
        if (!hasShapoorji) {
          return [INITIAL_PROJECTS[0], ...parsed];
        }
        return parsed;
      } catch {
        return INITIAL_PROJECTS;
      }
    }
    return INITIAL_PROJECTS;
  });

  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>(() => {
    const saved = localStorage.getItem('apex_asset_categories');
    return saved ? JSON.parse(saved) : INITIAL_ASSET_CATEGORIES;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('apex_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [villas, setVillas] = useState<Villa[]>(() => {
    const saved = localStorage.getItem('apex_villas');
    if (saved) {
      try {
        const parsed: Villa[] = JSON.parse(saved);
        return parsed.map((v) => {
          if (!v.dailyWorkEntities || v.dailyWorkEntities.length === 0) {
            const initialMatch = INITIAL_VILLAS.find((iv) => iv.id === v.id);
            return {
              ...v,
              dailyWorkEntities: initialMatch?.dailyWorkEntities || [
                {
                  id: `DWE-${v.id}-01`,
                  villaId: v.id,
                  date: new Date().toISOString().substring(0, 10),
                  workStage: 'Active Site Construction & Inspection',
                  taskSummary: `Scheduled daily site execution, structural checks and workforce deployment for ${v.villaNo}.`,
                  employeeCount: 10,
                  supervisorName: v.assignedEmployeeName || 'Site Engineering Lead',
                  workingHours: 8,
                  status: 'in_progress' as const,
                },
              ],
            };
          }
          return v;
        });
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VILLAS;
  });

  const [customVillaTypes, setCustomVillaTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_custom_villa_types');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOM_VILLA_TYPES;
  });

  const [manpowerSuppliers, setManpowerSuppliers] = useState<ManpowerSupplier[]>(() => {
    const saved = localStorage.getItem('apex_manpower_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_MANPOWER_SUPPLIERS;
  });

  const [suppliedWorkers, setSuppliedWorkers] = useState<SuppliedWorker[]>(() => {
    const saved = localStorage.getItem('apex_supplied_workers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIED_WORKERS;
  });

  const [manpowerTrades, setManpowerTrades] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_manpower_trades');
    return saved ? JSON.parse(saved) : DEFAULT_MANPOWER_TRADES;
  });

  const [manpowerPOSList, setManpowerPOSList] = useState<ManpowerPOS[]>(() => {
    const saved = localStorage.getItem('apex_manpower_pos');
    return saved ? JSON.parse(saved) : INITIAL_MANPOWER_POS;
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('apex_inventory_items');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_ITEMS;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('apex_stock_movements');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [inventoryCategories, setInventoryCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_inventory_categories');
    return saved ? JSON.parse(saved) : DEFAULT_INVENTORY_CATEGORIES;
  });

  const [inventoryUOMs, setInventoryUOMs] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_inventory_uoms');
    return saved ? JSON.parse(saved) : DEFAULT_UOMS;
  });

  const [inventoryWarehouses, setInventoryWarehouses] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_inventory_warehouses');
    return saved ? JSON.parse(saved) : DEFAULT_WAREHOUSES;
  });

  const [inventoryInvoices, setInventoryInvoices] = useState<InventoryInvoice[]>(() => {
    const saved = localStorage.getItem('apex_inventory_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_INVOICES;
  });

  const [customPrivileges, setCustomPrivileges] = useState<CustomPrivilege[]>(() => {
    try {
      const saved = localStorage.getItem('apex_custom_privileges');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOM_PRIVILEGES;
    } catch {
      return INITIAL_CUSTOM_PRIVILEGES;
    }
  });

  const [rbacMatrix, setRbacMatrix] = useState<RoleMatrixMap>(() => {
    try {
      const saved = localStorage.getItem('apex_rbac_matrix');
      if (saved) {
        return normalizeRbacMatrix(JSON.parse(saved));
      }
    } catch {
      // Fall back to factory role defaults
    }
    return buildDefaultRbacMatrix();
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('apex_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [templateConfigs, setTemplateConfigs] = useState<Record<string, TemplateCustomization>>(() => {
    const saved = localStorage.getItem('apex_template_configs');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATE_CUSTOMIZATIONS;
  });

  const [shareAccessModalOpen, setShareAccessModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Sync state to LocalStorage and auto-update browser title & favicon
  useEffect(() => {
    localStorage.setItem('apex_corporate_entity', JSON.stringify(corporateEntity));

    // Dynamic Title Auto-Sync
    if (corporateEntity?.companyName) {
      document.title = `${corporateEntity.companyName} | Apex HRMS & Contracting Suite`;
    }

    // Dynamic Favicon Auto-Sync
    if (corporateEntity?.logoUrl) {
      let faviconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = corporateEntity.logoUrl;
    }
  }, [corporateEntity]);

  useEffect(() => {
    localStorage.setItem('apex_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('apex_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('apex_designations', JSON.stringify(designations));
  }, [designations]);

  useEffect(() => {
    localStorage.setItem('apex_timesheets', JSON.stringify(timesheetEntries));
  }, [timesheetEntries]);

  useEffect(() => {
    localStorage.setItem('apex_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('apex_acc_categories', JSON.stringify(accountingCategories));
  }, [accountingCategories]);

  useEffect(() => {
    localStorage.setItem('apex_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('apex_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('apex_asset_categories', JSON.stringify(assetCategories));
  }, [assetCategories]);

  useEffect(() => {
    localStorage.setItem('apex_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('apex_villas', JSON.stringify(villas));
  }, [villas]);

  useEffect(() => {
    localStorage.setItem('apex_custom_villa_types', JSON.stringify(customVillaTypes));
  }, [customVillaTypes]);

  useEffect(() => {
    localStorage.setItem('apex_manpower_suppliers', JSON.stringify(manpowerSuppliers));
  }, [manpowerSuppliers]);

  useEffect(() => {
    localStorage.setItem('apex_supplied_workers', JSON.stringify(suppliedWorkers));
  }, [suppliedWorkers]);

  useEffect(() => {
    localStorage.setItem('apex_manpower_trades', JSON.stringify(manpowerTrades));
  }, [manpowerTrades]);

  useEffect(() => {
    localStorage.setItem('apex_manpower_pos', JSON.stringify(manpowerPOSList));
  }, [manpowerPOSList]);

  useEffect(() => {
    localStorage.setItem('apex_inventory_items', JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem('apex_stock_movements', JSON.stringify(stockMovements));
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem('apex_inventory_categories', JSON.stringify(inventoryCategories));
  }, [inventoryCategories]);

  useEffect(() => {
    localStorage.setItem('apex_inventory_uoms', JSON.stringify(inventoryUOMs));
  }, [inventoryUOMs]);

  useEffect(() => {
    localStorage.setItem('apex_inventory_warehouses', JSON.stringify(inventoryWarehouses));
  }, [inventoryWarehouses]);

  useEffect(() => {
    localStorage.setItem('apex_inventory_invoices', JSON.stringify(inventoryInvoices));
  }, [inventoryInvoices]);

  useEffect(() => {
    localStorage.setItem('apex_custom_privileges', JSON.stringify(customPrivileges));
  }, [customPrivileges]);

  useEffect(() => {
    localStorage.setItem('apex_rbac_matrix', JSON.stringify(rbacMatrix));
  }, [rbacMatrix]);

  useEffect(() => {
    localStorage.setItem('apex_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('apex_template_configs', JSON.stringify(templateConfigs));
  }, [templateConfigs]);

  useEffect(() => {
    localStorage.setItem('apex_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('apex_user_directory', JSON.stringify(userDirectory));
  }, [userDirectory]);

  // Ref for accessing latest state during initial empty cloud seed
  const latestWorkspaceRef = useRef({
    branches,
    employees,
    departments,
    designations,
    timesheetEntries,
    leaveRequests,
    accountingCategories,
    expenses,
    projects,
    villas,
    assetCategories,
    assets,
    manpowerSuppliers,
    suppliedWorkers,
    manpowerPOSList,
    inventoryItems,
    stockMovements,
    inventoryInvoices,
    customPrivileges,
    corporateEntity,
    customVillaTypes,
    manpowerTrades,
    inventoryCategories,
    inventoryUOMs,
    inventoryWarehouses,
    templateConfigs,
    rbacMatrix,
    auditLogs,
  });

  useEffect(() => {
    latestWorkspaceRef.current = {
      branches,
      employees,
      departments,
      designations,
      timesheetEntries,
      leaveRequests,
      accountingCategories,
      expenses,
      projects,
      villas,
      assetCategories,
      assets,
      manpowerSuppliers,
      suppliedWorkers,
      manpowerPOSList,
      inventoryItems,
      stockMovements,
      inventoryInvoices,
      customPrivileges,
      corporateEntity,
      customVillaTypes,
      manpowerTrades,
      inventoryCategories,
      inventoryUOMs,
      inventoryWarehouses,
      templateConfigs,
      rbacMatrix,
      auditLogs,
    };
  });

  // Network online/offline watcher for sync status clarity
  useEffect(() => {
    const handleOnline = () => {
      if (cloudAuthorized) setSyncStatus('synced');
    };
    const handleOffline = () => {
      if (cloudAuthorized) setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cloudAuthorized]);

  // Firebase Auth & Member Bootstrap
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (!user) {
        hasSeededCloudRef.current = false;
        serverOwnProfileRef.current = null;
        setCloudBootRole(null);
        setCloudAuthorized(false);
        setCloudAccessPending(false);
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('apex_auth_user');
        setSyncStatus('local');
        setCloudSyncError(null);
        setUserDirectory([]);
        setUserInvites([]);
        setDeviceSessions([]);
        return;
      }

      setSyncStatus('syncing');
      setCloudSyncError(null);

      try {
        const boot = await bootstrapAuthenticatedMember(user);
        if (!boot.authorized) {
          setCloudBootRole(null);
          setCloudAuthorized(false);
          setCloudAccessPending(true);
          setIsAuthenticated(false);
          setSyncStatus('error');
          setCloudSyncError('This Google account is not yet invited to this enterprise workspace.');
          return;
        }

        setCloudBootRole(boot.role);
        setCloudAuthorized(true);
        setCloudAccessPending(false);
        setCurrentRole(boot.role);
        if (boot.branchId && boot.branchId !== 'all') {
          setActiveBranchIdState(boot.branchId);
        }

        const authedProfile: AuthUser = {
          id: user.uid,
          fullName: boot.account?.displayName || user.displayName || 'Workspace User',
          email: user.email || '',
          role: boot.role,
          avatar: user.photoURL || DEMO_ACCOUNTS[boot.role]?.avatar || DEMO_ACCOUNTS.super_admin.avatar,
          department: boot.account?.department || 'Enterprise Cloud Workspace',
          designation: boot.account?.designation || boot.role.replace('_', ' ').toUpperCase(),
          lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
          branchId: boot.branchId,
        };
        setCurrentUser(authedProfile);
        setIsAuthenticated(true);
        localStorage.setItem('apex_auth_user', JSON.stringify(authedProfile));

        serverOwnProfileRef.current = {
          role: boot.role,
          branchId: boot.branchId || 'all',
          status: boot.account?.status || 'active',
        };
      } catch (err) {
        setSyncStatus('error');
        setCloudSyncError(err instanceof Error ? err.message : 'Failed to initialize cloud sync.');
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Real-time Multi-Device Firestore Subscriptions (active after Google Sign-In + workspace authorization)
  useEffect(() => {
    if (!firebaseUser || !cloudAuthorized || !cloudBootRole) {
      return;
    }

    const activeUid = firebaseUser.uid;
    const bootRole = cloudBootRole;
    setSyncStatus('syncing');

    const unsubFirestore = subscribeToWorkspaceCollections({
      uid: activeUid,
      role: bootRole,
      onOwnUserProfile: (profile) => {
        if (profile.status && profile.status !== 'active') {
          setCloudAuthorized(false);
          setCloudAccessPending(true);
          setSyncStatus('error');
          setCloudSyncError('Your workspace access has been suspended or revoked by an administrator.');
          return;
        }
        const prevServer = serverOwnProfileRef.current;
        const nextServerRole = profile.role || prevServer?.role || bootRole;
        const nextServerBranch = profile.branchId || prevServer?.branchId || 'all';
        const roleChangedOnServer = !prevServer || prevServer.role !== nextServerRole;
        const branchChangedOnServer = !prevServer || prevServer.branchId !== nextServerBranch;

        serverOwnProfileRef.current = {
          role: nextServerRole,
          branchId: nextServerBranch,
          status: profile.status || 'active',
        };

        if (roleChangedOnServer) {
          setCurrentRole(nextServerRole);
          setCurrentUser((curr) => {
            if (!curr) return curr;
            const updated = {
              ...curr,
              role: nextServerRole,
              branchId: nextServerBranch,
              fullName: profile.displayName || curr.fullName,
              department: profile.department || curr.department,
              designation: profile.designation || curr.designation,
            };
            localStorage.setItem('apex_auth_user', JSON.stringify(updated));
            return updated;
          });
        }
        if (branchChangedOnServer && nextServerBranch !== 'all') {
          setActiveBranchIdState(nextServerBranch);
          localStorage.setItem('apex_active_branch', nextServerBranch);
        }
      },
      onBranches: (items, isEmpty) => {
        if (!isEmpty) {
          setBranches(items);
        } else if (bootRole === 'super_admin' && !hasSeededCloudRef.current) {
          hasSeededCloudRef.current = true;
          void pushFullWorkspaceToCloud(latestWorkspaceRef.current, activeUid)
            .then(() => {
              setLastSyncedAt(new Date().toISOString());
              setSyncStatus(navigator.onLine ? 'synced' : 'offline');
            })
            .catch((seedErr) => {
              setSyncStatus('error');
              setCloudSyncError(
                seedErr instanceof Error ? seedErr.message : 'Failed to synchronize workspace seed.'
              );
            });
        }
      },
      onEmployees: (items) => setEmployees(items),
      onDepartments: (items) => setDepartments(items),
      onDesignations: (items) => setDesignations(items),
      onTimesheets: (items) => setTimesheetEntries(items),
      onLeaves: (items) => setLeaveRequests(items),
      onAccountingCategories: (items) => setAccountingCategories(items),
      onExpenses: (items) => setExpenses(items),
      onProjects: (items) => setProjects(items),
      onVillas: (items) => setVillas(items),
      onAssetCategories: (items) => setAssetCategories(items),
      onAssets: (items) => setAssets(items),
      onManpowerSuppliers: (items) => setManpowerSuppliers(items),
      onSuppliedWorkers: (items) => setSuppliedWorkers(items),
      onManpowerPOS: (items) => setManpowerPOSList(items),
      onInventoryItems: (items) => setInventoryItems(items),
      onStockMovements: (items) => setStockMovements(items),
      onInventoryInvoices: (items) => setInventoryInvoices(items),
      onCustomPrivileges: (items) => setCustomPrivileges(items),
      onCorporateSettings: (data) => {
        setCorporateEntity((prev) => ({
          ...prev,
          companyName: (data.companyName as string) || prev.companyName,
          legalName: (data.legalName as string) || prev.legalName,
          logoUrl: (data.logoUrl as string) || prev.logoUrl,
          crNumber: (data.crNumber as string) || prev.crNumber,
          vatNumber: (data.vatNumber as string) || prev.vatNumber,
          email: (data.email as string) || prev.email,
          phone: (data.phone as string) || prev.phone,
          address: (data.address as string) || prev.address,
          bankName: (data.bankName as string) || prev.bankName,
          accountTitle: (data.accountTitle as string) || prev.accountTitle,
          iban: (data.iban as string) || prev.iban,
          swiftCode: (data.swiftCode as string) || prev.swiftCode,
          baseCurrency: (data.baseCurrency as string) || prev.baseCurrency,
        }));
        if (Array.isArray(data.customVillaTypes)) {
          setCustomVillaTypes(data.customVillaTypes as string[]);
        }
        if (Array.isArray(data.manpowerTrades)) {
          setManpowerTrades(data.manpowerTrades as string[]);
        }
        if (Array.isArray(data.inventoryCategories)) {
          setInventoryCategories(data.inventoryCategories as string[]);
        }
        if (Array.isArray(data.inventoryUOMs)) {
          setInventoryUOMs(data.inventoryUOMs as string[]);
        }
        if (Array.isArray(data.inventoryWarehouses)) {
          setInventoryWarehouses(data.inventoryWarehouses as string[]);
        }
      },
      onTemplateConfigs: (items) => {
        setTemplateConfigs((prev) => ({ ...prev, ...items }));
      },
      onRbacMatrix: (partial) => {
        setRbacMatrix((prev) => normalizeRbacMatrix({ ...prev, ...partial }));
      },
      onAuditLogs: (items) => setAuditLogs(items),
      onUserDirectory: (items) => {
        if (items.length > 0) setUserDirectory(items);
      },
      onUserInvites: (items) => setUserInvites(items),
      onDeviceSessions: (items) => setDeviceSessions(items),
      onSyncActivity: () => {
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        setLastSyncedAt(new Date().toISOString());
      },
      onSyncError: (msg) => {
        setSyncStatus('error');
        setCloudSyncError(msg);
      },
    });

    return () => {
      unsubFirestore();
    };
  }, [firebaseUser, cloudAuthorized, cloudBootRole]);

  // Active cloud user UID shortcut
  const activeCloudUid = cloudAuthorized && firebaseUser ? firebaseUser.uid : null;
  const defaultActiveBranchId = activeBranchId !== 'all' ? activeBranchId : (branches[0]?.id || 'BR-RUH');

  const extractCloudErrMsg = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || 'Cloud sync failed.');
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      // plain string
    }
    return raw;
  };

  const syncUpsertCloudDoc = (
    collectionName: string,
    docId: string,
    data: Record<string, unknown>,
    uid: string | null
  ) => {
    if (!uid) return;
    void upsertCloudDoc(collectionName, docId, data, uid).catch((err) => {
      setSyncStatus('error');
      setCloudSyncError(extractCloudErrMsg(err));
    });
  };

  const syncRemoveCloudDoc = (
    collectionName: string,
    docId: string,
    uid: string | null
  ) => {
    if (!uid) return;
    void removeCloudDoc(collectionName, docId, uid).catch((err) => {
      setSyncStatus('error');
      setCloudSyncError(extractCloudErrMsg(err));
    });
  };

  // Adjust document direction for Arabic, Urdu, Persian, Hebrew RTL
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa' || language === 'he';
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  // Audit Logger Helper
  const addAuditLog = (
    actionType: AuditLog['actionType'],
    entityType: AuditLog['entityType'],
    details: string
  ) => {
    const operatorName =
      firebaseUser?.displayName
        ? `${firebaseUser.displayName} (${currentRole.replace('_', ' ')})`
        : currentRole === 'super_admin'
        ? 'Khalid Al-Fassi (Super Admin)'
        : currentRole === 'branch_admin'
        ? 'Faisal Al-Otaibi (Branch Admin)'
        : currentRole === 'hr_manager'
        ? 'Mona Al-Hassan (HR Manager)'
        : currentRole === 'finance_officer'
        ? 'Tariq Mansoor (Finance Officer)'
        : currentRole === 'project_manager'
        ? 'Sarah Jenkins (Project Manager)'
        : 'Omar Farooq (Employee)';

    const newLog: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operatorName,
      operatorRole: currentRole.toUpperCase().replace('_', ' '),
      operatorUid: activeCloudUid || undefined,
      branchId: activeBranchId,
      actionType,
      entityType,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    if (activeCloudUid) {
      void createCloudAuditLog(newLog, activeCloudUid).catch(() => {
        // Non-blocking audit telemetry error already logged by handleFirestoreError
      });
    }
  };

  // Multi-Device Auth & User Management Actions
  const signInWithGoogle = async () => {
    setCloudSyncError(null);
    await signInWithGooglePopup();
  };

  const signOutCloud = async () => {
    if (activeCloudUid) {
      const activeSessionId = getOrCreateDeviceSessionMeta(activeCloudUid).sessionId;
      if (activeSessionId) {
        try {
          await removeCloudDoc('device_sessions', activeSessionId, activeCloudUid);
        } catch {
          // Ignore cleanup failure during sign out
        }
      }
    }
    await signOutFirebase();
    try {
      localStorage.removeItem('apex_auth_user');
    } catch {
      // ignore storage errors
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCloudAuthorized(false);
    setCloudAccessPending(false);
    setSyncStatus('local');
    setCloudSyncError(null);
    setUserDirectory([]);
    setUserInvites([]);
    setDeviceSessions([]);
  };

  const pushWorkspaceToCloudNow = async (): Promise<number> => {
    if (!activeCloudUid) {
      throw new Error('Sign in with an authorized Google account before syncing to cloud.');
    }
    setSyncStatus('syncing');
    const count = await pushFullWorkspaceToCloud(latestWorkspaceRef.current, activeCloudUid);
    setSyncStatus('synced');
    setLastSyncedAt(new Date().toISOString());
    addAuditLog('UPDATE', 'Device', `Synchronized ${count} enterprise records across cloud devices.`);
    return count;
  };

  const hashAccessPasscode = async (raw: string): Promise<string | undefined> => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(trimmed);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return undefined;
  };

  const inviteWorkspaceUser = async (invite: {
    email: string;
    displayName: string;
    role: RoleTier;
    branchId: string;
    department?: string;
    designation?: string;
    password?: string;
  }) => {
    const cleanEmail = invite.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const passcodeHash = invite.password ? await hashAccessPasscode(invite.password) : undefined;
    const newInvite: UserInvite = {
      id: cleanEmail,
      email: cleanEmail,
      displayName: invite.displayName.trim(),
      role: invite.role,
      branchId: invite.branchId || 'all',
      department: invite.department?.trim() || undefined,
      designation: invite.designation?.trim() || undefined,
      status: 'pending',
      hasAccessPasscode: Boolean(invite.password?.trim()),
      accessPasscodeHash: passcodeHash,
      invitedByUid: activeCloudUid || currentUser?.id || 'USR-001',
      createdAt: nowIso,
    };

    if (activeCloudUid) {
      await upsertCloudInvite(newInvite, activeCloudUid);
    }
    setUserInvites((prev) => [newInvite, ...prev.filter((i) => i.id !== cleanEmail)]);
    addAuditLog('CREATE', 'User', `Invited ${newInvite.displayName} (${cleanEmail}) with role [${newInvite.role}] on branch [${newInvite.branchId}].`);
  };

  const updateWorkspaceUser = async (
    uid: string,
    updates: Partial<Pick<WorkspaceUserAccount, 'role' | 'branchId' | 'status' | 'department' | 'designation'>>
  ) => {
    const target = userDirectory.find((u) => u.uid === uid);
    setUserDirectory((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...updates } : u)));
    if (activeCloudUid) {
      const nextRole = updates.role ?? target?.role ?? 'employee';
      const nextBranch = updates.branchId ?? target?.branchId ?? 'all';
      const nextStatus = updates.status ?? target?.status ?? 'active';
      const nextDept = updates.department ?? target?.department;
      const nextDesig = updates.designation ?? target?.designation;
      const nextDisplayName = target?.displayName || 'Workspace User';

      await updateCloudWorkspaceUser(
        uid,
        {
          uid,
          displayName: nextDisplayName,
          role: nextRole,
          branchId: nextBranch,
          status: nextStatus,
          department: nextDept,
          designation: nextDesig,
          lastDeviceType: target?.lastDeviceType,
          lastDeviceLabel: target?.lastDeviceLabel,
          lastActiveAt: target?.lastActiveAt,
        },
        {
          uid,
          email: target?.email,
          displayName: nextDisplayName,
          role: nextRole,
          branchId: nextBranch,
          status: nextStatus,
          department: nextDept,
          designation: nextDesig,
        },
        activeCloudUid
      );
    }
    addAuditLog('UPDATE', 'User', `Updated access policy for user ${target?.displayName || uid}.`);
  };

  const deleteWorkspaceUser = async (uid: string) => {
    if (!uid) return;
    if (firebaseUser?.uid === uid) {
      throw new Error('You cannot delete your own currently active Super Admin session.');
    }
    const target = userDirectory.find((u) => u.uid === uid);
    if (activeCloudUid) {
      await deleteCloudWorkspaceUser(uid, activeCloudUid);
    }
    setUserDirectory((prev) => prev.filter((u) => u.uid !== uid));
    addAuditLog('DELETE', 'User', `Removed workspace user ${target?.displayName || uid} and revoked cloud access.`);
  };

  const revokeUserInvite = async (inviteId: string) => {
    setUserInvites((prev) => prev.filter((i) => i.id !== inviteId));
    if (activeCloudUid) {
      await removeCloudDoc('user_invites', inviteId, activeCloudUid);
    }
    addAuditLog('DELETE', 'User', `Revoked pending workspace invitation for ${inviteId}.`);
  };

  const removeDeviceSession = async (sessionId: string) => {
    setDeviceSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeCloudUid) {
      await removeCloudDoc('device_sessions', sessionId, activeCloudUid);
    }
    addAuditLog('DELETE', 'Device', `Removed connected device session ${sessionId}.`);
  };

  // Multi-Branch Helpers & CRUD
  const getBranchName = (branchId?: string): string => {
    if (!branchId || branchId === 'all') return 'All Branches (Consolidated)';
    if (branchId === 'HEAD_OFFICE' || branchId.toLowerCase() === 'head office') return 'Head Office';
    const matched = branches.find((b) => b.id === branchId);
    return matched ? `${matched.code} · ${matched.name}` : branchId;
  };

  const addBranch = (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Branch => {
    const cleanCode = (branch.code || 'BR').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    const newId = `BR-${cleanCode}-${Date.now().toString().slice(-3)}`;
    const nowIso = new Date().toISOString();
    const newBranch: Branch = {
      ...branch,
      id: newId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setBranches((prev) => [...prev, newBranch]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('branches', newId, { ...newBranch }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Branch', `Registered branch ${newBranch.name} (${newBranch.code}) in ${newBranch.city}.`);
    return newBranch;
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    const nowIso = new Date().toISOString();
    const existingList = latestWorkspaceRef.current.branches;
    const nextList = existingList.map((b) => {
      if (b.id !== id) {
        return updates.isHeadquarters ? { ...b, isHeadquarters: false } : b;
      }
      return { ...b, ...updates, updatedAt: nowIso };
    });
    setBranches(nextList);
    latestWorkspaceRef.current.branches = nextList;
    const updated = nextList.find((b) => b.id === id);
    if (updated && activeCloudUid) {
      syncUpsertCloudDoc('branches', id, { ...updated }, activeCloudUid);
    }
    if (updates.isHeadquarters && activeCloudUid) {
      nextList
        .filter((b) => b.id !== id)
        .forEach((b) => syncUpsertCloudDoc('branches', b.id, { ...b }, activeCloudUid));
    }
    addAuditLog('UPDATE', 'Branch', `Updated branch configuration for ${id}.`);
  };

  const deleteBranch = (id: string) => {
    const target = branches.find((b) => b.id === id);
    setBranches((prev) => {
      const next = prev.filter((b) => b.id !== id);
      latestWorkspaceRef.current.branches = next;
      return next;
    });
    if (activeBranchId === id) {
      setActiveBranchId('all');
    }
    if (activeCloudUid) {
      syncRemoveCloudDoc('branches', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Branch', `Decommissioned branch ${target?.name || id}.`);
  };

  // Currency & Corporate Settings Cloud Payload Helper
  const buildCorporateSettingsPayload = (
    entity: CorporateLegalEntity,
    extras: {
      villaTypes: string[];
      trades: string[];
      invCategories: string[];
      invUOMs: string[];
      invWarehouses: string[];
    }
  ): Record<string, unknown> => ({
    id: 'primary',
    companyName: String(entity.companyName || '').trim().slice(0, 160),
    legalName: String(entity.legalName || '').trim().slice(0, 200),
    logoUrl: String(entity.logoUrl || '').trim(),
    crNumber: String(entity.crNumber || '').trim().slice(0, 64),
    vatNumber: String(entity.vatNumber || '').trim().slice(0, 64),
    email: String(entity.email || '').trim().slice(0, 120),
    phone: String(entity.phone || '').trim().slice(0, 40),
    address: String(entity.address || '').trim().slice(0, 300),
    bankName: String(entity.bankName || '').trim().slice(0, 120),
    accountTitle: String(entity.accountTitle || '').trim().slice(0, 160),
    iban: String(entity.iban || '').trim().slice(0, 64),
    swiftCode: String(entity.swiftCode || '').trim().slice(0, 32),
    baseCurrency: String(entity.baseCurrency || 'SAR').trim().slice(0, 16) || 'SAR',
    customVillaTypes: (extras.villaTypes || []).slice(0, 200),
    manpowerTrades: (extras.trades || []).slice(0, 200),
    inventoryCategories: (extras.invCategories || []).slice(0, 200),
    inventoryUOMs: (extras.invUOMs || []).slice(0, 200),
    inventoryWarehouses: (extras.invWarehouses || []).slice(0, 200),
  });

  // Currency Handling
  const baseCurrency = corporateEntity.baseCurrency || 'SAR';

  const setBaseCurrency = (currencyCode: string) => {
    const latest = latestWorkspaceRef.current;
    const next: CorporateLegalEntity = {
      ...latest.corporateEntity,
      baseCurrency: currencyCode,
    };
    setCorporateEntity(next);
    latestWorkspaceRef.current.corporateEntity = next;
    if (activeCloudUid && canPerformAdminAction) {
      const cloudPayload = buildCorporateSettingsPayload(next, {
        villaTypes: latest.customVillaTypes,
        trades: latest.manpowerTrades,
        invCategories: latest.inventoryCategories,
        invUOMs: latest.inventoryUOMs,
        invWarehouses: latest.inventoryWarehouses,
      });
      void upsertCloudDoc('corporate_settings', 'primary', cloudPayload, activeCloudUid).catch((err) => {
        setCloudSyncError(err instanceof Error ? err.message : 'Failed to sync base currency setting.');
      });
    }
    addAuditLog(
      'UPDATE',
      'Settings',
      `Base operating currency changed to ${currencyCode}. Automatic recalculation applied to all compensation and expenses.`
    );
  };

  const currentCurrencyObj =
    SUPPORTED_CURRENCIES.find((c) => c.code === baseCurrency) || SUPPORTED_CURRENCIES[0];

  const currentCurrencySymbol = currentCurrencyObj.symbol;

  const getRawConvertedAmount = (amountInSAR: number): number => {
    if (baseCurrency === 'SAR') return amountInSAR;
    const rate = currentCurrencyObj.rateToSAR; // e.g. 3.75 for USD
    return amountInSAR / rate;
  };

  const formatCurrency = (amountInSAR: number, hideSymbol = false): string => {
    const converted = getRawConvertedAmount(amountInSAR);
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted);

    if (hideSymbol) return formattedNum;
    if (baseCurrency === 'SAR') {
      return `${formattedNum} SAR`;
    }
    return `${currentCurrencySymbol} ${formattedNum}`;
  };

  // Role switching
  const switchRole = (role: RoleTier) => {
    setCurrentRole(role);
    if (currentUser) {
      const updatedUser: AuthUser = { ...currentUser, role };
      setCurrentUser(updatedUser);
      localStorage.setItem('apex_auth_user', JSON.stringify(updatedUser));
    }
    addAuditLog('ROLE_SWITCH', 'Settings', `Operational role switched to ${role}.`);
  };

  const login = (emailOrId: string, _password?: string, targetRole?: RoleTier): boolean => {
    const cleanInput = (emailOrId || '').trim().toLowerCase();
    if (!cleanInput) return false;

    // Check Demo Accounts by role key, email, or user ID
    for (const [roleKey, demoUser] of Object.entries(DEMO_ACCOUNTS)) {
      if (
        demoUser.email.toLowerCase() === cleanInput ||
        demoUser.id.toLowerCase() === cleanInput ||
        roleKey.toLowerCase() === cleanInput
      ) {
        const authedUser: AuthUser = {
          ...demoUser,
          lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(),
        };
        setCurrentUser(authedUser);
        setIsAuthenticated(true);
        setCurrentRole(demoUser.role);
        localStorage.setItem('apex_auth_user', JSON.stringify(authedUser));
        addAuditLog('LOGIN', 'User', `${authedUser.fullName} (${authedUser.role}) logged in successfully.`);
        return true;
      }
    }

    // Check Employees directory by email or Employee ID
    const foundEmp = employees.find(
      (e) => e.email.toLowerCase() === cleanInput || e.id.toLowerCase() === cleanInput
    );
    if (foundEmp) {
      const empUser: AuthUser = {
        id: foundEmp.id,
        fullName: foundEmp.fullName,
        email: foundEmp.email,
        role: targetRole || 'employee',
        avatar: foundEmp.profileImage,
        department: foundEmp.department,
        designation: foundEmp.designation,
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(),
      };
      setCurrentUser(empUser);
      setIsAuthenticated(true);
      setCurrentRole(empUser.role);
      localStorage.setItem('apex_auth_user', JSON.stringify(empUser));
      addAuditLog('LOGIN', 'User', `${empUser.fullName} signed in with role ${empUser.role}.`);
      return true;
    }

    // Generic valid email address fallback
    if (cleanInput.includes('@')) {
      const namePart = cleanInput.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const role = targetRole || 'super_admin';
      const customUser: AuthUser = {
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        fullName: formattedName,
        email: emailOrId.trim(),
        role: role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        department: role === 'employee' ? 'Engineering' : 'Executive Governance',
        designation: role === 'super_admin' ? 'System Administrator' : 'Authorized Personnel',
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
      };
      setCurrentUser(customUser);
      setIsAuthenticated(true);
      setCurrentRole(role);
      localStorage.setItem('apex_auth_user', JSON.stringify(customUser));
      addAuditLog('LOGIN', 'User', `${customUser.fullName} logged in with role ${role}.`);
      return true;
    }

    return false;
  };

  const logout = () => {
    void signOutCloud();
  };

  const loginAsPersona = (role: RoleTier) => {
    const demo = DEMO_ACCOUNTS[role];
    if (demo) {
      const user: AuthUser = {
        ...demo,
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      setCurrentRole(role);
      localStorage.setItem('apex_auth_user', JSON.stringify(user));
      addAuditLog('LOGIN', 'User', `${user.fullName} quick-authenticated as ${role}.`);
    }
  };

  const canPerformAdminAction = currentRole === 'super_admin';
  const canPerformBranchAdminAction = currentRole === 'super_admin' || currentRole === 'branch_admin';
  const canPerformHrAction = currentRole === 'super_admin' || currentRole === 'branch_admin' || currentRole === 'hr_manager';
  const canPerformFinanceAction = currentRole === 'super_admin' || currentRole === 'branch_admin' || currentRole === 'finance_officer';
  const isEmployeeViewOnly = currentRole === 'employee';

  // Standard employee persona user (Omar Farooq or matching logged in employee)
  const currentEmployeeUser =
    (currentUser?.role === 'employee' &&
      employees.find((e) => e.email.toLowerCase() === currentUser.email.toLowerCase() || e.id === currentUser.id)) ||
    employees.find((e) => e.id === 'EMP-1005') ||
    employees[0] ||
    INITIAL_EMPLOYEES[0];

  // Sequential Unique Employee ID Generator (Collision-Safe Across Deletions & Batches)
  const getNextEmployeeId = (existingList: Employee[], offset = 0): string => {
    const maxNum = existingList.reduce((max, emp) => {
      const match = /^EMP-(\d+)$/.exec(emp.id || '');
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    let candidateNum = maxNum + 1 + offset;
    while (existingList.some((emp) => emp.id === `EMP-${candidateNum}`)) {
      candidateNum += 1;
    }
    return `EMP-${candidateNum}`;
  };

  // Employee CRUD & Salary Editing
  const addEmployee = (data: Omit<Employee, 'id' | 'annualBaseSalary' | 'totalMonthlyPackage'>) => {
    const currentEmployees = latestWorkspaceRef.current.employees;
    const newId = getNextEmployeeId(currentEmployees);
    const base = Math.max(0, Number(data.monthlyBaseSalary) || 0);
    const housing = Math.max(0, Number(data.housingAllowance) || 0);
    const transport = Math.max(0, Number(data.transportAllowance) || 0);
    const other = Math.max(0, Number(data.otherAllowances) || 0);
    const annual = base * 12;
    const totalPkg = base + housing + transport + other;

    const newEmp: Employee = {
      ...data,
      id: newId,
      monthlyBaseSalary: base,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      branchId: data.branchId || defaultActiveBranchId,
      annualBaseSalary: annual,
      totalMonthlyPackage: totalPkg,
    };

    const nextEmployees = [newEmp, ...currentEmployees];
    latestWorkspaceRef.current.employees = nextEmployees;
    setEmployees(nextEmployees);
    if (activeCloudUid) {
      syncUpsertCloudDoc('employees', newId, { ...newEmp }, activeCloudUid);
    }
    addAuditLog(
      'CREATE',
      'Employee',
      `Onboarded employee ${newEmp.fullName} (${newEmp.id}) with designation ${newEmp.designation}.`
    );
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const currentEmployees = latestWorkspaceRef.current.employees;
    let updatedEmp: Employee | null = null;
    const nextEmployees = currentEmployees.map((emp) => {
      if (emp.id !== id) return emp;
      const merged = { ...emp, ...updates };
      merged.monthlyBaseSalary = Math.max(0, Number(merged.monthlyBaseSalary) || 0);
      merged.housingAllowance = Math.max(0, Number(merged.housingAllowance) || 0);
      merged.transportAllowance = Math.max(0, Number(merged.transportAllowance) || 0);
      merged.otherAllowances = Math.max(0, Number(merged.otherAllowances) || 0);
      merged.annualBaseSalary = merged.monthlyBaseSalary * 12;
      merged.totalMonthlyPackage =
        merged.monthlyBaseSalary +
        merged.housingAllowance +
        merged.transportAllowance +
        merged.otherAllowances;
      updatedEmp = merged;
      return merged;
    });
    if (!updatedEmp) return;
    latestWorkspaceRef.current.employees = nextEmployees;
    setEmployees(nextEmployees);
    if (activeCloudUid) {
      syncUpsertCloudDoc('employees', id, { ...(updatedEmp as Employee) }, activeCloudUid);
    }
    addAuditLog('UPDATE', 'Employee', `Updated records for employee ID ${id}.`);
  };

  const deleteEmployee = (id: string) => {
    const currentEmployees = latestWorkspaceRef.current.employees;
    const target = currentEmployees.find((e) => e.id === id);
    const nextEmployees = currentEmployees.filter((e) => e.id !== id);
    latestWorkspaceRef.current.employees = nextEmployees;
    setEmployees(nextEmployees);

    const currentWorkers = latestWorkspaceRef.current.suppliedWorkers;
    const unlinkedWorkers: SuppliedWorker[] = [];
    const nextWorkers = currentWorkers.map((w) => {
      if (w.linkedEmployeeId === id) {
        const cleaned: SuppliedWorker = {
          ...w,
          linkedEmployeeId: undefined,
          isAddedToDirectory: false,
        };
        unlinkedWorkers.push(cleaned);
        return cleaned;
      }
      return w;
    });
    if (unlinkedWorkers.length > 0) {
      latestWorkspaceRef.current.suppliedWorkers = nextWorkers;
      setSuppliedWorkers(nextWorkers);
    }

    if (activeCloudUid) {
      syncRemoveCloudDoc('employees', id, activeCloudUid);
      unlinkedWorkers.forEach((w) => syncUpsertCloudDoc('supplied_workers', w.id, { ...w }, activeCloudUid));
    }
    addAuditLog('DELETE', 'Employee', `Deleted employee record ${target?.fullName || id}.`);
  };

  const updateSalary = (
    id: string,
    monthlyBase: number,
    housing: number,
    transport: number,
    other: number,
    reasonNotes: string
  ) => {
    const currentEmployees = latestWorkspaceRef.current.employees;
    let updatedEmp: Employee | null = null;
    const cleanBase = Math.max(0, Number(monthlyBase) || 0);
    const cleanHousing = Math.max(0, Number(housing) || 0);
    const cleanTransport = Math.max(0, Number(transport) || 0);
    const cleanOther = Math.max(0, Number(other) || 0);
    const nextEmployees = currentEmployees.map((emp) => {
      if (emp.id !== id) return emp;
      const merged: Employee = {
        ...emp,
        monthlyBaseSalary: cleanBase,
        housingAllowance: cleanHousing,
        transportAllowance: cleanTransport,
        otherAllowances: cleanOther,
        annualBaseSalary: cleanBase * 12,
        totalMonthlyPackage: cleanBase + cleanHousing + cleanTransport + cleanOther,
      };
      updatedEmp = merged;
      return merged;
    });
    if (!updatedEmp) return;
    latestWorkspaceRef.current.employees = nextEmployees;
    setEmployees(nextEmployees);
    if (activeCloudUid) {
      syncUpsertCloudDoc('employees', id, { ...(updatedEmp as Employee) }, activeCloudUid);
    }
    addAuditLog(
      'SALARY_EDIT',
      'Salary',
      `Modified compensation structure for employee ${id}. New Base: ${cleanBase} SAR/mo (${cleanBase * 12} SAR/yr). Reason: ${reasonNotes}`
    );
  };

  // Departments & Designations
  const addDepartment = (dept: Omit<Department, 'id'>) => {
    const newId = `DEP-${String(departments.length + 1).padStart(2, '0')}`;
    const newDept: Department = { ...dept, id: newId, branchId: dept.branchId || defaultActiveBranchId };
    setDepartments((prev) => [...prev, newDept]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('departments', newId, { ...newDept }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Settings', `Added operating department: ${dept.name} (${dept.code}).`);
  };

  const updateDepartment = (id: string, updates: Partial<Department>) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('departments', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Settings', `Updated operating department: ${updates.name || id}.`);
  };

  const deleteDepartment = (id: string) => {
    const target = departments.find((d) => d.id === id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('departments', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Settings', `Deleted operating department: ${target?.name || id}.`);
  };

  const addDesignation = (des: Omit<Designation, 'id'>) => {
    const newId = `DES-${String(designations.length + 1).padStart(2, '0')}`;
    const newDes = { ...des, id: newId, branchId: des.branchId || defaultActiveBranchId };
    setDesignations((prev) => [...prev, newDes]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('designations', newId, { ...newDes }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Settings', `Created job title & designation: ${des.title}.`);
  };

  const updateDesignation = (id: string, updates: Partial<Designation>) => {
    setDesignations((prev) =>
      prev.map((des) => {
        if (des.id !== id) return des;
        const updated = { ...des, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('designations', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Settings', `Updated job title & designation: ${updates.title || id}.`);
  };

  const deleteDesignation = (id: string) => {
    const target = designations.find((d) => d.id === id);
    setDesignations((prev) => prev.filter((d) => d.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('designations', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Settings', `Deleted job title & designation: ${target?.title || id}.`);
  };

  // Timesheet Management
  const getTimesheetEntry = (empId: string, date: string) => {
    return timesheetEntries.find((e) => e.employeeId === empId && e.date === date);
  };

  const updateTimesheetCell = (
    empId: string,
    date: string,
    regularHours: number,
    overtimeHours: number,
    status: TimesheetStatus,
    notes?: string
  ) => {
    const existing = timesheetEntries.find((e) => e.employeeId === empId && e.date === date);
    const emp = employees.find((e) => e.id === empId);

    if (existing) {
      const updatedEntry: TimesheetEntry = {
        ...existing,
        regularHours,
        overtimeHours,
        status,
        notes: notes ?? existing.notes,
        branchId: existing.branchId || emp?.branchId || defaultActiveBranchId,
        updatedBy: currentRole,
        updatedAt: new Date().toISOString(),
      };
      setTimesheetEntries((prev) =>
        prev.map((entry) => (entry.id === existing.id ? updatedEntry : entry))
      );
      if (activeCloudUid) {
        syncUpsertCloudDoc('timesheet_entries', existing.id, { ...updatedEntry }, activeCloudUid);
      }
    } else {
      const newEntry: TimesheetEntry = {
        id: `TS-${empId}-${date}`,
        employeeId: empId,
        date,
        regularHours,
        overtimeHours,
        status,
        notes,
        branchId: emp?.branchId || defaultActiveBranchId,
        updatedBy: currentRole,
        updatedAt: new Date().toISOString(),
      };
      setTimesheetEntries((prev) => [...prev, newEntry]);
      if (activeCloudUid) {
        syncUpsertCloudDoc('timesheet_entries', newEntry.id, { ...newEntry }, activeCloudUid);
      }
    }

    addAuditLog(
      'TIMESHEET_LOG',
      'Timesheet',
      `Logged timesheet for ${emp?.fullName || empId} on ${date}: ${regularHours}h regular, ${overtimeHours}h OT, status [${status}].`
    );
  };

  const clearAllTimesheetForMonth = (year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const toRemove = timesheetEntries.filter((e) => e.date.startsWith(prefix));
    setTimesheetEntries((prev) => prev.filter((e) => !e.date.startsWith(prefix)));
    if (activeCloudUid) {
      toRemove.forEach((e) => syncRemoveCloudDoc('timesheet_entries', e.id, activeCloudUid));
    }
    addAuditLog(
      'DELETE',
      'Timesheet',
      `Purged all timesheet records for period ${prefix} as requested.`
    );
  };

  const clearEmployeeTimesheetForMonth = (employeeId: string, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const toRemove = timesheetEntries.filter((e) => e.employeeId === employeeId && e.date.startsWith(prefix));
    setTimesheetEntries((prev) =>
      prev.filter((e) => !(e.employeeId === employeeId && e.date.startsWith(prefix)))
    );
    if (activeCloudUid) {
      toRemove.forEach((e) => syncRemoveCloudDoc('timesheet_entries', e.id, activeCloudUid));
    }
    addAuditLog(
      'DELETE',
      'Timesheet',
      `Cleared timesheet records for employee ${employeeId} for period ${prefix}.`
    );
  };

  const batchUpdateTimesheetCells = (
    updates: {
      empId: string;
      date: string;
      regularHours: number;
      overtimeHours: number;
      status: TimesheetStatus;
      notes?: string;
    }[],
    auditSummary?: string
  ) => {
    if (updates.length === 0) return;

    const currentList = latestWorkspaceRef.current.timesheetEntries;
    const empBranchMap = new Map<string, string>();
    latestWorkspaceRef.current.employees.forEach((emp) => {
      if (emp.branchId) empBranchMap.set(emp.id, emp.branchId);
    });

    const map = new Map<string, TimesheetEntry>();
    currentList.forEach((e) => map.set(`${e.employeeId}_${e.date}`, e));

    const now = new Date().toISOString();
    const syncedBatch: TimesheetEntry[] = [];
    updates.forEach((u) => {
      const key = `${u.empId}_${u.date}`;
      const existing = map.get(key);
      const branchId = existing?.branchId || empBranchMap.get(u.empId) || defaultActiveBranchId;
      if (existing) {
        const updatedEntry: TimesheetEntry = {
          ...existing,
          regularHours: u.regularHours,
          overtimeHours: u.overtimeHours,
          status: u.status,
          notes: u.notes ?? existing.notes,
          branchId,
          updatedBy: currentRole,
          updatedAt: now,
        };
        map.set(key, updatedEntry);
        syncedBatch.push(updatedEntry);
      } else {
        const newEntry: TimesheetEntry = {
          id: `TS-${u.empId}-${u.date}`,
          employeeId: u.empId,
          date: u.date,
          regularHours: u.regularHours,
          overtimeHours: u.overtimeHours,
          status: u.status,
          notes: u.notes,
          branchId,
          updatedBy: currentRole,
          updatedAt: now,
        };
        map.set(key, newEntry);
        syncedBatch.push(newEntry);
      }
    });

    const nextEntries = Array.from(map.values());
    setTimesheetEntries(nextEntries);
    latestWorkspaceRef.current.timesheetEntries = nextEntries;

    if (activeCloudUid) {
      syncedBatch.forEach((entry) => {
        syncUpsertCloudDoc('timesheet_entries', entry.id, { ...entry }, activeCloudUid);
      });
    }

    addAuditLog(
      'TIMESHEET_LOG',
      'Timesheet',
      auditSummary || `Batch adjusted timesheet work hours across ${updates.length} daily entries.`
    );
  };

  // Leaves
  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newId = `LV-${Date.now()}`;
    const emp = employees.find((e) => e.id === req.employeeId);
    const newReq: LeaveRequest = {
      ...req,
      id: newId,
      branchId: req.branchId || emp?.branchId || defaultActiveBranchId,
      status: 'pending',
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('leave_requests', newId, { ...newReq }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Leave', `Submitted ${req.leaveType} for ${req.employeeName} (${req.totalDays} days).`);
  };

  const approveLeaveRequest = (id: string) => {
    setLeaveRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated: LeaveRequest = {
          ...r,
          status: 'approved',
          reviewedBy: currentRole,
          reviewDate: new Date().toISOString().substring(0, 10),
        };
        if (activeCloudUid) {
          syncUpsertCloudDoc('leave_requests', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('APPROVE', 'Leave', `Approved leave request ${id}.`);
  };

  const rejectLeaveRequest = (id: string, reason: string) => {
    setLeaveRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated: LeaveRequest = {
          ...r,
          status: 'rejected',
          rejectionReason: reason,
          reviewedBy: currentRole,
          reviewDate: new Date().toISOString().substring(0, 10),
        };
        if (activeCloudUid) {
          syncUpsertCloudDoc('leave_requests', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('REJECT', 'Leave', `Rejected leave request ${id}. Reason: ${reason}`);
  };

  const deleteLeaveRequest = (id: string) => {
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('leave_requests', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Leave', `Deleted leave request record ${id}.`);
  };

  // Accounting Categories & Expenses
  const addAccountingCategory = (cat: Omit<AccountingCategory, 'id'>) => {
    const newId = `CAT-${Date.now().toString().slice(-4)}`;
    const newCat = { ...cat, id: newId };
    setAccountingCategories((prev) => [...prev, newCat]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('accounting_categories', newId, { ...newCat }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Category', `Created accounting category ${cat.name} (${cat.code}).`);
  };

  const updateAccountingCategory = (id: string, cat: Partial<AccountingCategory>) => {
    setAccountingCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...cat };
        if (activeCloudUid) {
          syncUpsertCloudDoc('accounting_categories', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Category', `Updated accounting category ${id}.`);
  };

  const deleteAccountingCategory = (id: string) => {
    setAccountingCategories((prev) => prev.filter((c) => c.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('accounting_categories', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Category', `Deleted accounting category ${id}.`);
  };

  const addExpense = (exp: Omit<Expense, 'id' | 'expenseNumber' | 'status'>) => {
    const expNum = `EXP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(3, '0')}`;
    const newId = `EXP-${Date.now()}`;
    const newExpense: Expense = {
      ...exp,
      id: newId,
      branchId: exp.branchId || defaultActiveBranchId,
      expenseNumber: expNum,
      status: 'pending',
    };
    setExpenses((prev) => [newExpense, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('expenses', newId, { ...newExpense }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Expense', `Submitted expense voucher ${expNum}: ${exp.title} (${exp.amountSAR} SAR).`);
  };

  const approveExpense = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated: Expense = {
          ...e,
          status: 'approved',
          approvedBy: 'Admin Approval (Executive)',
          approvalDate: new Date().toISOString().substring(0, 10),
        };
        if (activeCloudUid) {
          syncUpsertCloudDoc('expenses', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('APPROVE', 'Expense', `Approved expense settlement ${id}.`);
  };

  const rejectExpense = (id: string, notes?: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated: Expense = {
          ...e,
          status: 'rejected',
          notes: notes || e.notes,
          approvedBy: 'Rejected by Finance Admin',
          approvalDate: new Date().toISOString().substring(0, 10),
        };
        if (activeCloudUid) {
          syncUpsertCloudDoc('expenses', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('REJECT', 'Expense', `Rejected expense claim ${id}.`);
  };

  const updateExpense = (id: string, exp: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...exp };
        if (activeCloudUid) {
          syncUpsertCloudDoc('expenses', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Expense', `Updated expense voucher ${id}.`);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('expenses', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Expense', `Deleted expense record ${id}.`);
  };

  // Projects
  const addProject = (prj: Omit<Project, 'id' | 'spentSAR'>) => {
    const newId = `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`;
    const newPrj: Project = {
      ...prj,
      id: newId,
      branchId: prj.branchId || defaultActiveBranchId,
      spentSAR: 0,
    };
    setProjects((prev) => [...prev, newPrj]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('projects', newId, { ...newPrj }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Project', `Created enterprise project: ${prj.name} (${newId}).`);
  };

  const updateProject = (id: string, prj: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...prj };
        if (activeCloudUid) {
          syncUpsertCloudDoc('projects', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Project', `Updated project parameters for ${id}.`);
  };

  const deleteProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('projects', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Project', `Deleted project ${target?.name || id}.`);
  };

  // Asset Categories & Assets
  const addAssetCategory = (cat: Omit<AssetCategory, 'id' | 'assetsCount'>) => {
    const newId = `ACAT-${Date.now().toString().slice(-4)}`;
    const newCat = { ...cat, id: newId, assetsCount: 0 };
    setAssetCategories((prev) => [...prev, newCat]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('asset_categories', newId, { ...newCat }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Category', `Created custom asset category: ${cat.name} (${cat.code}).`);
  };

  const updateAssetCategory = (id: string, cat: Partial<AssetCategory>) => {
    setAssetCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...cat };
        if (activeCloudUid) {
          syncUpsertCloudDoc('asset_categories', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Category', `Updated asset category ${id}.`);
  };

  const deleteAssetCategory = (id: string) => {
    setAssetCategories((prev) => prev.filter((c) => c.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('asset_categories', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Category', `Deleted asset category ${id}.`);
  };

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    const newId = `AST-${Date.now()}`;
    const newAsset: Asset = { ...asset, id: newId, branchId: asset.branchId || defaultActiveBranchId };
    setAssets((prev) => [...prev, newAsset]);
    setAssetCategories((prev) =>
      prev.map((c) => {
        if (c.id !== asset.categoryId) return c;
        const updated = { ...c, assetsCount: c.assetsCount + 1 };
        if (activeCloudUid) {
          syncUpsertCloudDoc('asset_categories', c.id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    if (activeCloudUid) {
      syncUpsertCloudDoc('assets', newId, { ...newAsset }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Asset', `Enrolled asset into inventory: ${asset.name} (${asset.assetTag}).`);
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('assets', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Asset', `Updated asset data for ${id}.`);
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('assets', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Asset', `Removed asset record ${id}.`);
  };

  // Villas & Housing Units Ledger
  const addVilla = (villaData: Omit<Villa, 'id'>): Villa => {
    const newId = `VIL-${Date.now().toString().slice(-4)}`;
    const newVilla: Villa = {
      ...villaData,
      id: newId,
      branchId: villaData.branchId || defaultActiveBranchId,
    };
    setVillas((prev) => [newVilla, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('villas', newId, { ...newVilla }, activeCloudUid);
    }
    addAuditLog(
      'CREATE',
      'Villa',
      `Registered Villa ${villaData.villaNo} in ${villaData.blockNo} (${villaData.villaType}, Qty: ${villaData.villaQuantity}).`
    );
    return newVilla;
  };

  const updateVilla = (id: string, updates: Partial<Villa>) => {
    setVillas((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const updated = { ...v, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('villas', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Villa', `Updated Villa record ${id}.`);
  };

  const deleteVilla = (id: string) => {
    const target = villas.find((v) => v.id === id);
    setVillas((prev) => prev.filter((v) => v.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('villas', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Villa', `Deleted Villa ${target?.villaNo || id} from contracting ledger.`);
  };

  const addCustomVillaType = (typeName: string) => {
    const trimmed = typeName.trim();
    if (!trimmed || customVillaTypes.includes(trimmed)) return;
    const next = [...customVillaTypes, trimmed];
    setCustomVillaTypes(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', customVillaTypes: next }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Villa', `Created custom villa category: "${trimmed}".`);
  };

  const deleteCustomVillaType = (typeName: string) => {
    const next = customVillaTypes.filter((t) => t !== typeName);
    setCustomVillaTypes(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', customVillaTypes: next }, activeCloudUid);
    }
    addAuditLog('DELETE', 'Villa', `Removed custom villa type: "${typeName}".`);
  };

  const addVillaDailyWorkEntity = (
    villaId: string,
    entity: Omit<VillaDailyWorkEntity, 'id' | 'villaId'>
  ): VillaDailyWorkEntity => {
    const newId = `DWE-${Date.now().toString().slice(-6)}`;
    const newEntity: VillaDailyWorkEntity = {
      ...entity,
      id: newId,
      villaId,
    };
    setVillas((prev) =>
      prev.map((v) => {
        if (v.id === villaId) {
          const currentLogs = v.dailyWorkEntities || [];
          const updated = {
            ...v,
            dailyWorkEntities: [newEntity, ...currentLogs],
          };
          if (activeCloudUid) {
            syncUpsertCloudDoc('villas', villaId, { ...updated }, activeCloudUid);
          }
          return updated;
        }
        return v;
      })
    );
    addAuditLog(
      'CREATE',
      'Villa',
      `Logged Daily Work Entity for Villa ${villaId} (${entity.workStage}, Workforce: ${entity.employeeCount} workers).`
    );
    return newEntity;
  };

  const addMultipleVillaDailyWorkEntities = (
    villaId: string,
    entities: Array<Omit<VillaDailyWorkEntity, 'id' | 'villaId'>>
  ): VillaDailyWorkEntity[] => {
    const timestamp = Date.now().toString().slice(-6);
    const newEntities: VillaDailyWorkEntity[] = entities.map((ent, idx) => ({
      ...ent,
      id: `DWE-${timestamp}-${idx + 1}-${Math.floor(Math.random() * 900 + 100)}`,
      villaId,
    }));
    setVillas((prev) =>
      prev.map((v) => {
        if (v.id === villaId) {
          const currentLogs = v.dailyWorkEntities || [];
          const updated = {
            ...v,
            dailyWorkEntities: [...newEntities, ...currentLogs],
          };
          if (activeCloudUid) {
            syncUpsertCloudDoc('villas', villaId, { ...updated }, activeCloudUid);
          }
          return updated;
        }
        return v;
      })
    );
    addAuditLog(
      'CREATE',
      'Villa',
      `Logged ${entities.length} Daily Work Entities for Villa ${villaId}.`
    );
    return newEntities;
  };

  const updateVillaDailyWorkEntity = (
    villaId: string,
    entityId: string,
    updates: Partial<VillaDailyWorkEntity>
  ) => {
    setVillas((prev) =>
      prev.map((v) => {
        if (v.id === villaId) {
          const currentLogs = v.dailyWorkEntities || [];
          const updated = {
            ...v,
            dailyWorkEntities: currentLogs.map((log) =>
              log.id === entityId ? { ...log, ...updates } : log
            ),
          };
          if (activeCloudUid) {
            syncUpsertCloudDoc('villas', villaId, { ...updated }, activeCloudUid);
          }
          return updated;
        }
        return v;
      })
    );
    addAuditLog('UPDATE', 'Villa', `Updated Daily Work Entity ${entityId} on Villa ${villaId}.`);
  };

  const deleteVillaDailyWorkEntity = (villaId: string, entityId: string) => {
    setVillas((prev) =>
      prev.map((v) => {
        if (v.id === villaId) {
          const currentLogs = v.dailyWorkEntities || [];
          const updated = {
            ...v,
            dailyWorkEntities: currentLogs.filter((log) => log.id !== entityId),
          };
          if (activeCloudUid) {
            syncUpsertCloudDoc('villas', villaId, { ...updated }, activeCloudUid);
          }
          return updated;
        }
        return v;
      })
    );
    addAuditLog('DELETE', 'Villa', `Deleted Daily Work Entity ${entityId} on Villa ${villaId}.`);
  };

  // Manpower Suppliers
  const addManpowerSupplier = (supplier: Omit<ManpowerSupplier, 'id'>) => {
    const newId = `SUP-${Date.now().toString().slice(-4)}`;
    const newSupplier: ManpowerSupplier = {
      ...supplier,
      id: newId,
      branchId: supplier.branchId || defaultActiveBranchId,
    };
    setManpowerSuppliers((prev) => [newSupplier, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('manpower_suppliers', newId, { ...newSupplier }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Manpower', `Onboarded Manpower Supplier: ${supplier.name} (${supplier.code}).`);
  };

  const updateManpowerSupplier = (id: string, updates: Partial<ManpowerSupplier>) => {
    setManpowerSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('manpower_suppliers', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Manpower', `Updated supplier records for ${id}.`);
  };

  const deleteManpowerSupplier = (id: string) => {
    const linked = suppliedWorkers.filter((w) => w.supplierId === id);
    setManpowerSuppliers((prev) => prev.filter((s) => s.id !== id));
    setSuppliedWorkers((prev) => prev.filter((w) => w.supplierId !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('manpower_suppliers', id, activeCloudUid);
      linked.forEach((w) => syncRemoveCloudDoc('supplied_workers', w.id, activeCloudUid));
    }
    addAuditLog('DELETE', 'Manpower', `Deleted manpower supplier ${id} and linked workforce.`);
  };

  const addSuppliedWorker = (worker: Omit<SuppliedWorker, 'id'>, alsoAddToDirectory?: boolean) => {
    const newId = `WRK-${Date.now().toString().slice(-4)}`;
    const resolvedBranchId = worker.branchId || defaultActiveBranchId;
    let linkedEmpId: string | undefined = undefined;

    if (alsoAddToDirectory) {
      const currentEmps = latestWorkspaceRef.current.employees;
      const newEmpId = getNextEmployeeId(currentEmps);
      linkedEmpId = newEmpId;
      const monthlyRate = worker.hourlyRateSAR * (worker.monthlyHoursLogged || 176);

      const newEmp: Employee = {
        id: newEmpId,
        fullName: worker.fullName,
        email: `${worker.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@outsourced.nexusglobal.sa`,
        phone: worker.contactPhone || '+966 50 000 0000',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        department: worker.assignedProjectName ? `Field Operations - ${worker.assignedProjectName}` : 'Outsourced Field Operations',
        operatingDepartment: `${worker.supplierName} (Labor Contracting)`,
        designation: worker.designation || 'Field Operations Specialist',
        roleTier: 'employee',
        nationality: 'Outsourced Resident',
        iqamaNationalId: worker.iqamaOrWorkPermit || '2000000000',
        passportNumber: `PA-${worker.iqamaOrWorkPermit ? worker.iqamaOrWorkPermit.slice(-6) : '889900'}`,
        passportExpiry: '2028-12-31',
        joiningDate: worker.joiningDate || new Date().toISOString().substring(0, 10),
        status: worker.status === 'active' ? 'active' : 'inactive',
        employmentType: 'Contract',
        monthlyBaseSalary: monthlyRate,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        annualBaseSalary: monthlyRate * 12,
        totalMonthlyPackage: monthlyRate,
        isOutsourced: true,
        supplierId: worker.supplierId,
        supplierName: worker.supplierName,
        outsourcedWorkerId: newId,
        trade: worker.trade,
        branchId: resolvedBranchId,
      };

      setEmployees((prev) => [newEmp, ...prev]);
      if (activeCloudUid) {
        syncUpsertCloudDoc('employees', newEmpId, { ...newEmp }, activeCloudUid);
      }
    }

    const newWorker: SuppliedWorker = {
      ...worker,
      id: newId,
      branchId: resolvedBranchId,
      linkedEmployeeId: linkedEmpId,
      isAddedToDirectory: Boolean(alsoAddToDirectory),
    };

    setSuppliedWorkers((prev) => [newWorker, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('supplied_workers', newId, { ...newWorker }, activeCloudUid);
    }
    setManpowerSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== worker.supplierId) return s;
        const updated = { ...s, deployedWorkersCount: (s.deployedWorkersCount || 0) + 1 };
        if (activeCloudUid) {
          syncUpsertCloudDoc('manpower_suppliers', s.id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('CREATE', 'Manpower', `Deployed outsourced worker ${worker.fullName} (${worker.trade})${alsoAddToDirectory ? ' and added to Employee Directory' : ''}.`);
    return newWorker;
  };

  const updateSuppliedWorker = (id: string, updates: Partial<SuppliedWorker>) => {
    setSuppliedWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const updated = { ...w, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('supplied_workers', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Manpower', `Updated supplied worker profile ${id}.`);
  };

  const deleteSuppliedWorker = (id: string) => {
    setSuppliedWorkers((prev) => prev.filter((w) => w.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('supplied_workers', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Manpower', `Removed supplied worker ${id}.`);
  };

  const addSuppliedWorkerToEmployeeDirectory = (workerId: string): Employee | null => {
    const worker = suppliedWorkers.find((w) => w.id === workerId);
    if (!worker) return null;

    // Check if already in directory
    const existing = employees.find(
      (e) => e.outsourcedWorkerId === worker.id || (worker.iqamaOrWorkPermit && e.iqamaNationalId === worker.iqamaOrWorkPermit)
    );
    if (existing) {
      if (!worker.linkedEmployeeId || !worker.isAddedToDirectory) {
        const updatedWorker = { ...worker, linkedEmployeeId: existing.id, isAddedToDirectory: true };
        setSuppliedWorkers((prev) =>
          prev.map((w) => (w.id === worker.id ? updatedWorker : w))
        );
        if (activeCloudUid) {
          syncUpsertCloudDoc('supplied_workers', worker.id, { ...updatedWorker }, activeCloudUid);
        }
      }
      return existing;
    }

    const currentEmps = latestWorkspaceRef.current.employees;
    const newEmpId = getNextEmployeeId(currentEmps);
    const monthlyRate = worker.hourlyRateSAR * (worker.monthlyHoursLogged || 176);

    const newEmp: Employee = {
      id: newEmpId,
      fullName: worker.fullName,
      email: `${worker.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@outsourced.nexusglobal.sa`,
      phone: worker.contactPhone || '+966 50 000 0000',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      department: worker.assignedProjectName ? `Field Operations - ${worker.assignedProjectName}` : 'Outsourced Field Operations',
      operatingDepartment: `${worker.supplierName} (Labor Contracting)`,
      designation: worker.designation || 'Field Operations Specialist',
      roleTier: 'employee',
      nationality: 'Outsourced Resident',
      iqamaNationalId: worker.iqamaOrWorkPermit || '2000000000',
      passportNumber: `PA-${worker.iqamaOrWorkPermit ? worker.iqamaOrWorkPermit.slice(-6) : '889900'}`,
      passportExpiry: '2028-12-31',
      joiningDate: worker.joiningDate || new Date().toISOString().substring(0, 10),
      status: worker.status === 'active' ? 'active' : 'inactive',
      employmentType: 'Contract',
      monthlyBaseSalary: monthlyRate,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      annualBaseSalary: monthlyRate * 12,
      totalMonthlyPackage: monthlyRate,
      isOutsourced: true,
      supplierId: worker.supplierId,
      supplierName: worker.supplierName,
      outsourcedWorkerId: worker.id,
      trade: worker.trade,
      branchId: worker.branchId || defaultActiveBranchId,
    };

    const updatedWorker = { ...worker, linkedEmployeeId: newEmpId, isAddedToDirectory: true };
    setEmployees((prev) => [newEmp, ...prev]);
    setSuppliedWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? updatedWorker : w))
    );
    if (activeCloudUid) {
      syncUpsertCloudDoc('employees', newEmpId, { ...newEmp }, activeCloudUid);
      syncUpsertCloudDoc('supplied_workers', worker.id, { ...updatedWorker }, activeCloudUid);
    }

    addAuditLog(
      'CREATE',
      'Employee',
      `Enrolled outsourced worker ${worker.fullName} (${worker.supplierName}) into Employee Directory as ${newEmpId}.`
    );

    return newEmp;
  };

  const addAllSuppliedWorkersToEmployeeDirectory = (): number => {
    let count = 0;
    const toAdd: Employee[] = [];
    const idMap = new Map<string, string>();

    suppliedWorkers.forEach((worker) => {
      const alreadyExists = employees.some(
        (e) => e.outsourcedWorkerId === worker.id || (worker.iqamaOrWorkPermit && e.iqamaNationalId === worker.iqamaOrWorkPermit)
      );

      if (!alreadyExists) {
        const newEmpId = getNextEmployeeId(latestWorkspaceRef.current.employees, toAdd.length);
        const monthlyRate = worker.hourlyRateSAR * (worker.monthlyHoursLogged || 176);

        const newEmp: Employee = {
          id: newEmpId,
          fullName: worker.fullName,
          email: `${worker.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@outsourced.nexusglobal.sa`,
          phone: worker.contactPhone || '+966 50 000 0000',
          profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
          department: worker.assignedProjectName ? `Field Operations - ${worker.assignedProjectName}` : 'Outsourced Field Operations',
          operatingDepartment: `${worker.supplierName} (Labor Contracting)`,
          designation: worker.designation || 'Field Operations Specialist',
          roleTier: 'employee',
          nationality: 'Outsourced Resident',
          iqamaNationalId: worker.iqamaOrWorkPermit || '2000000000',
          passportNumber: `PA-${worker.iqamaOrWorkPermit ? worker.iqamaOrWorkPermit.slice(-6) : '889900'}`,
          passportExpiry: '2028-12-31',
          joiningDate: worker.joiningDate || new Date().toISOString().substring(0, 10),
          status: worker.status === 'active' ? 'active' : 'inactive',
          employmentType: 'Contract',
          monthlyBaseSalary: monthlyRate,
          housingAllowance: 0,
          transportAllowance: 0,
          otherAllowances: 0,
          annualBaseSalary: monthlyRate * 12,
          totalMonthlyPackage: monthlyRate,
          isOutsourced: true,
          supplierId: worker.supplierId,
          supplierName: worker.supplierName,
          outsourcedWorkerId: worker.id,
          trade: worker.trade,
          branchId: worker.branchId || defaultActiveBranchId,
        };

        toAdd.push(newEmp);
        idMap.set(worker.id, newEmpId);
        count++;
      } else {
        const existingEmp = employees.find(
          (e) => e.outsourcedWorkerId === worker.id || (worker.iqamaOrWorkPermit && e.iqamaNationalId === worker.iqamaOrWorkPermit)
        );
        if (existingEmp) {
          idMap.set(worker.id, existingEmp.id);
        }
      }
    });

    if (toAdd.length > 0) {
      setEmployees((prev) => [...toAdd, ...prev]);
      if (activeCloudUid) {
        toAdd.forEach((emp) => syncUpsertCloudDoc('employees', emp.id, { ...emp }, activeCloudUid));
      }
    }

    setSuppliedWorkers((prev) =>
      prev.map((w) => {
        const empId = idMap.get(w.id);
        if (empId) {
          const updated = { ...w, linkedEmployeeId: empId, isAddedToDirectory: true };
          if (activeCloudUid) {
            syncUpsertCloudDoc('supplied_workers', w.id, { ...updated }, activeCloudUid);
          }
          return updated;
        }
        return w;
      })
    );

    if (count > 0) {
      addAuditLog(
        'CREATE',
        'Employee',
        `Batch enrolled ${count} outsourced contractors into corporate Employee Directory.`
      );
    }

    return count;
  };

  const postOutsourcedWorkerHoursToTimesheet = (
    workerId: string,
    year: number,
    month: number,
    customHours?: number
  ): { success: boolean; message: string; employeeId?: string } => {
    const worker = suppliedWorkers.find((w) => w.id === workerId);
    if (!worker) {
      return { success: false, message: 'Worker record not found.' };
    }

    // 1. Ensure worker is in employee directory
    let empId = worker.linkedEmployeeId;
    if (!empId) {
      const createdEmp = addSuppliedWorkerToEmployeeDirectory(workerId);
      empId = createdEmp?.id;
    }

    if (!empId) {
      return { success: false, message: 'Could not resolve linked Employee ID for this contractor.' };
    }

    // 2. Determine hours to log
    const targetHours = customHours !== undefined ? customHours : (worker.monthlyHoursLogged || 176);
    const daysInMonth = new Date(year, month, 0).getDate();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    // Collect working days (Sunday to Thursday)
    const workDays: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workDays.push(`${prefix}-${String(day).padStart(2, '0')}`);
      }
    }

    if (workDays.length === 0) {
      return { success: false, message: 'No working days found for selected month.' };
    }

    const regularPerDay = 8;
    const standardTotal = workDays.length * regularPerDay;
    const overtimeTotal = Math.max(0, targetHours - standardTotal);
    const overtimePerDay = overtimeTotal > 0 ? Number((overtimeTotal / workDays.length).toFixed(1)) : 0;

    const newEntries: TimesheetEntry[] = [];
    workDays.forEach((dateStr) => {
      newEntries.push({
        id: `TS-${empId}-${dateStr}`,
        employeeId: empId!,
        date: dateStr,
        regularHours: regularPerDay,
        overtimeHours: overtimePerDay,
        status: overtimePerDay > 0 ? 'overtime' : 'present',
        notes: `Outsourced contractor labor timesheet via ${worker.supplierName} (${worker.trade}).`,
        branchId: worker.branchId || defaultActiveBranchId,
        updatedBy: currentRole,
        updatedAt: new Date().toISOString(),
      });
    });

    const removed = timesheetEntries.filter((e) => e.employeeId === empId && e.date.startsWith(prefix));
    setTimesheetEntries((prev) => [
      ...newEntries,
      ...prev.filter((e) => !(e.employeeId === empId && e.date.startsWith(prefix))),
    ]);
    if (activeCloudUid) {
      removed.forEach((r) => syncRemoveCloudDoc('timesheet_entries', r.id, activeCloudUid));
      newEntries.forEach((entry) => syncUpsertCloudDoc('timesheet_entries', entry.id, { ...entry }, activeCloudUid));
    }

    addAuditLog(
      'TIMESHEET_LOG',
      'Timesheet',
      `Posted ${targetHours} working hours for outsourced worker ${worker.fullName} (${empId}) to Timesheet Ledger (${prefix}).`
    );

    return {
      success: true,
      message: `Posted ${targetHours}h across ${workDays.length} working days to Timesheet for ${worker.fullName} (${empId}).`,
      employeeId: empId,
    };
  };

  const postAllOutsourcedWorkersHoursToTimesheet = (
    year: number,
    month: number
  ): { postedCount: number; message: string } => {
    let count = 0;
    suppliedWorkers.forEach((w) => {
      const res = postOutsourcedWorkerHoursToTimesheet(w.id, year, month);
      if (res.success) count++;
    });

    return {
      postedCount: count,
      message: `Successfully posted verified working hours for ${count} outsourced workers to the Attendance & Timesheet Ledger.`,
    };
  };

  const addManpowerTrade = (tradeName: string) => {
    const trimmed = tradeName.trim();
    if (!trimmed || manpowerTrades.includes(trimmed)) return;
    const next = [...manpowerTrades, trimmed];
    setManpowerTrades(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', manpowerTrades: next }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Manpower', `Registered custom trade/skill category "${trimmed}".`);
  };

  const deleteManpowerTrade = (tradeName: string) => {
    const next = manpowerTrades.filter((t) => t !== tradeName);
    setManpowerTrades(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', manpowerTrades: next }, activeCloudUid);
    }
    addAuditLog('DELETE', 'Manpower', `Removed custom trade category "${tradeName}".`);
  };

  const addManpowerPOS = (pos: Omit<ManpowerPOS, 'id'>) => {
    const newId = `POS-${Date.now().toString().slice(-4)}`;
    const newPOS: ManpowerPOS = {
      ...pos,
      id: newId,
      branchId: pos.branchId || defaultActiveBranchId,
    };
    setManpowerPOSList((prev) => [newPOS, ...prev]);
    setManpowerSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== pos.supplierId) return s;
        const updated = { ...s, totalInvoicedSAR: (s.totalInvoicedSAR || 0) + pos.grandTotalSAR };
        if (activeCloudUid) {
          syncUpsertCloudDoc('manpower_suppliers', s.id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    if (activeCloudUid) {
      syncUpsertCloudDoc('manpower_pos', newId, { ...newPOS }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Manpower', `Generated service order POS ${pos.posNumber} (${pos.grandTotalSAR} SAR).`);
  };

  const updateManpowerPOS = (id: string, updates: Partial<ManpowerPOS>) => {
    setManpowerPOSList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('manpower_pos', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Manpower', `Updated manpower POS order ${id}.`);
  };

  const deleteManpowerPOS = (id: string) => {
    const target = manpowerPOSList.find((p) => p.id === id);
    if (target) {
      setManpowerSuppliers((prev) =>
        prev.map((s) => {
          if (s.id !== target.supplierId) return s;
          const updated = { ...s, totalInvoicedSAR: Math.max(0, (s.totalInvoicedSAR || 0) - target.grandTotalSAR) };
          if (activeCloudUid) {
            syncUpsertCloudDoc('manpower_suppliers', s.id, { ...updated }, activeCloudUid);
          }
          return updated;
        })
      );
    }
    setManpowerPOSList((prev) => prev.filter((p) => p.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('manpower_pos', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Manpower', `Deleted manpower POS order ${id}.`);
  };

  // Inventory & Stock Management
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newId = `INV-${Date.now().toString().slice(-4)}`;
    const newItem: InventoryItem = {
      ...item,
      id: newId,
      branchId: item.branchId || defaultActiveBranchId,
    };
    setInventoryItems((prev) => [newItem, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('inventory_items', newId, { ...newItem }, activeCloudUid);
    }
    if (item.quantityOnHand > 0) {
      const movId = `MOV-${Date.now().toString().slice(-4)}`;
      const initMovement: StockMovement = {
        id: movId,
        itemId: newId,
        itemName: item.name,
        type: 'IN',
        quantity: item.quantityOnHand,
        date: new Date().toISOString().substring(0, 10),
        referenceDoc: 'Initial Stock Count / Onboarding',
        operatorName: currentUser?.fullName || 'System Administrator',
        notes: 'Initial inventory catalog enrollment.',
        branchId: newItem.branchId,
      };
      setStockMovements((prev) => [initMovement, ...prev]);
      if (activeCloudUid) {
        syncUpsertCloudDoc('stock_movements', movId, { ...initMovement }, activeCloudUid);
      }
    }
    addAuditLog('CREATE', 'Inventory', `Added new inventory SKU: ${item.name} (${item.sku}).`);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventoryItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        if (updated.quantityOnHand <= 0) {
          updated.status = 'out_of_stock';
        } else if (updated.quantityOnHand <= updated.minReorderLevel) {
          updated.status = 'low_stock';
        } else {
          updated.status = 'in_stock';
        }
        if (activeCloudUid) {
          syncUpsertCloudDoc('inventory_items', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Inventory', `Updated inventory catalog item ${id}.`);
  };

  const deleteInventoryItem = (id: string) => {
    setInventoryItems((prev) => prev.filter((it) => it.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('inventory_items', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Inventory', `Deleted inventory item ${id}.`);
  };

  const adjustInventoryStock = (
    itemId: string,
    delta: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    notes?: string,
    reference?: string
  ) => {
    const target = inventoryItems.find((it) => it.id === itemId);
    if (!target) return;

    let newQty = target.quantityOnHand;
    if (type === 'IN') {
      newQty += Math.abs(delta);
    } else if (type === 'OUT') {
      newQty = Math.max(0, target.quantityOnHand - Math.abs(delta));
    } else {
      newQty = Math.max(0, delta);
    }

    let newStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (newQty <= 0) {
      newStatus = 'out_of_stock';
    } else if (newQty <= target.minReorderLevel) {
      newStatus = 'low_stock';
    }

    const updatedItem: InventoryItem = {
      ...target,
      quantityOnHand: newQty,
      status: newStatus,
      lastRestockedDate: type === 'IN' ? new Date().toISOString().substring(0, 10) : target.lastRestockedDate,
    };

    setInventoryItems((prev) => prev.map((it) => (it.id === itemId ? updatedItem : it)));
    if (activeCloudUid) {
      syncUpsertCloudDoc('inventory_items', itemId, { ...updatedItem }, activeCloudUid);
    }

    const movId = `MOV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;
    const movement: StockMovement = {
      id: movId,
      itemId,
      itemName: target.name,
      type,
      quantity: Math.abs(type === 'ADJUSTMENT' ? newQty - target.quantityOnHand : delta),
      date: new Date().toISOString().substring(0, 10),
      referenceDoc: reference || (type === 'IN' ? 'Stock Receipt' : 'Material Issue'),
      operatorName: currentUser?.fullName || 'System Administrator',
      notes: notes || `Stock ${type} operation applied. New balance: ${newQty} ${target.unitOfMeasure}.`,
      branchId: target.branchId || defaultActiveBranchId,
    };
    setStockMovements((prev) => [movement, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('stock_movements', movId, { ...movement }, activeCloudUid);
    }

    addAuditLog(
      'UPDATE',
      'Inventory',
      `Stock ${type} for ${target.name}: ${delta > 0 ? '+' : ''}${delta} ${target.unitOfMeasure} (Balance: ${newQty}).`
    );
  };

  const transferInventoryItem = ({
    sourceItemId,
    destinationLocation,
    quantity,
    destinationBranchId,
    reference,
    notes,
  }: {
    sourceItemId: string;
    destinationLocation: string;
    quantity: number;
    destinationBranchId?: string;
    reference?: string;
    notes?: string;
  }): { ok: boolean; error?: string; destinationItemId?: string } => {
    const source = inventoryItems.find((it) => it.id === sourceItemId);
    if (!source) {
      return { ok: false, error: 'Source inventory SKU not found.' };
    }
    const cleanDestLocation = destinationLocation.trim();
    if (!cleanDestLocation) {
      return { ok: false, error: 'Please specify a destination warehouse location.' };
    }
    if (cleanDestLocation.toLowerCase() === source.warehouseLocation.trim().toLowerCase()) {
      return { ok: false, error: 'Destination warehouse location must be different from the source warehouse.' };
    }
    const moveQty = Math.floor(Number(quantity) || 0);
    if (moveQty <= 0 || moveQty > source.quantityOnHand) {
      return {
        ok: false,
        error: `Transfer quantity must be between 1 and ${source.quantityOnHand} ${source.unitOfMeasure}.`,
      };
    }

    const computeItemStatus = (qty: number, minLevel: number): InventoryItem['status'] => {
      if (qty <= 0) return 'out_of_stock';
      if (qty <= minLevel) return 'low_stock';
      return 'in_stock';
    };

    const todayStr = new Date().toISOString().substring(0, 10);
    const resolvedDestBranchId = destinationBranchId || source.branchId || defaultActiveBranchId;
    const existingDest = inventoryItems.find(
      (it) =>
        it.id !== source.id &&
        it.sku.trim().toLowerCase() === source.sku.trim().toLowerCase() &&
        it.warehouseLocation.trim().toLowerCase() === cleanDestLocation.toLowerCase()
    );

    let destinationItemId = source.id;
    const nextItems: InventoryItem[] = [...inventoryItems];

    if (existingDest) {
      const nextSourceQty = source.quantityOnHand - moveQty;
      const updatedSource: InventoryItem = {
        ...source,
        quantityOnHand: nextSourceQty,
        status: computeItemStatus(nextSourceQty, source.minReorderLevel),
      };
      const nextDestQty = existingDest.quantityOnHand + moveQty;
      const updatedDest: InventoryItem = {
        ...existingDest,
        quantityOnHand: nextDestQty,
        status: computeItemStatus(nextDestQty, existingDest.minReorderLevel),
        lastRestockedDate: todayStr,
        branchId: resolvedDestBranchId,
      };
      destinationItemId = updatedDest.id;

      for (let i = 0; i < nextItems.length; i++) {
        if (nextItems[i].id === updatedSource.id) nextItems[i] = updatedSource;
        else if (nextItems[i].id === updatedDest.id) nextItems[i] = updatedDest;
      }

      if (activeCloudUid) {
        syncUpsertCloudDoc('inventory_items', updatedSource.id, { ...updatedSource }, activeCloudUid);
        syncUpsertCloudDoc('inventory_items', updatedDest.id, { ...updatedDest }, activeCloudUid);
      }
    } else if (moveQty === source.quantityOnHand) {
      const relocatedItem: InventoryItem = {
        ...source,
        warehouseLocation: cleanDestLocation,
        branchId: resolvedDestBranchId,
        lastRestockedDate: todayStr,
        status: computeItemStatus(source.quantityOnHand, source.minReorderLevel),
      };
      destinationItemId = relocatedItem.id;
      for (let i = 0; i < nextItems.length; i++) {
        if (nextItems[i].id === relocatedItem.id) {
          nextItems[i] = relocatedItem;
          break;
        }
      }
      if (activeCloudUid) {
        syncUpsertCloudDoc('inventory_items', relocatedItem.id, { ...relocatedItem }, activeCloudUid);
      }
    } else {
      const nextSourceQty = source.quantityOnHand - moveQty;
      const updatedSource: InventoryItem = {
        ...source,
        quantityOnHand: nextSourceQty,
        status: computeItemStatus(nextSourceQty, source.minReorderLevel),
      };
      const newDestId = `INV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;
      const createdDest: InventoryItem = {
        ...source,
        id: newDestId,
        warehouseLocation: cleanDestLocation,
        quantityOnHand: moveQty,
        lastRestockedDate: todayStr,
        status: computeItemStatus(moveQty, source.minReorderLevel),
        branchId: resolvedDestBranchId,
      };
      destinationItemId = newDestId;

      for (let i = 0; i < nextItems.length; i++) {
        if (nextItems[i].id === updatedSource.id) {
          nextItems[i] = updatedSource;
          break;
        }
      }
      nextItems.unshift(createdDest);

      if (activeCloudUid) {
        syncUpsertCloudDoc('inventory_items', updatedSource.id, { ...updatedSource }, activeCloudUid);
        syncUpsertCloudDoc('inventory_items', createdDest.id, { ...createdDest }, activeCloudUid);
      }
    }

    setInventoryItems(nextItems);

    const refCode = (reference || `TRF-${Date.now().toString().slice(-5)}`).trim();
    const cleanNote = notes?.trim() ? ` ${notes.trim()}` : '';
    const operatorName = currentUser?.fullName || 'System Administrator';

    const outMovId = `MOV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;
    const inMovId = `MOV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}R`;

    const outMovement: StockMovement = {
      id: outMovId,
      itemId: source.id,
      itemName: source.name,
      type: 'OUT',
      quantity: moveQty,
      date: todayStr,
      referenceDoc: `${refCode} · Transfer OUT -> ${cleanDestLocation}`.slice(0, 120),
      operatorName,
      notes: `Transferred ${moveQty} ${source.unitOfMeasure} of ${source.sku} from "${source.warehouseLocation}" to "${cleanDestLocation}".${cleanNote}`.slice(0, 500),
      branchId: source.branchId || defaultActiveBranchId,
    };

    const inMovement: StockMovement = {
      id: inMovId,
      itemId: destinationItemId,
      itemName: source.name,
      type: 'IN',
      quantity: moveQty,
      date: todayStr,
      referenceDoc: `${refCode} · Transfer IN <- ${source.warehouseLocation}`.slice(0, 120),
      operatorName,
      notes: `Received ${moveQty} ${source.unitOfMeasure} of ${source.sku} into "${cleanDestLocation}" from "${source.warehouseLocation}".${cleanNote}`.slice(0, 500),
      branchId: resolvedDestBranchId,
    };

    setStockMovements((prev) => [inMovement, outMovement, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('stock_movements', outMovId, { ...outMovement }, activeCloudUid);
      syncUpsertCloudDoc('stock_movements', inMovId, { ...inMovement }, activeCloudUid);
    }

    addAuditLog(
      'UPDATE',
      'Inventory',
      `Transferred ${moveQty} ${source.unitOfMeasure} of ${source.sku} (${source.name}) from "${source.warehouseLocation}" to "${cleanDestLocation}" (Ref: ${refCode}).`
    );

    return { ok: true, destinationItemId };
  };

  const addInventoryCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed || inventoryCategories.includes(trimmed)) return;
    const next = [...inventoryCategories, trimmed];
    setInventoryCategories(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryCategories: next }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Inventory', `Created custom inventory category: ${trimmed}.`);
  };

  const deleteInventoryCategory = (categoryName: string) => {
    const next = inventoryCategories.filter((c) => c !== categoryName);
    setInventoryCategories(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryCategories: next }, activeCloudUid);
    }
    addAuditLog('DELETE', 'Inventory', `Removed inventory category: ${categoryName}.`);
  };

  const addInventoryUOM = (uomName: string) => {
    const trimmed = uomName.trim();
    if (!trimmed || inventoryUOMs.includes(trimmed)) return;
    const next = [...inventoryUOMs, trimmed];
    setInventoryUOMs(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryUOMs: next }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Inventory', `Created custom Unit of Measure: ${trimmed}.`);
  };

  const deleteInventoryUOM = (uomName: string) => {
    const next = inventoryUOMs.filter((u) => u !== uomName);
    setInventoryUOMs(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryUOMs: next }, activeCloudUid);
    }
    addAuditLog('DELETE', 'Inventory', `Removed custom Unit of Measure: ${uomName}.`);
  };

  const addInventoryWarehouse = (warehouseName: string) => {
    const trimmed = warehouseName.trim();
    if (!trimmed || inventoryWarehouses.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...inventoryWarehouses, trimmed];
    setInventoryWarehouses(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryWarehouses: next }, activeCloudUid);
    }
    addAuditLog('CREATE', 'Inventory', `Added custom warehouse location: ${trimmed}.`);
  };

  const deleteInventoryWarehouse = (warehouseName: string) => {
    const next = inventoryWarehouses.filter((w) => w !== warehouseName);
    setInventoryWarehouses(next);
    if (activeCloudUid) {
      syncUpsertCloudDoc('corporate_settings', 'primary', { id: 'primary', inventoryWarehouses: next }, activeCloudUid);
    }
    addAuditLog('DELETE', 'Inventory', `Removed custom warehouse location: ${warehouseName}.`);
  };

  const addInventoryInvoice = (inv: Omit<InventoryInvoice, 'id'>) => {
    const newId = `INV-DOC-${Date.now().toString().slice(-4)}`;
    const newInvoice: InventoryInvoice = {
      ...inv,
      id: newId,
      branchId: inv.branchId || defaultActiveBranchId,
    };
    setInventoryInvoices((prev) => [newInvoice, ...prev]);
    if (activeCloudUid) {
      syncUpsertCloudDoc('inventory_invoices', newId, { ...newInvoice }, activeCloudUid);
    }

    // Automatically update stock based on invoice type
    inv.lineItems.forEach((li) => {
      if (inv.type === 'Purchase') {
        adjustInventoryStock(li.itemId, li.quantity, 'IN', `Restocked via Invoice ${inv.invoiceNumber}`, inv.invoiceNumber);
      } else if (inv.type === 'Material_Issue' || inv.type === 'Sales') {
        adjustInventoryStock(li.itemId, li.quantity, 'OUT', `Issued via Invoice ${inv.invoiceNumber}`, inv.invoiceNumber);
      }
    });

    addAuditLog('CREATE', 'Inventory', `Generated ${inv.type} invoice ${inv.invoiceNumber} (${inv.grandTotalSAR} SAR).`);
  };

  const updateInventoryInvoice = (id: string, updates: Partial<InventoryInvoice>) => {
    setInventoryInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const updated = { ...inv, ...updates };
        if (activeCloudUid) {
          syncUpsertCloudDoc('inventory_invoices', id, { ...updated }, activeCloudUid);
        }
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Inventory', `Updated inventory invoice ${id}.`);
  };

  const deleteInventoryInvoice = (id: string) => {
    setInventoryInvoices((prev) => prev.filter((inv) => inv.id !== id));
    if (activeCloudUid) {
      syncRemoveCloudDoc('inventory_invoices', id, activeCloudUid);
    }
    addAuditLog('DELETE', 'Inventory', `Deleted inventory invoice ${id}.`);
  };

  // RBAC Matrix & Custom Privileges
  const hasModulePermission = (moduleId: string, action: RbacActionKey): boolean => {
    return checkRbacPermission(rbacMatrix, currentRole, moduleId, action);
  };

  const saveRbacRolePermissions = async (
    roleId: RoleTier,
    permissions: Record<string, boolean>
  ): Promise<void> => {
    const normalized = normalizeRbacMatrix({
      ...latestWorkspaceRef.current.rbacMatrix,
      [roleId]: permissions,
    });
    const cleanRolePerms = normalized[roleId];

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error(
          'Super Admin privileges are required to modify RBAC role policies in the cloud workspace.'
        );
      }
      await upsertCloudRbacRole(roleId, cleanRolePerms, activeCloudUid);
    }

    setRbacMatrix(normalized);
    latestWorkspaceRef.current.rbacMatrix = normalized;
    const activeCount = countRolePermissions(cleanRolePerms);
    addAuditLog(
      'UPDATE',
      'Settings',
      `Updated RBAC permission matrix for role ${roleId} (${activeCount} active permissions).`
    );
  };

  const saveFullRbacMatrix = async (nextMatrix: RoleMatrixMap): Promise<void> => {
    const normalized = normalizeRbacMatrix(nextMatrix);

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error(
          'Super Admin privileges are required to modify RBAC policies in the cloud workspace.'
        );
      }
      await upsertCloudRbacMatrix(normalized, activeCloudUid);
    }

    setRbacMatrix(normalized);
    latestWorkspaceRef.current.rbacMatrix = normalized;
    addAuditLog('UPDATE', 'Settings', 'Synchronized complete multi-role RBAC permission matrix.');
  };

  const resetRbacMatrixToDefaults = async (): Promise<void> => {
    const defaults = buildDefaultRbacMatrix();

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error(
          'Super Admin privileges are required to reset RBAC policies in the cloud workspace.'
        );
      }
      await upsertCloudRbacMatrix(defaults, activeCloudUid);
    }

    setRbacMatrix(defaults);
    latestWorkspaceRef.current.rbacMatrix = defaults;
    addAuditLog('UPDATE', 'Settings', 'Reset RBAC permission matrix to factory role defaults.');
  };

  const addCustomPrivilege = async (priv: Omit<CustomPrivilege, 'id'>): Promise<void> => {
    const newId = `PRIV-${Date.now().toString().slice(-4)}`;
    const newPriv: CustomPrivilege = {
      ...priv,
      id: newId,
      name: priv.name.trim(),
      description: priv.description.trim(),
      assignedUsersCount: Math.max(0, Number(priv.assignedUsersCount) || 0),
    };

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error('Super Admin privileges are required to create custom privilege profiles.');
      }
      await upsertCloudDoc('custom_privileges', newId, { ...newPriv }, activeCloudUid);
    }

    setCustomPrivileges((prev) => [...prev, newPriv]);
    addAuditLog('CREATE', 'Settings', `Created custom privilege profile: ${newPriv.name}.`);
  };

  const updateCustomPrivilege = async (
    id: string,
    priv: Partial<CustomPrivilege>
  ): Promise<void> => {
    const current = latestWorkspaceRef.current.customPrivileges.find((p) => p.id === id);
    if (!current) return;

    const updated: CustomPrivilege = {
      ...current,
      ...priv,
      name: priv.name !== undefined ? priv.name.trim() : current.name,
      description: priv.description !== undefined ? priv.description.trim() : current.description,
      assignedUsersCount:
        priv.assignedUsersCount !== undefined
          ? Math.max(0, Number(priv.assignedUsersCount) || 0)
          : current.assignedUsersCount,
    };

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error('Super Admin privileges are required to update custom privilege profiles.');
      }
      await upsertCloudDoc('custom_privileges', id, { ...updated }, activeCloudUid);
    }

    setCustomPrivileges((prev) => prev.map((p) => (p.id === id ? updated : p)));
    addAuditLog('UPDATE', 'Settings', `Modified custom privilege profile ${updated.name} (${id}).`);
  };

  const deleteCustomPrivilege = async (id: string): Promise<void> => {
    const target = latestWorkspaceRef.current.customPrivileges.find((p) => p.id === id);
    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error('Super Admin privileges are required to delete custom privilege profiles.');
      }
      await removeCloudDoc('custom_privileges', id, activeCloudUid);
    }

    setCustomPrivileges((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('DELETE', 'Settings', `Removed custom privilege profile ${target?.name || id}.`);
  };

  // Template Customizer
  const updateTemplateConfig = (type: string, config: Partial<TemplateCustomization>) => {
    setTemplateConfigs((prev) => {
      const updated = { ...prev[type], ...config };
      if (activeCloudUid) {
        syncUpsertCloudDoc('template_configs', type, { id: type, ...updated }, activeCloudUid);
      }
      return {
        ...prev,
        [type]: updated,
      };
    });
    addAuditLog('UPDATE', 'Settings', `Updated template customization for ${type}.`);
  };

  const updateCorporateEntity = async (updates: Partial<CorporateLegalEntity>): Promise<void> => {
    const latest = latestWorkspaceRef.current;
    const sanitizedUpdates: Partial<CorporateLegalEntity> = {};
    if (updates.companyName !== undefined) sanitizedUpdates.companyName = updates.companyName.trim();
    if (updates.legalName !== undefined) sanitizedUpdates.legalName = updates.legalName.trim();
    if (updates.logoUrl !== undefined) sanitizedUpdates.logoUrl = updates.logoUrl.trim();
    if (updates.crNumber !== undefined) sanitizedUpdates.crNumber = updates.crNumber.trim();
    if (updates.vatNumber !== undefined) sanitizedUpdates.vatNumber = updates.vatNumber.trim();
    if (updates.email !== undefined) sanitizedUpdates.email = updates.email.trim();
    if (updates.phone !== undefined) sanitizedUpdates.phone = updates.phone.trim();
    if (updates.address !== undefined) sanitizedUpdates.address = updates.address.trim();
    if (updates.bankName !== undefined) sanitizedUpdates.bankName = updates.bankName.trim();
    if (updates.accountTitle !== undefined) sanitizedUpdates.accountTitle = updates.accountTitle.trim();
    if (updates.iban !== undefined) sanitizedUpdates.iban = updates.iban.trim();
    if (updates.swiftCode !== undefined) sanitizedUpdates.swiftCode = updates.swiftCode.trim();
    if (updates.baseCurrency !== undefined) sanitizedUpdates.baseCurrency = updates.baseCurrency.trim() || 'SAR';

    const next: CorporateLegalEntity = {
      ...latest.corporateEntity,
      ...sanitizedUpdates,
    };

    if (activeCloudUid) {
      if (!canPerformAdminAction) {
        throw new Error(
          'Super Admin privileges are required to modify Corporate Identity & Legal Entity settings in the cloud workspace.'
        );
      }
      const cloudPayload = buildCorporateSettingsPayload(next, {
        villaTypes: latest.customVillaTypes,
        trades: latest.manpowerTrades,
        invCategories: latest.inventoryCategories,
        invUOMs: latest.inventoryUOMs,
        invWarehouses: latest.inventoryWarehouses,
      });
      await upsertCloudDoc('corporate_settings', 'primary', cloudPayload, activeCloudUid);
    }

    setCorporateEntity(next);
    latestWorkspaceRef.current.corporateEntity = next;
    addAuditLog(
      'UPDATE',
      'Settings',
      `Updated Corporate Identity & Legal Entity profile for ${next.companyName || 'Workspace'} (CR: ${next.crNumber || '—'}).`
    );
  };

  return (
    <HRMSContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        loginAsPersona,
        firebaseUser,
        authReady,
        cloudAuthorized,
        cloudAccessPending,
        syncStatus,
        lastSyncedAt,
        cloudSyncError,
        signInWithGoogle,
        signOutCloud,
        pushWorkspaceToCloudNow,
        userDirectory,
        userInvites,
        deviceSessions,
        currentDeviceMeta,
        inviteWorkspaceUser,
        updateWorkspaceUser,
        deleteWorkspaceUser,
        revokeUserInvite,
        removeDeviceSession,

        branches,
        activeBranchId,
        setActiveBranchId,
        getBranchName,
        addBranch,
        updateBranch,
        deleteBranch,

        corporateEntity,
        updateCorporateEntity,
        baseCurrency,
        setBaseCurrency,
        formatCurrency,
        getRawConvertedAmount,
        currentCurrencySymbol,

        currentRole,
        switchRole,
        canPerformAdminAction,
        canPerformBranchAdminAction,
        canPerformHrAction,
        canPerformFinanceAction,
        isEmployeeViewOnly,
        currentEmployeeUser,

        language,
        setLanguage,
        t: translations[language] || translations['en'],
        isRTL,

        employees,
        departments,
        designations,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        updateSalary,

        addDepartment,
        updateDepartment,
        deleteDepartment,
        addDesignation,
        updateDesignation,
        deleteDesignation,

        timesheetEntries,
        getTimesheetEntry,
        updateTimesheetCell,
        clearAllTimesheetForMonth,
        clearEmployeeTimesheetForMonth,
        batchUpdateTimesheetCells,

        leaveRequests,
        addLeaveRequest,
        approveLeaveRequest,
        rejectLeaveRequest,
        deleteLeaveRequest,

        accountingCategories,
        addAccountingCategory,
        updateAccountingCategory,
        deleteAccountingCategory,
        expenses,
        addExpense,
        updateExpense,
        approveExpense,
        rejectExpense,
        deleteExpense,

        projects,
        addProject,
        updateProject,
        deleteProject,

        villas,
        addVilla,
        updateVilla,
        deleteVilla,
        customVillaTypes,
        addCustomVillaType,
        deleteCustomVillaType,
        addVillaDailyWorkEntity,
        addMultipleVillaDailyWorkEntities,
        updateVillaDailyWorkEntity,
        deleteVillaDailyWorkEntity,

        assetCategories,
        addAssetCategory,
        updateAssetCategory,
        deleteAssetCategory,
        assets,
        addAsset,
        updateAsset,
        deleteAsset,

        manpowerSuppliers,
        addManpowerSupplier,
        updateManpowerSupplier,
        deleteManpowerSupplier,
        suppliedWorkers,
        addSuppliedWorker,
        updateSuppliedWorker,
        deleteSuppliedWorker,
        addSuppliedWorkerToEmployeeDirectory,
        addAllSuppliedWorkersToEmployeeDirectory,
        postOutsourcedWorkerHoursToTimesheet,
        postAllOutsourcedWorkersHoursToTimesheet,
        manpowerTrades,
        addManpowerTrade,
        deleteManpowerTrade,
        manpowerPOSList,
        addManpowerPOS,
        updateManpowerPOS,
        deleteManpowerPOS,

        inventoryItems,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustInventoryStock,
        transferInventoryItem,
        stockMovements,
        inventoryCategories,
        addInventoryCategory,
        deleteInventoryCategory,
        inventoryUOMs,
        addInventoryUOM,
        deleteInventoryUOM,
        inventoryWarehouses,
        addInventoryWarehouse,
        deleteInventoryWarehouse,
        inventoryInvoices,
        addInventoryInvoice,
        updateInventoryInvoice,
        deleteInventoryInvoice,

        rbacMatrix,
        saveRbacRolePermissions,
        saveFullRbacMatrix,
        resetRbacMatrixToDefaults,
        hasModulePermission,
        customPrivileges,
        addCustomPrivilege,
        updateCustomPrivilege,
        deleteCustomPrivilege,

        auditLogs,
        addAuditLog,

        templateConfigs,
        updateTemplateConfig,

        shareAccessModalOpen,
        setShareAccessModalOpen,
        auditModalOpen,
        setAuditModalOpen,
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = (): HRMSContextType => {
  const context = useContext(HRMSContext);
  if (!context) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return context;
};
