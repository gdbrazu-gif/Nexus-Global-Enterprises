import React, { useState, useMemo, useRef } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Check,
  Database,
  Download,
  FileJson,
  HardDrive,
  History,
  RotateCcw,
  Trash2,
  Upload,
  AlertTriangle,
} from 'lucide-react';

interface BackupModuleDefinition {
  id: string;
  name: string;
  description: string;
  keys: string[];
  getRecordCount: () => number;
}

interface BackupPayload {
  schemaVersion: string;
  appName: string;
  exportedAt: string;
  exportedBy: string;
  companyName: string;
  crNumber: string;
  includedModules: string[];
  data: Record<string, unknown>;
}

interface LocalSnapshot {
  id: string;
  label: string;
  createdAt: string;
  createdBy: string;
  companyName: string;
  moduleCount: number;
  recordCount: number;
  sizeBytes: number;
  payload: BackupPayload;
}

const SNAPSHOTS_STORAGE_KEY = 'apex_backup_snapshots';

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const BackupDataManager: React.FC = () => {
  const {
    corporateEntity,
    branches,
    currentUser,
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
    auditLogs,
    templateConfigs,
    addAuditLog,
  } = useHRMS();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const moduleDefinitions: BackupModuleDefinition[] = useMemo(
    () => [
      {
        id: 'corporate',
        name: 'Corporate Identity, Branches & Legal Entity',
        description: 'Company profile, logo asset, CR/VAT registration, treasury IBAN, and multi-branch registry',
        keys: ['apex_corporate_entity', 'apex_branches'],
        getRecordCount: () => 1 + branches.length,
      },
      {
        id: 'workforce',
        name: 'Workforce Directory & Org Structure',
        description: 'Employee profiles, compensation structures, departments, and designations',
        keys: ['apex_employees', 'apex_departments', 'apex_designations'],
        getRecordCount: () => employees.length + departments.length + designations.length,
      },
      {
        id: 'timesheets',
        name: 'Attendance & Timesheet Ledger',
        description: 'Daily attendance matrix entries, regular hours, and overtime logs',
        keys: ['apex_timesheets'],
        getRecordCount: () => timesheetEntries.length,
      },
      {
        id: 'leaves',
        name: 'Leave & Time-Off Requests',
        description: 'Submitted leave applications, approvals, and rejection notes',
        keys: ['apex_leaves'],
        getRecordCount: () => leaveRequests.length,
      },
      {
        id: 'payroll_state',
        name: 'Payroll Exclusions & Ledger Preferences',
        description: 'Removed/archived monthly payslip exclusion markers',
        keys: ['apex_deleted_payrolls'],
        getRecordCount: () => readJsonStorage<string[]>('apex_deleted_payrolls', []).length,
      },
      {
        id: 'finance',
        name: 'Accounting Categories & Expenses',
        description: 'Cost categories, corporate expense vouchers, and settlement approvals',
        keys: ['apex_acc_categories', 'apex_expenses'],
        getRecordCount: () => accountingCategories.length + expenses.length,
      },
      {
        id: 'projects_villas',
        name: 'Projects, Contracts & Villas Ledger',
        description: 'Master contracts, villas/housing units, custom types, and daily site work logs',
        keys: ['apex_projects', 'apex_villas', 'apex_custom_villa_types'],
        getRecordCount: () => projects.length + villas.length,
      },
      {
        id: 'assets',
        name: 'Asset Categories & Custody Registry',
        description: 'Equipment categories, serial tracking, and employee custody assignments',
        keys: ['apex_asset_categories', 'apex_assets'],
        getRecordCount: () => assetCategories.length + assets.length,
      },
      {
        id: 'manpower',
        name: 'Manpower Suppliers, Workers & POs',
        description: 'Vendor contracts, outsourced labor rosters, trades, and service purchase orders',
        keys: [
          'apex_manpower_suppliers',
          'apex_supplied_workers',
          'apex_manpower_trades',
          'apex_manpower_pos',
        ],
        getRecordCount: () =>
          manpowerSuppliers.length + suppliedWorkers.length + manpowerPOSList.length,
      },
      {
        id: 'inventory',
        name: 'Inventory Catalog, Movements & Invoices',
        description: 'Warehouse SKUs, stock IN/OUT ledger, categories, UOMs, and invoices',
        keys: [
          'apex_inventory_items',
          'apex_stock_movements',
          'apex_inventory_categories',
          'apex_inventory_uoms',
          'apex_inventory_invoices',
        ],
        getRecordCount: () =>
          inventoryItems.length + stockMovements.length + inventoryInvoices.length,
      },
      {
        id: 'governance',
        name: 'RBAC Matrix, Templates & Audit Logs',
        description: 'Role permissions matrix, letterhead/PDF templates, privileges, and audit trail',
        keys: [
          'apex_rbac_matrix',
          'apex_custom_privileges',
          'apex_template_configs',
          'apex_audit_logs',
        ],
        getRecordCount: () =>
          Object.keys(templateConfigs).length + customPrivileges.length + auditLogs.length,
      },
    ],
    [
      branches.length,
      employees.length,
      departments.length,
      designations.length,
      timesheetEntries.length,
      leaveRequests.length,
      accountingCategories.length,
      expenses.length,
      projects.length,
      villas.length,
      assetCategories.length,
      assets.length,
      manpowerSuppliers.length,
      suppliedWorkers.length,
      manpowerPOSList.length,
      inventoryItems.length,
      stockMovements.length,
      inventoryInvoices.length,
      templateConfigs,
      customPrivileges.length,
      auditLogs.length,
    ]
  );

  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [
      'corporate',
      'workforce',
      'timesheets',
      'leaves',
      'payroll_state',
      'finance',
      'projects_villas',
      'assets',
      'manpower',
      'inventory',
      'governance',
    ].forEach((id) => {
      initial[id] = true;
    });
    return initial;
  });

  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() =>
    readJsonStorage<LocalSnapshot[]>(SNAPSHOTS_STORAGE_KEY, [])
  );
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    payload: BackupPayload;
    totalRecords: number;
    keyCount: number;
  } | null>(null);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const moduleMetrics = useMemo(() => {
    return moduleDefinitions.map((mod) => {
      let bytes = 0;
      mod.keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          bytes += new Blob([raw]).size;
        }
      });
      return {
        ...mod,
        records: mod.getRecordCount(),
        bytes,
      };
    });
  }, [moduleDefinitions]);

  const selectedList = moduleMetrics.filter((m) => selectedModules[m.id]);
  const totalSelectedRecords = selectedList.reduce((acc, m) => acc + m.records, 0);
  const totalSelectedBytes = selectedList.reduce((acc, m) => acc + m.bytes, 0);
  const totalStorageBytes = moduleMetrics.reduce((acc, m) => acc + m.bytes, 0);

  const toggleModule = (id: string) => {
    setSelectedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setAllModules = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    moduleDefinitions.forEach((m) => {
      next[m.id] = checked;
    });
    setSelectedModules(next);
  };

  const buildBackupPayload = (): BackupPayload => {
    const data: Record<string, unknown> = {};
    const includedIds: string[] = [];

    moduleDefinitions.forEach((mod) => {
      if (!selectedModules[mod.id]) return;
      includedIds.push(mod.id);
      mod.keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            data[key] = JSON.parse(raw);
          } catch {
            data[key] = raw;
          }
        }
      });
    });

    return {
      schemaVersion: '2.6.0',
      appName: 'Apex HRMS & Contracting Suite',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.fullName || 'Super Administrator',
      companyName: corporateEntity.companyName || 'Corporate Entity',
      crNumber: corporateEntity.crNumber || '',
      includedModules: includedIds,
      data,
    };
  };

  const triggerJsonDownload = (payload: BackupPayload, filenamePrefix?: string) => {
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const safeCompany = (payload.companyName || 'company')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filenamePrefix || safeCompany}-backup-${dateStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBackup = () => {
    if (selectedList.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Select at least one dataset module before generating a backup file.',
      });
      return;
    }
    const payload = buildBackupPayload();
    triggerJsonDownload(payload);
    addAuditLog(
      'CREATE',
      'Settings',
      `Exported full JSON data backup covering ${selectedList.length} modules (${totalSelectedRecords} records).`
    );
    setStatusMessage({
      type: 'success',
      text: `Backup file downloaded for ${selectedList.length} modules (${formatBytes(
        new Blob([JSON.stringify(payload)]).size
      )}).`,
    });
  };

  const handleCreateSnapshot = () => {
    if (selectedList.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Select at least one dataset module to save a local restore point.',
      });
      return;
    }

    const payload = buildBackupPayload();
    const serializedPayload = JSON.stringify(payload);
    const newSnapshot: LocalSnapshot = {
      id: `SNAP-${Date.now()}`,
      label:
        snapshotLabel.trim() ||
        `${corporateEntity.companyName || 'Enterprise'} Restore Point`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.fullName || 'Administrator',
      companyName: corporateEntity.companyName || 'Enterprise',
      moduleCount: selectedList.length,
      recordCount: totalSelectedRecords,
      sizeBytes: new Blob([serializedPayload]).size,
      payload,
    };

    const nextSnapshots = [newSnapshot, ...snapshots].slice(0, 8);
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(nextSnapshots));
      setSnapshots(nextSnapshots);
      setSnapshotLabel('');
      addAuditLog(
        'CREATE',
        'Settings',
        `Created local browser restore snapshot "${newSnapshot.label}" (${newSnapshot.recordCount} records).`
      );
      setStatusMessage({
        type: 'success',
        text: `Restore point "${newSnapshot.label}" saved in browser storage.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Browser storage quota exceeded. Download the JSON backup file instead or remove older snapshots.',
      });
    }
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const target = snapshots.find((s) => s.id === snapshotId);
    const next = snapshots.filter((s) => s.id !== snapshotId);
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(next));
    setSnapshots(next);
    if (target) {
      addAuditLog('DELETE', 'Settings', `Deleted local backup snapshot "${target.label}".`);
    }
    setStatusMessage({
      type: 'info',
      text: 'Local restore snapshot removed.',
    });
  };

  const applyBackupPayload = (payload: BackupPayload, sourceLabel: string) => {
    const entries = Object.entries(payload.data || {});
    if (entries.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Backup payload contains no recognizable workspace keys.',
      });
      return;
    }

    entries.forEach(([key, value]) => {
      if (key.startsWith('apex_') && key !== SNAPSHOTS_STORAGE_KEY) {
        localStorage.setItem(
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }
    });

    addAuditLog(
      'UPDATE',
      'Settings',
      `Restored workspace data from ${sourceLabel} (${entries.length} storage collections).`
    );

    setPendingImport(null);
    setStatusMessage({
      type: 'success',
      text: `Restored ${entries.length} data collections from ${sourceLabel}. Reloading workspace...`,
    });

    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as BackupPayload;
        if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
          setStatusMessage({
            type: 'error',
            text: 'Invalid backup file structure. Expected an Apex HRMS JSON backup bundle.',
          });
          return;
        }

        const validKeys = Object.keys(parsed.data).filter((k) => k.startsWith('apex_'));
        if (validKeys.length === 0) {
          setStatusMessage({
            type: 'error',
            text: 'No Apex workspace collections were found inside this JSON file.',
          });
          return;
        }

        let estimatedRecords = 0;
        validKeys.forEach((k) => {
          const val = parsed.data[k];
          if (Array.isArray(val)) {
            estimatedRecords += val.length;
          } else if (val && typeof val === 'object') {
            estimatedRecords += 1;
          }
        });

        setPendingImport({
          fileName: file.name,
          payload: parsed,
          totalRecords: estimatedRecords,
          keyCount: validKeys.length,
        });
        setStatusMessage({
          type: 'info',
          text: `Backup file "${file.name}" verified. Review summary below and click Confirm & Restore.`,
        });
      } catch {
        setStatusMessage({
          type: 'error',
          text: 'Could not parse JSON file. Ensure you selected an unmodified .json backup.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFactoryReset = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('apex_') && k !== SNAPSHOTS_STORAGE_KEY && k !== 'apex_auth_user') {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setConfirmResetOpen(false);
    setStatusMessage({
      type: 'success',
      text: 'Workspace data cleared to default seed state. Reloading workspace...',
    });
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Backup Data & Restore Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Export portable JSON archives, save browser restore points, or recover workspace datasets for{' '}
            <span className="font-semibold text-slate-700">
              {corporateEntity.companyName || 'Corporate Entity'}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>Import Backup File</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Backup (.json)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleUploadFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Feedback Notice */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-slate-100 text-slate-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Selected Datasets</div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
            {selectedList.length} / {moduleDefinitions.length}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Workspace modules</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Records in Scope</div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
            {totalSelectedRecords.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Included entities</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Archive Footprint</div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
            {formatBytes(totalSelectedBytes)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
            Total stored: {formatBytes(totalStorageBytes)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Local Restore Points</div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono tabular-nums">
            {snapshots.length}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Saved in browser</div>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Module Dataset Selection Table */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                01. Dataset Selection & Export Scope
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose which ERP ledgers and configuration collections to include in your export or snapshot.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAllModules(true)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setAllModules(false)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pl-5 pr-2 w-10">Include</th>
                  <th className="py-2.5 px-3">Dataset Module</th>
                  <th className="py-2.5 px-3 text-right">Records</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {moduleMetrics.map((mod) => {
                  const isChecked = !!selectedModules[mod.id];
                  return (
                    <tr
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`transition-colors cursor-pointer ${
                        isChecked ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 opacity-65 hover:opacity-90'
                      }`}
                    >
                      <td className="py-3 pl-5 pr-2 align-top">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModule(mod.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Include ${mod.name}`}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{mod.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {mod.description}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 align-top">
                        {mod.records.toLocaleString()}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right font-mono tabular-nums text-slate-500 align-top whitespace-nowrap">
                        {formatBytes(mod.bytes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right 5 Columns: Snapshot Creator, File Restore, Factory Reset */}
        <div className="lg:col-span-5 space-y-5">
          {/* Save Local Restore Point */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  02. Create Browser Restore Point
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save a point-in-time copy locally before bulk imports or payroll runs.
                </p>
              </div>
              <HardDrive className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <div>
              <label
                htmlFor="backup-snapshot-label"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Snapshot Label (Optional)
              </label>
              <input
                id="backup-snapshot-label"
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="e.g., Pre-Payroll Closing Nov 2026"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Database className="h-3.5 w-3.5 text-slate-700" />
              <span>Create Restore Snapshot</span>
            </button>
          </section>

          {/* Restore From JSON Backup File */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  03. Restore From JSON Backup
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a previously exported backup bundle to restore company and ledger records.
                </p>
              </div>
              <FileJson className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            </div>

            {!pendingImport ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center space-y-2.5">
                <p className="text-xs text-slate-600">
                  Select a <span className="font-mono font-semibold">.json</span> archive exported from this portal.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Backup File</span>
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 truncate">
                    {pendingImport.fileName}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                    v{pendingImport.payload.schemaVersion || '2.6.0'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <div>
                    Company:{' '}
                    <span className="font-semibold text-slate-800">
                      {pendingImport.payload.companyName || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    Exported:{' '}
                    <span className="font-mono tabular-nums">
                      {pendingImport.payload.exportedAt
                        ? new Date(pendingImport.payload.exportedAt).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  <div>
                    Payload:{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {pendingImport.keyCount} collections · {pendingImport.totalRecords} items
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      applyBackupPayload(pendingImport.payload, `"${pendingImport.fileName}"`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm & Restore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingImport(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Factory Reset Section */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  04. Reset Workspace to Defaults
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear local modifications and reload default sample data (snapshots are kept).
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            </div>

            {!confirmResetOpen ? (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Workspace Data</span>
              </button>
            ) : (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2.5 text-xs">
                <p className="font-medium text-rose-800">
                  This clears current changes across employees, timesheets, finances, and settings. Download a backup first if needed.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFactoryReset}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 whitespace-nowrap cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Saved Local Snapshots History Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Saved Local Restore Snapshots
              </h2>
              <p className="text-xs text-slate-500">
                Up to 8 most recent point-in-time snapshots stored locally in this browser.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {snapshots.length} stored
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="px-6 py-10 text-center space-y-2">
            <p className="text-xs font-medium text-slate-600">
              No local restore points created yet.
            </p>
            <p className="text-[11px] text-slate-400">
              Use "Create Restore Snapshot" above to save a recoverable checkpoint before major updates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pl-5 pr-3">Snapshot Label</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3 text-right">Modules</th>
                  <th className="py-2.5 px-3 text-right">Records</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-5 pr-3 font-semibold text-slate-900">
                      <div>{snap.label}</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {snap.companyName}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(snap.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{snap.createdBy}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {snap.moduleCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {snap.recordCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatBytes(snap.sizeBytes)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => triggerJsonDownload(snap.payload, 'snapshot')}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                          title="Download Snapshot JSON"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => applyBackupPayload(snap.payload, `snapshot "${snap.label}"`)}
                          className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Snapshot"
                          aria-label={`Delete snapshot ${snap.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
