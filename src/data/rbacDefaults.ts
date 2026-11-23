import { RoleTier } from '../types';

export type RbacActionKey =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'pdf'
  | 'manage';

export type RbacModuleCategory =
  | 'Workforce & People'
  | 'Payroll & Finance'
  | 'Projects & Supply'
  | 'Governance & System';

export interface RbacModuleDef {
  id: string;
  name: string;
  key: string;
  category: RbacModuleCategory;
  description: string;
}

export interface RbacRoleDef {
  id: RoleTier;
  name: string;
  shortName: string;
  policyTitle: string;
  policyDescription: string;
  scopeSummary: string;
}

export type RoleMatrixMap = Record<RoleTier, Record<string, boolean>>;

export const RBAC_ACTIONS: { key: RbacActionKey; label: string; description: string }[] = [
  { key: 'read', label: 'View', description: 'View records and ledgers' },
  { key: 'create', label: 'Create', description: 'Add new records or entries' },
  { key: 'update', label: 'Edit', description: 'Modify existing records' },
  { key: 'delete', label: 'Delete', description: 'Remove or archive records' },
  { key: 'approve', label: 'Approve', description: 'Sign off requests & batches' },
  { key: 'export', label: 'Export', description: 'Export CSV / data tables' },
  { key: 'pdf', label: 'PDF', description: 'Generate official PDF ledgers' },
  { key: 'manage', label: 'Config', description: 'Manage rules & categories' },
];

export const RBAC_MODULES: RbacModuleDef[] = [
  // Workforce & People
  {
    id: 'employees',
    name: 'Employee Directory',
    key: 'employees.*',
    category: 'Workforce & People',
    description: 'Workforce profiles, Iqama/passport KYC, and onboarding records',
  },
  {
    id: 'departments',
    name: 'Departments & Designations',
    key: 'departments.*',
    category: 'Workforce & People',
    description: 'Organizational hierarchy, grades, and reporting heads',
  },
  {
    id: 'attendance',
    name: 'Timesheets & Attendance',
    key: 'attendance.*',
    category: 'Workforce & People',
    description: 'Daily shift logs, regular/overtime hours, and site attendance',
  },
  {
    id: 'leaves',
    name: 'Leave & Absence Management',
    key: 'leaves.*',
    category: 'Workforce & People',
    description: 'Annual, sick, emergency leave balances and approvals',
  },

  // Payroll & Finance
  {
    id: 'payroll',
    name: 'Payroll & WPS Salary',
    key: 'payroll.*',
    category: 'Payroll & Finance',
    description: 'Monthly salary calculations, allowances, and WPS disbursement runs',
  },
  {
    id: 'accounting',
    name: 'Accounting & Expenses',
    key: 'accounting.*',
    category: 'Payroll & Finance',
    description: 'General ledger categories, vouchers, and operational expenses',
  },
  {
    id: 'branches',
    name: 'Branch Network',
    key: 'branches.*',
    category: 'Payroll & Finance',
    description: 'Multi-branch operating locations, regional hubs, and HQ config',
  },

  // Projects & Supply
  {
    id: 'projects',
    name: 'Projects & Master Contracts',
    key: 'projects.*',
    category: 'Projects & Supply',
    description: 'Contract budgets, milestones, and team assignments',
  },
  {
    id: 'villas',
    name: 'Daily Progress & Villas',
    key: 'villas.*',
    category: 'Projects & Supply',
    description: 'Site villa tracking, m² work entities, and daily production logs',
  },
  {
    id: 'assets',
    name: 'Corporate Assets & Custody',
    key: 'assets.*',
    category: 'Projects & Supply',
    description: 'Fleet vehicles, machinery, IT equipment, and employee custody',
  },
  {
    id: 'manpower',
    name: 'Manpower & Service POS',
    key: 'manpower.*',
    category: 'Projects & Supply',
    description: 'Subcontractor suppliers, outsourced workers, and service orders',
  },
  {
    id: 'inventory',
    name: 'Inventory, Invoices & Stock',
    key: 'inventory.*',
    category: 'Projects & Supply',
    description: 'Warehouse SKUs, stock movements, and purchase/sales invoices',
  },

  // Governance & System
  {
    id: 'templates',
    name: 'Document & Template Studio',
    key: 'templates.*',
    category: 'Governance & System',
    description: 'Official letterheads, offer letters, certificates, and QR stamps',
  },
  {
    id: 'analytics',
    name: 'Analytics & BI Reports',
    key: 'analytics.*',
    category: 'Governance & System',
    description: 'Executive workforce, cost allocation, and financial metrics',
  },
  {
    id: 'users',
    name: 'Multi-User & Device Access',
    key: 'users.*',
    category: 'Governance & System',
    description: 'Workspace invitations, member roles, and active device sessions',
  },
  {
    id: 'rbac',
    name: 'RBAC & Privilege Profiles',
    key: 'rbac.*',
    category: 'Governance & System',
    description: 'Role permission matrix and custom operational privilege overlays',
  },
  {
    id: 'audit_logs',
    name: 'Tamper-Evident Audit Logs',
    key: 'audit_logs.*',
    category: 'Governance & System',
    description: 'Immutable security trail for workspace mutations and exports',
  },
  {
    id: 'settings',
    name: 'Corporate Identity & Backups',
    key: 'settings.*',
    category: 'Governance & System',
    description: 'Legal entity, CR/VAT, treasury banking, currency, and snapshots',
  },
];

