import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CorporateLegalEntity,
  RoleTier,
  LanguageCode,
  Department,
  Designation,
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
  TemplateCustomization
} from '../types';
import {
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
  DEFAULT_TEMPLATE_CUSTOMIZATIONS
} from '../data/initialData';
import { translations, Translations } from '../i18n/translations';

interface HRMSContextType {
  // Corporate Entity & Currency
  corporateEntity: CorporateLegalEntity;
  updateCorporateEntity: (entity: Partial<CorporateLegalEntity>) => void;
  baseCurrency: string;
  setBaseCurrency: (currencyCode: string) => void;
  formatCurrency: (amountInSAR: number, hideSymbol?: boolean) => string;
  getRawConvertedAmount: (amountInSAR: number) => number;
  currentCurrencySymbol: string;

  // Role & Persona (RBAC)
  currentRole: RoleTier;
  switchRole: (role: RoleTier) => void;
  canPerformAdminAction: boolean;
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
  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id' | 'expenseNumber' | 'status'>) => void;
  approveExpense: (id: string) => void;
  rejectExpense: (id: string, notes?: string) => void;
  deleteExpense: (id: string) => void;

  // Projects & Operations
  projects: Project[];
  addProject: (prj: Omit<Project, 'id' | 'spentSAR'>) => void;
  updateProject: (id: string, prj: Partial<Project>) => void;

  // Assets & Categories
  assetCategories: AssetCategory[];
  addAssetCategory: (cat: Omit<AssetCategory, 'id' | 'assetsCount'>) => void;
  updateAssetCategory: (id: string, cat: Partial<AssetCategory>) => void;
  deleteAssetCategory: (id: string) => void;
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // Custom Privileges & System Access Roles
  customPrivileges: CustomPrivilege[];
  addCustomPrivilege: (priv: Omit<CustomPrivilege, 'id'>) => void;
  updateCustomPrivilege: (id: string, priv: Partial<CustomPrivilege>) => void;
  deleteCustomPrivilege: (id: string) => void;

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
  // State Initialization with LocalStorage fallbacks for persistence
  const [corporateEntity, setCorporateEntity] = useState<CorporateLegalEntity>(() => {
    const saved = localStorage.getItem('apex_corporate_entity');
    return saved ? JSON.parse(saved) : INITIAL_CORPORATE_ENTITY;
  });

