import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Project, Villa, AssignedProjectMember } from '../../types';
import {
  FolderGit2,
  Home,
  Plus,
  Edit3,
  Trash2,
  X,
  Calendar,
  Building,
  CheckCircle,
  Download,
  Search,
  Filter,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  FileSpreadsheet,
  BadgeCheck,
  MapPin,
  Clock,
  Ruler,
  AlertCircle,
  Eye,
  Check,
  UserCheck,
  User,
  Users,
  Shield,
  FileText,
  Printer,
} from 'lucide-react';
import {
  downloadVillaLedgerPDF,
  downloadVillaSpecificationDeedPDF,
  downloadProjectSpecificationPDF,
} from '../../utils/pdfGenerator';

interface ProjectsAssetsProps {
  mode?: 'villas' | 'projects';
}

export const ProjectsAssets: React.FC<ProjectsAssetsProps> = ({ mode }) => {
  const {
    employees,
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
    formatCurrency,
    baseCurrency,
    canPerformAdminAction,
    canPerformBranchAdminAction,
    hasModulePermission,
    corporateEntity,
    activeBranchId,
  } = useHRMS();

  const canManageProjects =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    hasModulePermission('projects', 'create') ||
    hasModulePermission('projects', 'update');
  const canManageVillas =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    hasModulePermission('villas', 'create') ||
    hasModulePermission('villas', 'update');
  const canDeleteVillas =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    hasModulePermission('villas', 'delete');

  // Active Main Tab: 'villas' | 'projects'
  const [activeMainTab, setActiveMainTab] = useState<'villas' | 'projects'>(mode || 'villas');

  React.useEffect(() => {
    if (mode) {
      setActiveMainTab(mode);
    }
  }, [mode]);

  // Villa View Modes: 'grid' | 'list' | 'ledger'
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'ledger'>('grid');

  // Projects & Master Contracts View Modes & Filters
  const [projectViewMode, setProjectViewMode] = useState<'list' | 'grid'>('grid');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');

  // Search & Filters for Villas
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customFilter, setCustomFilter] = useState<'all' | 'custom_only' | 'standard_only'>('all');

  // Villa Create / Edit Modal State
  const [villaModalOpen, setVillaModalOpen] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [deletingVilla, setDeletingVilla] = useState<Villa | null>(null);
  const [viewingDeedVilla, setViewingDeedVilla] = useState<Villa | null>(null);

  // Project Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

  // Custom Villa Types Management Modal
  const [customTypeModalOpen, setCustomTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeDefaultArea, setNewTypeDefaultArea] = useState<number>(450);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Form State for Villa (Required: Block No, Villa No, Villa Type, Villa Quantity, Custom Villa)
  const initialVillaForm = {
    blockNo: 'Block A',
    villaNo: 'V-101',
    villaType: 'Standalone Executive Villa',
    villaQuantity: 1,
    customVilla: false,
    customVillaSpecification: '',
    projectId: projects[0]?.id || '',
    projectName: projects[0]?.name || 'Akash Palm Compound',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    floors: 2,
    bedrooms: 5,
    builtUpAreaSqm: 520,
    plotAreaSqm: 680,
    estimatedCostSAR: 1450000,
    contractPriceSAR: 2150000,
    constructionStatus: 'structure' as Villa['constructionStatus'],
    handoverTargetDate: '2027-06-30',
    clientName: '',
    contractorName: 'Akash Global Contracting',
    notes: 'Premium structural concrete, VRF air conditioning provisions, and private courtyard.',
  };

  const [villaForm, setVillaForm] = useState(initialVillaForm);

  // Project Form State
  const initialProjectForm = {
    name: '',
    code: '',
    client: '',
    department: 'Contracting & Construction Operations',
    location: 'Riyadh, Saudi Arabia',
    budgetSAR: 8500000,
    startDate: '2026-10-01',
    endDate: '2027-12-31',
    status: 'in_progress' as Project['status'],
    leadName: 'Eng. Khalid Al-Mansoor',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    assignedTeam: [] as AssignedProjectMember[],
  };
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [teamMemberToAssign, setTeamMemberToAssign] = useState('');
  const [teamMemberRoleToAssign, setTeamMemberRoleToAssign] = useState('Site Engineering Superintendent');

  // Distinct Blocks available
  const availableBlocks = useMemo(() => {
    const set = new Set<string>();
    villas.forEach((v) => {
      if (v.blockNo) set.add(v.blockNo.trim());
    });
    return Array.from(set).sort();
  }, [villas]);

  // Combined Villa Types (Default + Custom from HRMSContext)
  const allVillaTypes = useMemo(() => {
    const list = [
      'Standalone Executive Villa',
      'Twin Villa Prestige',
      'Duplex Modern Villa',
      'Courtyard Royal Villa',
      'Townhouse Family Unit',
      'Penthouse Sky Villa',
    ];
    customVillaTypes.forEach((ct) => {
      if (!list.includes(ct)) list.push(ct);
    });
    return list;
  }, [customVillaTypes]);

  // Filtered Villas
  const filteredVillas = useMemo(() => {
    return villas.filter((v) => {
      const matchSearch =
        v.blockNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.villaNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.villaType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.clientName && v.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.projectName && v.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.customVillaSpecification && v.customVillaSpecification.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchBlock = blockFilter === 'all' || v.blockNo.toLowerCase() === blockFilter.toLowerCase();
      const matchStatus = statusFilter === 'all' || v.constructionStatus === statusFilter;
      const matchCustom =
        customFilter === 'all'
          ? true
          : customFilter === 'custom_only'
          ? v.customVilla
          : !v.customVilla;

      const matchBranch = activeBranchId === 'all' || (v.branchId || 'BR-RUH') === activeBranchId;

      return matchSearch && matchBlock && matchStatus && matchCustom && matchBranch;
    });
  }, [villas, searchQuery, blockFilter, statusFilter, customFilter, activeBranchId]);

  // Filtered Projects & Master Contracts
  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return projects.filter((prj) => {
      const matchesStatus = projectStatusFilter === 'all' || prj.status === projectStatusFilter;
      const matchesBranch = activeBranchId === 'all' || (prj.branchId || 'BR-RUH') === activeBranchId;
      const matchesQuery =
        !q ||
        prj.name.toLowerCase().includes(q) ||
        prj.code.toLowerCase().includes(q) ||
        prj.client.toLowerCase().includes(q) ||
        (prj.location && prj.location.toLowerCase().includes(q)) ||
        (prj.leadName && prj.leadName.toLowerCase().includes(q)) ||
        (prj.assignedEmployeeName && prj.assignedEmployeeName.toLowerCase().includes(q));
      return matchesStatus && matchesQuery && matchesBranch;
    });
  }, [projects, projectSearch, projectStatusFilter, activeBranchId]);

  // Grouped Villas by Block No. for Ledger View
  const villasByBlock = useMemo(() => {
    const groups: { [block: string]: Villa[] } = {};
    filteredVillas.forEach((v) => {
      const b = v.blockNo || 'Unassigned Block';
      if (!groups[b]) groups[b] = [];
      groups[b].push(v);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredVillas]);

  // Financial and Operational KPIs
  const kpis = useMemo(() => {
    const totalRecords = villas.length;
    const totalUnits = villas.reduce((sum, v) => sum + (v.villaQuantity || 1), 0);
    const totalContractValue = villas.reduce(
      (sum, v) => sum + (v.contractPriceSAR || 0) * (v.villaQuantity || 1),
      0
    );
    const totalEstimatedCost = villas.reduce(
      (sum, v) => sum + (v.estimatedCostSAR || 0) * (v.villaQuantity || 1),
      0
    );
    const customCount = villas.filter((v) => v.customVilla).length;
    const handoverReadyCount = villas.filter(
      (v) => v.constructionStatus === 'handover_ready' || v.constructionStatus === 'completed'
    ).length;

    return {
      totalRecords,
      totalUnits,
      totalContractValue,
      totalEstimatedCost,
      customCount,
      handoverReadyCount,
    };
  }, [villas]);

  // Handlers for Villa
  const handleOpenAddVilla = () => {
    setEditingVilla(null);
    setVillaForm(initialVillaForm);
    setVillaModalOpen(true);
  };

  const handleOpenEditVilla = (villa: Villa) => {
    setEditingVilla(villa);
    setVillaForm({
      blockNo: villa.blockNo,
      villaNo: villa.villaNo,
      villaType: villa.villaType,
      villaQuantity: villa.villaQuantity || 1,
      customVilla: Boolean(villa.customVilla),
      customVillaSpecification: villa.customVillaSpecification || '',
      projectId: villa.projectId || '',
      projectName: villa.projectName || '',
      assignedEmployeeId: villa.assignedEmployeeId || '',
      assignedEmployeeName: villa.assignedEmployeeName || '',
      floors: villa.floors || 2,
      bedrooms: villa.bedrooms || 4,
      builtUpAreaSqm: villa.builtUpAreaSqm || 400,
      plotAreaSqm: villa.plotAreaSqm || 500,
      estimatedCostSAR: villa.estimatedCostSAR || 1000000,
      contractPriceSAR: villa.contractPriceSAR || 1500000,
      constructionStatus: villa.constructionStatus || 'structure',
      handoverTargetDate: villa.handoverTargetDate || '',
      clientName: villa.clientName || '',
      contractorName: villa.contractorName || 'Akash Global Contracting',
      notes: villa.notes || '',
    });
    setVillaModalOpen(true);
  };

  const handleSaveVilla = (e: React.FormEvent) => {
    e.preventDefault();

    if (!villaForm.blockNo.trim() || !villaForm.villaNo.trim() || !villaForm.villaType.trim()) {
      showToast('Block No., Villa No., and Villa Type are required fields.');
      return;
    }

    const payload = {
      ...villaForm,
      villaQuantity: Math.max(1, Number(villaForm.villaQuantity) || 1),
      floors: Number(villaForm.floors) || 2,
      bedrooms: Number(villaForm.bedrooms) || 4,
      builtUpAreaSqm: Number(villaForm.builtUpAreaSqm) || 0,
      plotAreaSqm: Number(villaForm.plotAreaSqm) || 0,
      estimatedCostSAR: Number(villaForm.estimatedCostSAR) || 0,
      contractPriceSAR: Number(villaForm.contractPriceSAR) || 0,
    };

    if (editingVilla) {
      updateVilla(editingVilla.id, payload);
      showToast(`Updated Villa ${payload.blockNo} - ${payload.villaNo} successfully.`);
    } else {
      addVilla(payload);
      showToast(`Registered Villa ${payload.blockNo} - ${payload.villaNo} successfully.`);
    }

    setVillaModalOpen(false);
    setEditingVilla(null);
  };

  const handleConfirmDeleteVilla = () => {
    if (!deletingVilla) return;
    deleteVilla(deletingVilla.id);
    showToast(`Removed Villa ${deletingVilla.blockNo} - ${deletingVilla.villaNo} from ledger.`);
    setDeletingVilla(null);
  };

  // Add Custom Villa Type Handler
  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    addCustomVillaType(newTypeName.trim());
    const addedName = newTypeName.trim();
    setNewTypeName('');
    showToast(`Added custom villa type "${addedName}".`);
  };

  const handleOpenAddProject = () => {
    setEditingProject(null);
    setProjectForm(initialProjectForm);
    setTeamMemberToAssign('');
    setTeamMemberRoleToAssign('Site Engineering Superintendent');
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (prj: Project) => {
    setEditingProject(prj);
    const initialTeam: AssignedProjectMember[] =
      prj.assignedTeam && prj.assignedTeam.length > 0
        ? [...prj.assignedTeam]
        : prj.assignedEmployeeName || prj.leadName
        ? [
            {
              employeeId: prj.assignedEmployeeId || 'EMP-1001',
              employeeName: prj.assignedEmployeeName || prj.leadName,
              role: 'Project Director',
              department: prj.department || 'Engineering',
              assignedDate: prj.startDate,
            },
          ]
        : [];

    setProjectForm({
      name: prj.name,
      code: prj.code,
      client: prj.client,
      department: prj.department || 'Contracting & Construction Operations',
      location: prj.location || 'Riyadh, Saudi Arabia',
      startDate: prj.startDate,
      endDate: prj.endDate,
      budgetSAR: prj.budgetSAR,
      leadName: prj.leadName || '',
      assignedEmployeeId: prj.assignedEmployeeId || (initialTeam[0]?.employeeId || ''),
      assignedEmployeeName: prj.assignedEmployeeName || prj.leadName || (initialTeam[0]?.employeeName || ''),
      status: prj.status,
      assignedTeam: initialTeam,
    });
    setTeamMemberToAssign('');
    setTeamMemberRoleToAssign('Site Engineering Superintendent');
    setProjectModalOpen(true);
  };

  const handleAddEmployeeToProject = () => {
    if (!teamMemberToAssign) {
      showToast('Please select a workforce member from the directory.');
      return;
    }
    const emp = employees.find((e) => e.id === teamMemberToAssign);
    if (!emp) return;

    if (projectForm.assignedTeam?.some((m) => m.employeeId === emp.id)) {
      showToast(`${emp.fullName} is already assigned to this project.`);
      return;
    }

    const newMember: AssignedProjectMember = {
      employeeId: emp.id,
      employeeName: emp.fullName,
      role: teamMemberRoleToAssign.trim() || emp.designation || 'Project Engineer',
      department: emp.department || 'Operations',
      assignedDate: new Date().toISOString().substring(0, 10),
    };

    const updatedTeam = [...(projectForm.assignedTeam || []), newMember];
    setProjectForm({
      ...projectForm,
      assignedTeam: updatedTeam,
      assignedEmployeeId: projectForm.assignedEmployeeId || emp.id,
      assignedEmployeeName: projectForm.assignedEmployeeName || emp.fullName,
      leadName: projectForm.leadName || emp.fullName,
    });
    setTeamMemberToAssign('');
    showToast(`Assigned ${emp.fullName} (${newMember.role}) to project.`);
  };

  const handleRemoveEmployeeFromProject = (empId: string) => {
    const updatedTeam = (projectForm.assignedTeam || []).filter((m) => m.employeeId !== empId);
    setProjectForm({
      ...projectForm,
      assignedTeam: updatedTeam,
      // If we removed the lead, fall back to next member if available
      assignedEmployeeId:
        projectForm.assignedEmployeeId === empId
          ? updatedTeam[0]?.employeeId || ''
          : projectForm.assignedEmployeeId,
      assignedEmployeeName:
        projectForm.assignedEmployeeId === empId
          ? updatedTeam[0]?.employeeName || ''
          : projectForm.assignedEmployeeName,
    });
    showToast('Removed workforce member from project team.');
  };

  // Save Project Handler
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryLead =
      projectForm.assignedEmployeeName ||
      projectForm.assignedTeam?.[0]?.employeeName ||
      projectForm.leadName;

    const payload = {
      ...projectForm,
      budgetSAR: Number(projectForm.budgetSAR),
      assignedEmployeeName: primaryLead,
      leadName: primaryLead,
      assignedTeam: projectForm.assignedTeam || [],
    };

    if (editingProject) {
      updateProject(editingProject.id, payload);
      showToast(`Updated master contract ${projectForm.name}.`);
    } else {
      addProject(payload);
      showToast(`Created master contract ${projectForm.name}.`);
    }

    setProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleConfirmDeleteProject = () => {
    if (!deletingProject) return;
    deleteProject(deletingProject.id);
    showToast(`Deleted project ${deletingProject.name}.`);
    setDeletingProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {mode === 'projects'
                ? 'Projects & Master Contracts'
                : mode === 'villas'
                ? 'Villas & Units Ledger'
                : 'Projects & Villa Contracting Ledger'}
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-800">
              Contracting & Engineering
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'projects'
              ? 'Enterprise delivery contracts, master construction developments, allocated budgets, and assigned engineering teams.'
              : 'Master engineering registers for residential compound villas, block units, and formal deeds.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Villa actions: shown when viewing Villas page or combined view */}
          {(!mode || mode === 'villas') && (
            <>
              <button
                type="button"
                onClick={() => {
                  downloadVillaLedgerPDF(filteredVillas, corporateEntity, baseCurrency, {
                    block: blockFilter !== 'all' ? blockFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                  });
                  showToast(`Downloaded Villa Master Ledger PDF (${filteredVillas.length} records).`);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                title="Download Master Ledger PDF"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>PDF</span>
              </button>

              {canManageVillas && (
                <>
                  <button
                    type="button"
                    onClick={() => setCustomTypeModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>Villa Types</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddVilla}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Villa</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Create Project Button: shown when viewing Projects page or combined view */}
          {canManageProjects && (!mode || mode === 'projects') && (
            <button
              type="button"
              onClick={handleOpenAddProject}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs (hidden when routed directly to a single page via Sidebar) & Villas View Switcher */}
      {(!mode || activeMainTab === 'villas') && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          {!mode ? (
            <div className="flex items-center gap-2 -mb-2">
              <button
                type="button"
                onClick={() => setActiveMainTab('villas')}
                className={`pb-2.5 px-3.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'villas'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Villas & Units Ledger</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                  {villas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('projects')}
                className={`pb-2.5 px-3.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'projects'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FolderGit2 className="h-4 w-4" />
                <span>Projects & Master Contracts</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                  {projects.length}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Home className="h-4 w-4 text-blue-600" />
              <span>Registered Villa Units</span>
              <span className="font-mono text-slate-500 tabular-nums">({villas.length})</span>
            </div>
          )}

          {/* View Switcher only in Villas Tab: Grid View | List View | Ledger View */}
          {activeMainTab === 'villas' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grid View (Visual Cards)"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span></span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List View (Data Table)"
              >
                <List className="h-3.5 w-3.5" />
                <span></span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('ledger')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'ledger'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ledger View (Block-by-Block Accounting)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Ledger View</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          TAB 1: VILLAS & UNITS LEDGER
          ============================================================== */}
      {activeMainTab === 'villas' && (
        <div className="space-y-5">
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Villa Units
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900 font-mono">{kpis.totalUnits}</span>
                <span className="text-[11px] text-slate-500">across {kpis.totalRecords} records</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Contract Price
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {kpis.totalContractValue.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">{baseCurrency}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Custom Bespoke Villas
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-purple-700 font-mono">{kpis.customCount}</span>
                <span className="text-[11px] text-slate-500">tailored blueprints</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Handover Ready / Done
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-blue-700 font-mono">{kpis.handoverReadyCount}</span>
                <span className="text-[11px] text-slate-500">of {kpis.totalRecords} batches</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50/50">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Block No, Villa No, Type, Client, or Project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Block Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-medium text-slate-500">Block:</span>
                <select
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="all">All Blocks</option>
                  {availableBlocks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-medium text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="planning">Planning</option>
                  <option value="foundation">Foundation</option>
                  <option value="structure">Structure</option>
                  <option value="mep">MEP</option>
                  <option value="finishing">Finishing</option>
                  <option value="handover_ready">Handover Ready</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Custom Villa Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] font-medium text-slate-500">Custom:</span>
                <select
                  value={customFilter}
                  onChange={(e) => setCustomFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="all">All Specs</option>
                  <option value="custom_only">Custom Villas Only</option>
                  <option value="standard_only">Standard Layouts</option>
                </select>
              </div>
            </div>
          </div>

          {/* ==========================================
              VIEW 1: GRID VIEW (VISUAL CARDS)
              ========================================== */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVillas.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
                  <Home className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                  <h3 className="font-bold text-slate-800 text-sm">No Villa Records Found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search criteria or register a new villa with Block No. & Villa No.
                  </p>
                  {canManageVillas && (
                    <button
                      type="button"
                      onClick={handleOpenAddVilla}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Villa Unit</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredVillas.map((villa) => {
                  const unitPrice = villa.contractPriceSAR || 0;
                  const totalPrice = unitPrice * (villa.villaQuantity || 1);

                  return (
                    <div
                      key={villa.id}
                      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-3">
                        {/* Card Header: Block No & Villa No Badge + Custom Tag */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-base">
                                {villa.blockNo} · {villa.villaNo}
                              </span>
                              {villa.customVilla && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                  <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                                  <span>CUSTOM</span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-blue-600 block mt-0.5">
                              {villa.villaType}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              villa.constructionStatus === 'completed' || villa.constructionStatus === 'handover_ready'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : villa.constructionStatus === 'structure' || villa.constructionStatus === 'finishing'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {villa.constructionStatus.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Project Name and Quantity */}
                        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <span className="truncate max-w-[170px]" title={villa.projectName}>
                            {villa.projectName || 'General Compound'}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Qty: {villa.villaQuantity || 0} Unit{villa.villaQuantity !== 0 ? 's' : ''}
                          </span>
                        </div>

                        {/* Specs Grid: Floors, Bedrooms, Built-up Area */}
                        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9.5px]">Floors</span>
                            <span className="font-semibold text-slate-800">{villa.floors || 0} Lvls</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px]">Bedrooms</span>
                            <span className="font-semibold text-slate-800">{villa.bedrooms || 0} Beds</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px]">Built Area</span>
                            <span className="font-semibold text-slate-800">
                              {villa.builtUpAreaSqm ? `${villa.builtUpAreaSqm} m²` : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Custom Specifications Note if Present */}
                        {villa.customVilla && villa.customVillaSpecification && (
                          <div className="rounded-lg bg-purple-50/60 border border-purple-100 p-2 text-[11px] text-purple-900 leading-tight">
                            <span className="font-bold text-purple-800 block text-[10px]">Client Custom Spec:</span>
                            <p className="line-clamp-2 mt-0.5 text-slate-700">{villa.customVillaSpecification}</p>
                          </div>
                        )}

                        {/* Assigned Employee Tag */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-800 truncate">
                            {villa.assignedEmployeeName ? villa.assignedEmployeeName : 'Unassigned (General Site Team)'}
                          </span>
                        </div>

                        {/* Financials: Contract Price */}
                        <div className="flex items-baseline justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              Unit Price: {unitPrice.toLocaleString()} {baseCurrency}
                            </span>
                            <div className="text-sm font-bold font-mono text-slate-900">
                              Total: {totalPrice.toLocaleString()} {baseCurrency}
                            </div>
                          </div>
                          {villa.clientName && (
                            <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]" title={villa.clientName}>
                              👤 {villa.clientName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions: View, Edit, PDF, Delete */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Actions
                        </span>

                        <div className="flex items-center gap-1">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => setViewingDeedVilla(villa)}
                            className="rounded-lg p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="View Villa Details & Blueprint Deed"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          {canManageVillas && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditVilla(villa)}
                              className="rounded-lg p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Edit Villa Record"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}

                          {/* PDF */}
                          <button
                            type="button"
                            onClick={() => {
                              downloadVillaSpecificationDeedPDF(villa, corporateEntity, baseCurrency);
                              showToast(`Downloaded Specification Deed PDF for ${villa.blockNo} - ${villa.villaNo}.`);
                            }}
                            className="rounded-lg p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Download Specification Deed PDF"
                          >
                            <Download className="h-4 w-4 text-blue-600" />
                          </button>

                          {/* Delete */}
                          {canDeleteVillas && (
                            <button
                              type="button"
                              onClick={() => setDeletingVilla(villa)}
                              className="rounded-lg p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Villa Record"
                            >
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ==========================================
              VIEW 2: LIST VIEW (COMPACT DATA TABLE)
              ========================================== */}
          {viewMode === 'list' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                    <tr>
                      <th className="px-3.5 py-3">Block No.</th>
                      <th className="px-3.5 py-3">Villa No.</th>
                      <th className="px-3.5 py-3">Villa Type</th>
                      <th className="px-3.5 py-3 text-center">Qty</th>
                      <th className="px-3.5 py-3">Assigned Employee</th>
                      <th className="px-3.5 py-3">Assigned Project</th>
                      <th className="px-3.5 py-3">Custom Spec</th>
                      <th className="px-3.5 py-3">Status</th>
                      <th className="px-3.5 py-3 text-right">Built Area</th>
                      <th className="px-3.5 py-3 text-right">Unit Price</th>
                      <th className="px-3.5 py-3 text-right">Total Value</th>
                      <th className="px-3.5 py-3">Client</th>
                      <th className="px-3.5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVillas.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-10 text-center text-slate-400">
                          <Home className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600">No Villa Records Found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredVillas.map((villa) => {
                        const unitPrice = villa.contractPriceSAR || 0;
                        const totalPrice = unitPrice * (villa.villaQuantity || 1);

                        return (
                          <tr key={villa.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                              {villa.blockNo}
                            </td>
                            <td className="px-3.5 py-3 font-mono font-semibold text-blue-700">
                              {villa.villaNo}
                            </td>
                            <td className="px-3.5 py-3 font-medium text-slate-800">
                              {villa.villaType}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800">
                                {villa.villaQuantity || 1}
                              </span>
                            </td>
                            <td className="px-3.5 py-3">
                              {villa.assignedEmployeeName ? (
                                <div className="flex items-center gap-1.5 text-slate-800 font-medium text-[11px]">
                                  <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate max-w-[130px]" title={villa.assignedEmployeeName}>
                                    {villa.assignedEmployeeName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Unassigned</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700">
                              {villa.projectName || 'General Compound'}
                            </td>
                            <td className="px-3.5 py-3">
                              {villa.customVilla ? (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10.5px] font-bold text-purple-700">
                                  <Sparkles className="h-3 w-3" />
                                  <span>Custom</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">Standard</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  villa.constructionStatus === 'completed' || villa.constructionStatus === 'handover_ready'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : villa.constructionStatus === 'structure' || villa.constructionStatus === 'finishing'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {villa.constructionStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                              {villa.builtUpAreaSqm ? `${villa.builtUpAreaSqm} m²` : '-'}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                              {unitPrice.toLocaleString()} {baseCurrency}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                              {totalPrice.toLocaleString()} {baseCurrency}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600">
                              {villa.clientName || 'Private Client'}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* View */}
                                <button
                                  type="button"
                                  onClick={() => setViewingDeedVilla(villa)}
                                  className="rounded p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  title="View Villa Details & Blueprint Deed"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {/* Edit */}
                                {canManageVillas && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditVilla(villa)}
                                    className="rounded p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                    title="Edit Villa Record"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    downloadVillaSpecificationDeedPDF(villa, corporateEntity, baseCurrency);
                                    showToast(`Downloaded Specification Deed PDF for ${villa.blockNo} - ${villa.villaNo}.`);
                                  }}
                                  className="rounded p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  title="Download Specification Deed PDF"
                                >
                                  <Download className="h-3.5 w-3.5 text-blue-600" />
                                </button>

                                {/* Delete */}
                                {canDeleteVillas && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingVilla(villa)}
                                    className="rounded p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title="Delete Villa Record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW 3: LEDGER VIEW (BLOCK-BY-BLOCK AUDIT)
              ========================================== */}
          {viewMode === 'ledger' && (
            <div className="space-y-6">
              {villasByBlock.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                  <p>No villa ledger records available for display.</p>
                </div>
              ) : (
                villasByBlock.map(([blockName, blockVillas]) => {
                  const blockTotalUnits = blockVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);
                  const blockTotalContract = blockVillas.reduce(
                    (s, v) => s + (v.contractPriceSAR || 0) * (v.villaQuantity || 1),
                    0
                  );
                  const blockCustomCount = blockVillas.filter((v) => v.customVilla).length;

                  return (
                    <div
                      key={blockName}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
                    >
                      {/* Block Ledger Header */}
                      <div className="bg-slate-900 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-400" />
                          <h3 className="font-bold text-sm tracking-tight">{blockName.toUpperCase()} MASTER LEDGER</h3>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10.5px] font-mono">
                            {blockVillas.length} Records · {blockTotalUnits} Units
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-slate-300">
                            Custom Specs: <strong className="text-purple-300">{blockCustomCount}</strong>
                          </span>
                          <span className="text-slate-300">
                            Block Contract Value:{' '}
                            <strong className="text-emerald-400">
                              {blockTotalContract.toLocaleString()} {baseCurrency}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Block Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                            <tr>
                              <th className="px-3.5 py-2.5">Villa No.</th>
                              <th className="px-3.5 py-2.5">Villa Type</th>
                              <th className="px-3.5 py-2.5 text-center">Quantity</th>
                              <th className="px-3.5 py-2.5">Custom Spec Detail</th>
                              <th className="px-3.5 py-2.5">Assigned Employee</th>
                              <th className="px-3.5 py-2.5">Status</th>
                              <th className="px-3.5 py-2.5 text-right">Built Area</th>
                              <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                              <th className="px-3.5 py-2.5 text-right">Total Line Value</th>
                              <th className="px-3.5 py-2.5">Target Handover</th>
                              <th className="px-3.5 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {blockVillas.map((villa) => {
                              const lineTotal = (villa.contractPriceSAR || 0) * (villa.villaQuantity || 1);

                              return (
                                <tr key={villa.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                                    {villa.villaNo}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-medium text-slate-800">
                                    {villa.villaType}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-900">
                                    {villa.villaQuantity || 1}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    {villa.customVilla ? (
                                      <div className="max-w-xs text-[11px] text-purple-900">
                                        <span className="font-semibold text-purple-700">[CUSTOM] </span>
                                        <span>{villa.customVillaSpecification || 'Client Bespoke Blueprint'}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Standard Architecture</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    {villa.assignedEmployeeName ? (
                                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                        <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                        <span className="truncate max-w-[130px]">{villa.assignedEmployeeName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 uppercase">
                                      {villa.constructionStatus.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-700">
                                    {villa.builtUpAreaSqm ? `${villa.builtUpAreaSqm} m²` : '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-700">
                                    {(villa.contractPriceSAR || 0).toLocaleString()} {baseCurrency}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700">
                                    {lineTotal.toLocaleString()} {baseCurrency}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">
                                    {villa.handoverTargetDate || 'Scheduled'}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* View Villa Deed */}
                                      <button
                                        type="button"
                                        onClick={() => setViewingDeedVilla(villa)}
                                        className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="View Villa Dossier"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>

                                      {/* Edit Villa */}
                                      {canManageVillas && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditVilla(villa)}
                                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                          title="Edit Villa"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                      )}

                                      {/* Download Deed PDF */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          downloadVillaSpecificationDeedPDF(villa, corporateEntity, baseCurrency);
                                          showToast(`Downloaded Specification Deed PDF for ${villa.blockNo} - ${villa.villaNo}.`);
                                        }}
                                        className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Download Deed PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>

                                      {/* Delete Villa */}
                                      {canDeleteVillas && (
                                        <button
                                          type="button"
                                          onClick={() => setDeletingVilla(villa)}
                                          className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                          title="Delete Villa"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {/* Block Subtotal Row */}
                          <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                            <tr>
                              <td colSpan={2} className="px-3.5 py-2.5 uppercase tracking-wider text-[11px]">
                                Subtotal for {blockName}
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-mono text-xs">
                                {blockTotalUnits} Units
                              </td>
                              <td colSpan={5} className="px-3.5 py-2.5 text-right text-slate-500 text-[11px]">
                                Total Contracted:
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-emerald-700 text-xs">
                                {blockTotalContract.toLocaleString()} {baseCurrency}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          TAB 2: PROJECTS & MASTER CONTRACTS
          ============================================================== */}
      {activeMainTab === 'projects' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <FolderGit2 className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Enterprise Delivery Contracts & Master Developments
                </h3>
                <p className="mt-0.5 text-slate-500">
                  Track parent master construction projects, allocated expenditure budgets, assigned project superintendents, and execution dates.
                </p>
              </div>
            </div>

            {/* Search, Filter & List View / Grid View Switcher */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search project, code, client..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-48 sm:w-56 rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <select
                value={projectStatusFilter}
                onChange={(e) => setProjectStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="planning">Planning</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setProjectViewMode('list')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    projectViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProjectViewMode('grid')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    projectViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid View</span>
                </button>
              </div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-2">
              <FolderGit2 className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No Master Contracts Found</h3>
              <p className="text-xs text-slate-500">
                Adjust your search or status filter to inspect all active construction contracts.
              </p>
              {(projectSearch || projectStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setProjectSearch('');
                    setProjectStatusFilter('all');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : projectViewMode === 'list' ? (
            /* PROJECTS LIST VIEW (ENTERPRISE DATA TABLE) */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                      <th className="px-4 py-3">Contract & Code</th>
                      <th className="px-4 py-3">Client & Location</th>
                      <th className="px-4 py-3">Timeline</th>
                      <th className="px-4 py-3">Director & Team</th>
                      <th className="px-4 py-3 text-right">Units</th>
                      <th className="px-4 py-3 text-right">Spent</th>
                      <th className="px-4 py-3 text-right">Budget</th>
                      <th className="px-4 py-3">Utilization</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((prj) => {
                      const pct = prj.budgetSAR > 0 ? Math.round((prj.spentSAR / prj.budgetSAR) * 100) : 0;
                      const projectVillas = villas.filter(
                        (v) => v.projectId === prj.id || v.projectName === prj.name
                      );
                      const projectUnits = projectVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);
                      const teamCount = prj.assignedTeam?.length || 0;

                      return (
                        <tr key={prj.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900">{prj.name}</div>
                            <div className="font-mono text-[11px] text-slate-500 mt-0.5 tabular-nums">
                              {prj.code}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-800">{prj.client}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {prj.location || 'Saudi Arabia'}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top font-mono text-[11px] text-slate-600 tabular-nums whitespace-nowrap">
                            <div>{prj.startDate}</div>
                            <div className="text-slate-400">to {prj.endDate}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-800">
                              {prj.assignedEmployeeName || prj.leadName || 'Unassigned'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                              {teamCount} assigned member{teamCount === 1 ? '' : 's'}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                            {projectUnits} Villas
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {formatCurrency(prj.spentSAR)}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatCurrency(prj.budgetSAR)}
                          </td>
                          <td className="px-4 py-3 align-top min-w-[120px]">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                              <span className="text-slate-600">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold capitalize ${
                                prj.status === 'in_progress'
                                  ? 'text-emerald-700'
                                  : prj.status === 'completed'
                                  ? 'text-blue-700'
                                  : prj.status === 'on_hold'
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {prj.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingProject(prj)}
                                className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="View Project Charter"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {canManageProjects && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProject(prj)}
                                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Project"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  downloadProjectSpecificationPDF(
                                    prj,
                                    corporateEntity,
                                    baseCurrency,
                                    projectVillas
                                  );
                                  showToast(`Downloaded Project Specification Charter for ${prj.name}.`);
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Download Project Charter PDF"
                              >
                                <Download className="h-4 w-4" />
                              </button>

                              {canPerformAdminAction && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingProject(prj)}
                                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Project"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-600">
                        Total Contracts ({filteredProjects.length})
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {filteredProjects.reduce((sum, prj) => {
                          const pVillas = villas.filter(
                            (v) => v.projectId === prj.id || v.projectName === prj.name
                          );
                          return sum + pVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);
                        }, 0)}{' '}
                        Villas
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatCurrency(filteredProjects.reduce((s, p) => s + (p.spentSAR || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatCurrency(filteredProjects.reduce((s, p) => s + (p.budgetSAR || 0), 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* PROJECTS GRID VIEW (CARDS) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((prj) => {
                const pct = prj.budgetSAR > 0 ? Math.round((prj.spentSAR / prj.budgetSAR) * 100) : 0;
                const projectVillas = villas.filter(
                  (v) => v.projectId === prj.id || v.projectName === prj.name
                );
                const projectUnits = projectVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);

                return (
                  <div
                    key={prj.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{prj.name}</h3>
                          <span className="font-mono text-[11px] text-slate-500">
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
                        <div className="flex justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-slate-500">Budget Spent:</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(prj.spentSAR)} / {formatCurrency(prj.budgetSAR)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          Units: <strong className="tabular-nums">{projectUnits} Villas</strong>
                        </span>
                        <span className="font-mono text-[10.5px] text-slate-400">
                          {prj.location || 'Saudi Arabia'}
                        </span>
                      </div>

                      {/* Assigned Project Director / Lead */}
                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs border border-slate-100">
                        <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-tight">
                            Assigned Project Director
                          </span>
                          <span className="font-bold text-slate-900 truncate block text-[11px]">
                            {prj.assignedEmployeeName || prj.leadName || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* Custom Assigned Multiple Employees */}
                      {prj.assignedTeam && prj.assignedTeam.length > 0 && (
                        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-2 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-bold text-blue-900 flex items-center gap-1">
                              <Users className="h-3 w-3 text-blue-600" />
                              <span>Assigned Project Team ({prj.assignedTeam.length})</span>
                            </span>
                            <span className="text-[9.5px] font-mono text-blue-600 uppercase font-semibold">
                              Active Roster
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {prj.assignedTeam.map((m, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] border border-blue-200 text-slate-800 shadow-2xs"
                                title={`${m.employeeName} · ${m.role || 'Site Lead'}`}
                              >
                                <span className="font-bold text-slate-900">{m.employeeName}</span>
                                {m.role && (
                                  <span className="text-blue-700 font-medium text-[9.5px]">({m.role})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Icon-only Actions: View, Edit, PDF, Delete */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10.5px] text-slate-400 font-mono">Actions</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingProject(prj)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Project Charter"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canManageProjects && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditProject(prj)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            downloadProjectSpecificationPDF(
                              prj,
                              corporateEntity,
                              baseCurrency,
                              projectVillas
                            );
                            showToast(`Downloaded Project Specification Charter for ${prj.name}.`);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Download Project Charter PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {canPerformAdminAction && (
                          <button
                            type="button"
                            onClick={() => setDeletingProject(prj)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          MODAL 1: ADD / EDIT VILLA (ENFORCING ALL REQUIRED FIELDS)
          ============================================================== */}
      {villaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingVilla ? 'Edit Villa & Unit Ledger Record' : 'Register Villa Unit to Ledger'}
                </h3>
                <p className="text-[11.5px] text-slate-500">
                  Mandatory fields: Block No., Villa No., Villa Type, Villa Quantity, and Custom Villa details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVillaModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVilla} className="mt-4 space-y-4 text-xs">
              {/* Row 1: Block No & Villa No (REQUIRED) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Block No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block A, Block 102"
                    value={villaForm.blockNo}
                    onChange={(e) => setVillaForm({ ...villaForm, blockNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Villa No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. V-01, V-104"
                    value={villaForm.villaNo}
                    onChange={(e) => setVillaForm({ ...villaForm, villaNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 2: Villa Type & Villa Quantity (REQUIRED) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Villa Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={villaForm.villaType}
                    onChange={(e) => setVillaForm({ ...villaForm, villaType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden bg-white cursor-pointer"
                  >
                    {allVillaTypes.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Villa Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 1"
                    value={villaForm.villaQuantity}
                    onChange={(e) => setVillaForm({ ...villaForm, villaQuantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Custom Villa Toggle (REQUIRED FIELD) */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <div>
                      <span className="font-bold text-purple-900 text-xs block">Custom Villa</span>
                      <span className="text-[11px] text-purple-700">
                        Is this a bespoke / client-customized architectural layout?
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={villaForm.customVilla}
                      onChange={(e) => setVillaForm({ ...villaForm, customVilla: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {villaForm.customVilla && (
                  <div className="pt-2 border-t border-purple-200/70">
                    <label className="block font-bold text-purple-900 mb-1">
                      Custom Villa Architectural & Interior Specifications
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Extended living hall, Italian travertine cladding, basement cinema, private infinity pool, custom MEP VRF layout."
                      value={villaForm.customVillaSpecification}
                      onChange={(e) =>
                        setVillaForm({ ...villaForm, customVillaSpecification: e.target.value })
                      }
                      className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-slate-900 focus:border-purple-600 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Row 4: Project Link & Assigned Employee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Project</label>
                  <select
                    value={villaForm.projectId}
                    onChange={(e) => {
                      const sel = projects.find((p) => p.id === e.target.value);
                      setVillaForm({
                        ...villaForm,
                        projectId: e.target.value,
                        projectName: sel ? sel.name : villaForm.projectName,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="">-- Standalone Development --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Assign Employee / Site Engineer</span>
                  </label>
                  <select
                    value={villaForm.assignedEmployeeId}
                    onChange={(e) => {
                      const sel = employees.find((emp) => emp.id === e.target.value);
                      setVillaForm({
                        ...villaForm,
                        assignedEmployeeId: e.target.value,
                        assignedEmployeeName: sel ? sel.fullName : '',
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden bg-white cursor-pointer"
                  >
                    <option value="">-- No Assigned Engineer / Unassigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Construction Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Construction Status</label>
                <select
                  value={villaForm.constructionStatus}
                  onChange={(e) =>
                    setVillaForm({
                      ...villaForm,
                      constructionStatus: e.target.value as Villa['constructionStatus'],
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden bg-white"
                >
                  <option value="planning">Planning & Blueprints</option>
                  <option value="foundation">Substructure & Foundations</option>
                  <option value="structure">Reinforced Concrete Skeleton</option>
                  <option value="mep">MEP & Rough-ins</option>
                  <option value="finishing">Internal Finishing</option>
                  <option value="handover_ready">Handover Ready</option>
                  <option value="completed">Completed & Municipality Cleared</option>
                </select>
              </div>

              {/* Row 5: Areas and Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Internal - Area (m²)</label>
                  <input
                    type="number"
                    value={villaForm.builtUpAreaSqm}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, builtUpAreaSqm: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">External Area (m²)</label>
                  <input
                    type="number"
                    value={villaForm.plotAreaSqm}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, plotAreaSqm: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Floors</label>
                  <input
                    type="number"
                    min="0"
                    value={villaForm.floors}
                    onChange={(e) => setVillaForm({ ...villaForm, floors: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    min="0"
                    value={villaForm.bedrooms}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, bedrooms: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 6: Financials (Unit Contract Price & Estimated Cost) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Contract Price per Unit ({baseCurrency})
                  </label>
                  <input
                    type="number"
                    value={villaForm.contractPriceSAR}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, contractPriceSAR: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Estimated Direct Cost ({baseCurrency})
                  </label>
                  <input
                    type="number"
                    value={villaForm.estimatedCostSAR}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, estimatedCostSAR: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 7: Client, Target Handover & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client / Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sheikh Fahad Al-Otaibi"
                    value={villaForm.clientName}
                    onChange={(e) => setVillaForm({ ...villaForm, clientName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Handover Date</label>
                  <input
                    type="date"
                    value={villaForm.handoverTargetDate}
                    onChange={(e) =>
                      setVillaForm({ ...villaForm, handoverTargetDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contract / Technical Notes</label>
                <textarea
                  rows={2}
                  value={villaForm.notes}
                  onChange={(e) => setVillaForm({ ...villaForm, notes: e.target.value })}
                  placeholder="Structural specifications, client variations, warranty provisions..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVillaModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  {editingVilla ? 'Save Villa Changes' : 'Confirm & Register Villa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 2: CUSTOM VILLA TYPES MANAGEMENT
          ============================================================== */}
      {customTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Custom Villa Architecture Types</h3>
                <p className="text-[11.5px] text-slate-500">
                  Define corporate architectural villa templates and custom classifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomTypeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing Types List */}
            <div className="mt-4 space-y-2 max-h-52 overflow-y-auto pr-1">
              {customVillaTypes.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg">
                  No custom types yet. Standard types are active.
                </div>
              ) : (
                customVillaTypes.map((ct) => (
                  <div
                    key={ct}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{ct}</span>
                      <span className="text-[10.5px] text-slate-500">
                        Custom Architectural Specification Category
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteCustomVillaType(ct);
                        showToast(`Removed villa type "${ct}".`);
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      title="Remove Type"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Type Form */}
            <form onSubmit={handleSaveCustomType} className="mt-4 pt-3 border-t border-slate-100 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900">Create New Custom Villa Type</h4>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Villa Type Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modernist Oasis Villa, Royal Compound Suite"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomTypeModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 font-bold text-white hover:bg-purple-700 cursor-pointer shadow-xs"
                >
                  Add Custom Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 3: DELETE VILLA CONFIRMATION
          ============================================================== */}
      {deletingVilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Confirm Villa Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove Villa <strong>{deletingVilla.blockNo} - {deletingVilla.villaNo}</strong> ({deletingVilla.villaType}) from the master ledger? This will permanently erase the deed records and financial balances.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVilla(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVilla}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Villa Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 4: CREATE / EDIT MASTER CONSTRUCTION PROJECT
          ============================================================== */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProject ? 'Edit Master Construction Project' : 'Create Master Construction Project'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setProjectModalOpen(false);
                  setEditingProject(null);
                }}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Narjis Executive Villas"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-VIL-2026"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roshn Real Estate"
                    value={projectForm.client}
                    onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget ({baseCurrency})</label>
                  <input
                    type="number"
                    value={projectForm.budgetSAR}
                    onChange={(e) => setProjectForm({ ...projectForm, budgetSAR: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Assign Project Director / Lead</span>
                  </label>
                  <select
                    value={projectForm.assignedEmployeeId}
                    onChange={(e) => {
                      const sel = employees.find((emp) => emp.id === e.target.value);
                      setProjectForm({
                        ...projectForm,
                        assignedEmployeeId: e.target.value,
                        assignedEmployeeName: sel ? sel.fullName : '',
                        leadName: sel ? sel.fullName : projectForm.leadName,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white cursor-pointer"
                  >
                    <option value="">-- Select Project Director --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Assigned Multiple Employees & Site Leadership Section */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <h4 className="font-bold text-blue-950 text-xs">
                        Custom Assigned Multiple Employees ({projectForm.assignedTeam?.length || 0})
                      </h4>
                      <p className="text-[10.5px] text-blue-700">
                        Deploy project engineers, superintendents, MEP leads, and safety supervisors to this master contract.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-mono font-bold text-blue-800">
                    Multidisciplinary Roster
                  </span>
                </div>

                {/* Add Employee Form Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white rounded-lg p-2.5 border border-blue-100">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Select Employee</label>
                    <select
                      value={teamMemberToAssign}
                      onChange={(e) => setTeamMemberToAssign(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-white"
                    >
                      <option value="">-- Choose Workforce Member --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} · {emp.designation || emp.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Assigned Project Role</label>
                    <input
                      type="text"
                      list="project-roles-list"
                      placeholder="e.g. Site Engineering Lead"
                      value={teamMemberRoleToAssign}
                      onChange={(e) => setTeamMemberRoleToAssign(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                    />
                    <datalist id="project-roles-list">
                      <option value="Project Director" />
                      <option value="Site Engineering Superintendent" />
                      <option value="Senior Structural MEP Engineer" />
                      <option value="QA/QC & Technical Compliance Lead" />
                      <option value="Health, Safety & Environment (HSE) Officer" />
                      <option value="Civil Works Site Supervisor" />
                      <option value="Cost Controller & Quantity Surveyor" />
                    </datalist>
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddEmployeeToProject}
                      className="w-full rounded bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>
                </div>

                {/* Team Roster Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 px-1">
                    <span>Currently Assigned Staff Roster:</span>
                    <span>{projectForm.assignedTeam?.length || 0} Members</span>
                  </div>

                  {(!projectForm.assignedTeam || projectForm.assignedTeam.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-blue-200 bg-white/70 p-3 text-center text-[11px] text-slate-400">
                      No additional workforce members assigned yet. Select from the directory above to deploy team members.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
                      {projectForm.assignedTeam.map((member) => {
                        const isPrimary = projectForm.assignedEmployeeId === member.employeeId;
                        return (
                          <div
                            key={member.employeeId}
                            className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-2 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {member.employeeName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">{member.employeeName}</span>
                                  {isPrimary && (
                                    <span className="rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2">
                                      PRIMARY LEAD
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-blue-700 block font-medium">
                                  {member.role || 'Supervising Member'} · <span className="text-slate-400">{member.department || 'Operations'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjectForm({
                                      ...projectForm,
                                      assignedEmployeeId: member.employeeId,
                                      assignedEmployeeName: member.employeeName,
                                      leadName: member.employeeName,
                                    });
                                    showToast(`Set ${member.employeeName} as primary project director.`);
                                  }}
                                  className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                                  title="Promote to Primary Project Director"
                                >
                                  Make Lead
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveEmployeeFromProject(member.employeeId)}
                                className="rounded p-1 text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="Remove Employee from Project"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setProjectModalOpen(false);
                    setEditingProject(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  {editingProject ? 'Save Project Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 5: DELETE PROJECT CONFIRMATION
          ============================================================== */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Confirm Project Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete master project <strong>{deletingProject.name}</strong> ({deletingProject.code})? This charter and linked project records will be permanently removed.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 6: VIEW VILLA DOSSIER / SPECIFICATION DEED
          ============================================================== */}
      {viewingDeedVilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-800">
                    {viewingDeedVilla.blockNo}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Villa Specification Dossier: {viewingDeedVilla.villaNo}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Official Technical Charter & Architectural Ledger Record · {corporateEntity?.legalName || 'Akash Global Real Estate & Contracting'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDeedVilla(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Assigned Employee & Status Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">
                    Assigned Supervising Engineer
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {viewingDeedVilla.assignedEmployeeName || 'Site Engineering Division'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Construction Stage
                  </span>
                  <span className="text-sm font-bold text-slate-900 uppercase">
                    {viewingDeedVilla.constructionStatus.replace('_', ' ')}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  {viewingDeedVilla.handoverTargetDate ? `Target: ${viewingDeedVilla.handoverTargetDate}` : 'In Schedule'}
                </span>
              </div>
            </div>

            {/* Custom Villa Highlight if present */}
            {viewingDeedVilla.customVilla && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs mb-1">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>Custom Architectural & Interior Specification</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed font-mono">
                  {viewingDeedVilla.customVillaSpecification || 'Client bespoke custom architecture specifications apply.'}
                </p>
              </div>
            )}

            {/* Architectural Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Villa Type</span>
                <span className="text-slate-900 font-bold">{viewingDeedVilla.villaType}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Total Quantity</span>
                <span className="text-slate-900 font-bold font-mono">{viewingDeedVilla.villaQuantity || 1} Unit(s)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Built-Up Area</span>
                <span className="text-slate-900 font-bold font-mono">{viewingDeedVilla.builtUpAreaSqm || '-'} m²</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Plot Area</span>
                <span className="text-slate-900 font-bold font-mono">{viewingDeedVilla.plotAreaSqm || '-'} m²</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Stories / Floors</span>
                <span className="text-slate-900 font-bold font-mono">{viewingDeedVilla.floors || 2} Floors</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Bedrooms</span>
                <span className="text-slate-900 font-bold font-mono">{viewingDeedVilla.bedrooms || 4} Suites</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Linked Project</span>
                <span className="text-slate-900 font-bold truncate block">{viewingDeedVilla.projectName || 'Standalone'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10.5px] block font-medium">Client / Owner</span>
                <span className="text-slate-900 font-bold truncate block">{viewingDeedVilla.clientName || 'Akash Global Properties'}</span>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial Ledger Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Unit Contract Price:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {(viewingDeedVilla.contractPriceSAR || 0).toLocaleString()} {baseCurrency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Total Value ({viewingDeedVilla.villaQuantity || 1} Units):</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {((viewingDeedVilla.contractPriceSAR || 0) * (viewingDeedVilla.villaQuantity || 1)).toLocaleString()} {baseCurrency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Estimated Cost:</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {(viewingDeedVilla.estimatedCostSAR || 0).toLocaleString()} {baseCurrency}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  downloadVillaSpecificationDeedPDF(viewingDeedVilla, corporateEntity, baseCurrency);
                  showToast(`Downloaded Specification Deed PDF for ${viewingDeedVilla.blockNo} - ${viewingDeedVilla.villaNo}.`);
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export Specification Deed PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingDeedVilla(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 7: VIEW PROJECT CHARTER DOSSIER
          ============================================================== */}
      {viewingProject && (() => {
        const projectVillas = villas.filter(
          (v) => v.projectId === viewingProject.id || v.projectName === viewingProject.name
        );
        const projectUnits = projectVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);
        const pct = Math.round((viewingProject.spentSAR / viewingProject.budgetSAR) * 100);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {viewingProject.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{viewingProject.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Client: {viewingProject.client} · Location: {viewingProject.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Assigned Project Director */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">
                      Assigned Project Director
                    </span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {viewingProject.assignedEmployeeName || viewingProject.leadName || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Status & Units
                    </span>
                    <span className="text-sm font-bold text-slate-900 uppercase">
                      {viewingProject.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                    {projectUnits} Villas Registered
                  </span>
                </div>
              </div>

              {/* Financial Progress */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Expenditure Utilization:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(viewingProject.spentSAR)} / {formatCurrency(viewingProject.budgetSAR)} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Assigned Multiple Employees & Site Leadership Roster */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>Assigned Project Workforce & Leadership ({viewingProject.assignedTeam?.length || 1} Members)</span>
                  </h4>
                  <span className="text-[10px] text-blue-700 font-semibold font-mono">
                    Enterprise Staffing
                  </span>
                </div>

                {viewingProject.assignedTeam && viewingProject.assignedTeam.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Staff ID</th>
                          <th className="px-3 py-2">Workforce Name</th>
                          <th className="px-3 py-2">Assigned Project Role</th>
                          <th className="px-3 py-2">Department</th>
                          <th className="px-3 py-2 text-right">Deployment Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingProject.assignedTeam.map((m, idx) => {
                          const isDirector = m.employeeName === viewingProject.assignedEmployeeName || idx === 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-mono text-slate-500 text-[11px] font-semibold">{m.employeeId}</td>
                              <td className="px-3 py-2 font-bold text-slate-900 flex items-center gap-1.5">
                                {m.employeeName}
                                {isDirector && (
                                  <span className="rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2">
                                    DIRECTOR
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
                                  {m.role || 'Site Engineer'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">{m.department || 'Operations'}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500 text-[11px]">{m.assignedDate || viewingProject.startDate}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{viewingProject.assignedEmployeeName || viewingProject.leadName || 'Unassigned'}</span>
                      <span className="text-slate-500 block text-[11px]">Primary Project Director</span>
                    </div>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">Solo Lead</span>
                  </div>
                )}
              </div>

              {/* Linked Villas List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Associated Villas ({projectVillas.length} Records)
                </h4>
                {projectVillas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No villas currently linked to this master project.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {projectVillas.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{v.blockNo} - {v.villaNo}</span>
                          <span className="text-slate-500 font-medium">({v.villaType})</span>
                          {v.customVilla && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-700">
                          {((v.contractPriceSAR || 0) * (v.villaQuantity || 1)).toLocaleString()} {baseCurrency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    downloadProjectSpecificationPDF(viewingProject, corporateEntity, baseCurrency, projectVillas);
                    showToast(`Downloaded Project Specification Charter for ${viewingProject.name}.`);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Project Charter PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close Charter
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