export const RBAC_ROLES: RbacRoleDef[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    shortName: 'Super Admin',
    policyTitle: 'Super Administrator Authority',
    policyDescription:
      'Unrestricted workspace owner authorized across all branches, statutory settings, cloud user invites, RBAC policies, and financial ledgers.',
    scopeSummary: 'All Branches · Global Governance',
  },
  {
    id: 'branch_admin',
    name: 'Branch Admin',
    shortName: 'Branch Admin',
    policyTitle: 'Branch Administrator Authority',
    policyDescription:
      'Regional branch administrator authorized to oversee employees, attendance, leaves, payroll, accounting, projects, villas, assets, manpower, and inventory within their assigned branch.',
    scopeSummary: 'Assigned Branch · Operations & HR Lead',
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    shortName: 'HR Manager',
    policyTitle: 'Human Resources Director Policy',
    policyDescription:
      'Authorized to manage employee rosters, onboarding KYC, attendance matrices, leave workflows, outsourced manpower rosters, and HR templates.',
    scopeSummary: 'Workforce · Attendance · Leaves · Templates',
  },
  {
    id: 'finance_officer',
    name: 'Finance Officer',
    shortName: 'Finance',
    policyTitle: 'Finance & Treasury Policy',
    policyDescription:
      'Authorized to manage WPS payroll settlements, general ledger expenses, vendor/inventory invoices, manpower POS financial sign-offs, and VAT exports.',
    scopeSummary: 'Payroll · Accounting · Invoices · BI Reports',
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    shortName: 'Project Mgr',
    policyTitle: 'Operations & Project Delivery Policy',
    policyDescription:
      'Authorized to manage field contracts, villa daily progress ledgers, site equipment custody, outsourced trade allocations, and stock issuance.',
    scopeSummary: 'Projects · Villas · Assets · Field Manpower',
  },
  {
    id: 'employee',
    name: 'Employee (Self-Service)',
    shortName: 'Employee',
    policyTitle: 'Self-Service Portal Policy',
    policyDescription:
      'Standard workforce portal member restricted to personal profile, attendance history, leave applications, and individual salary statements.',
    scopeSummary: 'Self-Service Only · Restricted Write',
  },
];

export const PROTECTED_SUPER_ADMIN_KEYS = new Set<string>([
  'rbac:read',
  'rbac:update',
  'rbac:manage',
  'users:read',
  'users:manage',
  'settings:read',
  'settings:update',
  'audit_logs:read',
]);