  const [currentRole, setCurrentRole] = useState<RoleTier>('super_admin');
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
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>(() => {
    const saved = localStorage.getItem('apex_asset_categories');
    return saved ? JSON.parse(saved) : INITIAL_ASSET_CATEGORIES;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('apex_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [customPrivileges, setCustomPrivileges] = useState<CustomPrivilege[]>(() => {
    const saved = localStorage.getItem('apex_custom_privileges');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOM_PRIVILEGES;
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

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('apex_corporate_entity', JSON.stringify(corporateEntity));
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
    localStorage.setItem('apex_custom_privileges', JSON.stringify(customPrivileges));
  }, [customPrivileges]);

  useEffect(() => {
    localStorage.setItem('apex_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('apex_template_configs', JSON.stringify(templateConfigs));
  }, [templateConfigs]);

  // Adjust document direction for Arabic/Urdu RTL
  const isRTL = language === 'ar' || language === 'ur';
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
      currentRole === 'super_admin'
        ? 'Khalid Al-Fassi (Super Admin)'
        : currentRole === 'hr_manager'
        ? 'Mona Al-Hassan (HR Manager)'
        : currentRole === 'finance_officer'
        ? 'Tariq Mansoor (Finance Officer)'
        : currentRole === 'project_manager'
        ? 'Sarah Jenkins (Project Manager)'
        : 'Omar Farooq (Employee)';

    const newLog: AuditLog = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operatorName,
      operatorRole: currentRole.toUpperCase().replace('_', ' '),
      actionType,
      entityType,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Currency Handling
  const baseCurrency = corporateEntity.baseCurrency || 'SAR';

  const setBaseCurrency = (currencyCode: string) => {
    setCorporateEntity((prev) => ({ ...prev, baseCurrency: currencyCode }));
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
    addAuditLog('ROLE_SWITCH', 'Settings', `Operational role switched to ${role}.`);
  };

  const canPerformAdminAction = currentRole === 'super_admin';
  const canPerformHrAction = currentRole === 'super_admin' || currentRole === 'hr_manager';
  const canPerformFinanceAction = currentRole === 'super_admin' || currentRole === 'finance_officer';
  const isEmployeeViewOnly = currentRole === 'employee';

  // Standard employee persona user (Omar Farooq)
  const currentEmployeeUser =
    employees.find((e) => e.id === 'EMP-1005') || employees[0];

  // Employee CRUD & Salary Editing
  const addEmployee = (data: Omit<Employee, 'id' | 'annualBaseSalary' | 'totalMonthlyPackage'>) => {
    const newId = `EMP-${1000 + employees.length + 1}`;
    const annual = data.monthlyBaseSalary * 12;
    const totalPkg =
      data.monthlyBaseSalary +
      data.housingAllowance +
      data.transportAllowance +
      data.otherAllowances;

    const newEmp: Employee = {
      ...data,
      id: newId,
      annualBaseSalary: annual,
      totalMonthlyPackage: totalPkg,
    };

    setEmployees((prev) => [newEmp, ...prev]);
    addAuditLog(
      'CREATE',
      'Employee',
      `Onboarded employee ${newEmp.fullName} (${newEmp.id}) with designation ${newEmp.designation}.`
    );
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        const updated = { ...emp, ...updates };
        if (updates.monthlyBaseSalary !== undefined) {
          updated.annualBaseSalary = updated.monthlyBaseSalary * 12;
        }
        updated.totalMonthlyPackage =
          updated.monthlyBaseSalary +
          updated.housingAllowance +
          updated.transportAllowance +
          updated.otherAllowances;
        return updated;
      })
    );
    addAuditLog('UPDATE', 'Employee', `Updated records for employee ID ${id}.`);
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
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
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        return {
          ...emp,
          monthlyBaseSalary: monthlyBase,
          housingAllowance: housing,
          transportAllowance: transport,
          otherAllowances: other,
          annualBaseSalary: monthlyBase * 12,
          totalMonthlyPackage: monthlyBase + housing + transport + other,
        };
      })
    );
    addAuditLog(
      'SALARY_EDIT',
      'Salary',
      `Modified compensation structure for employee ${id}. New Base: ${monthlyBase} SAR/mo (${monthlyBase * 12} SAR/yr). Reason: ${reasonNotes}`
    );
  };

  // Departments & Designations
  const addDepartment = (dept: Omit<Department, 'id'>) => {
    const newId = `DEP-${String(departments.length + 1).padStart(2, '0')}`;
    setDepartments((prev) => [...prev, { ...dept, id: newId }]);
    addAuditLog('CREATE', 'Settings', `Added operating department: ${dept.name} (${dept.code}).`);
  };

  const updateDepartment = (id: string, updates: Partial<Department>) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    addAuditLog('UPDATE', 'Settings', `Updated operating department: ${updates.name || id}.`);
  };

  const deleteDepartment = (id: string) => {
    const target = departments.find((d) => d.id === id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    addAuditLog('DELETE', 'Settings', `Deleted operating department: ${target?.name || id}.`);
  };

  const addDesignation = (des: Omit<Designation, 'id'>) => {
    const newId = `DES-${String(designations.length + 1).padStart(2, '0')}`;
    setDesignations((prev) => [...prev, { ...des, id: newId }]);
    addAuditLog('CREATE', 'Settings', `Created job title & designation: ${des.title}.`);
  };

  const updateDesignation = (id: string, updates: Partial<Designation>) => {
    setDesignations((prev) =>
      prev.map((des) => (des.id === id ? { ...des, ...updates } : des))
    );
    addAuditLog('UPDATE', 'Settings', `Updated job title & designation: ${updates.title || id}.`);
  };

  const deleteDesignation = (id: string) => {
    const target = designations.find((d) => d.id === id);
    setDesignations((prev) => prev.filter((d) => d.id !== id));
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
      setTimesheetEntries((prev) =>
        prev.map((entry) =>
          entry.id === existing.id
            ? {
                ...entry,
                regularHours,
                overtimeHours,
                status,
                notes: notes ?? entry.notes,
                updatedBy: currentRole,
                updatedAt: new Date().toISOString(),
              }
            : entry
        )
      );
    } else {
      const newEntry: TimesheetEntry = {
        id: `TS-${empId}-${date}`,
        employeeId: empId,
        date,
        regularHours,
        overtimeHours,
        status,
        notes,
        updatedBy: currentRole,
        updatedAt: new Date().toISOString(),
      };
      setTimesheetEntries((prev) => [...prev, newEntry]);
    }

    addAuditLog(
      'TIMESHEET_LOG',
      'Timesheet',
      `Logged timesheet for ${emp?.fullName || empId} on ${date}: ${regularHours}h regular, ${overtimeHours}h OT, status [${status}].`
    );
  };

  const clearAllTimesheetForMonth = (year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    setTimesheetEntries((prev) => prev.filter((e) => !e.date.startsWith(prefix)));
    addAuditLog(
      'DELETE',
      'Timesheet',
      `Purged all timesheet records for period ${prefix} as requested.`
    );
  };

  // Leaves
  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newId = `LV-${Date.now()}`;
    const newReq: LeaveRequest = { ...req, id: newId, status: 'pending' };
    setLeaveRequests((prev) => [newReq, ...prev]);
    addAuditLog('CREATE', 'Leave', `Submitted ${req.leaveType} for ${req.employeeName} (${req.totalDays} days).`);
  };

  const approveLeaveRequest = (id: string) => {
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              reviewedBy: currentRole,
              reviewDate: new Date().toISOString().substring(0, 10),
            }
          : r
      )
    );
    addAuditLog('APPROVE', 'Leave', `Approved leave request ${id}.`);
  };

  const rejectLeaveRequest = (id: string, reason: string) => {
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              rejectionReason: reason,
              reviewedBy: currentRole,
              reviewDate: new Date().toISOString().substring(0, 10),
            }
          : r
      )
    );
    addAuditLog('REJECT', 'Leave', `Rejected leave request ${id}. Reason: ${reason}`);
  };

  const deleteLeaveRequest = (id: string) => {
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('DELETE', 'Leave', `Deleted leave request record ${id}.`);
  };

  // Accounting Categories & Expenses
  const addAccountingCategory = (cat: Omit<AccountingCategory, 'id'>) => {
    const newId = `CAT-${Date.now().toString().slice(-4)}`;
    setAccountingCategories((prev) => [...prev, { ...cat, id: newId }]);
    addAuditLog('CREATE', 'Category', `Created accounting category ${cat.name} (${cat.code}).`);
  };

  const updateAccountingCategory = (id: string, cat: Partial<AccountingCategory>) => {
    setAccountingCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...cat } : c))
    );
    addAuditLog('UPDATE', 'Category', `Updated accounting category ${id}.`);
  };

  const addExpense = (exp: Omit<Expense, 'id' | 'expenseNumber' | 'status'>) => {
    const expNum = `EXP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(3, '0')}`;
    const newExpense: Expense = {
      ...exp,
      id: `EXP-${Date.now()}`,
      expenseNumber: expNum,
      status: 'pending',
    };
    setExpenses((prev) => [newExpense, ...prev]);
    addAuditLog('CREATE', 'Expense', `Submitted expense voucher ${expNum}: ${exp.title} (${exp.amountSAR} SAR).`);
  };

  const approveExpense = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'approved',
              approvedBy: 'Admin Approval (Executive)',
              approvalDate: new Date().toISOString().substring(0, 10),
            }
          : e
      )
    );
    addAuditLog('APPROVE', 'Expense', `Approved expense settlement ${id}.`);
  };

  const rejectExpense = (id: string, notes?: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'rejected',
              notes: notes || e.notes,
              approvedBy: 'Rejected by Finance Admin',
              approvalDate: new Date().toISOString().substring(0, 10),
            }
          : e
      )
    );
    addAuditLog('REJECT', 'Expense', `Rejected expense claim ${id}.`);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addAuditLog('DELETE', 'Expense', `Deleted expense record ${id}.`);
  };

  // Projects
  const addProject = (prj: Omit<Project, 'id' | 'spentSAR'>) => {
    const newId = `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`;
    setProjects((prev) => [...prev, { ...prj, id: newId, spentSAR: 0 }]);
    addAuditLog('CREATE', 'Project', `Created enterprise project: ${prj.name} (${newId}).`);
  };

  const updateProject = (id: string, prj: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...prj } : p)));
    addAuditLog('UPDATE', 'Project', `Updated project parameters for ${id}.`);
  };

  // Asset Categories & Assets
  const addAssetCategory = (cat: Omit<AssetCategory, 'id' | 'assetsCount'>) => {
    const newId = `ACAT-${Date.now().toString().slice(-4)}`;
    setAssetCategories((prev) => [...prev, { ...cat, id: newId, assetsCount: 0 }]);
    addAuditLog('CREATE', 'Category', `Created custom asset category: ${cat.name} (${cat.code}).`);
  };

  const updateAssetCategory = (id: string, cat: Partial<AssetCategory>) => {
    setAssetCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...cat } : c)));
    addAuditLog('UPDATE', 'Category', `Updated asset category ${id}.`);
  };

  const deleteAssetCategory = (id: string) => {
    setAssetCategories((prev) => prev.filter((c) => c.id !== id));
    addAuditLog('DELETE', 'Category', `Deleted asset category ${id}.`);
  };

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    const newId = `AST-${Date.now()}`;
    setAssets((prev) => [...prev, { ...asset, id: newId }]);
    setAssetCategories((prev) =>
      prev.map((c) =>
        c.id === asset.categoryId ? { ...c, assetsCount: c.assetsCount + 1 } : c
      )
    );
    addAuditLog('CREATE', 'Asset', `Enrolled asset into inventory: ${asset.name} (${asset.assetTag}).`);
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    addAuditLog('UPDATE', 'Asset', `Updated asset data for ${id}.`);
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('DELETE', 'Asset', `Removed asset record ${id}.`);
  };

  // Custom Privileges
  const addCustomPrivilege = (priv: Omit<CustomPrivilege, 'id'>) => {
    const newId = `PRIV-${Date.now().toString().slice(-4)}`;
    setCustomPrivileges((prev) => [...prev, { ...priv, id: newId }]);
    addAuditLog('CREATE', 'Settings', `Created custom privilege profile: ${priv.name}.`);
  };

  const updateCustomPrivilege = (id: string, priv: Partial<CustomPrivilege>) => {
    setCustomPrivileges((prev) => prev.map((p) => (p.id === id ? { ...p, ...priv } : p)));
    addAuditLog('UPDATE', 'Settings', `Modified custom privilege profile ${id}.`);
  };

  const deleteCustomPrivilege = (id: string) => {
    setCustomPrivileges((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('DELETE', 'Settings', `Removed privilege profile ${id}.`);
  };

  // Template Customizer
  const updateTemplateConfig = (type: string, config: Partial<TemplateCustomization>) => {
    setTemplateConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...config },
    }));
    addAuditLog('UPDATE', 'Settings', `Updated template customization for ${type}.`);
  };

  const updateCorporateEntity = (updates: Partial<CorporateLegalEntity>) => {
    setCorporateEntity((prev) => ({ ...prev, ...updates }));
    addAuditLog('UPDATE', 'Settings', 'Updated Corporate Legal Entity & Banking details.');
  };

  return (
    <HRMSContext.Provider
      value={{
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
        canPerformHrAction,
        canPerformFinanceAction,
        isEmployeeViewOnly,
        currentEmployeeUser,

        language,
        setLanguage,
        t: translations[language],
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

        leaveRequests,
        addLeaveRequest,
        approveLeaveRequest,
        rejectLeaveRequest,
        deleteLeaveRequest,

        accountingCategories,
        addAccountingCategory,
        updateAccountingCategory,
        expenses,
        addExpense,
        approveExpense,
        rejectExpense,
        deleteExpense,

        projects,
        addProject,
        updateProject,

        assetCategories,
        addAssetCategory,
        updateAssetCategory,
        deleteAssetCategory,
        assets,
        addAsset,
        updateAsset,
        deleteAsset,

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
