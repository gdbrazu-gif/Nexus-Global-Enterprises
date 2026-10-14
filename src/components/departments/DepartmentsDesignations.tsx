import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Department, Designation, Employee } from '../../types';
import {
  Building2,
  Briefcase,
  Plus,
  Users,
  MapPin,
  Eye,
  Edit3,
  Trash2,
  X,
  Search,
  Check,
  AlertCircle,
  Coins,
} from 'lucide-react';

export const DepartmentsDesignations: React.FC = () => {
  const {
    departments,
    designations,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    employees,
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Department
  const [createDeptModalOpen, setCreateDeptModalOpen] = useState(false);
  const [viewDeptModal, setViewDeptModal] = useState<Department | null>(null);
  const [editDeptModal, setEditDeptModal] = useState<Department | null>(null);

  // Modals for Designation
  const [createDesigModalOpen, setCreateDesigModalOpen] = useState(false);
  const [viewDesigModal, setViewDesigModal] = useState<Designation | null>(null);
  const [editDesigModal, setEditDesigModal] = useState<Designation | null>(null);

  // In-app deletion confirmation targets
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<Department | null>(null);
  const [deleteDesigTarget, setDeleteDesigTarget] = useState<Designation | null>(null);

  // Form state for creating Department
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    operatingUnit: '',
    headEmployeeId: 'EMP-1001',
    headEmployeeName: 'Khalid Al-Fassi',
    location: 'Riyadh HQ - Tower A, 6th Floor',
  });

  // Form state for creating Designation
  const [desigForm, setDesigForm] = useState({
    title: '',
    departmentId: departments[0]?.id || 'DEP-01',
    gradeLevel: 'Specialist Tier 4',
    minSalary: 15000,
    maxSalary: 25000,
  });

  // Handle Create Department
  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    const headEmp = employees.find((emp) => emp.id === deptForm.headEmployeeId);
    addDepartment({
      ...deptForm,
      headEmployeeName: headEmp?.fullName || deptForm.headEmployeeName,
    });
    setCreateDeptModalOpen(false);
    setDeptForm({
      name: '',
      code: '',
      operatingUnit: '',
      headEmployeeId: 'EMP-1001',
      headEmployeeName: 'Khalid Al-Fassi',
      location: 'Riyadh HQ - Tower A, 6th Floor',
    });
  };

  // Handle Edit Department
  const handleUpdateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptModal) return;
    const headEmp = employees.find((emp) => emp.id === editDeptModal.headEmployeeId);
    updateDepartment(editDeptModal.id, {
      ...editDeptModal,
      headEmployeeName: headEmp?.fullName || editDeptModal.headEmployeeName,
    });
    setEditDeptModal(null);
  };

  // Handle Delete Department Trigger
  const handleDeleteDept = (dept: Department) => {
    setDeleteDeptTarget(dept);
  };

  const confirmDeleteDept = () => {
    if (deleteDeptTarget) {
      deleteDepartment(deleteDeptTarget.id);
      setDeleteDeptTarget(null);
    }
  };

  // Handle Create Designation
  const handleCreateDesig = (e: React.FormEvent) => {
    e.preventDefault();
    addDesignation({
      ...desigForm,
      minSalary: Number(desigForm.minSalary),
      maxSalary: Number(desigForm.maxSalary),
    });
    setCreateDesigModalOpen(false);
    setDesigForm({
      title: '',
      departmentId: departments[0]?.id || 'DEP-01',
      gradeLevel: 'Specialist Tier 4',
      minSalary: 15000,
      maxSalary: 25000,
    });
  };

  // Handle Edit Designation
  const handleUpdateDesig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDesigModal) return;
    updateDesignation(editDesigModal.id, {
      ...editDesigModal,
      minSalary: Number(editDesigModal.minSalary),
      maxSalary: Number(editDesigModal.maxSalary),
    });
    setEditDesigModal(null);
  };

  // Handle Delete Designation Trigger
  const handleDeleteDesig = (des: Designation) => {
    setDeleteDesigTarget(des);
  };

  const confirmDeleteDesig = () => {
    if (deleteDesigTarget) {
      deleteDesignation(deleteDesigTarget.id);
      setDeleteDesigTarget(null);
    }
  };

  // Filtered lists
  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.operatingUnit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDesignations = designations.filter((des) => {
    const assignedDept = departments.find((d) => d.id === des.departmentId);
    return (
      des.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      des.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assignedDept?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Departments, Operating Units & Designations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, create, edit, and manage organizational departments, operating divisions, job titles, and pay bands.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPerformAdminAction && (
            <>
              <button
                onClick={() => setCreateDeptModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Department</span>
              </button>
              <button
                onClick={() => setCreateDesigModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Job Title</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('departments');
              setSearchQuery('');
            }}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 -mb-2 ${
              activeTab === 'departments'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Operating Departments ({departments.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('designations');
              setSearchQuery('');
            }}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 -mb-2 ${
              activeTab === 'designations'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Job Titles & Designations ({designations.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'departments'
                ? 'Search departments, code...'
                : 'Search job titles, grades...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-slate-400 bg-white"
          />
        </div>
      </div>

      {/* TAB 1: Operating Departments */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const count = employees.filter((e) => e.department === dept.name).length;
            return (
              <div
                key={dept.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-md bg-slate-100 p-2 text-slate-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs">{dept.name}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Code: {dept.code} · ID: {dept.id}
                        </span>
                      </div>
                    </div>

                    {/* Actions: View, Edit, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewDeptModal(dept)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="View Department Dossier & Staff"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {canPerformAdminAction && (
                        <>
                          <button
                            onClick={() => setEditDeptModal({ ...dept })}
                            className="rounded p-1 text-amber-600 hover:bg-amber-50"
                            title="Edit Department"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete Department"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md space-y-1">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Operating Division:</span>
                      <span className="font-medium text-slate-800">{dept.operatingUnit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Location:</span>
                      <span className="text-slate-700 font-mono text-[11px]">{dept.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-mono">
                  <div className="text-slate-600 flex items-center gap-1 font-sans">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold">{count}</span>
                    <span>staff</span>
                  </div>
                  <div className="text-slate-600 truncate max-w-[150px] font-sans">
                    Head: <strong className="font-semibold">{dept.headEmployeeName}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Job Titles & Designations */}
      {activeTab === 'designations' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                <th className="px-4 py-3">Job Title & Code</th>
                <th className="px-4 py-3">Assigned Department</th>
                <th className="px-4 py-3">Grade Tier</th>
                <th className="px-4 py-3 text-right">Min Base ({baseCurrency})</th>
                <th className="px-4 py-3 text-right">Max Base ({baseCurrency})</th>
                <th className="px-4 py-3 text-center">Incumbents</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDesignations.map((des) => {
                const assignedDept = departments.find((d) => d.id === des.departmentId);
                const count = employees.filter((e) => e.designation === des.title).length;
                return (
                  <tr key={des.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {des.title}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        {des.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {assignedDept?.name || 'General Operations'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{des.gradeLevel}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {formatCurrency(des.minSalary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {formatCurrency(des.maxSalary)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {count} Active
                      </span>
                    </td>

                    {/* Actions: View, Edit, Delete */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewDesigModal(des)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="View Details & Incumbents"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {canPerformAdminAction && (
                          <>
                            <button
                              onClick={() => setEditDesigModal({ ...des })}
                              className="rounded p-1 text-amber-600 hover:bg-amber-50"
                              title="Edit Designation"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteDesig(des)}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete Designation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
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

      {/* MODAL 1: VIEW Department Dossier */}
      {viewDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-900 p-2 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewDeptModal.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Code: {viewDeptModal.code} · ID: {viewDeptModal.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDeptModal(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Operating Division:</span>
                  <span className="font-semibold text-slate-900">
                    {viewDeptModal.operatingUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department Head:</span>
                  <span className="font-semibold text-slate-900">
                    {viewDeptModal.headEmployeeName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Location:</span>
                  <span className="font-mono text-slate-800">{viewDeptModal.location}</span>
                </div>
              </div>

              {/* Assigned Staff Members */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Assigned Personnel (
                  {employees.filter((e) => e.department === viewDeptModal.name).length})
                </h4>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {employees.filter((e) => e.department === viewDeptModal.name).length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">
                      No employees assigned to this department yet.
                    </div>
                  ) : (
                    employees
                      .filter((e) => e.department === viewDeptModal.name)
                      .map((emp) => (
                        <div key={emp.id} className="p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={emp.profileImage}
                              alt={emp.fullName}
                              className="h-7 w-7 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {emp.designation} · {emp.id}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-slate-800 text-[11px]">
                            {formatCurrency(emp.monthlyBaseSalary)}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewDeptModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT Department */}
      {editDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Operating Department ({editDeptModal.id})
              </h3>
              <button onClick={() => setEditDeptModal(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateDept} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={editDeptModal.name}
                  onChange={(e) => setEditDeptModal({ ...editDeptModal, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editDeptModal.code}
                    onChange={(e) => setEditDeptModal({ ...editDeptModal, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location / Floor</label>
                  <input
                    type="text"
                    value={editDeptModal.location}
                    onChange={(e) => setEditDeptModal({ ...editDeptModal, location: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Operating Division / Unit
                </label>
                <input
                  type="text"
                  required
                  value={editDeptModal.operatingUnit}
                  onChange={(e) =>
                    setEditDeptModal({ ...editDeptModal, operatingUnit: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Department Head</label>
                <select
                  value={editDeptModal.headEmployeeId}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    setEditDeptModal({
                      ...editDeptModal,
                      headEmployeeId: e.target.value,
                      headEmployeeName: emp?.fullName || editDeptModal.headEmployeeName,
                    });
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditDeptModal(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE New Department */}
      {createDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Operating Department</h3>
              <button onClick={() => setCreateDeptModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI-DS"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location / Floor</label>
                  <input
                    type="text"
                    value={deptForm.location}
                    onChange={(e) => setDeptForm({ ...deptForm, location: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Operating Department / Division
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Algorithm Engineering & Data Labs"
                  value={deptForm.operatingUnit}
                  onChange={(e) => setDeptForm({ ...deptForm, operatingUnit: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Department Head</label>
                <select
                  value={deptForm.headEmployeeId}
                  onChange={(e) => setDeptForm({ ...deptForm, headEmployeeId: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDeptModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW Job Title & Designation */}
      {viewDesigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-900 p-2 text-white">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewDesigModal.title}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {viewDesigModal.id} · {viewDesigModal.gradeLevel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDesigModal(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Department Allocation:</span>
                  <span className="font-semibold text-slate-900">
                    {departments.find((d) => d.id === viewDesigModal.departmentId)?.name || 'General'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Compensation Grade:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {viewDesigModal.gradeLevel}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-mono">
                  <span className="text-slate-500">Base Salary Scale ({baseCurrency}):</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(viewDesigModal.minSalary)} - {formatCurrency(viewDesigModal.maxSalary)}
                  </span>
                </div>
              </div>

              {/* Incumbents list */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Incumbents Holding this Title (
                  {employees.filter((e) => e.designation === viewDesigModal.title).length})
                </h4>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {employees.filter((e) => e.designation === viewDesigModal.title).length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">
                      No active personnel currently assigned this job title.
                    </div>
                  ) : (
                    employees
                      .filter((e) => e.designation === viewDesigModal.title)
                      .map((emp) => (
                        <div key={emp.id} className="p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={emp.profileImage}
                              alt={emp.fullName}
                              className="h-7 w-7 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {emp.id} · {emp.department}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-emerald-800 text-[11px]">
                            {formatCurrency(emp.monthlyBaseSalary)} / mo
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewDesigModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT Job Title & Designation */}
      {editDesigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Job Title & Designation ({editDesigModal.id})
              </h3>
              <button onClick={() => setEditDesigModal(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateDesig} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={editDesigModal.title}
                  onChange={(e) => setEditDesigModal({ ...editDesigModal, title: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={editDesigModal.departmentId}
                    onChange={(e) =>
                      setEditDesigModal({ ...editDesigModal, departmentId: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Grade Tier</label>
                  <input
                    type="text"
                    value={editDesigModal.gradeLevel}
                    onChange={(e) =>
                      setEditDesigModal({ ...editDesigModal, gradeLevel: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Base Salary (SAR)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={editDesigModal.minSalary}
                    onChange={(e) =>
                      setEditDesigModal({ ...editDesigModal, minSalary: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Max Base Salary (SAR)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={editDesigModal.maxSalary}
                    onChange={(e) =>
                      setEditDesigModal({ ...editDesigModal, maxSalary: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditDesigModal(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: CREATE New Designation */}
      {createDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Job Title & Designation</h3>
              <button onClick={() => setCreateDesigModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateDesig} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Cyber Security Architect"
                  value={desigForm.title}
                  onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={desigForm.departmentId}
                    onChange={(e) => setDesigForm({ ...desigForm, departmentId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Grade Tier</label>
                  <input
                    type="text"
                    value={desigForm.gradeLevel}
                    onChange={(e) => setDesigForm({ ...desigForm, gradeLevel: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Base Salary (SAR)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={desigForm.minSalary}
                    onChange={(e) =>
                      setDesigForm({ ...desigForm, minSalary: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Max Base Salary (SAR)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={desigForm.maxSalary}
                    onChange={(e) =>
                      setDesigForm({ ...desigForm, maxSalary: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDesigModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Save Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: In-App Delete Department Confirmation */}
      {deleteDeptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Department: {deleteDeptTarget.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Code: {deleteDeptTarget.code} · Operating Division: {deleteDeptTarget.operatingUnit}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>Active Workforce Impact</span>
              </div>
              <p>
                {employees.filter((e) => e.department === deleteDeptTarget.name).length > 0 ? (
                  <span>
                    Warning: <strong>{employees.filter((e) => e.department === deleteDeptTarget.name).length} employee(s)</strong> are currently assigned to this department. Deleting it will leave their organizational allocation unassigned.
                  </span>
                ) : (
                  <span>No active employees are currently assigned to this department. This operation is safe to proceed.</span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteDeptTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDept}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Confirm & Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: In-App Delete Designation Confirmation */}
      {deleteDesigTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Job Title: {deleteDesigTarget.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {deleteDesigTarget.id} · Grade: {deleteDesigTarget.gradeLevel}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>Active Incumbents Impact</span>
              </div>
              <p>
                {employees.filter((e) => e.designation === deleteDesigTarget.title).length > 0 ? (
                  <span>
                    Warning: <strong>{employees.filter((e) => e.designation === deleteDesigTarget.title).length} active employee(s)</strong> currently hold this title. Deleting it will require re-allocating them to another designation.
                  </span>
                ) : (
                  <span>No active employees hold this designation. This operation is safe to proceed.</span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteDesigTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDesig}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Confirm & Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
