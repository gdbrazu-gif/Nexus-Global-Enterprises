export const TAB_TO_RBAC_MODULE: Record<string, string> = {
  employees: 'employees',
  onboarding: 'employees',
  departments: 'departments',
  designations: 'departments',
  'timesheet-matrix': 'attendance',
  leaves: 'leaves',
  payroll: 'payroll',
  expenses: 'accounting',
  'accounting-categories': 'accounting',
  projects: 'projects',
  assets: 'villas',
  'daily-work': 'villas',
  'daily-work-entities': 'villas',
  inventory: 'inventory',
  'inventory-catalog': 'inventory',
  'inventory-invoices': 'inventory',
  'inventory-movements': 'inventory',
  'manpower-suppliers': 'manpower',
  'manpower-workers': 'manpower',
  'manpower-pos': 'manpower',
  templates: 'templates',
  reports: 'analytics',
  settings: 'settings',
  'backup-data': 'settings',
  branches: 'branches',
  'users-devices': 'users',
  rbac: 'rbac',
  'audit-trail': 'audit_logs',
};

export function getRequiredRbacModule(tabId: string): string | null {
  return TAB_TO_RBAC_MODULE[tabId] || null;
}
