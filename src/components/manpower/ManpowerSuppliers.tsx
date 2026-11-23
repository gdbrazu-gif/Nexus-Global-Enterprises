import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { ManpowerSupplier, SuppliedWorker, ManpowerPOS, ManpowerPOSLineItem } from '../../types';
import {
  Truck,
  Users2,
  Building2,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Download,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  FileText,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  HardHat,
  Receipt,
  SlidersHorizontal,
  Wrench,
  Check,
  DollarSign,
  Layers,
  Sparkles,
  UserPlus,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  downloadManpowerPOSPDF,
  downloadManpowerSupplierDossierPDF,
  downloadSuppliedWorkerDossierPDF,
  PDF_BORDER_HEAD,
  PDF_BORDER_CELL,
} from '../../utils/pdfGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ManpowerSuppliersProps {
  initialTab?: 'suppliers' | 'workers' | 'pos';
  onTabChange?: (tab: 'suppliers' | 'workers' | 'pos') => void;
}

export const ManpowerSuppliers: React.FC<ManpowerSuppliersProps> = ({
  initialTab = 'suppliers',
  onTabChange,
}) => {
  const {
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
    manpowerTrades,
    addManpowerTrade,
    deleteManpowerTrade,
    manpowerPOSList,
    addManpowerPOS,
    updateManpowerPOS,
    deleteManpowerPOS,
    designations,
    projects,
    formatCurrency,
    baseCurrency,
    corporateEntity,
    canPerformAdminAction,
    canPerformBranchAdminAction,
    canPerformHrAction,
    hasModulePermission,
    activeBranchId,
  } = useHRMS();

  const canManageManpower =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    hasModulePermission('manpower', 'create') ||
    hasModulePermission('manpower', 'update');
  const canEnrollToDirectory = canPerformAdminAction || canPerformHrAction;

  // Active view tab: 'suppliers' | 'workers' | 'pos'
  const [activeTab, setActiveTab] = useState<'suppliers' | 'workers' | 'pos'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: 'suppliers' | 'workers' | 'pos') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'under_review' | 'expired' | 'suspended'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [tradeFilter, setTradeFilter] = useState('all');

  // Modals state: Supplier
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ManpowerSupplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<ManpowerSupplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<ManpowerSupplier | null>(null);

  // Modals state: Worker
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<SuppliedWorker | null>(null);
  const [viewingWorker, setViewingWorker] = useState<SuppliedWorker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<SuppliedWorker | null>(null);
  const [isCustomDesignationMode, setIsCustomDesignationMode] = useState(false);
  const [isCustomTradeMode, setIsCustomTradeMode] = useState(false);

  // Modals state: Custom Trades
  const [isManageTradesOpen, setIsManageTradesOpen] = useState(false);
  const [newTradeInput, setNewTradeInput] = useState('');
  const [confirmDeleteTrade, setConfirmDeleteTrade] = useState<string | null>(null);

  // Modals state: POS Orders
  const [isAddPOSOpen, setIsAddPOSOpen] = useState(false);
  const [editingPOS, setEditingPOS] = useState<ManpowerPOS | null>(null);
  const [viewingPOS, setViewingPOS] = useState<ManpowerPOS | null>(null);
  const [deletingPOS, setDeletingPOS] = useState<ManpowerPOS | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // Form State: Supplier
  const [supplierFormData, setSupplierFormData] = useState({
    code: '',
    name: '',
    legalEntityName: '',
    crNumber: '',
    vatNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    city: 'Riyadh',
    address: '',
    agreementStartDate: new Date().toISOString().substring(0, 10),
    agreementEndDate: '2027-12-31',
    status: 'active' as ManpowerSupplier['status'],
    suppliedTradesStr: 'Civil Structural Inspector, Electrical Specialist, Safety Officer (NEBOSH)',
    paymentTerms: 'Monthly Timesheet Claim (Net 30)',
    complianceScore: 95,
    totalInvoicedSAR: 0,
    notes: '',
  });

  // Form State: Worker
  const [workerFormData, setWorkerFormData] = useState({
    supplierId: '',
    fullName: '',
    designation: '',
    trade: '',
    assignedProjectId: '',
    iqamaOrWorkPermit: '',
    hourlyRateSAR: 65,
    monthlyHoursLogged: 176,
    status: 'active' as SuppliedWorker['status'],
    joiningDate: new Date().toISOString().substring(0, 10),
    contactPhone: '',
    alsoAddToDirectory: true,
  });

  const unsyncedWorkersCount = useMemo(() => {
    return suppliedWorkers.filter((w) => !w.isAddedToDirectory && !w.linkedEmployeeId).length;
  }, [suppliedWorkers]);

  const handleBatchSyncWorkersToDirectory = () => {
    const count = addAllSuppliedWorkersToEmployeeDirectory();
    if (count > 0) {
      showToast(`Successfully enrolled ${count} outsourced workers into the Corporate Employee Directory.`);
    } else {
      showToast('All outsourced workers are already enrolled in the Employee Directory.');
    }
  };

  // Form State: POS Order
  const [posFormData, setPosFormData] = useState<{
    posNumber: string;
    supplierId: string;
    projectId: string;
    issueDate: string;
    commencementDate: string;
    completionDate: string;
    scopeOfWork: string;
    paymentTerms: string;
    status: ManpowerPOS['status'];
    authorizedBy: string;
    notes: string;
    lineItems: ManpowerPOSLineItem[];
  }>({
    posNumber: '',
    supplierId: '',
    projectId: '',
    issueDate: new Date().toISOString().substring(0, 10),
    commencementDate: new Date().toISOString().substring(0, 10),
    completionDate: '2027-06-30',
    scopeOfWork: 'Provision of certified site inspectors, technical operators and safety personnel.',
    paymentTerms: 'Monthly Timesheet Claim (Net 30 Days)',
    status: 'approved',
    authorizedBy: 'Tariq Al-Harbi (Head of Procurement)',
    notes: 'All dispatched personnel must carry valid Ajeer temporary assignment permits and safety certifications.',
    lineItems: [
      {
        id: 'LI-1',
        tradeOrSkill: 'Civil Structural Inspector',
        designation: 'Senior Project Engineer',
        workerName: '',
        headcount: 2,
        hoursPerWorker: 176,
        totalHours: 352,
        hourlyRateSAR: 75,
        totalSAR: 26400,
      },
    ],
  });

  // --------------------------------------------------------------------------
  // SUPPLIER ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddSupplier = () => {
    const nextCode = `MPS-${String(manpowerSuppliers.length + 1).padStart(2, '0')}`;
    setSupplierFormData({
      code: nextCode,
      name: '',
      legalEntityName: '',
      crNumber: '',
      vatNumber: '',
      contactPerson: '',
      email: '',
      phone: '+966 ',
      city: 'Riyadh',
      address: '',
      agreementStartDate: new Date().toISOString().substring(0, 10),
      agreementEndDate: '2027-12-31',
      status: 'active',
      suppliedTradesStr: 'Civil Structural Inspector, Electrical Specialist, Safety Officer (NEBOSH)',
      paymentTerms: 'Monthly Timesheet Claim (Net 30)',
      complianceScore: 95,
      totalInvoicedSAR: 0,
      notes: '',
    });
    setIsAddSupplierOpen(true);
  };

  const handleOpenEditSupplier = (sup: ManpowerSupplier) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      code: sup.code,
      name: sup.name,
      legalEntityName: sup.legalEntityName,
      crNumber: sup.crNumber,
      vatNumber: sup.vatNumber,
      contactPerson: sup.contactPerson,
      email: sup.email,
      phone: sup.phone,
      city: sup.city,
      address: sup.address,
      agreementStartDate: sup.agreementStartDate,
      agreementEndDate: sup.agreementEndDate,
      status: sup.status,
      suppliedTradesStr: sup.suppliedTrades.join(', '),
      paymentTerms: sup.paymentTerms,
      complianceScore: sup.complianceScore,
      totalInvoicedSAR: sup.totalInvoicedSAR,
      notes: sup.notes || '',
    });
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const trades = supplierFormData.suppliedTradesStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingSupplier) {
      updateManpowerSupplier(editingSupplier.id, {
        ...supplierFormData,
        suppliedTrades: trades,
      });
      showToast(`Updated details for supplier "${supplierFormData.name}".`);
      setEditingSupplier(null);
    } else {
      addManpowerSupplier({
        ...supplierFormData,
        suppliedTrades: trades,
        deployedWorkersCount: 0,
      });
      showToast(`Added new manpower supplier "${supplierFormData.name}".`);
      setIsAddSupplierOpen(false);
    }
  };

  // --------------------------------------------------------------------------
  // WORKER ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddWorker = (preselectedSupplierId?: string) => {
    const defaultSup = preselectedSupplierId || (manpowerSuppliers[0]?.id ?? '');
    const firstTrade = manpowerTrades[0] || 'Civil Structural Inspector';
    const firstDesignation = designations[0]?.title || 'Senior Project Engineer';

    setWorkerFormData({
      supplierId: defaultSup,
      fullName: '',
      designation: firstDesignation,
      trade: firstTrade,
      assignedProjectId: projects[0]?.id || '',
      iqamaOrWorkPermit: '',
      hourlyRateSAR: 65,
      monthlyHoursLogged: 176,
      status: 'active',
      joiningDate: new Date().toISOString().substring(0, 10),
      contactPhone: '+966 5',
      alsoAddToDirectory: true,
    });
    setIsCustomDesignationMode(false);
    setIsCustomTradeMode(false);
    setIsAddWorkerOpen(true);
  };

  const handleOpenEditWorker = (wrk: SuppliedWorker) => {
    setEditingWorker(wrk);
    setWorkerFormData({
      supplierId: wrk.supplierId,
      fullName: wrk.fullName,
      designation: wrk.designation,
      trade: wrk.trade,
      assignedProjectId: wrk.assignedProjectId || '',
      iqamaOrWorkPermit: wrk.iqamaOrWorkPermit,
      hourlyRateSAR: wrk.hourlyRateSAR,
      monthlyHoursLogged: wrk.monthlyHoursLogged,
      status: wrk.status,
      joiningDate: wrk.joiningDate,
      contactPhone: wrk.contactPhone || '',
      alsoAddToDirectory: wrk.isAddedToDirectory || !!wrk.linkedEmployeeId,
    });
    setIsCustomDesignationMode(!designations.some((d) => d.title === wrk.designation));
    setIsCustomTradeMode(!manpowerTrades.includes(wrk.trade));
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = manpowerSuppliers.find((s) => s.id === workerFormData.supplierId);
    const supplierName = supplier ? supplier.name : 'Unknown Agency';
    const project = projects.find((p) => p.id === workerFormData.assignedProjectId);

    // If new custom trade was typed, register it
    if (workerFormData.trade && !manpowerTrades.includes(workerFormData.trade)) {
      addManpowerTrade(workerFormData.trade);
    }

    if (editingWorker) {
      updateSuppliedWorker(editingWorker.id, {
        supplierId: workerFormData.supplierId,
        fullName: workerFormData.fullName,
        designation: workerFormData.designation,
        trade: workerFormData.trade,
        assignedProjectId: workerFormData.assignedProjectId,
        iqamaOrWorkPermit: workerFormData.iqamaOrWorkPermit,
        hourlyRateSAR: workerFormData.hourlyRateSAR,
        monthlyHoursLogged: workerFormData.monthlyHoursLogged,
        status: workerFormData.status,
        joiningDate: workerFormData.joiningDate,
        contactPhone: workerFormData.contactPhone,
        supplierName,
        assignedProjectName: project ? project.name : undefined,
      });
      showToast(`Updated outsourced worker "${workerFormData.fullName}".`);
      setEditingWorker(null);
    } else {
      const createdWorker = addSuppliedWorker(
        {
          supplierId: workerFormData.supplierId,
          fullName: workerFormData.fullName,
          designation: workerFormData.designation,
          trade: workerFormData.trade,
          assignedProjectId: workerFormData.assignedProjectId,
          iqamaOrWorkPermit: workerFormData.iqamaOrWorkPermit,
          hourlyRateSAR: workerFormData.hourlyRateSAR,
          monthlyHoursLogged: workerFormData.monthlyHoursLogged,
          status: workerFormData.status,
          joiningDate: workerFormData.joiningDate,
          contactPhone: workerFormData.contactPhone,
          supplierName,
          assignedProjectName: project ? project.name : undefined,
        },
        workerFormData.alsoAddToDirectory
      );

      if (workerFormData.alsoAddToDirectory && createdWorker.linkedEmployeeId) {
        showToast(
          `Deployed "${workerFormData.fullName}" & enrolled into Employee Directory (${createdWorker.linkedEmployeeId}).`
        );
      } else {
        showToast(`Deployed outsourced worker "${workerFormData.fullName}".`);
      }
      setIsAddWorkerOpen(false);
    }
  };

  // --------------------------------------------------------------------------
  // CUSTOM SKILL / TRADE CATEGORY ACTIONS
  // --------------------------------------------------------------------------
  const handleAddNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTradeInput.trim()) return;
    addManpowerTrade(newTradeInput.trim());
    showToast(`Added custom trade category "${newTradeInput.trim()}".`);
    setNewTradeInput('');
  };

  // --------------------------------------------------------------------------
  // MAKE POS (SERVICE ORDER) ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddPOS = () => {
    setEditingPOS(null);
    const nextNum = `POS-MPS-${new Date().getFullYear()}-${String(manpowerPOSList.length + 1).padStart(3, '0')}`;
    const defaultSup = manpowerSuppliers[0];
    const defaultProj = projects[0];

    const initialLine: ManpowerPOSLineItem = {
      id: `LI-${Date.now().toString().slice(-4)}`,
      tradeOrSkill: manpowerTrades[0] || 'Civil Structural Inspector',
      designation: designations[0]?.title || 'Senior Project Engineer',
      workerName: '',
      headcount: 2,
      hoursPerWorker: 176,
      totalHours: 352,
      hourlyRateSAR: 75,
      totalSAR: 26400,
    };

    setPosFormData({
      posNumber: nextNum,
      supplierId: defaultSup?.id || '',
      projectId: defaultProj?.id || '',
      issueDate: new Date().toISOString().substring(0, 10),
      commencementDate: new Date().toISOString().substring(0, 10),
      completionDate: '2027-06-30',
      scopeOfWork: 'Provision of certified site inspectors, technical operators and safety personnel.',
      paymentTerms: defaultSup?.paymentTerms || 'Monthly Timesheet Claim (Net 30 Days)',
      status: 'approved',
      authorizedBy: 'Tariq Al-Harbi (Head of Procurement)',
      notes: 'All dispatched personnel must carry valid Ajeer temporary assignment permits and safety certifications.',
      lineItems: [initialLine],
    });
    setIsAddPOSOpen(true);
  };

  const handleOpenEditPOS = (pos: ManpowerPOS) => {
    setEditingPOS(pos);
    setPosFormData({
      posNumber: pos.posNumber,
      supplierId: pos.supplierId,
      projectId: pos.projectId || '',
      issueDate: pos.issueDate,
      commencementDate: pos.commencementDate,
      completionDate: pos.completionDate,
      scopeOfWork: pos.scopeOfWork,
      paymentTerms: pos.paymentTerms,
      status: pos.status,
      authorizedBy: pos.authorizedBy,
      notes: pos.notes || '',
      lineItems:
        pos.lineItems && pos.lineItems.length > 0
          ? [...pos.lineItems]
          : [
              {
                id: `LI-${Date.now().toString().slice(-4)}`,
                tradeOrSkill: manpowerTrades[0] || 'Civil Structural Inspector',
                designation: designations[0]?.title || 'Senior Project Engineer',
                workerName: '',
                headcount: 1,
                hoursPerWorker: 176,
                totalHours: 176,
                hourlyRateSAR: 75,
                totalSAR: 13200,
              },
            ],
    });
    setIsAddPOSOpen(true);
  };

  const handleAddPOSLineItem = () => {
    const newLine: ManpowerPOSLineItem = {
      id: `LI-${Date.now().toString().slice(-4)}`,
      tradeOrSkill: manpowerTrades[0] || 'General Technical Trade',
      designation: designations[0]?.title || 'Structural Site Engineer',
      workerName: '',
      headcount: 1,
      hoursPerWorker: 176,
      totalHours: 176,
      hourlyRateSAR: 60,
      totalSAR: 10560,
    };
    setPosFormData({
      ...posFormData,
      lineItems: [...posFormData.lineItems, newLine],
    });
  };

  const handleUpdatePOSLineItem = (index: number, updates: Partial<ManpowerPOSLineItem>) => {
    const updated = [...posFormData.lineItems];
    const current = { ...updated[index], ...updates };

    // Recalculate totals
    const headcount = Math.max(1, current.headcount || 1);
    const hours = Math.max(1, current.hoursPerWorker || 0);
    const rate = Math.max(0, current.hourlyRateSAR || 0);
    current.totalHours = headcount * hours;
    current.totalSAR = current.totalHours * rate;

    updated[index] = current;
    setPosFormData({ ...posFormData, lineItems: updated });
  };

  const handleRemovePOSLineItem = (index: number) => {
    if (posFormData.lineItems.length <= 1) {
      showToast('A Purchase Order must contain at least one line item.');
      return;
    }
    const updated = posFormData.lineItems.filter((_, i) => i !== index);
    setPosFormData({ ...posFormData, lineItems: updated });
  };

  // Real-time POS calculations
  const posSubtotal = useMemo(() => {
    return posFormData.lineItems.reduce((acc, li) => acc + li.totalSAR, 0);
  }, [posFormData.lineItems]);

  const posVatAmount = useMemo(() => {
    return Math.round(posSubtotal * 0.15 * 100) / 100;
  }, [posSubtotal]);

  const posGrandTotal = useMemo(() => {
    return posSubtotal + posVatAmount;
  }, [posSubtotal, posVatAmount]);

  const handleSavePOS = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = manpowerSuppliers.find((s) => s.id === posFormData.supplierId);
    const supplierName = supplier ? supplier.name : 'Outsourced Agency';
    const project = projects.find((p) => p.id === posFormData.projectId);
    const projectName = project ? project.name : 'General Project Deployment';

    if (editingPOS) {
      updateManpowerPOS(editingPOS.id, {
        ...posFormData,
        supplierName,
        projectName,
        subtotalSAR: posSubtotal,
        vatRate: 15,
        vatAmountSAR: posVatAmount,
        grandTotalSAR: posGrandTotal,
      });
      showToast(`Updated Purchase Order ${posFormData.posNumber}.`);
      setEditingPOS(null);
      setIsAddPOSOpen(false);
    } else {
      addManpowerPOS({
        ...posFormData,
        supplierName,
        projectName,
        subtotalSAR: posSubtotal,
        vatRate: 15,
        vatAmountSAR: posVatAmount,
        grandTotalSAR: posGrandTotal,
      });
      showToast(`Issued Service Order POS ${posFormData.posNumber} (${posGrandTotal.toLocaleString()} SAR).`);
      setIsAddPOSOpen(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------------------------------
  const filteredSuppliers = useMemo(() => {
    return manpowerSuppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.crNumber.includes(searchQuery) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.suppliedTrades.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchCity = cityFilter === 'all' || s.city.toLowerCase() === cityFilter.toLowerCase();
      const matchBranch = activeBranchId === 'all' || (s.branchId || 'BR-RUH') === activeBranchId;

      return matchSearch && matchStatus && matchCity && matchBranch;
    });
  }, [manpowerSuppliers, searchQuery, statusFilter, cityFilter, activeBranchId]);

  const filteredWorkers = useMemo(() => {
    return suppliedWorkers.filter((w) => {
      const matchSearch =
        w.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.trade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.iqamaOrWorkPermit.includes(searchQuery);

      const matchTrade = tradeFilter === 'all' || w.trade.toLowerCase() === tradeFilter.toLowerCase();
      const matchBranch = activeBranchId === 'all' || (w.branchId || 'BR-RUH') === activeBranchId;
      return matchSearch && matchTrade && matchBranch;
    });
  }, [suppliedWorkers, searchQuery, tradeFilter, activeBranchId]);

  const filteredPOSList = useMemo(() => {
    return manpowerPOSList.filter((p) => {
      const matchSearch =
        p.posNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lineItems.some((li) => li.tradeOrSkill.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchBranch = activeBranchId === 'all' || (p.branchId || 'BR-RUH') === activeBranchId;

      return matchSearch && matchBranch;
    });
  }, [manpowerPOSList, searchQuery, activeBranchId]);

  // High-level KPI Stats
  const stats = useMemo(() => {
    const totalSuppliers = manpowerSuppliers.length;
    const activeSuppliers = manpowerSuppliers.filter((s) => s.status === 'active').length;
    const totalDeployedWorkers = suppliedWorkers.filter((w) => w.status === 'active').length;
    const totalMonthlyCommitment = suppliedWorkers.reduce(
      (sum, w) => sum + w.hourlyRateSAR * w.monthlyHoursLogged,
      0
    );
    const avgCompliance =
      totalSuppliers > 0
        ? Math.round(manpowerSuppliers.reduce((sum, s) => sum + s.complianceScore, 0) / totalSuppliers)
        : 100;
    const totalPOSValue = manpowerPOSList.reduce((sum, p) => sum + p.grandTotalSAR, 0);

    return {
      totalSuppliers,
      activeSuppliers,
      totalDeployedWorkers,
      totalMonthlyCommitment,
      avgCompliance,
      totalPOSValue,
    };
  }, [manpowerSuppliers, suppliedWorkers, manpowerPOSList]);

  // Distinct cities for filter
  const distinctCities = useMemo(() => {
    return Array.from(new Set(manpowerSuppliers.map((s) => s.city))).filter(Boolean);
  }, [manpowerSuppliers]);

  // PDF Exporters
  const handleExportSuppliersMasterPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(corporateEntity.companyName.toUpperCase(), 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('MANPOWER SUPPLIERS & OUTSOURCED WORKFORCE MASTER DIRECTORY', 14, 16);
    doc.text(`CR: ${corporateEntity.crNumber} | VAT: ${corporateEntity.vatNumber}`, pageWidth - 14, 10, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 16, { align: 'right' });

    const tableBody = manpowerSuppliers.map((s, idx) => [
      idx + 1,
      s.code,
      s.name,
      s.crNumber,
      s.contactPerson,
      s.city,
      s.suppliedTrades.slice(0, 2).join(', '),
      s.deployedWorkersCount,
      `${s.complianceScore}%`,
      s.status.toUpperCase(),
      `${s.totalInvoicedSAR.toLocaleString()} ${baseCurrency}`,
    ]);

    autoTable(doc, {
      startY: 28,
      theme: 'grid',
      head: [
        [
          '#',
          'Code',
          'Supplier Agency',
          'CR Number',
          'Contact Person',
          'City',
          'Key Trades',
          'Deployed',
          'Compliance',
          'Status',
          'Total Invoiced',
        ],
      ],
      body: tableBody,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.25,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: PDF_BORDER_CELL,
        lineWidth: 0.22,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`manpower_suppliers_directory_${new Date().toISOString().substring(0, 10)}.pdf`);
    showToast('Exported Manpower Suppliers Master Ledger PDF.');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Manpower Supplier & Labor Contracting
              </h1>
              <p className="text-xs text-slate-500">
                workforce agencies, Service Orders (POS), trade / skill categories & ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Make POS Button (Primary Action) */}
          {canManageManpower && (
            <button
              type="button"
              onClick={handleOpenAddPOS}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Make new Manpower Purchase Order / Service Order (POS)"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>POS</span>
            </button>
          )}

          {/* Manage Custom Skill / Trade Categories */}
          {canManageManpower && (
            <button
              type="button"
              onClick={() => setIsManageTradesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              title="Manage and create custom skill / trade categories"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              <span> Skill/Trade ({manpowerTrades.length})</span>
            </button>
          )}

          {/* Deploy Worker */}
          {canManageManpower && (
            <button
              type="button"
              onClick={() => handleOpenAddWorker()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
              title="Deploy a new outsourced worker with designation title dropdown"
            >
              <HardHat className="h-3.5 w-3.5" />
              <span>Deploy Worker</span>
            </button>
          )}

          {/* Add Supplier */}
          {canManageManpower && (
            <button
              type="button"
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Supplier</span>
            </button>
          )}

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportSuppliersMasterPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Export full directory as PDF"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Suppliers Enrolled</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{stats.totalSuppliers}</span>
            <span className="text-xs text-emerald-600 font-semibold">{stats.activeSuppliers} active contracts</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Outsourced Staff</span>
            <HardHat className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600">{stats.totalDeployedWorkers}</span>
            <span className="text-xs text-slate-400">deployed personnel</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">POS Commitments</span>
            <Receipt className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">
              {stats.totalPOSValue.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{baseCurrency}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Ajeer & Qiwa Rating</span>
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-700">{stats.avgCompliance}%</span>
            <span className="text-[11px] text-emerald-600 font-medium">Compliance Rate</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleSelectTab('suppliers')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'suppliers'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Suppliers & Contracts ({manpowerSuppliers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('workers')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'workers'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardHat className="h-4 w-4" />
            <span>Outsourced Workers ({suppliedWorkers.length})</span>
          </button>

          {/* POS Orders Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('pos')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'pos'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Service Orders / POS ({manpowerPOSList.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50 border border-slate-200 p-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'workers'
                ? 'Search worker name, designation, trade, iqama/permit...'
                : activeTab === 'pos'
                ? 'Search POS number, project, supplier, trade...'
                : 'Search supplier name, CR, contact, city, trades...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'suppliers' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Contract Status</option>
                <option value="active">Active</option>
                <option value="under_review">Under Review</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Cities</option>
                {distinctCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'workers' && (
            <div className="flex items-center gap-2">
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Skill / Trade Categories</option>
                {manpowerTrades.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {canEnrollToDirectory && (
                <button
                  type="button"
                  onClick={handleBatchSyncWorkersToDirectory}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                    unsyncedWorkersCount > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  title="Enroll all outsourced workers into the corporate Employee Directory"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>
                    {unsyncedWorkersCount > 0
                      ? `Add All to Employee Directory (${unsyncedWorkersCount})`
                      : 'All in Employee Directory'}
                  </span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'pos' && canManageManpower && (
            <button
              type="button"
              onClick={handleOpenAddPOS}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New POS</span>
            </button>
          )}
        </div>
      </div>

      {/* ==============================================================
          TAB 1: SUPPLIERS DIRECTORY
          ============================================================== */}
      {activeTab === 'suppliers' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <tr>
                  <th className="px-3.5 py-3">Code & Supplier Agency</th>
                  <th className="px-3.5 py-3">Legal Entity & CR #</th>
                  <th className="px-3.5 py-3">Contact Person & City</th>
                  <th className="px-3.5 py-3">Authorized Trades</th>
                  <th className="px-3.5 py-3 text-center">Deployed Staff</th>
                  <th className="px-3.5 py-3 text-center">Ajeer Score</th>
                  <th className="px-3.5 py-3">Agreement Dates</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Truck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600 text-sm">No Manpower Suppliers Found</p>
                      <p className="text-xs text-slate-400 mt-1">Enroll your first manpower contracting agency.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.code}</div>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">
                        <div className="font-sans font-medium text-slate-800 text-xs">{s.legalEntityName || s.name}</div>
                        <div>CR: {s.crNumber}</div>
                        <div className="text-slate-400">VAT: {s.vatNumber}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-slate-900">{s.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{s.city} · {s.phone}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.suppliedTrades.slice(0, 3).map((tr, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-700"
                            >
                              {tr}
                            </span>
                          ))}
                          {s.suppliedTrades.length > 3 && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              +{s.suppliedTrades.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                          {s.deployedWorkersCount}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded-md ${
                            s.complianceScore >= 95
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.complianceScore >= 90
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.complianceScore}%
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[11px] text-slate-600">
                        <div>From: {s.agreementStartDate}</div>
                        <div className="text-slate-400">To: {s.agreementEndDate}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'under_review'
                              ? 'bg-amber-100 text-amber-800'
                              : s.status === 'expired'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.status === 'active'
                                ? 'bg-emerald-500'
                                : s.status === 'under_review'
                                ? 'bg-amber-500'
                                : s.status === 'expired'
                                ? 'bg-slate-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {s.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Dossier */}
                          <button
                            type="button"
                            onClick={() => setViewingSupplier(s)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                            title="View Supplier Profile & Linked Personnel"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* PDF Dossier */}
                          <button
                            type="button"
                            onClick={() => {
                              const agencyWorkers = suppliedWorkers.filter((w) => w.supplierId === s.id);
                              downloadManpowerSupplierDossierPDF(s, agencyWorkers, corporateEntity, baseCurrency);
                              showToast(`Downloaded compliance dossier PDF for ${s.name}.`);
                            }}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Download Supplier Dossier PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {canManageManpower && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditSupplier(s)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                              title="Edit Supplier Agreement"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canPerformAdminAction && (
                            <button
                              type="button"
                              onClick={() => setDeletingSupplier(s)}
                              className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Delete Supplier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: OUTSOURCED WORKERS ROSTER
          ============================================================== */}
      {activeTab === 'workers' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <tr>
                  <th className="px-3.5 py-3">Worker ID & Full Name</th>
                  <th className="px-3.5 py-3">Designation Title</th>
                  <th className="px-3.5 py-3">Skill / Trade Category</th>
                  <th className="px-3.5 py-3">Supplier Agency</th>
                  <th className="px-3.5 py-3">Assigned Project</th>
                  <th className="px-3.5 py-3">Iqama / Permit #</th>
                  <th className="px-3.5 py-3 text-right">Hourly Rate</th>
                  <th className="px-3.5 py-3 text-center">Monthly Hours</th>
                  <th className="px-3.5 py-3 text-right">Monthly Commitment</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <HardHat className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600 text-sm">No Outsourced Workers Found</p>
                      <p className="text-xs text-slate-400 mt-1">Deploy an outsourced worker using the Designation Title dropdown.</p>
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">{w.fullName}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{w.id}</span>
                          {w.linkedEmployeeId ? (
                            <span
                              className="inline-flex items-center gap-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-semibold"
                              title={`Enrolled in Employee Directory as ${w.linkedEmployeeId}`}
                            >
                              <UserCheck className="h-2.5 w-2.5 text-emerald-600" />
                              {w.linkedEmployeeId}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 text-[10px] font-medium"
                              title="Not yet enrolled into Employee Directory"
                            >
                              Unsynced
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">{w.designation}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          {w.trade}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-slate-900">{w.supplierName}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {w.assignedProjectName || 'General Operations'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">
                        {w.iqamaOrWorkPermit}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-900">
                        {w.hourlyRateSAR} {baseCurrency}/h
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono font-semibold">
                        {w.monthlyHoursLogged}h
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(w.hourlyRateSAR * w.monthlyHoursLogged)}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            w.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'on_standby'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {w.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Add to Employee Directory Button if not enrolled */}
                          {!w.linkedEmployeeId && !w.isAddedToDirectory && canEnrollToDirectory && (
                            <button
                              type="button"
                              onClick={() => {
                                const emp = addSuppliedWorkerToEmployeeDirectory(w.id);
                                if (emp) {
                                  showToast(`Added ${w.fullName} to Employee Directory (${emp.id}).`);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-2 py-1 text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
                              title="Add this outsourced worker to the Employee Directory"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span className="hidden xl:inline">Add to Directory</span>
                            </button>
                          )}

                          {/* View Worker */}
                          <button
                            type="button"
                            onClick={() => setViewingWorker(w)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                            title="View Worker Credentials & Assignment Dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* PDF Worker Dossier */}
                          <button
                            type="button"
                            onClick={() => {
                              downloadSuppliedWorkerDossierPDF(w, corporateEntity, baseCurrency);
                              showToast(`Downloaded deployment dossier PDF for ${w.fullName}.`);
                            }}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Download Worker Dossier PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {canManageManpower && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditWorker(w)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                              title="Edit Worker"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canPerformAdminAction && (
                            <button
                              type="button"
                              onClick={() => setDeletingWorker(w)}
                              className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Remove Worker"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: SERVICE ORDERS / POS ORDERS
          ============================================================== */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Labor Contracting Purchase Orders (POS / LPO)</h3>
                <p className="mt-0.5 text-emerald-800">
                  Formally authorized service orders for labor supply, technical trade headcounts, contracted billing rates & 15% VAT.
                </p>
              </div>
            </div>

            {canManageManpower && (
              <button
                type="button"
                onClick={handleOpenAddPOS}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Make New POS</span>
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                  <tr>
                    <th className="px-3.5 py-3">POS Order #</th>
                    <th className="px-3.5 py-3">Contractor / Supplier</th>
                    <th className="px-3.5 py-3">Assigned Project Site</th>
                    <th className="px-3.5 py-3">Contract Term</th>
                    <th className="px-3.5 py-3 text-center">Line Items</th>
                    <th className="px-3.5 py-3 text-right">Subtotal</th>
                    <th className="px-3.5 py-3 text-right">VAT (15%)</th>
                    <th className="px-3.5 py-3 text-right">Grand Total</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPOSList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">No Purchase Orders (POS) Found</p>
                        <p className="text-xs text-slate-400 mt-1">Create your first official labor contracting service order.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPOSList.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3">
                          <span className="font-mono font-bold text-slate-900 block">{pos.posNumber}</span>
                          <span className="text-[10px] text-slate-400">Issued: {pos.issueDate}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-bold text-slate-900 block">{pos.supplierName}</span>
                          <span className="text-[10.5px] text-slate-500 font-mono">{pos.paymentTerms}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {pos.projectName}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                          <div>{pos.commencementDate}</div>
                          <div className="text-slate-400">to {pos.completionDate}</div>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                            {pos.lineItems.length} Trade{pos.lineItems.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-700">
                          {pos.subtotalSAR.toLocaleString()} {baseCurrency}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-500">
                          +{pos.vatAmountSAR.toLocaleString()} {baseCurrency}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-700 text-sm">
                          {pos.grandTotalSAR.toLocaleString()} {baseCurrency}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                              pos.status === 'approved' || pos.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pos.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : pos.status === 'draft'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                pos.status === 'approved' || pos.status === 'active'
                                  ? 'bg-emerald-500'
                                  : pos.status === 'completed'
                                  ? 'bg-blue-500'
                                  : pos.status === 'draft'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-500'
                              }`}
                            />
                            {pos.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View POS Details */}
                            <button
                              type="button"
                              onClick={() => setViewingPOS(pos)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                              title="View POS Voucher Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit POS Service Order */}
                            {canManageManpower && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditPOS(pos)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                title="Edit POS Service Order"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Download POS PDF */}
                            <button
                              type="button"
                              onClick={() => {
                                downloadManpowerPOSPDF(pos, corporateEntity, baseCurrency);
                                showToast(`Downloaded POS Service Order PDF for ${pos.posNumber}.`);
                              }}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                              title="Download Official POS Vector PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            {canPerformAdminAction && (
                              <button
                                type="button"
                                onClick={() => setDeletingPOS(pos)}
                                className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Delete POS Order"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 1: ADD / EDIT SUPPLIER
          ============================================================== */}
      {(isAddSupplierOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingSupplier ? 'Edit Manpower Supplier Details' : 'Enroll New Manpower Supplier Agency'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Register outsourced staffing agency, CR, VAT ID, contract period, and authorized labor trades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddSupplierOpen(false);
                  setEditingSupplier(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.code}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Agency Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Falak Manpower Solutions"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Corporate Legal Registered Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Falak Contracting & Human Resources Co. Ltd."
                  value={supplierFormData.legalEntityName}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, legalEntityName: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Commercial Registration (CR) *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit CR Number"
                    value={supplierFormData.crNumber}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, crNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">VAT Identification Number</label>
                  <input
                    type="text"
                    placeholder="15-digit Tax ID"
                    value={supplierFormData.vatNumber}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, vatNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierFormData.contactPerson}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contract Status</label>
                  <select
                    value={supplierFormData.status}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, status: e.target.value as any })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  >
                    <option value="active">Active</option>
                    <option value="under_review">Under Review</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Supplied Trades / Categories (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Civil Structural Inspector, Electrical Specialist, Heavy Equipment Operator"
                  value={supplierFormData.suppliedTradesStr}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, suppliedTradesStr: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Agreement Start Date</label>
                  <input
                    type="date"
                    value={supplierFormData.agreementStartDate}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, agreementStartDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Agreement Expiry Date</label>
                  <input
                    type="date"
                    value={supplierFormData.agreementEndDate}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, agreementEndDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={supplierFormData.paymentTerms}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentTerms: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Compliance Score (0-100%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={supplierFormData.complianceScore}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, complianceScore: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSupplierOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 2: ADD / EDIT SUPPLIED WORKER (WITH DESIGNATION TITLE DROPDOWN & CUSTOM TRADE)
          ============================================================== */}
      {(isAddWorkerOpen || editingWorker) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingWorker ? 'Edit Outsourced Worker Profile' : 'Deploy New Outsourced Worker'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select designation title from corporate registry and assign customized skill / trade category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddWorkerOpen(false);
                  setEditingWorker(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Manpower Supplier Agency *</label>
                <select
                  required
                  value={workerFormData.supplierId}
                  onChange={(e) => setWorkerFormData({ ...workerFormData, supplierId: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                >
                  <option value="">Select Supplier</option>
                  {manpowerSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} - {s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={workerFormData.fullName}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, fullName: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Iqama / Ajeer Permit # *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit National/Iqama ID"
                    value={workerFormData.iqamaOrWorkPermit}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, iqamaOrWorkPermit: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* DESIGNATION TITLE DROPDOWN MENU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Designation Title (Dropdown Menu) *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDesignationMode(!isCustomDesignationMode)}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    {isCustomDesignationMode ? 'Switch to Standard List' : '+ Enter Custom Designation'}
                  </button>
                </div>

                {!isCustomDesignationMode ? (
                  <select
                    required
                    value={workerFormData.designation}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomDesignationMode(true);
                      } else {
                        setWorkerFormData({ ...workerFormData, designation: e.target.value });
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="">-- Select Corporate Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.title}>
                        {d.title} ({d.gradeLevel})
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Enter Custom Designation Title...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Type custom designation title..."
                    value={workerFormData.designation}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, designation: e.target.value })}
                    className="w-full rounded-md border border-blue-400 bg-blue-50/20 px-3 py-1.5 outline-none focus:border-blue-600"
                  />
                )}
              </div>

              {/* CUSTOM SKILL / TRADE CATEGORY DROPDOWN MENU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Skill / Trade Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTradeMode(!isCustomTradeMode)}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    {isCustomTradeMode ? 'Select from Registered Trades' : '+ Add Custom Trade'}
                  </button>
                </div>

                {!isCustomTradeMode ? (
                  <select
                    required
                    value={workerFormData.trade}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomTradeMode(true);
                      } else {
                        setWorkerFormData({ ...workerFormData, trade: e.target.value });
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="">-- Select Skill / Trade Category --</option>
                    {manpowerTrades.map((tr) => (
                      <option key={tr} value={tr}>
                        {tr}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Add Custom Skill / Trade...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Type new custom trade / skill (e.g. Industrial Automation Inspector)..."
                    value={workerFormData.trade}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, trade: e.target.value })}
                    className="w-full rounded-md border border-blue-400 bg-blue-50/20 px-3 py-1.5 outline-none focus:border-blue-600"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Project</label>
                  <select
                    value={workerFormData.assignedProjectId}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, assignedProjectId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  >
                    <option value="">Unassigned / General</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Deployment Status</label>
                  <select
                    value={workerFormData.status}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, status: e.target.value as any })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  >
                    <option value="active">Active</option>
                    <option value="on_standby">On Standby</option>
                    <option value="demobilized">Demobilized</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hourly Billing Rate ({baseCurrency})</label>
                  <input
                    type="number"
                    min={1}
                    value={workerFormData.hourlyRateSAR}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, hourlyRateSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Monthly Hours Standard</label>
                  <input
                    type="number"
                    min={0}
                    value={workerFormData.monthlyHoursLogged}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, monthlyHoursLogged: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mobilization / Joining Date</label>
                  <input
                    type="date"
                    value={workerFormData.joiningDate}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, joiningDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={workerFormData.contactPhone}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, contactPhone: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Auto-enroll in Employee Directory Checkbox */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workerFormData.alsoAddToDirectory}
                    onChange={(e) => setWorkerFormData({ ...workerFormData, alsoAddToDirectory: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">
                      Also add & register this worker in Corporate Employee Directory
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Automatically creates an Employee profile with Contract status, enabling corporate ID badge, timesheet logging & payroll ledger integration.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddWorkerOpen(false);
                    setEditingWorker(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  {editingWorker ? 'Update Worker' : 'Deploy Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 3: MAKE POS (SERVICE ORDER / LPO CREATION)
          ============================================================== */}
      {(isAddPOSOpen || editingPOS) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPOS ? 'Edit Manpower Purchase Order' : 'Make Manpower Purchase Order (POS / LPO)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Issue formal labor contracting voucher with trade skill line items, hours, billing rates, and 15% VAT.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddPOSOpen(false);
                  setEditingPOS(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePOS} className="mt-4 space-y-4 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">POS / Order Number *</label>
                  <input
                    type="text"
                    required
                    value={posFormData.posNumber}
                    onChange={(e) => setPosFormData({ ...posFormData, posNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contractor / Supplier *</label>
                  <select
                    required
                    value={posFormData.supplierId}
                    onChange={(e) => {
                      const sup = manpowerSuppliers.find((s) => s.id === e.target.value);
                      setPosFormData({
                        ...posFormData,
                        supplierId: e.target.value,
                        paymentTerms: sup?.paymentTerms || posFormData.paymentTerms,
                      });
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Supplier</option>
                    {manpowerSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Project Site *</label>
                  <select
                    required
                    value={posFormData.projectId}
                    onChange={(e) => setPosFormData({ ...posFormData, projectId: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Project Site</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Order Issue Date</label>
                  <input
                    type="date"
                    value={posFormData.issueDate}
                    onChange={(e) => setPosFormData({ ...posFormData, issueDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Commencement Date</label>
                  <input
                    type="date"
                    value={posFormData.commencementDate}
                    onChange={(e) => setPosFormData({ ...posFormData, commencementDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={posFormData.completionDate}
                    onChange={(e) => setPosFormData({ ...posFormData, completionDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Scope of Manpower Services</label>
                <textarea
                  rows={2}
                  value={posFormData.scopeOfWork}
                  onChange={(e) => setPosFormData({ ...posFormData, scopeOfWork: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              {/* Line Items Editor */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Service Line Items (Trades, Rates & Hours)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPOSLineItem}
                    className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Trade Line Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {posFormData.lineItems.map((li, idx) => (
                    <div
                      key={li.id || idx}
                      className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
                    >
                      {/* Skill / Trade Category */}
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Skill / Trade</label>
                        <select
                          value={li.tradeOrSkill}
                          onChange={(e) => handleUpdatePOSLineItem(idx, { tradeOrSkill: e.target.value })}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                        >
                          {manpowerTrades.map((tr) => (
                            <option key={tr} value={tr}>
                              {tr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Designation Title (Dropdown menu) */}
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Designation Title</label>
                        <select
                          value={li.designation}
                          onChange={(e) => handleUpdatePOSLineItem(idx, { designation: e.target.value })}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                        >
                          {designations.map((d) => (
                            <option key={d.id} value={d.title}>
                              {d.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Headcount */}
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={li.headcount}
                          onChange={(e) => handleUpdatePOSLineItem(idx, { headcount: Number(e.target.value) })}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center font-mono"
                        />
                      </div>

                      {/* Hours per person */}
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Hrs/Pax</label>
                        <input
                          type="number"
                          min={1}
                          value={li.hoursPerWorker}
                          onChange={(e) => handleUpdatePOSLineItem(idx, { hoursPerWorker: Number(e.target.value) })}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-right font-mono"
                        />
                      </div>

                      {/* Hourly Rate */}
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Rate ({baseCurrency}/h)</label>
                        <input
                          type="number"
                          min={1}
                          value={li.hourlyRateSAR}
                          onChange={(e) => handleUpdatePOSLineItem(idx, { hourlyRateSAR: Number(e.target.value) })}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-right font-mono"
                        />
                      </div>

                      {/* Line Total & Remove */}
                      <div className="col-span-2 flex items-center justify-between gap-1 pl-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Total</label>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {li.totalSAR.toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePOSLineItem(idx)}
                          className="rounded p-1 text-rose-500 hover:bg-rose-50 cursor-pointer"
                          title="Remove line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="space-y-1">
                  <div className="text-slate-600 font-medium">
                    Payment Terms: <span className="font-bold text-slate-800">{posFormData.paymentTerms}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Authorized by: <span className="font-semibold text-slate-700">{posFormData.authorizedBy}</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="text-slate-600">
                    Subtotal: <span className="font-mono font-bold text-slate-900">{posSubtotal.toLocaleString()} {baseCurrency}</span>
                  </div>
                  <div className="text-slate-600">
                    VAT (15%): <span className="font-mono font-bold text-slate-900">+{posVatAmount.toLocaleString()} {baseCurrency}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 border-t border-slate-200 pt-1">
                    Grand Total: <span className="font-mono text-base">{posGrandTotal.toLocaleString()} {baseCurrency}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPOSOpen(false);
                    setEditingPOS(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  {editingPOS ? 'Update Purchase Order' : 'Issue POS Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 4: MANAGE CUSTOM SKILL / TRADE CATEGORIES
          ============================================================== */}
      {isManageTradesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Custom Skill / Trade Categories</h3>
                  <p className="text-xs text-slate-500">
                    Define and organize technical trades for manpower deployment and service orders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageTradesOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Add New Trade Input */}
              <form onSubmit={handleAddNewTrade} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter custom trade title (e.g. Fiber Splicing Specialist)..."
                  value={newTradeInput}
                  onChange={(e) => setNewTradeInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 font-semibold text-white cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Trade</span>
                </button>
              </form>

              {/* Trades List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {manpowerTrades.map((tradeName) => {
                  const workerCount = suppliedWorkers.filter(
                    (w) => w.trade.toLowerCase() === tradeName.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={tradeName}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-semibold text-slate-900">{tradeName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          {workerCount} Staff
                        </span>

                        {confirmDeleteTrade === tradeName ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteManpowerTrade(tradeName);
                                setConfirmDeleteTrade(null);
                                showToast(`Removed custom trade "${tradeName}".`);
                              }}
                              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTrade(null)}
                              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTrade(tradeName)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Delete trade category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManageTradesOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 5: VIEW SUPPLIER DETAILS & LINKED WORKERS
          ============================================================== */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingSupplier.name}</h3>
                  <p className="text-xs text-slate-500">
                    {viewingSupplier.legalEntityName || viewingSupplier.name} · {viewingSupplier.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">CR Number</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{viewingSupplier.crNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">VAT Number</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{viewingSupplier.vatNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">City / Location</span>
                  <span className="font-semibold text-slate-900 text-xs">{viewingSupplier.city}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Contact Person</span>
                  <span className="font-semibold text-slate-900 text-xs">{viewingSupplier.contactPerson}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Phone</span>
                  <span className="font-mono text-slate-700 text-xs">{viewingSupplier.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Agreement Term</span>
                  <span className="font-mono text-slate-700 text-xs">{viewingSupplier.agreementStartDate} to {viewingSupplier.agreementEndDate}</span>
                </div>
              </div>

              {/* Supplied Trades */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1.5">Authorized Labor Trades</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingSupplier.suppliedTrades.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Linked Supplied Workforce Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Deployed Personnel ({suppliedWorkers.filter((w) => w.supplierId === viewingSupplier.id).length})
                  </span>
                  {canManageManpower && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingSupplier(null);
                        handleOpenAddWorker(viewingSupplier.id);
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Deploy New Worker to this Agency</span>
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Worker Name</th>
                        <th className="px-3 py-2">Trade</th>
                        <th className="px-3 py-2">Assigned Project</th>
                        <th className="px-3 py-2 font-mono">Iqama</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suppliedWorkers.filter((w) => w.supplierId === viewingSupplier.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No workers currently deployed under this agency.
                          </td>
                        </tr>
                      ) : (
                        suppliedWorkers
                          .filter((w) => w.supplierId === viewingSupplier.id)
                          .map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-semibold text-slate-900">{w.fullName}</td>
                              <td className="px-3 py-2 text-blue-700">{w.trade}</td>
                              <td className="px-3 py-2">{w.assignedProjectName || 'General Operations'}</td>
                              <td className="px-3 py-2 font-mono text-[11px]">{w.iqamaOrWorkPermit}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{w.hourlyRateSAR} {baseCurrency}/h</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingSupplier.notes && (
                <div className="rounded-lg bg-amber-50/50 border border-amber-200 p-3 text-slate-700">
                  <span className="font-bold text-amber-900 text-xs block mb-0.5">Agreement Notes:</span>
                  <p>{viewingSupplier.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const agencyWorkers = suppliedWorkers.filter((w) => w.supplierId === viewingSupplier.id);
                  downloadManpowerSupplierDossierPDF(viewingSupplier, agencyWorkers, corporateEntity, baseCurrency);
                  showToast(`Downloaded dossier PDF for ${viewingSupplier.name}.`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Supplier Dossier PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 6: VIEW WORKER DOSSIER & PERMIT CARD
          ============================================================== */}
      {viewingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <HardHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingWorker.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    {viewingWorker.designation} · {viewingWorker.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingWorker(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Skill / Trade</span>
                  <span className="font-semibold text-blue-700 text-xs">{viewingWorker.trade}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Designation Title</span>
                  <span className="font-semibold text-slate-900 text-xs">{viewingWorker.designation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Sponsoring Agency</span>
                  <span className="font-semibold text-slate-900 text-xs">{viewingWorker.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Iqama / Permit #</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{viewingWorker.iqamaOrWorkPermit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Assigned Project</span>
                  <span className="font-medium text-slate-800 text-xs">{viewingWorker.assignedProjectName || 'General Operations'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Deployment Status</span>
                  <span className="font-bold text-emerald-700 text-xs uppercase">{viewingWorker.status}</span>
                </div>
              </div>

              {/* Financial Commitment Card */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2">
                <span className="font-bold text-blue-900 text-xs block">Labor Contracting Rate Schedule</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Hourly Rate</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {viewingWorker.hourlyRateSAR} {baseCurrency}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Standard Hours</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {viewingWorker.monthlyHoursLogged} hrs/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Monthly Gross</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {(viewingWorker.hourlyRateSAR * viewingWorker.monthlyHoursLogged).toLocaleString()} {baseCurrency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Directory Status Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Corporate Employee Directory</span>
                    <span className="text-[11px] text-slate-500 block">
                      {viewingWorker.linkedEmployeeId
                        ? `Enrolled as Contract Personnel (${viewingWorker.linkedEmployeeId})`
                        : 'Worker is not yet added to Corporate Directory'}
                    </span>
                  </div>
                </div>

                <div>
                  {viewingWorker.linkedEmployeeId ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {viewingWorker.linkedEmployeeId}
                    </span>
                  ) : canEnrollToDirectory ? (
                    <button
                      type="button"
                      onClick={() => {
                        const emp = addSuppliedWorkerToEmployeeDirectory(viewingWorker.id);
                        if (emp) {
                          setViewingWorker({
                            ...viewingWorker,
                            linkedEmployeeId: emp.id,
                            isAddedToDirectory: true,
                          });
                          showToast(`Added ${viewingWorker.fullName} to Employee Directory (${emp.id}).`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add to Directory</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  downloadSuppliedWorkerDossierPDF(viewingWorker, corporateEntity, baseCurrency);
                  showToast(`Downloaded dossier PDF for ${viewingWorker.fullName}.`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Worker Dossier PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingWorker(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 7: VIEW POS DETAILS (SERVICE ORDER DOSSIER)
          ============================================================== */}
      {viewingPOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingPOS.posNumber}</h3>
                  <p className="text-xs text-slate-500">
                    {viewingPOS.supplierName} · {viewingPOS.projectName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPOS(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Issue Date</span>
                  <span className="font-mono text-slate-800 font-bold">{viewingPOS.issueDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Contract Term</span>
                  <span className="font-mono text-slate-800">{viewingPOS.commencementDate} to {viewingPOS.completionDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Approval Status</span>
                  <span className="font-bold text-emerald-700 uppercase">{viewingPOS.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium mb-0.5">Scope of Work</span>
                <p className="text-slate-700 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                  {viewingPOS.scopeOfWork}
                </p>
              </div>

              {/* Line items table */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1.5">
                  Contracted Trade Line Items ({viewingPOS.lineItems.length})
                </span>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Skill / Trade</th>
                        <th className="px-3 py-2">Designation</th>
                        <th className="px-3 py-2 text-center">Headcount</th>
                        <th className="px-3 py-2 text-right">Total Hours</th>
                        <th className="px-3 py-2 text-right">Rate/hr</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingPOS.lineItems.map((li, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-900">{li.tradeOrSkill}</td>
                          <td className="px-3 py-2 text-slate-700">{li.designation}</td>
                          <td className="px-3 py-2 text-center font-mono">{li.headcount} Pax</td>
                          <td className="px-3 py-2 text-right font-mono">{li.totalHours}h</td>
                          <td className="px-3 py-2 text-right font-mono">{li.hourlyRateSAR} {baseCurrency}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {li.totalSAR.toLocaleString()} {baseCurrency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-right space-y-1">
                <div>Subtotal Net: <span className="font-mono font-bold text-slate-900">{viewingPOS.subtotalSAR.toLocaleString()} {baseCurrency}</span></div>
                <div>VAT (15%): <span className="font-mono text-slate-600">+{viewingPOS.vatAmountSAR.toLocaleString()} {baseCurrency}</span></div>
                <div className="text-sm font-bold text-emerald-700 border-t border-slate-200 pt-1">
                  Grand Total: <span className="font-mono text-base">{viewingPOS.grandTotalSAR.toLocaleString()} {baseCurrency}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  downloadManpowerPOSPDF(viewingPOS, corporateEntity, baseCurrency);
                  showToast(`Downloaded POS voucher PDF for ${viewingPOS.posNumber}.`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download POS PDF Voucher</span>
              </button>

              <div className="flex items-center gap-2">
                {canManageManpower && (
                  <button
                    type="button"
                    onClick={() => {
                      const posToEdit = viewingPOS;
                      setViewingPOS(null);
                      handleOpenEditPOS(posToEdit);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                    <span>Edit POS Order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingPOS(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 8: DELETE CONFIRMATION
          ============================================================== */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Delete Manpower Supplier?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong>{deletingSupplier.name}</strong> ({deletingSupplier.code})?
              All linked deployed personnel records ({deletingSupplier.deployedWorkersCount} workers) will also be demobilized.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteManpowerSupplier(deletingSupplier.id);
                  showToast(`Deleted supplier "${deletingSupplier.name}".`);
                  setDeletingSupplier(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Demobilize Worker?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove outsourced worker <strong>{deletingWorker.fullName}</strong> ({deletingWorker.trade})
              supplied by <strong>{deletingWorker.supplierName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletingWorker(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSuppliedWorker(deletingWorker.id);
                  showToast(`Demobilized worker "${deletingWorker.fullName}".`);
                  setDeletingWorker(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingPOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Cancel / Delete Purchase Order?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove Purchase Order <strong>{deletingPOS.posNumber}</strong> issued to{' '}
              <strong>{deletingPOS.supplierName}</strong> ({deletingPOS.grandTotalSAR.toLocaleString()} {baseCurrency})?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletingPOS(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteManpowerPOS(deletingPOS.id);
                  showToast(`Deleted POS Order "${deletingPOS.posNumber}".`);
                  setDeletingPOS(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
