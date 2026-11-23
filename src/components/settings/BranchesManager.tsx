import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Branch } from '../../types';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Globe2,
  Users,
  FolderGit2,
  Boxes,
  X,
  LayoutGrid,
  List,
  Crown,
} from 'lucide-react';

export const BranchesManager: React.FC = () => {
  const {
    branches,
    activeBranchId,
    setActiveBranchId,
    addBranch,
    updateBranch,
    deleteBranch,
    employees,
    projects,
    inventoryItems,
    canPerformAdminAction,
  } = useHRMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Branch['status']>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('Saudi Arabia');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [status, setStatus] = useState<Branch['status']>('active');

  const openAddModal = () => {
    setEditingBranch(null);
    setCode('');
    setName('');
    setCity('');
    setRegion('');
    setCountry('Saudi Arabia');
    setAddress('');
    setPhone('+966 ');
    setEmail('');
    setManagerName('');
    setIsHeadquarters(false);
    setStatus('active');
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setCode(branch.code);
    setName(branch.name);
    setCity(branch.city);
    setRegion(branch.region);
    setCountry(branch.country);
    setAddress(branch.address);
    setPhone(branch.phone);
    setEmail(branch.email || '');
    setManagerName(branch.managerName);
    setIsHeadquarters(branch.isHeadquarters);
    setStatus(branch.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !city.trim()) return;

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        city: city.trim(),
        region: region.trim() || 'Central Region',
        country: country.trim() || 'Saudi Arabia',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        managerName: managerName.trim() || 'Branch Operations Lead',
        isHeadquarters,
        status,
      });
    } else {
      addBranch({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        city: city.trim(),
        region: region.trim() || 'Central Region',
        country: country.trim() || 'Saudi Arabia',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        managerName: managerName.trim() || 'Branch Operations Lead',
        isHeadquarters,
        status,
      });
    }
    setModalOpen(false);
  };

  const branchStatsMap = useMemo(() => {
    const map = new Map<string, { staff: number; projects: number; stockUnits: number }>();
    branches.forEach((b) => {
      const staff = employees.filter((e) => (e.branchId || 'BR-RUH') === b.id).length;
      const prj = projects.filter((p) => (p.branchId || 'BR-RUH') === b.id).length;
      const stockUnits = inventoryItems
        .filter((i) => (i.branchId || 'BR-RUH') === b.id)
        .reduce((sum, i) => sum + (i.quantityOnHand || 0), 0);
      map.set(b.id, { staff, projects: prj, stockUnits });
    });
    return map;
  }, [branches, employees, projects, inventoryItems]);

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          b.managerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [branches, statusFilter, searchQuery]);

  const activeBranchesCount = branches.filter((b) => b.status === 'active').length;
  const hqBranch = branches.find((b) => b.isHeadquarters);
  const distinctCitiesCount = new Set(branches.map((b) => b.city).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Multi-Branch Network &amp; Regional Locations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure corporate offices, operating hubs, and regional branches. Switching active context filters ledgers across your devices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPerformAdminAction && (
            <>
              <button
                type="button"
                onClick={() => setActiveBranchId('all')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  activeBranchId === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                <span>Consolidated View (All Branches)</span>
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Branch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Registered Branches</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{branches.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {activeBranchesCount} active operating hubs
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Corporate Headquarters</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 truncate">
            {hqBranch?.name || 'Central Corporate HQ'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {hqBranch ? `${hqBranch.code} · ${hqBranch.city}` : 'Primary Governing Office'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Workspace Scope</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 font-mono truncate">
            {activeBranchId === 'all'
              ? 'All Branches'
              : branches.find((b) => b.id === activeBranchId)?.code || activeBranchId}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {activeBranchId === 'all'
              ? 'Consolidated multi-branch ledger'
              : branches.find((b) => b.id === activeBranchId)?.name || 'Filtered view'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Geographic Cities</span>
            <MapPin className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{distinctCitiesCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">Across regional branches</div>
        </div>
      </div>

      {/* Filter & View Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search branches by code, name, city, or manager..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | Branch['status'])}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="opening_soon">Opening Soon</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Branches Grid or List */}
      {filteredBranches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          No branches match the current filter criteria.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => {
            const stats = branchStatsMap.get(branch.id) || { staff: 0, projects: 0, stockUnits: 0 };
            const isSelected = activeBranchId === branch.id;

            return (
              <div
                key={branch.id}
                className={`rounded-xl border bg-white p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isSelected ? 'border-slate-900 ring-1 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900">
                          {branch.code}
                        </span>
                        {branch.isHeadquarters && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            <Crown className="h-3 w-3" />
                            <span>HQ</span>
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            branch.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : branch.status === 'opening_soon'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {branch.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-slate-900 truncate">
                        {branch.name}
                      </h3>
                    </div>

                    {canPerformAdminAction && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(branch)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                          title="Edit Branch"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {!branch.isHeadquarters && branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteId(confirmDeleteId === branch.id ? null : branch.id)
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Delete Branch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {confirmDeleteId === branch.id && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-red-800">Remove this branch?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteBranch(branch.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {branch.city}, {branch.region} · {branch.address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Branch Manager: {branch.managerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{branch.phone}</span>
                    </div>
                    {branch.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <Users className="h-3 w-3" />
                        <span>Staff</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {stats.staff}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <FolderGit2 className="h-3 w-3" />
                        <span>Projects</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {stats.projects}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <Boxes className="h-3 w-3" />
                        <span>Stock Qty</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {stats.stockUnits}
                      </div>
                    </div>
                  </div>
                </div>

                {canPerformAdminAction ? (
                  <button
                    type="button"
                    onClick={() => setActiveBranchId(isSelected ? 'all' : branch.id)}
                    className={`w-full min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {isSelected ? 'Active Branch Scope (Click to Clear)' : 'Switch Context to This Branch'}
                    </span>
                  </button>
                ) : (
                  <div
                    className={`w-full min-h-[38px] rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'border border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isSelected ? 'Assigned Active Branch' : 'Read-Only Branch Overview'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Branch Name</th>
                <th className="px-4 py-3">City / Region</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3 text-right">Staff</th>
                <th className="px-4 py-3 text-right">Projects</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.map((branch) => {
                const stats = branchStatsMap.get(branch.id) || { staff: 0, projects: 0, stockUnits: 0 };
                const isSelected = activeBranchId === branch.id;
                return (
                  <tr key={branch.id} className={isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {branch.code}
                      {branch.isHeadquarters && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                          HQ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{branch.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {branch.city}, {branch.region}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{branch.managerName}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{stats.staff}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{stats.projects}</td>
                    <td className="px-4 py-3 capitalize">{branch.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canPerformAdminAction ? (
                          <button
                            type="button"
                            onClick={() => setActiveBranchId(isSelected ? 'all' : branch.id)}
                            className={`rounded px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Activate'}
                          </button>
                        ) : (
                          <span
                            className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isSelected ? 'Assigned' : 'View Only'}
                          </span>
                        )}
                        {canPerformAdminAction && (
                          <button
                            type="button"
                            onClick={() => openEditModal(branch)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-200 cursor-pointer"
                            title="Edit Branch"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Register / Edit Branch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {editingBranch ? `Edit Branch · ${editingBranch.code}` : 'Register New Corporate Branch'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Syncs immediately across all connected browsers and regional devices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. DXB-04"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono uppercase outline-none focus:border-slate-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Branch Official Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dubai DIFC Regional Office"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Riyadh / Jeddah / Dubai"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Region / Province</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Central Region"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Building, street, district, postal code"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Manager</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Branch Director Name"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operating Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Branch['status'])}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none focus:border-slate-500"
                  >
                    <option value="active">Active Operating</option>
                    <option value="opening_soon">Opening Soon</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="branch@nexusglobal.corp"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHeadquarters}
                  onChange={(e) => setIsHeadquarters(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="font-semibold text-slate-800">
                  Designate as Primary Corporate Headquarters (HQ)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
