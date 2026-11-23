import React, { useEffect, useMemo, useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { CustomPrivilege, RoleTier } from '../../types';
import {
  PROTECTED_SUPER_ADMIN_KEYS,
  RBAC_ACTIONS,
  RBAC_MODULES,
  RBAC_ROLES,
  RbacActionKey,
  RbacModuleCategory,
  RoleMatrixMap,
  TOTAL_RBAC_PERMISSIONS,
  buildDefaultRbacMatrix,
  countRolePermissions,
  normalizeRbacMatrix,
} from '../../data/rbacDefaults';
import {
  AlertCircle,
  Check,
  Columns3,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

type RbacWorkspaceView = 'matrix' | 'comparison' | 'custom';

const MODULE_CATEGORIES: ('All' | RbacModuleCategory)[] = [
  'All',
  'Workforce & People',
  'Payroll & Finance',
  'Projects & Supply',
  'Governance & System',
];

const CUSTOM_PRIV_FLAGS: {
  key: keyof CustomPrivilege['permissions'];
  label: string;
}[] = [
  { key: 'canView', label: 'View Records' },
  { key: 'canEdit', label: 'Edit Records' },
  { key: 'canDelete', label: 'Delete Records' },
  { key: 'canApprove', label: 'Approve Workflows' },
  { key: 'canExportPdf', label: 'Export PDF' },
  { key: 'canManageSalary', label: 'Manage Payroll' },
  { key: 'canManageExpense', label: 'Manage Expenses' },
  { key: 'canManageTimesheet', label: 'Manage Timesheets' },
];

const EMPTY_CUSTOM_PERMISSIONS: CustomPrivilege['permissions'] = {
  canView: true,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExportPdf: true,
  canManageSalary: false,
  canManageExpense: false,
  canManageTimesheet: false,
};

function extractReadableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Operation failed.');
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Plain message
  }
  return raw;
}

