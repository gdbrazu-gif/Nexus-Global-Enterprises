import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Project, AssetCategory, Asset } from '../../types';
import {
  FolderGit2,
  Laptop,
  Plus,
  Printer,
  Edit3,
  Trash2,
  X,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const ProjectsAssets: React.FC = () => {
  const {
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
    employees,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    corporateEntity,
    t,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<'projects' | 'assets' | 'assetCategories'>('projects');

  // Project Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    client: '',
    department: 'Engineering & Technology',
    budgetSAR: 500000,
    startDate: '2026-10-01',
    endDate: '2027-04-30',
    status: 'in_progress' as Project['status'],
    leadName: 'Khalid Al-Fassi',
  });

  // Asset Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  // Asset Modal
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    assetTag: '',
    name: '',
    categoryId: assetCategories[0]?.id || 'ACAT-01',
    serialNumber: '',
    assignedToEmployeeId: 'EMP-1005',
    purchaseDate: '2026-01-15',
    costSAR: 8500,
    warrantyExpiry: '2028-01-14',
    status: 'in_use' as Asset['status'],
  });

  // Asset Handover Deed Print Modal
  const [handoverAsset, setHandoverAsset] = useState<Asset | null>(null);

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    addProject({
      ...projectForm,
      budgetSAR: Number(projectForm.budgetSAR),
    });
    setProjectModalOpen(false);
  };

  const handleSaveAssetCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatId) {
      updateAssetCategory(editingCatId, catForm);
    } else {
      addAssetCategory(catForm);
    }
    setCatModalOpen(false);
    setEditingCatId(null);
    setCatForm({ name: '', code: '', description: '' });
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = assetCategories.find((c) => c.id === assetForm.categoryId);
    const emp = employees.find((e) => e.id === assetForm.assignedToEmployeeId);
    addAsset({
      ...assetForm,
      categoryName: cat?.name || 'General Hardware',
      assignedToEmployeeName: emp?.fullName,
      costSAR: Number(assetForm.costSAR),
    });
    setAssetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Projects & Corporate Assets Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise delivery contracts, custom asset categories, inventory tracking, and handover deeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPerformAdminAction && (
            <>
              <button
                onClick={() => {
                  setEditingCatId(null);
                  setCatForm({ name: '', code: '', description: '' });
                  setCatModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Custom Asset Category</span>
              </button>

              <button
                onClick={() => setAssetModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Asset</span>
              </button>

              <button
                onClick={() => setProjectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Project</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'projects'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'assets'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Assets Inventory ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('assetCategories')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'assetCategories'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Custom Asset Categories ({assetCategories.length})
        </button>
      </div>

      {/* TAB 1: Projects */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((prj) => {
            const pct = Math.round((prj.spentSAR / prj.budgetSAR) * 100);
            return (
              <div
                key={prj.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">{prj.name}</h3>
                    <span className="font-mono text-[10px] text-slate-500">
                      {prj.code} · {prj.client}
                    </span>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      prj.status === 'in_progress'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {prj.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Budget Spent:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(prj.spentSAR)} / {formatCurrency(prj.budgetSAR)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span>Lead: {prj.leadName}</span>
                  <span>End: {prj.endDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Assets Inventory */}
      {activeTab === 'assets' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                <th className="px-4 py-3">Asset Tag & Device</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Assigned Custodian</th>
                <th className="px-4 py-3 text-right">Cost ({baseCurrency})</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Handover PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{asset.name}</div>
                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                      {asset.assetTag}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {asset.categoryName}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                    {asset.serialNumber}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {asset.assignedToEmployeeName || 'Corporate Stock'}
                    </div>
                    {asset.assignedToEmployeeId && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {asset.assignedToEmployeeId}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(asset.costSAR)}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize">
                      {asset.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setHandoverAsset(asset)}
                        className="rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-slate-800 text-[11px] font-semibold flex items-center gap-1"
                        title="Print / PDF Custody Handover Certificate"
                      >
                        <Printer className="h-3 w-3" />
                        <span>PDF Deed</span>
                      </button>

                      {canPerformAdminAction && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete asset record ${asset.assetTag}?`)) {
                              deleteAsset(asset.id);
                            }
                          }}
                          className="rounded p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Custom Asset Categories */}
      {activeTab === 'assetCategories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{cat.name}</h3>
                  <span className="font-mono text-[11px] text-slate-500 font-semibold">
                    Code: {cat.code}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {canPerformAdminAction && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatForm({
                            name: cat.name,
                            code: cat.code,
                            description: cat.description,
                          });
                          setCatModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Edit Asset Category"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete category ${cat.name}?`)) {
                            deleteAssetCategory(cat.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{cat.description}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Enrolled Assets:</span>
                <span className="font-bold text-slate-900">{cat.assetsCount} items</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create Project */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Project Contract</h3>
              <button onClick={() => setProjectModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Healthcare ERP Modernization"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-2026-04"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Client Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ministry of Health"
                    value={projectForm.client}
                    onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Budget (SAR)</label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={projectForm.budgetSAR}
                    onChange={(e) => setProjectForm({ ...projectForm, budgetSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Project Director</label>
                  <select
                    value={projectForm.leadName}
                    onChange={(e) => setProjectForm({ ...projectForm, leadName: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.fullName}>
                        {emp.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target End Date</label>
                  <input
                    type="date"
                    required
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Custom Asset Category Modal (Create & Edit) */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCatId ? 'Edit Asset Category' : 'Create Custom Asset Category'}
              </h3>
              <button onClick={() => setCatModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveAssetCategory} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Specialized Mobile Testing Units"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MOB-TEST"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Description of equipment covered under this category..."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Register Asset */}
      {assetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Register Asset into Inventory</h3>
              <button onClick={() => setAssetModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveAsset} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AST-DEV-908"
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={assetForm.categoryId}
                    onChange={(e) => setAssetForm({ ...assetForm, categoryId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {assetCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Equipment / Model Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apple MacBook Pro 14 M3 Max"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C02GK9140"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cost (SAR)</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={assetForm.costSAR}
                    onChange={(e) => setAssetForm({ ...assetForm, costSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Custodian (Employee)</label>
                <select
                  value={assetForm.assignedToEmployeeId}
                  onChange={(e) => setAssetForm({ ...assetForm, assignedToEmployeeId: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  <option value="">Unassigned (In Storage)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssetModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Enroll Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Asset Handover Certificate PDF Preview */}
      {handoverAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Print Asset Custody & Handover Deed
                </h3>
                <p className="text-xs text-slate-500">
                  Official Equipment Handover Declaration according to Corporate Policy.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Deed</span>
                </button>
                <button
                  onClick={() => setHandoverAsset(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Deed Document */}
            <div className="print-container mt-6 space-y-6 text-slate-900">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Logo"
                    className="h-12 w-12 object-contain"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {corporateEntity.companyName}
                    </h2>
                    <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT: {corporateEntity.vatNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider block">
                    ASSET CUSTODY DEED
                  </span>
                  <span className="font-mono text-slate-700 block font-semibold mt-0.5">
                    {handoverAsset.assetTag}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 block">
                    Issued: {new Date().toISOString().substring(0, 10)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                  Assigned Custodian Particulars
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">EMPLOYEE NAME</span>
                    <span className="font-bold text-slate-900 font-sans text-sm">
                      {handoverAsset.assignedToEmployeeName || 'Corporate Stock'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">EMPLOYEE ID</span>
                    <span className="font-semibold text-slate-800">
                      {handoverAsset.assignedToEmployeeId || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] font-sans">
                  Equipment Specifications
                </div>
                <table className="w-full border-collapse border border-slate-200">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 bg-slate-50 text-slate-500 w-1/3">Device / Item</td>
                      <td className="p-2.5 font-bold text-slate-900 font-sans">
                        {handoverAsset.name}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-slate-50 text-slate-500">Asset Category</td>
                      <td className="p-2.5 text-slate-800">{handoverAsset.categoryName}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-slate-50 text-slate-500">Serial Number</td>
                      <td className="p-2.5 font-bold text-slate-900">{handoverAsset.serialNumber}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-slate-50 text-slate-500">Book Value</td>
                      <td className="p-2.5 text-slate-800">
                        {formatCurrency(handoverAsset.costSAR)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 block">Custody Declaration & Undertaking:</span>
                <p>
                  I acknowledge receipt of the asset listed above in fully operational condition. I undertake to protect and utilize it exclusively for business operations, and return it in good working condition upon request or termination of employment.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <span className="text-slate-400 text-[11px] block mb-6">IT & Assets Custodian</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Signature: __________________
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block mb-6">Employee Signature</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    {handoverAsset.assignedToEmployeeName}
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                Nexus Global ERP Assets Management Module · Formal Custody Record
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