const DEFAULT_ROLE_GRANTS: Record<RoleTier, Record<string, RbacActionKey[]>> = {
  super_admin: Object.fromEntries(
    RBAC_MODULES.map((m) => [m.id, RBAC_ACTIONS.map((a) => a.key)])
  ),
  branch_admin: {
    employees: ['read', 'create', 'update', 'delete', 'approve', 'export', 'pdf', 'manage'],
    departments: ['read', 'create', 'update', 'delete', 'manage'],
    attendance: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    leaves: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    payroll: ['read', 'create', 'update', 'approve', 'export', 'pdf'],
    accounting: ['read', 'create', 'update', 'approve', 'export', 'pdf'],
    branches: ['read'],
    projects: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    villas: ['read', 'create', 'update', 'delete', 'approve', 'export', 'pdf', 'manage'],
    assets: ['read', 'create', 'update', 'export', 'pdf'],
    manpower: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    inventory: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    templates: ['read', 'create', 'update', 'pdf', 'manage'],
    analytics: ['read', 'export', 'pdf'],
    users: ['read'],
    rbac: ['read'],
    audit_logs: ['read', 'export'],
    settings: ['read'],
  },
  hr_manager: {
    employees: ['read', 'create', 'update', 'delete', 'approve', 'export', 'pdf', 'manage'],
    departments: ['read', 'create', 'update', 'delete', 'manage'],
    attendance: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    leaves: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    payroll: ['read', 'export', 'pdf'],
    accounting: ['read'],
    branches: ['read'],
    projects: ['read'],
    villas: ['read'],
    assets: ['read', 'create', 'update'],
    manpower: ['read', 'create', 'update', 'export', 'pdf'],
    inventory: ['read'],
    templates: ['read', 'create', 'update', 'pdf', 'manage'],
    analytics: ['read', 'export', 'pdf'],
    users: ['read'],
    rbac: ['read'],
    audit_logs: ['read', 'export'],
    settings: ['read'],
  },
  finance_officer: {
    employees: ['read', 'export', 'pdf'],
    departments: ['read'],
    attendance: ['read', 'export'],
    leaves: ['read'],
    payroll: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    accounting: ['read', 'create', 'update', 'delete', 'approve', 'export', 'pdf', 'manage'],
    branches: ['read'],
    projects: ['read', 'export', 'pdf'],
    villas: ['read', 'export', 'pdf'],
    assets: ['read', 'export'],
    manpower: ['read', 'approve', 'export', 'pdf'],
    inventory: ['read', 'create', 'update', 'approve', 'export', 'pdf'],
    templates: ['read', 'pdf'],
    analytics: ['read', 'export', 'pdf'],
    users: [],
    rbac: [],
    audit_logs: ['read', 'export'],
    settings: ['read'],
  },
  project_manager: {
    employees: ['read'],
    departments: ['read'],
    attendance: ['read', 'create', 'update', 'approve', 'export'],
    leaves: ['read', 'approve'],
    payroll: [],
    accounting: ['read', 'create'],
    branches: ['read'],
    projects: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    villas: ['read', 'create', 'update', 'delete', 'approve', 'export', 'pdf', 'manage'],
    assets: ['read', 'create', 'update', 'export', 'pdf'],
    manpower: ['read', 'create', 'update', 'approve', 'export', 'pdf', 'manage'],
    inventory: ['read', 'create', 'update', 'export', 'pdf'],
    templates: ['read', 'pdf'],
    analytics: ['read', 'export'],
    users: [],
    rbac: [],
    audit_logs: [],
    settings: [],
  },
  employee: {
    employees: ['read'],
    departments: ['read'],
    attendance: ['read', 'create'],
    leaves: ['read', 'create'],
    payroll: ['read', 'pdf'],
    accounting: [],
    branches: ['read'],
    projects: ['read'],
    villas: [],
    assets: ['read'],
    manpower: [],
    inventory: ['read'],
    templates: ['read', 'pdf'],
    analytics: [],
    users: [],
    rbac: [],
    audit_logs: [],
    settings: [],
  },
};

export const ROLE_DISPLAY_LABELS: Record<RoleTier, string> = {
  super_admin: 'Super Admin',
  branch_admin: 'Branch Admin',
  hr_manager: 'HR Manager',
  finance_officer: 'Finance Officer',
  project_manager: 'Project Manager',
  employee: 'Standard Employee',
};

export const TOTAL_RBAC_PERMISSIONS = RBAC_MODULES.length * RBAC_ACTIONS.length;

export function buildDefaultRbacMatrix(): RoleMatrixMap {
  const matrix = {} as RoleMatrixMap;

  RBAC_ROLES.forEach((role) => {
    const roleMap: Record<string, boolean> = {};
    const roleDefaults = DEFAULT_ROLE_GRANTS[role.id] || {};
    RBAC_MODULES.forEach((mod) => {
      const allowed = roleDefaults[mod.id] || [];
      RBAC_ACTIONS.forEach((act) => {
        roleMap[`${mod.id}:${act.key}`] = allowed.includes(act.key);
      });
    });
    matrix[role.id] = roleMap;
  });

  return matrix;
}

export function normalizeRbacMatrix(raw: unknown): RoleMatrixMap {
  const base = buildDefaultRbacMatrix();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const rawRecord = raw as Record<string, unknown>;
  RBAC_ROLES.forEach((role) => {
    const candidate = rawRecord[role.id];
    if (candidate && typeof candidate === 'object') {
      const candidateMap = candidate as Record<string, unknown>;
      RBAC_MODULES.forEach((mod) => {
        RBAC_ACTIONS.forEach((act) => {
          const permKey = `${mod.id}:${act.key}`;
          if (typeof candidateMap[permKey] === 'boolean') {
            base[role.id][permKey] =
              role.id === 'super_admin' && PROTECTED_SUPER_ADMIN_KEYS.has(permKey)
                ? true
                : (candidateMap[permKey] as boolean);
          }
        });
      });
    }
  });

  return base;
}

export function countRolePermissions(roleMap: Record<string, boolean> | undefined): number {
  if (!roleMap) return 0;
  let count = 0;
  RBAC_MODULES.forEach((mod) => {
    RBAC_ACTIONS.forEach((act) => {
      if (roleMap[`${mod.id}:${act.key}`]) {
        count += 1;
      }
    });
  });
  return count;
}

export function checkRbacPermission(
  matrix: RoleMatrixMap,
  role: RoleTier,
  moduleId: string,
  action: RbacActionKey
): boolean {
  const key = `${moduleId}:${action}`;
  if (role === 'super_admin' && PROTECTED_SUPER_ADMIN_KEYS.has(key)) {
    return true;
  }
  return Boolean(matrix[role]?.[key]);
}