export const RolePermissionMatrix: React.FC = () => {
  const {
    rbacMatrix,
    saveRbacRolePermissions,
    saveFullRbacMatrix,
    resetRbacMatrixToDefaults,
    customPrivileges,
    addCustomPrivilege,
    updateCustomPrivilege,
    deleteCustomPrivilege,
    userDirectory,
    employees,
    currentRole,
    canPerformAdminAction,
    cloudAuthorized,
  } = useHRMS();

  const [activeView, setActiveView] = useState<RbacWorkspaceView>('matrix');
  const [selectedRole, setSelectedRole] = useState<RoleTier>('hr_manager');
  const [selectedCategory, setSelectedCategory] = useState<'All' | RbacModuleCategory>('All');
  const [searchFilter, setSearchFilter] = useState('');

  const [draftMatrix, setDraftMatrix] = useState<RoleMatrixMap>(() =>
    normalizeRbacMatrix(rbacMatrix)
  );
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Custom Privilege modal/form state
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileAssignedCount, setProfileAssignedCount] = useState(0);
  const [profileFlags, setProfileFlags] = useState<CustomPrivilege['permissions']>({
    ...EMPTY_CUSTOM_PERMISSIONS,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [confirmDeletePrivId, setConfirmDeletePrivId] = useState<string | null>(null);

  const isCloudReadOnly = cloudAuthorized && !canPerformAdminAction;

  // Sync draft when persisted matrix updates externally (e.g., Firestore real-time update)
  useEffect(() => {
    setDraftMatrix(normalizeRbacMatrix(rbacMatrix));
  }, [rbacMatrix]);

  const roleGrantCounts = useMemo(() => {
    const map = {} as Record<RoleTier, number>;
    RBAC_ROLES.forEach((r) => {
      map[r.id] = countRolePermissions(draftMatrix[r.id]);
    });
    return map;
  }, [draftMatrix]);

  // Count real users & employees mapped to each RoleTier
  const roleMemberCounts = useMemo(() => {
    const counts: Record<RoleTier, number> = {
      super_admin: 0,
      branch_admin: 0,
      hr_manager: 0,
      finance_officer: 0,
      project_manager: 0,
      employee: 0,
    };
    const seenEmails = new Set<string>();
    userDirectory.forEach((u) => {
      if (u.role in counts && u.status !== 'suspended') {
        counts[u.role] += 1;
        if (u.email) seenEmails.add(u.email.toLowerCase());
      }
    });
    employees.forEach((emp) => {
      if (emp.email && seenEmails.has(emp.email.toLowerCase())) return;
      if (emp.roleTier in counts && emp.status !== 'inactive') {
        counts[emp.roleTier] += 1;
      }
    });
    return counts;
  }, [userDirectory, employees]);

  const changedRoles = useMemo(() => {
    return RBAC_ROLES.filter((role) => {
      const savedMap = rbacMatrix[role.id] || {};
      const draftMap = draftMatrix[role.id] || {};
      return RBAC_MODULES.some((mod) =>
        RBAC_ACTIONS.some((act) => {
          const key = `${mod.id}:${act.key}`;
          return Boolean(savedMap[key]) !== Boolean(draftMap[key]);
        })
      );
    }).map((r) => r.id);
  }, [draftMatrix, rbacMatrix]);

  const hasUnsavedChanges = changedRoles.length > 0;
  const activeRoleHasChanges = changedRoles.includes(selectedRole);

  const activeRoleDef = useMemo(
    () => RBAC_ROLES.find((r) => r.id === selectedRole) || RBAC_ROLES[0],
    [selectedRole]
  );

  const filteredModules = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return RBAC_MODULES.filter((mod) => {
      if (selectedCategory !== 'All' && mod.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        mod.name.toLowerCase().includes(q) ||
        mod.key.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchFilter]);

  const isLockedSuperAdminKey = (roleId: RoleTier, permKey: string): boolean => {
    return roleId === 'super_admin' && PROTECTED_SUPER_ADMIN_KEYS.has(permKey);
  };

  const handleTogglePermission = (moduleId: string, actionKey: RbacActionKey) => {
    if (isCloudReadOnly) return;
    const permKey = `${moduleId}:${actionKey}`;
    if (isLockedSuperAdminKey(selectedRole, permKey)) return;

    setSaveError(null);
    setDraftMatrix((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || {}),
        [permKey]: !prev[selectedRole]?.[permKey],
      },
    }));
  };

  const handleToggleModuleRow = (moduleId: string) => {
    if (isCloudReadOnly) return;
    setSaveError(null);
    setDraftMatrix((prev) => {
      const roleMap = { ...(prev[selectedRole] || {}) };
      const editableActions = RBAC_ACTIONS.filter(
        (act) => !isLockedSuperAdminKey(selectedRole, `${moduleId}:${act.key}`)
      );
      if (editableActions.length === 0) return prev;
      const allEditableGranted = editableActions.every((act) => roleMap[`${moduleId}:${act.key}`]);
      editableActions.forEach((act) => {
        roleMap[`${moduleId}:${act.key}`] = !allEditableGranted;
      });
      return {
        ...prev,
        [selectedRole]: roleMap,
      };
    });
  };

  const handleToggleActionColumn = (actionKey: RbacActionKey) => {
    if (isCloudReadOnly || filteredModules.length === 0) return;
    setSaveError(null);
    setDraftMatrix((prev) => {
      const roleMap = { ...(prev[selectedRole] || {}) };
      const editableModules = filteredModules.filter(
        (mod) => !isLockedSuperAdminKey(selectedRole, `${mod.id}:${actionKey}`)
      );
      if (editableModules.length === 0) return prev;
      const allColumnGranted = editableModules.every(
        (mod) => roleMap[`${mod.id}:${actionKey}`]
      );
      editableModules.forEach((mod) => {
        roleMap[`${mod.id}:${actionKey}`] = !allColumnGranted;
      });
      return {
        ...prev,
        [selectedRole]: roleMap,
      };
    });
  };

  const handleGrantVisibleForRole = () => {
    if (isCloudReadOnly) return;
    setSaveError(null);
    setDraftMatrix((prev) => {
      const roleMap = { ...(prev[selectedRole] || {}) };
      filteredModules.forEach((mod) => {
        RBAC_ACTIONS.forEach((act) => {
          roleMap[`${mod.id}:${act.key}`] = true;
        });
      });
      return {
        ...prev,
        [selectedRole]: roleMap,
      };
    });
  };

  const handleRevokeVisibleForRole = () => {
    if (isCloudReadOnly) return;
    setSaveError(null);
    setDraftMatrix((prev) => {
      const roleMap = { ...(prev[selectedRole] || {}) };
      filteredModules.forEach((mod) => {
        RBAC_ACTIONS.forEach((act) => {
          const key = `${mod.id}:${act.key}`;
          if (!isLockedSuperAdminKey(selectedRole, key)) {
            roleMap[key] = false;
          }
        });
      });
      return {
        ...prev,
        [selectedRole]: roleMap,
      };
    });
  };

  const handleDiscardChanges = () => {
    setDraftMatrix(normalizeRbacMatrix(rbacMatrix));
    setSaveError(null);
    setConfirmReset(false);
  };

  const handleResetDefaults = async () => {
    if (saving || isCloudReadOnly) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await resetRbacMatrixToDefaults();
      setDraftMatrix(buildDefaultRbacMatrix());
      setConfirmReset(false);
      setSaveMessage(
        cloudAuthorized
          ? 'Factory RBAC defaults restored and synced to cloud.'
          : 'Factory RBAC defaults restored.'
      );
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setSaveError(extractReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (saving || isCloudReadOnly || !hasUnsavedChanges) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      if (changedRoles.length === 1) {
        const targetRole = changedRoles[0];
        await saveRbacRolePermissions(targetRole, draftMatrix[targetRole]);
        const targetDef = RBAC_ROLES.find((r) => r.id === targetRole);
        setSaveMessage(
          `Saved ${countRolePermissions(draftMatrix[targetRole])} permissions for ${
            targetDef?.name || targetRole
          }${cloudAuthorized ? ' and synced to cloud' : ''}.`
        );
      } else {
        await saveFullRbacMatrix(draftMatrix);
        setSaveMessage(
          `Saved permission updates across ${changedRoles.length} roles${
            cloudAuthorized ? ' and synced to cloud' : ''
          }.`
        );
      }
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      setSaveError(extractReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  // Custom Privilege handlers
  const openCreateProfile = () => {
    setEditingProfileId(null);
    setProfileName('');
    setProfileDescription('');
    setProfileAssignedCount(0);
    setProfileFlags({ ...EMPTY_CUSTOM_PERMISSIONS });
    setSaveError(null);
    setProfileFormOpen(true);
  };

  const openEditProfile = (priv: CustomPrivilege) => {
    setEditingProfileId(priv.id);
    setProfileName(priv.name);
    setProfileDescription(priv.description);
    setProfileAssignedCount(priv.assignedUsersCount || 0);
    setProfileFlags({ ...priv.permissions });
    setSaveError(null);
    setProfileFormOpen(true);
  };

  const handleSaveCustomProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileSaving || isCloudReadOnly) return;
    if (!profileName.trim() || !profileDescription.trim()) return;

    setProfileSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      if (editingProfileId) {
        await updateCustomPrivilege(editingProfileId, {
          name: profileName.trim(),
          description: profileDescription.trim(),
          assignedUsersCount: Math.max(0, Number(profileAssignedCount) || 0),
          permissions: { ...profileFlags },
        });
        setSaveMessage(`Updated privilege profile "${profileName.trim()}".`);
      } else {
        await addCustomPrivilege({
          name: profileName.trim(),
          description: profileDescription.trim(),
          assignedUsersCount: Math.max(0, Number(profileAssignedCount) || 0),
          permissions: { ...profileFlags },
        });
        setSaveMessage(`Created privilege profile "${profileName.trim()}".`);
      }
      setProfileFormOpen(false);
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setSaveError(extractReadableError(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteCustomProfile = async (id: string) => {
    if (profileSaving || isCloudReadOnly) return;
    setProfileSaving(true);
    setSaveError(null);
    try {
      await deleteCustomPrivilege(id);
      setConfirmDeletePrivId(null);
      setSaveMessage('Custom privilege profile removed.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveError(extractReadableError(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const summarizeRoleActionsForModule = (roleId: RoleTier, moduleId: string): string => {
    const roleMap = draftMatrix[roleId] || {};
    const active = RBAC_ACTIONS.filter((a) => roleMap[`${moduleId}:${a.key}`]).map((a) => a.label);
    if (active.length === 0) return 'Restricted';
    if (active.length === RBAC_ACTIONS.length) return 'Full Access';
    return active.join(' · ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Role-Based Permissions (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {RBAC_ROLES.length} operational roles · {RBAC_MODULES.length} modules · {RBAC_ACTIONS.length} action scopes ·{' '}
            {customPrivileges.length} custom privilege profiles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {saveMessage && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveMessage}</span>
            </span>
          )}

          {activeView !== 'custom' ? (
            <>
              {hasUnsavedChanges && !isCloudReadOnly && (
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Discard ({changedRoles.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving || isCloudReadOnly || !hasUnsavedChanges}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>
                  {saving
                    ? 'Saving Matrix...'
                    : hasUnsavedChanges
                    ? `Save Permission Matrix (${changedRoles.length})`
                    : 'Matrix Up to Date'}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openCreateProfile}
              disabled={isCloudReadOnly}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Custom Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Guard Notice / Cloud Error Banners */}
      {isCloudReadOnly && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Read-only RBAC inspection:</span> Signed-in role ({currentRole.replace('_', ' ')}) does not hold Super Administrator privileges. Policy edits require a Super Admin account.
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-rose-700 hover:text-rose-900 font-semibold whitespace-nowrap cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Segmented Workspace Mode Switcher + Summary Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="RBAC workspace sections"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'matrix'}
            onClick={() => setActiveView('matrix')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'matrix'
                ? 'bg-white text-slate-900 border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Role Matrix Editor</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'comparison'}
            onClick={() => setActiveView('comparison')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'comparison'
                ? 'bg-white text-slate-900 border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Cross-Role Comparison</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'custom'}
            onClick={() => setActiveView('custom')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'custom'
                ? 'bg-white text-slate-900 border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Custom Privilege Profiles ({customPrivileges.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
          Active Session Role:{' '}
          <span className="font-semibold text-slate-800">
            {RBAC_ROLES.find((r) => r.id === currentRole)?.name || currentRole}
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: ROLE MATRIX EDITOR                                          */}
      {/* =================================================================== */}
      {activeView === 'matrix' && (
        <div className="space-y-5">
          {/* 6 Operational Roles Selector Strip (Unboxed tabular counts, zero pills) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {RBAC_ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              const grantCount = roleGrantCounts[role.id] ?? 0;
              const memberCount = roleMemberCounts[role.id] ?? 0;
              const isDirty = changedRoles.includes(role.id);

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="flex items-center gap-1.5 text-xs font-bold truncate">
                      <ShieldCheck
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{role.name}</span>
                    </span>
                    {isDirty && (
                      <span
                        className={`text-[10px] font-semibold shrink-0 ${
                          isSelected ? 'text-amber-300' : 'text-amber-600'
                        }`}
                      >
                        Modified
                      </span>
                    )}
                  </div>

                  <div
                    className={`mt-2.5 flex items-center justify-between text-[11px] font-mono tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    <span>
                      {grantCount}/{TOTAL_RBAC_PERMISSIONS} grants
                    </span>
                    <span>
                      {memberCount} {memberCount === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Role Policy Overview & Bulk Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-sm text-slate-900">{activeRoleDef.policyTitle}</span>
                <span aria-hidden="true">·</span>
                <span>{activeRoleDef.scopeSummary}</span>
                {activeRoleHasChanges && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-700">Unsaved draft changes</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {activeRoleDef.policyDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGrantVisibleForRole}
                disabled={isCloudReadOnly || filteredModules.length === 0}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Grant Visible
              </button>

              <button
                type="button"
                onClick={handleRevokeVisibleForRole}
                disabled={isCloudReadOnly || filteredModules.length === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Revoke Visible
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  disabled={isCloudReadOnly || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Reset Defaults</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1">
                  <span className="text-[11px] font-semibold text-rose-800 whitespace-nowrap">
                    Reset all roles?
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    disabled={saving}
                    className="rounded bg-rose-700 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-800 cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search modules, resource keys, or capabilities..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 transition-colors"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  aria-label="Clear module filter"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              {MODULE_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty Filter State */}
          {filteredModules.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                No workspace modules matched your filter
              </p>
              <p className="text-xs text-slate-500">
                Adjust your search term or reset the category filter to view all {RBAC_MODULES.length} system modules.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setSelectedCategory('All');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                Show All Modules
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Permission Matrix Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600">
                      <th className="px-4 py-3 font-semibold min-w-[260px]">
                        Workspace Module ({filteredModules.length})
                      </th>
                      {RBAC_ACTIONS.map((action) => (
                        <th key={action.key} className="px-2 py-3 text-center min-w-[74px]">
                          <button
                            type="button"
                            onClick={() => handleToggleActionColumn(action.key)}
                            disabled={isCloudReadOnly}
                            title={`Click to toggle "${action.label}" for all visible modules (${action.description})`}
                            className="inline-flex flex-col items-center gap-0.5 rounded px-1.5 py-1 font-semibold text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 disabled:hover:bg-transparent transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <span>{action.label}</span>
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold min-w-[100px]">
                        Row Scope
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredModules.map((mod) => {
                      const roleMap = draftMatrix[selectedRole] || {};
                      const editableActions = RBAC_ACTIONS.filter(
                        (act) => !isLockedSuperAdminKey(selectedRole, `${mod.id}:${act.key}`)
                      );
                      const rowAllGranted =
                        editableActions.length > 0 &&
                        editableActions.every((act) => roleMap[`${mod.id}:${act.key}`]);
                      const grantedInRow = RBAC_ACTIONS.filter(
                        (act) => roleMap[`${mod.id}:${act.key}`]
                      ).length;

                      return (
                        <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 text-xs">
                              {mod.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-400">{mod.key}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[230px]">{mod.category}</span>
                            </div>
                          </td>

                          {RBAC_ACTIONS.map((action) => {
                            const permKey = `${mod.id}:${action.key}`;
                            const checked = Boolean(roleMap[permKey]);
                            const locked = isLockedSuperAdminKey(selectedRole, permKey);

                            return (
                              <td key={action.key} className="px-2 py-2.5 text-center">
                                <button
                                  type="button"
                                  disabled={isCloudReadOnly || locked}
                                  onClick={() => handleTogglePermission(mod.id, action.key)}
                                  aria-pressed={checked}
                                  aria-label={`${action.label} on ${mod.name}`}
                                  title={
                                    locked
                                      ? 'Core Super Administrator governance permission cannot be disabled'
                                      : `${action.label} on ${mod.name}: ${
                                          checked ? 'Enabled' : 'Disabled'
                                        }`
                                  }
                                  className={`mx-auto inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                                    locked
                                      ? 'bg-slate-700 border-slate-700 text-white cursor-not-allowed opacity-90'
                                      : checked
                                      ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                                      : 'bg-white border-slate-300 text-transparent hover:border-slate-500 cursor-pointer'
                                  } disabled:opacity-60`}
                                >
                                  {locked ? (
                                    <Lock className="h-3 w-3" />
                                  ) : checked ? (
                                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2.5">
                              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                                {grantedInRow}/{RBAC_ACTIONS.length}
                              </span>
                              <button
                                type="button"
                                disabled={isCloudReadOnly || editableActions.length === 0}
                                onClick={() => handleToggleModuleRow(mod.id)}
                                className="text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                              >
                                {rowAllGranted ? 'Clear' : 'All'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Accessible Touch Cards (< md) */}
              <div className="md:hidden space-y-3">
                {filteredModules.map((mod) => {
                  const roleMap = draftMatrix[selectedRole] || {};
                  const editableActions = RBAC_ACTIONS.filter(
                    (act) => !isLockedSuperAdminKey(selectedRole, `${mod.id}:${act.key}`)
                  );
                  const rowAllGranted =
                    editableActions.length > 0 &&
                    editableActions.every((act) => roleMap[`${mod.id}:${act.key}`]);

                  return (
                    <div
                      key={mod.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900">{mod.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-slate-400">{mod.key}</span>
                            <span className="mx-1.5">·</span>
                            <span>{mod.category}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isCloudReadOnly || editableActions.length === 0}
                          onClick={() => handleToggleModuleRow(mod.id)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
                        >
                          {rowAllGranted ? 'Clear Row' : 'Grant All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {RBAC_ACTIONS.map((action) => {
                          const permKey = `${mod.id}:${action.key}`;
                          const checked = Boolean(roleMap[permKey]);
                          const locked = isLockedSuperAdminKey(selectedRole, permKey);

                          return (
                            <button
                              key={action.key}
                              type="button"
                              disabled={isCloudReadOnly || locked}
                              onClick={() => handleTogglePermission(mod.id, action.key)}
                              aria-pressed={checked}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                                locked
                                  ? 'border-slate-700 bg-slate-800 text-white cursor-not-allowed'
                                  : checked
                                  ? 'border-slate-900 bg-slate-900 text-white cursor-pointer'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                              } disabled:opacity-65`}
                            >
                              <span>{action.label}</span>
                              {locked ? (
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                              ) : checked ? (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <span className="h-3.5 w-3.5 rounded border border-slate-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: CROSS-ROLE COMPARISON MATRIX                                */}
      {/* =================================================================== */}
      {activeView === 'comparison' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Cross-Role Access Comparison
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare effective permissions across all {RBAC_ROLES.length} operational roles side-by-side. Select any role column to edit its grants.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter modules..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="px-4 py-3 font-semibold min-w-[210px]">System Module</th>
                  {RBAC_ROLES.map((role) => (
                    <th key={role.id} className="px-3.5 py-3 font-semibold min-w-[155px]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole(role.id);
                          setActiveView('matrix');
                        }}
                        className="text-left hover:underline cursor-pointer"
                      >
                        <div className="text-xs font-bold text-slate-900">{role.shortName}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-500 tabular-nums">
                          {roleGrantCounts[role.id]}/{TOTAL_RBAC_PERMISSIONS} · {roleMemberCounts[role.id]} users
                        </div>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{mod.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{mod.key}</div>
                    </td>
                    {RBAC_ROLES.map((role) => {
                      const summary = summarizeRoleActionsForModule(role.id, mod.id);
                      const isRestricted = summary === 'Restricted';
                      const isFull = summary === 'Full Access';
                      return (
                        <td key={role.id} className="px-3.5 py-3 align-top">
                          <span
                            className={`text-[11.5px] leading-snug block ${
                              isRestricted
                                ? 'text-slate-400'
                                : isFull
                                ? 'font-semibold text-emerald-700'
                                : 'text-slate-700'
                            }`}
                          >
                            {summary}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: CUSTOM PRIVILEGE PROFILES                                   */}
      {/* =================================================================== */}
      {activeView === 'custom' && (
        <div className="space-y-5">
          {profileFormOpen && (
            <form
              onSubmit={handleSaveCustomProfile}
              className="rounded-xl border border-slate-300 bg-white p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingProfileId ? 'Edit Custom Privilege Profile' : 'Create Custom Privilege Profile'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define specialized operational capability overlays synced alongside core roles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileFormOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Saudi GOSI & Legal Compliance Auditor"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assigned Users Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={profileAssignedCount}
                    onChange={(e) => setProfileAssignedCount(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Scope Description
                </label>
                <input
                  type="text"
                  required
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Describe the operational authority granted by this privilege overlay..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Granted Operational Capabilities
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CUSTOM_PRIV_FLAGS.map((flag) => {
                    const active = profileFlags[flag.key];
                    return (
                      <button
                        key={flag.key}
                        type="button"
                        onClick={() =>
                          setProfileFlags((prev) => ({ ...prev, [flag.key]: !prev[flag.key] }))
                        }
                        aria-pressed={active}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer min-h-[40px] ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{flag.label}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProfileFormOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{editingProfileId ? 'Save Profile Changes' : 'Create Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {customPrivileges.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                No custom privilege profiles configured
              </p>
              <p className="text-xs text-slate-500">
                Create specialized permission overlays (such as Compliance Auditors or Treasury Approvers) for cross-functional delegates.
              </p>
              {!isCloudReadOnly && (
                <button
                  type="button"
                  onClick={openCreateProfile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Profile</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
              {customPrivileges.map((priv) => {
                const enabledLabels = CUSTOM_PRIV_FLAGS.filter((f) => priv.permissions[f.key]).map(
                  (f) => f.label
                );

                return (
                  <div
                    key={priv.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{priv.name}</h3>
                        <span className="text-xs font-mono text-slate-400">{priv.id}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-xs font-mono text-slate-600 tabular-nums">
                          {priv.assignedUsersCount} assigned
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {priv.description}
                      </p>

                      <div className="text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700">Enabled Scopes: </span>
                        {enabledLabels.length > 0 ? enabledLabels.join(' · ') : 'None'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isCloudReadOnly}
                        onClick={() => openEditProfile(priv)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap cursor-pointer"
                      >
                        Configure
                      </button>

                      {confirmDeletePrivId !== priv.id ? (
                        <button
                          type="button"
                          disabled={isCloudReadOnly}
                          onClick={() => setConfirmDeletePrivId(priv.id)}
                          aria-label={`Delete ${priv.name}`}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-45 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1">
                          <button
                            type="button"
                            disabled={profileSaving}
                            onClick={() => handleDeleteCustomProfile(priv.id)}
                            className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-800 cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePrivId(null)}
                            className="px-1.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clean Factual Governance Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          Editing Policy:{' '}
          <span className="font-semibold text-slate-800">{activeRoleDef.name}</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono tabular-nums">
            {roleGrantCounts[selectedRole] ?? 0} of {TOTAL_RBAC_PERMISSIONS} grants enabled
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          {cloudAuthorized ? 'Cloud Governance Synced · Firestore RBAC Rules Active' : 'Local Workspace Policy Cache'}
        </div>
      </div>
    </div>
  );
};
