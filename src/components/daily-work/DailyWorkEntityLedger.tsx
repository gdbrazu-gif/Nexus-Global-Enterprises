import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Villa,
  VillaDailyWorkEntity,
  Project,
  Employee,
  CorporateLegalEntity,
} from '../../types';
import {
  downloadDailyWorkEntityPDF,
  downloadDailyWorkLedgerPDF,
  downloadDailyWorkEntityBlankPDF,
  downloadDailyWorkVillaTotalsPDF,
} from '../../utils/pdfGenerator';
import {
  HardHat,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Download,
  Printer,
  Plus,
  Users,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  FileText,
  MapPin,
  Wrench,
  Sun,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Paintbrush,
  Ruler,
  CalendarDays,
  Zap,
} from 'lucide-react';

export const PRESET_WORK_FIELDS = [
  'Primer Paint',
  'Putty 1st',
  'Putty 2st',
  'Paint 1st',
  'Paint Final',
] as const;

export const getWorkFieldBadge = (field?: string) => {
  const norm = (field || '').toLowerCase();
  if (norm.includes('primer')) {
    return 'bg-sky-50 text-sky-800 border-sky-300';
  }
  if (norm.includes('putty 1')) {
    return 'bg-amber-50 text-amber-800 border-amber-300';
  }
  if (norm.includes('putty 2') || norm.includes('putty 2st')) {
    return 'bg-purple-50 text-purple-800 border-purple-300';
  }
  if (norm.includes('paint 1')) {
    return 'bg-blue-50 text-blue-800 border-blue-300';
  }
  if (norm.includes('final') || norm.includes('silk')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  }
  return 'bg-slate-100 text-slate-800 border-slate-300';
};

export const formatMonthLabel = (monthYear: string) => {
  if (!monthYear || monthYear.length < 7) return monthYear;
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

interface EnrichedDailyWorkItem {
  entity: VillaDailyWorkEntity;
  villa: Villa;
  project?: Project;
  siteName: string;
  blockNo: string;
  villaNo: string;
  villaType: string;
  workField: string;
  metersWork: number;
  workProgress: number;
  monthYear: string; // e.g. "2026-11"
  dailyVillaEntityCount: number; // total entities for this villa on this day
  isMultiEntityDay: boolean; // whether this villa has > 1 entity on this day
}

interface DailyVillaSummaryRow {
  groupKey: string;
  date: string;
  monthYear: string;
  villa: Villa;
  villaId: string;
  villaNo: string;
  blockNo: string;
  villaType: string;
  siteName: string;
  entityCount: number; // Count of Total Work Entities for this villa on this day
  totalMetersWork: number; // Sum of meters completed for this villa on this day
  totalWorkers: number; // Sum of deployed personnel
  uniquePersonnelCount: number; // Headcount of unique assigned workers
  uniquePersonnelList: Array<{ id: string; name: string; role?: string }>;
  avgProgress: number;
  fieldBreakdown: Array<{ field: string; count: number; meters: number }>;
  items: EnrichedDailyWorkItem[];
}

interface MonthlyVillaSummaryRow {
  groupKey: string;
  monthYear: string;
  monthLabel: string;
  villa: Villa;
  villaId: string;
  villaNo: string;
  blockNo: string;
  villaType: string;
  siteName: string;
  entityCount: number; // Total Work Entities in this month
  totalMetersWork: number; // Sum of meters completed for this villa in this month
  totalManDays: number; // Sum of workers deployed across daily entities in this month
  uniquePersonnelCount: number; // Headcount of unique assigned workers in this month
  uniquePersonnelList: Array<{ id: string; name: string; role?: string }>;
  activeDaysCount: number; // Distinct days worked on this villa in this month
  avgWorkersPerDay: number;
  avgProgress: number;
  fieldBreakdown: Array<{ field: string; count: number; meters: number }>;
  items: EnrichedDailyWorkItem[];
}

export const DailyWorkEntityLedger: React.FC = () => {
  const {
    villas,
    projects,
    employees,
    corporateEntity,
    baseCurrency,
    addVillaDailyWorkEntity,
    addMultipleVillaDailyWorkEntities,
    updateVillaDailyWorkEntity,
    deleteVillaDailyWorkEntity,
  } = useHRMS();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [selectedVillaType, setSelectedVillaType] = useState('ALL');
  const [selectedWorkField, setSelectedWorkField] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // View Mode: Detailed Ledger View vs. Villa-by-Villa Daily Totals vs. Villa-by-Villa Monthly Totals
  const [ledgerViewMode, setLedgerViewMode] = useState<
    'detailed' | 'villa_daily_summary' | 'villa_monthly_summary'
  >('detailed');

  // Expanded group rows in aggregation views
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Modals state
  const [viewingItem, setViewingItem] = useState<EnrichedDailyWorkItem | null>(null);
  const [editingItem, setEditingItem] = useState<{
    isEdit: boolean;
    villaId: string;
    entity: Partial<VillaDailyWorkEntity>;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    villaId: string;
    entityId: string;
    label: string;
  } | null>(null);

  // Compute daily count map to flag multiple entities per villa per day
  const dailyVillaCountMap = useMemo(() => {
    const map = new Map<string, number>();
    villas.forEach((v) => {
      (v.dailyWorkEntities || []).forEach((ent) => {
        const key = `${ent.date}_${v.id}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return map;
  }, [villas]);

  // Flatten and enrich daily work entities across all villas
  const allItems: EnrichedDailyWorkItem[] = useMemo(() => {
    const list: EnrichedDailyWorkItem[] = [];

    villas.forEach((v) => {
      const proj = projects.find((p) => p.id === v.projectId);
      const site = proj?.name || v.projectName || 'Active Contracting Site';
      const entities = v.dailyWorkEntities || [];

      entities.forEach((ent) => {
        const progress = ent.workProgress !== undefined
          ? ent.workProgress
          : (ent.status === 'completed' ? 100 : (ent.status === 'delayed' ? 35 : 65));

        const field = ent.workField || 'Primer Paint';
        const meters = ent.metersWork !== undefined ? ent.metersWork : 0;
        const monthYear = ent.date ? ent.date.substring(0, 7) : '2026-11';
        const dailyCount = dailyVillaCountMap.get(`${ent.date}_${v.id}`) || 1;

        list.push({
          entity: ent,
          villa: v,
          project: proj,
          siteName: site,
          blockNo: v.blockNo,
          villaNo: v.villaNo,
          villaType: v.villaType,
          workField: field,
          metersWork: meters,
          workProgress: progress,
          monthYear,
          dailyVillaEntityCount: dailyCount,
          isMultiEntityDay: dailyCount > 1,
        });
      });
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.entity.date).getTime() - new Date(a.entity.date).getTime());
  }, [villas, projects, dailyVillaCountMap]);

  // Unique Blocks, Villa Types, Work Fields & Months for Filter Dropdowns
  const distinctBlocks = useMemo(() => {
    const set = new Set<string>();
    villas.forEach((v) => {
      if (v.blockNo) set.add(v.blockNo);
    });
    return Array.from(set).sort();
  }, [villas]);

  const distinctVillaTypes = useMemo(() => {
    const set = new Set<string>();
    villas.forEach((v) => {
      if (v.villaType) set.add(v.villaType);
    });
    return Array.from(set).sort();
  }, [villas]);

  const distinctWorkFields = useMemo(() => {
    const set = new Set<string>(['Primer Paint', 'Putty 1st', 'Putty 2st', 'Paint 1st', 'Paint Final']);
    allItems.forEach((it) => {
      if (it.workField) set.add(it.workField);
    });
    return Array.from(set);
  }, [allItems]);

  const distinctMonths = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((it) => {
      if (it.monthYear) set.add(it.monthYear);
    });
    return Array.from(set).sort().reverse();
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = [
          item.villaNo,
          item.blockNo,
          item.siteName,
          item.villaType,
          item.workField,
          `${item.metersWork}m2`,
          `${item.metersWork} meters`,
          item.entity.id,
          item.entity.workStage,
          item.entity.taskSummary,
          item.entity.supervisorName,
          item.entity.notes,
          item.entity.equipmentUsed,
          ...(item.entity.assignedEmployees?.map((e) => e.employeeName) || []),
        ].filter(Boolean).join(' ').toLowerCase();

        if (!matchText.includes(q)) return false;
      }

      // Block filter
      if (selectedBlock !== 'ALL' && item.blockNo !== selectedBlock) {
        return false;
      }

      // Villa Type filter
      if (selectedVillaType !== 'ALL' && item.villaType !== selectedVillaType) {
        return false;
      }

      // Work Field filter
      if (selectedWorkField !== 'ALL' && item.workField !== selectedWorkField) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'ALL' && item.monthYear !== selectedMonth) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && item.entity.status !== selectedStatus) {
        return false;
      }

      // Date filter
      if (selectedDate && item.entity.date !== selectedDate) {
        return false;
      }

      return true;
    });
  }, [allItems, searchQuery, selectedBlock, selectedVillaType, selectedWorkField, selectedMonth, selectedStatus, selectedDate]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    const totalEntities = allItems.length;
    const totalMetersWork = allItems.reduce((acc, it) => acc + (it.metersWork || 0), 0);
    const totalWorkforceToday = allItems.reduce((acc, it) => acc + (it.entity.employeeCount || 0), 0);
    const avgProgress = totalEntities > 0
      ? Math.round(allItems.reduce((acc, it) => acc + it.workProgress, 0) / totalEntities)
      : 0;

    const uniqueUnits = new Set(allItems.map((it) => it.villa.id)).size;

    // Unique personnel deployed
    const personnelIds = new Set<string>();
    allItems.forEach((it) => {
      it.entity.assignedEmployees?.forEach((emp) => personnelIds.add(emp.employeeId));
    });

    return {
      totalEntities,
      totalMetersWork,
      totalWorkforceToday,
      uniquePersonnelHeadcount: personnelIds.size,
      avgProgress,
      uniqueUnits,
    };
  }, [allItems]);

  // ========================================================
  // AGGREGATION 1: VILLA-BY-VILLA DAILY TOTALS
  // "count Total work Entity to Villa by Villa Every day" & "count personnel Villa-by-Villa"
  // ========================================================
  const villaDailySummaries: DailyVillaSummaryRow[] = useMemo(() => {
    const groupMap = new Map<string, DailyVillaSummaryRow>();

    filteredItems.forEach((item) => {
      const key = `${item.entity.date}_${item.villa.id}`;
      const fieldName = item.workField || 'Primer Paint';
      const meters = item.metersWork || 0;
      const workers = item.entity.employeeCount || 0;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupKey: key,
          date: item.entity.date,
          monthYear: item.monthYear,
          villa: item.villa,
          villaId: item.villa.id,
          villaNo: item.villaNo,
          blockNo: item.blockNo,
          villaType: item.villaType,
          siteName: item.siteName,
          entityCount: 0,
          totalMetersWork: 0,
          totalWorkers: 0,
          uniquePersonnelCount: 0,
          uniquePersonnelList: [],
          avgProgress: 0,
          fieldBreakdown: [],
          items: [],
        });
      }

      const grp = groupMap.get(key)!;
      grp.entityCount += 1;
      grp.totalMetersWork += meters;
      grp.totalWorkers += workers;
      grp.items.push(item);

      const existingField = grp.fieldBreakdown.find((f) => f.field === fieldName);
      if (existingField) {
        existingField.count += 1;
        existingField.meters += meters;
      } else {
        grp.fieldBreakdown.push({ field: fieldName, count: 1, meters });
      }
    });

    return Array.from(groupMap.values())
      .map((grp) => {
        // Collect unique assigned personnel
        const personnelMap = new Map<string, { id: string; name: string; role?: string }>();
        grp.items.forEach((it) => {
          it.entity.assignedEmployees?.forEach((emp) => {
            personnelMap.set(emp.employeeId, {
              id: emp.employeeId,
              name: emp.employeeName,
              role: emp.role,
            });
          });
        });
        const uniquePersonnelList = Array.from(personnelMap.values());

        return {
          ...grp,
          uniquePersonnelCount: uniquePersonnelList.length,
          uniquePersonnelList,
          avgProgress: grp.items.length > 0
            ? Math.round(grp.items.reduce((acc, it) => acc + it.workProgress, 0) / grp.items.length)
            : 0,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredItems]);

  // ========================================================
  // AGGREGATION 2: VILLA-BY-VILLA MONTHLY TOTALS
  // "Villa-by-Villa Daily Totals/ Monthly Totals, count personnel Villa-by-Villa"
  // ========================================================
  const villaMonthlySummaries: MonthlyVillaSummaryRow[] = useMemo(() => {
    const groupMap = new Map<string, MonthlyVillaSummaryRow>();

    filteredItems.forEach((item) => {
      const monthYear = item.monthYear;
      const key = `${monthYear}_${item.villa.id}`;
      const fieldName = item.workField || 'Primer Paint';
      const meters = item.metersWork || 0;
      const workers = item.entity.employeeCount || 0;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupKey: key,
          monthYear,
          monthLabel: formatMonthLabel(monthYear),
          villa: item.villa,
          villaId: item.villa.id,
          villaNo: item.villaNo,
          blockNo: item.blockNo,
          villaType: item.villaType,
          siteName: item.siteName,
          entityCount: 0,
          totalMetersWork: 0,
          totalManDays: 0,
          uniquePersonnelCount: 0,
          uniquePersonnelList: [],
          activeDaysCount: 0,
          avgWorkersPerDay: 0,
          avgProgress: 0,
          fieldBreakdown: [],
          items: [],
        });
      }

      const grp = groupMap.get(key)!;
      grp.entityCount += 1;
      grp.totalMetersWork += meters;
      grp.totalManDays += workers;
      grp.items.push(item);

      const existingField = grp.fieldBreakdown.find((f) => f.field === fieldName);
      if (existingField) {
        existingField.count += 1;
        existingField.meters += meters;
      } else {
        grp.fieldBreakdown.push({ field: fieldName, count: 1, meters });
      }
    });

    return Array.from(groupMap.values())
      .map((grp) => {
        // Unique execution dates worked in month
        const uniqueDates = new Set(grp.items.map((it) => it.entity.date));
        const activeDaysCount = uniqueDates.size;
        const avgWorkersPerDay = activeDaysCount > 0 ? Math.round(grp.totalManDays / activeDaysCount) : 0;

        // Unique personnel list across the whole month
        const personnelMap = new Map<string, { id: string; name: string; role?: string }>();
        grp.items.forEach((it) => {
          it.entity.assignedEmployees?.forEach((emp) => {
            personnelMap.set(emp.employeeId, {
              id: emp.employeeId,
              name: emp.employeeName,
              role: emp.role,
            });
          });
        });
        const uniquePersonnelList = Array.from(personnelMap.values());

        const avgProgress = grp.items.length > 0
          ? Math.round(grp.items.reduce((acc, it) => acc + it.workProgress, 0) / grp.items.length)
          : 0;

        return {
          ...grp,
          activeDaysCount,
          avgWorkersPerDay,
          uniquePersonnelCount: uniquePersonnelList.length,
          uniquePersonnelList,
          avgProgress,
        };
      })
      .sort((a, b) => b.monthYear.localeCompare(a.monthYear));
  }, [filteredItems]);

  // Handle Export View-Specific PDF
  const handleExportPDF = () => {
    if (ledgerViewMode === 'detailed') {
      const exportData = filteredItems.map((it) => ({
        entity: it.entity,
        villa: it.villa,
        project: it.project,
      }));
      downloadDailyWorkLedgerPDF(exportData, corporateEntity, baseCurrency);
    } else if (ledgerViewMode === 'villa_daily_summary') {
      const rows = villaDailySummaries.map((s) => ({
        period: s.date,
        villaNo: s.villaNo,
        siteName: s.siteName,
        blockNo: s.blockNo,
        villaType: s.villaType,
        entityCount: s.entityCount,
        totalMetersWork: s.totalMetersWork,
        totalPersonnel: s.totalWorkers,
        uniquePersonnelCount: s.uniquePersonnelCount,
        workFieldsSummary: s.fieldBreakdown.map((f) => `${f.field}: ${f.meters}m²`).join(', '),
        avgProgress: s.avgProgress,
      }));
      downloadDailyWorkVillaTotalsPDF('daily', rows, corporateEntity, baseCurrency);
    } else {
      const rows = villaMonthlySummaries.map((s) => ({
        period: s.monthLabel,
        villaNo: s.villaNo,
        siteName: s.siteName,
        blockNo: s.blockNo,
        villaType: s.villaType,
        entityCount: s.entityCount,
        totalMetersWork: s.totalMetersWork,
        totalPersonnel: s.totalManDays,
        uniquePersonnelCount: s.uniquePersonnelCount,
        workFieldsSummary: s.fieldBreakdown.map((f) => `${f.field}: ${f.meters}m²`).join(', '),
        avgProgress: s.avgProgress,
      }));
      downloadDailyWorkVillaTotalsPDF('monthly', rows, corporateEntity, baseCurrency);
    }
  };

  // Dedicated Handle Export Monthly Totals PDF
  const handleExportMonthlyTotalsPDF = () => {
    const rows = villaMonthlySummaries.map((s) => ({
      period: s.monthLabel,
      villaNo: s.villaNo,
      siteName: s.siteName,
      blockNo: s.blockNo,
      villaType: s.villaType,
      entityCount: s.entityCount,
      totalMetersWork: s.totalMetersWork,
      totalPersonnel: s.totalManDays,
      uniquePersonnelCount: s.uniquePersonnelCount,
      workFieldsSummary: s.fieldBreakdown.map((f) => `${f.field}: ${f.meters}m²`).join(', '),
      avgProgress: s.avgProgress,
    }));
    downloadDailyWorkVillaTotalsPDF('monthly', rows, corporateEntity, baseCurrency);
  };

  // Handle Download Blank Field PDF
  const handleDownloadBlankPDF = (villa?: Villa, project?: Project) => {
    downloadDailyWorkEntityBlankPDF(corporateEntity, baseCurrency, {
      villa,
      project,
    });
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultVilla = villas[0];
    setEditingItem({
      isEdit: false,
      villaId: defaultVilla ? defaultVilla.id : '',
      entity: {
        date: new Date().toISOString().substring(0, 10),
        workField: 'Primer Paint',
        metersWork: 150,
        workStage: 'Interior Finishing — Primer Paint',
        taskSummary: 'Application of high-penetration primer paint across interior walls and majlis ceiling.',
        employeeCount: 8,
        supervisorName: 'Eng. Mansour Al-Otaibi',
        workingHours: 8,
        equipmentUsed: 'Airless Sprayers, Laser Levels, Scaffolding',
        weatherCondition: 'Clear 30°C',
        workProgress: 60,
        status: 'in_progress',
        notes: '',
        assignedEmployees: [],
      },
    });
  };

  // Open Quick Add Daily Entity for a specific Villa and Date
  const handleQuickAddDailyEntity = (villaId: string, date: string) => {
    setEditingItem({
      isEdit: false,
      villaId,
      entity: {
        date,
        workField: 'Putty 1st',
        metersWork: 120,
        workStage: 'Interior Finishing — Putty 1st',
        taskSummary: 'Concurrent secondary trade execution for this villa.',
        employeeCount: 6,
        supervisorName: 'Eng. Mansour Al-Otaibi',
        workingHours: 8,
        equipmentUsed: 'Putty Knives, Scaffolding, Sanding Blocks',
        weatherCondition: 'Clear 30°C',
        workProgress: 45,
        status: 'in_progress',
        notes: 'Simultaneous trade logged for daily multi-entity execution.',
        assignedEmployees: [],
      },
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: EnrichedDailyWorkItem) => {
    setEditingItem({
      isEdit: true,
      villaId: item.villa.id,
      entity: { ...item.entity },
    });
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deleteVillaDailyWorkEntity(itemToDelete.villaId, itemToDelete.entityId);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <HardHat className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Daily Work Entity Data
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {filteredItems.length} Entities
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Work Field Trades, Meters Work, Villa-by-Villa Daily &amp; Monthly Totals, Personnel Headcount &amp; Multi-Entity Execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Blank PDF Action Button */}
          <button
            onClick={() => handleDownloadBlankPDF()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Download Printable Blank Daily Work Entity Field Form (PDF)"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Blank</span>
          </button>

          {/* 2. Dedicated Export Monthly Totals PDF Button 
          
          <button
            onClick={handleExportMonthlyTotalsPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-950 shadow-xs hover:bg-indigo-100 transition-colors cursor-pointer"
            title="Export Official Villa-by-Villa Monthly Totals PDF Report with Signatures & Borders"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Monthly Totals</span>
          </button>

          */}
          

          {/* 3. Export Active View PDF */}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Export Current View PDF Report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>
              {ledgerViewMode === 'detailed'
                ? 'Ledger PDF'
                : ledgerViewMode === 'villa_daily_summary'
                ? 'Daily Totals'
                : 'Monthly Totals'}
            </span>
          </button>

          {/* 4. Log Daily Work Entity Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Daily Work Entity</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards (5 Strategic Metrics including Personnel Count Villa-by-Villa) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Work Entities</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {metrics.totalEntities}
            </span>
            <span className="text-xs text-slate-500">logged records</span>
          </div>
        </div>

        {/* Total Meters Work */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Total Meters Work</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Ruler className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-blue-900 font-mono">
              {metrics.totalMetersWork.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-700 font-mono">m²</span>
          </div>
          <div className="text-[10.5px] text-blue-600 mt-0.5 truncate">
            Across active painting &amp; finishing trades
          </div>
        </div>

        {/* Personnel Count Villa-by-Villa */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950">Personnel Deployed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {metrics.totalWorkforceToday}
            </span>
            <span className="text-xs text-indigo-700 font-medium">total man-shifts</span>
          </div>
          <div className="text-[10.5px] text-indigo-600 mt-0.5 truncate font-medium">
            {metrics.uniquePersonnelHeadcount} assigned individual technicians
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Work Units</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {metrics.uniqueUnits}
            </span>
            <span className="text-xs text-slate-500">distinct villas</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Average Progress</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {metrics.avgProgress}%
            </span>
            <div className="flex-1 max-w-[80px] h-2 bg-slate-100 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${metrics.avgProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar with Work Field Dropdown & Month Dropdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search bar */}
          <div className="lg:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search site, villa, work field, meters..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Work Field filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedWorkField}
              onChange={(e) => setSelectedWorkField(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/30 py-1.5 px-2.5 text-xs font-semibold text-blue-900 focus:border-blue-900 focus:outline-hidden"
            >
              <option value="ALL">All Work Fields</option>
              {distinctWorkFields.map((wf) => (
                <option key={wf} value={wf}>{wf}</option>
              ))}
            </select>
          </div>

          {/* Month filter (NEW) */}
          <div className="lg:col-span-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 py-1.5 px-2.5 text-xs font-semibold text-indigo-900 focus:border-indigo-900 focus:outline-hidden"
            >
              <option value="ALL">All Months</option>
              {distinctMonths.map((m) => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Block filter */}
          <div className="lg:col-span-1.5">
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-slate-900 focus:outline-hidden"
            >
              <option value="ALL">All Blocks</option>
              {distinctBlocks.map((blk) => (
                <option key={blk} value={blk}>{blk}</option>
              ))}
            </select>
          </div>

          {/* Villa Type filter */}
          <div className="lg:col-span-1.5">
            <select
              value={selectedVillaType}
              onChange={(e) => setSelectedVillaType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-slate-900 focus:outline-hidden"
            >
              <option value="ALL">All Types</option>
              {distinctVillaTypes.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="lg:col-span-1">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-hidden"
            >
              <option value="ALL">Status</option>
              <option value="in_progress">In Prog.</option>
              <option value="completed">Done</option>
              <option value="pending_inspection">Pending</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="lg:col-span-1 flex items-center gap-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-1 text-xs text-slate-700 focus:border-slate-900 focus:outline-hidden font-mono"
              title="Filter by Log Date"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                title="Clear date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Switcher: Detailed Ledger vs. Villa-by-Villa Daily Totals vs. Villa-by-Villa Monthly Totals */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLedgerViewMode('detailed')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              ledgerViewMode === 'detailed'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Daily Entity</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-700">
              {filteredItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLedgerViewMode('villa_daily_summary')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              ledgerViewMode === 'villa_daily_summary'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Villa Daily</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              ledgerViewMode === 'villa_daily_summary' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {villaDailySummaries.length} Villa-Days
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLedgerViewMode('villa_monthly_summary')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              ledgerViewMode === 'villa_monthly_summary'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-indigo-300" />
            <span>Villa Monthly</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              ledgerViewMode === 'villa_monthly_summary' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {villaMonthlySummaries.length} Villa-Months
            </span>
          </button>
        </div>

        {/* Live Aggregation Pill */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 px-2 font-mono">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <strong>{filteredItems.length}</strong> Entities
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-blue-700 font-bold">
            <Ruler className="h-3.5 w-3.5" />
            <span>{filteredItems.reduce((acc, it) => acc + (it.metersWork || 0), 0).toLocaleString()} m²</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-indigo-700 font-bold">
            <Users className="h-3.5 w-3.5" />
            <span>{filteredItems.reduce((acc, it) => acc + (it.entity.employeeCount || 0), 0)}</span> Workers
          </span>
        </div>
      </div>

      {/* ========================================================
          MODE 1: DETAILED LEDGER VIEW (INDIVIDUAL ENTITY ROWS)
          ======================================================== */}
      {ledgerViewMode === 'detailed' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date &amp; Shift</th>
                  <th className="py-3 px-4">Site &amp; Work Unit</th>
                  <th className="py-3 px-4">Block No. &amp; Villa Type</th>
                  <th className="py-3 px-4">Work Field &amp; Meters</th>
                  <th className="py-3 px-4">Daily Assigned Workforce</th>
                  <th className="py-3 px-4">Work Stage &amp; Task</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <HardHat className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No Daily Work Entities found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery || selectedBlock !== 'ALL' || selectedWorkField !== 'ALL' || selectedStatus !== 'ALL' || selectedDate || selectedMonth !== 'ALL'
                          ? 'Try clearing active filters to view all logged site activities.'
                          : 'Click "Log Daily Work Entity" to record workforce execution for a villa.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const ent = item.entity;
                    const statusColors: Record<string, string> = {
                      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
                      pending_inspection: 'bg-amber-50 text-amber-700 border-amber-200',
                      delayed: 'bg-rose-50 text-rose-700 border-rose-200',
                    };

                    const assignedList = ent.assignedEmployees || [];
                    const previewNames = assignedList.slice(0, 2).map((a) => a.employeeName).join(', ');
                    const remainingCount = assignedList.length > 2 ? assignedList.length - 2 : 0;

                    return (
                      <tr
                        key={ent.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Date & Shift */}
                        <td className="py-3 px-4 whitespace-nowrap align-top">
                          <div className="font-semibold text-slate-900">{ent.date}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <Clock3 className="h-3 w-3 text-slate-400" />
                            <span>{ent.workingHours || 10}h Shift</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            {ent.id}
                          </span>
                        </td>

                        {/* Site & Work Unit */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-800">
                              {item.villaNo}
                            </span>
                            {/* Multi-Entity Flag on this date */}
                            {item.isMultiEntityDay && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9.5px] font-bold text-indigo-700 font-mono"
                                title={`This villa has ${item.dailyVillaEntityCount} entities logged on ${ent.date}`}
                              >
                                <Zap className="h-2.5 w-2.5 text-indigo-600" />
                                <span>Multi-Entity</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1" title={item.siteName}>
                            {item.siteName}
                          </div>
                        </td>

                        {/* Block No. & Villa Type */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <span className="text-slate-900 font-semibold">{item.blockNo}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>{item.villaType}</span>
                            {item.villa.customVilla && (
                              <span className="rounded-xs bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                                CUSTOM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Work Field & Meters Work */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border shadow-2xs w-fit ${getWorkFieldBadge(item.workField)}`}>
                              <Paintbrush className="h-3 w-3" />
                              <span>{item.workField}</span>
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[11.5px] font-bold text-slate-900 mt-0.5">
                              <Ruler className="h-3 w-3 text-blue-600" />
                              <span>{item.metersWork.toLocaleString()} m²</span>
                            </div>
                          </div>
                        </td>

                        {/* Daily Assigned Employee & Personnel Count */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 font-mono">
                              <Users className="h-3 w-3 text-slate-500" />
                              <span>{ent.employeeCount} Personnel</span>
                            </span>
                          </div>
                          {previewNames ? (
                            <div className="text-[11px] text-slate-600 mt-1 line-clamp-1" title={assignedList.map((e) => e.employeeName).join(', ')}>
                              {previewNames}
                              {remainingCount > 0 && <span className="text-slate-400 font-semibold"> +{remainingCount} more</span>}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 mt-1">
                              Supervisor: {ent.supervisorName || 'Site Engineer'}
                            </div>
                          )}
                        </td>

                        {/* Work Stage & Task */}
                        <td className="py-3 px-4 align-top max-w-xs">
                          <div className="font-semibold text-slate-900 line-clamp-1" title={ent.workStage}>
                            {ent.workStage}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2" title={ent.taskSummary}>
                            {ent.taskSummary || 'Daily operations carried out per structural plan.'}
                          </div>
                        </td>

                        {/* Work Progress */}
                        <td className="py-3 px-4 align-top whitespace-nowrap min-w-[125px]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900">{item.workProgress}%</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColors[ent.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                              {ent.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.workProgress === 100
                                  ? 'bg-emerald-500'
                                  : item.entity.status === 'delayed'
                                  ? 'bg-rose-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, item.workProgress))}%` }}
                            />
                          </div>
                        </td>

                        {/* Actions: ONLY ICONS: View, Edit, PDF, Delete */}
                        <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              title="View Work Entity Dossier"
                              aria-label="View Work Entity Dossier"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Work Entity"
                              aria-label="Edit Work Entity"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() =>
                                downloadDailyWorkEntityPDF(
                                  item.entity,
                                  item.villa,
                                  corporateEntity,
                                  baseCurrency,
                                  item.siteName
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Download PDF Progress Certificate"
                              aria-label="Download PDF Progress Certificate"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() =>
                                setItemToDelete({
                                  villaId: item.villa.id,
                                  entityId: item.entity.id,
                                  label: `${item.villaNo} · ${item.workField} (${item.metersWork}m² on ${item.entity.date})`,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Work Entity"
                              aria-label="Delete Work Entity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      {/* ========================================================
          MODE 2: VILLA BY VILLA DAILY TOTALS (AGGREGATION VIEW)
          "count Total work Entity to Villa by Villa Every day, count personnel Villa-by-Villa, Daily multiple Entity Villa-by-Villa"
          ======================================================== */}
      {ledgerViewMode === 'villa_daily_summary' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Daily Villa Work Entity &amp; Personnel Aggregation</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated summary counting daily entities, meters executed, and total deployed workforce Villa-by-Villa.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold">
              <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1">
                {villaDailySummaries.length} Villa-Days Aggregated
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Execution Date</th>
                  <th className="py-3 px-4">Work Unit (Villa)</th>
                  <th className="py-3 px-4">Block &amp; Type</th>
                  <th className="py-3 px-4 text-center">Total Work Entities</th>
                  <th className="py-3 px-4">Total Meters Work</th>
                  <th className="py-3 px-4">Work Fields Breakdown</th>
                  <th className="py-3 px-4">Personnel Count (Villa-by-Villa)</th>
                  <th className="py-3 px-4">Avg Progress</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {villaDailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No Villa-Day Aggregations found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Log daily work entities with meters work to view villa-by-villa daily totals.
                      </p>
                    </td>
                  </tr>
                ) : (
                  villaDailySummaries.map((summary) => {
                    const isExpanded = expandedGroupKeys.has(summary.groupKey);
                    const hasMultiple = summary.entityCount > 1;

                    return (
                      <React.Fragment key={summary.groupKey}>
                        <tr className="hover:bg-slate-50/70 transition-colors group">
                          {/* Execution Date */}
                          <td className="py-3 px-4 whitespace-nowrap align-top">
                            <div className="font-bold text-slate-900 font-mono">{summary.date}</div>
                            <span className="text-[10.5px] text-slate-400">Daily Execution</span>
                          </td>

                          {/* Work Unit (Villa) */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-xs font-bold">
                                {summary.villaNo}
                              </span>
                              {hasMultiple && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9.5px] font-bold text-indigo-700 font-mono">
                                  <Zap className="h-2.5 w-2.5 text-indigo-600" />
                                  <span>{summary.entityCount} Trades</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 truncate" title={summary.siteName}>
                              {summary.siteName}
                            </div>
                          </td>

                          {/* Block & Type */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-800">{summary.blockNo}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{summary.villaType}</div>
                          </td>

                          {/* Count Total Work Entities for this Villa on this Day */}
                          <td className="py-3 px-4 align-top text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold font-mono shadow-2xs border ${
                                hasMultiple
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}>
                                <CheckCircle2 className={`h-3.5 w-3.5 ${hasMultiple ? 'text-indigo-600' : 'text-emerald-600'}`} />
                                <span>{summary.entityCount} {summary.entityCount === 1 ? 'Entity' : 'Entities'}</span>
                              </span>
                              {hasMultiple && (
                                <span className="text-[10px] text-indigo-600 font-semibold">
                                  Multiple Trades Logged
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Meters Work */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1 font-mono font-black text-sm text-blue-900">
                              <Ruler className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>{summary.totalMetersWork.toLocaleString()} m²</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Completed today on villa
                            </div>
                          </td>

                          {/* Work Fields Breakdown */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              {summary.fieldBreakdown.map((fb, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold border shadow-2xs ${getWorkFieldBadge(fb.field)}`}
                                >
                                  <span>{fb.field}:</span>
                                  <strong className="font-mono">{fb.meters} m²</strong>
                                  {fb.count > 1 && <span className="opacity-75">({fb.count}x)</span>}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Personnel Count (Villa-by-Villa) */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-900 font-mono">
                                <Users className="h-3 w-3 text-indigo-600" />
                                <span>{summary.totalWorkers} Personnel</span>
                              </span>
                            </div>
                            {summary.uniquePersonnelCount > 0 ? (
                              <div className="text-[10.5px] text-slate-500 mt-1 line-clamp-1" title={summary.uniquePersonnelList.map((p) => p.name).join(', ')}>
                                {summary.uniquePersonnelList.slice(0, 2).map((p) => p.name).join(', ')}
                                {summary.uniquePersonnelCount > 2 && ` +${summary.uniquePersonnelCount - 2} more`}
                              </div>
                            ) : (
                              <div className="text-[10.5px] text-slate-400 mt-1">
                                Deployed site team
                              </div>
                            )}
                          </td>

                          {/* Avg Progress */}
                          <td className="py-3 px-4 align-top whitespace-nowrap min-w-[110px]">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-slate-900">{summary.avgProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${summary.avgProgress}%` }}
                              />
                            </div>
                          </td>

                          {/* Actions: ONLY ICONS: Expand/Collapse, Quick Add Entity, View */}
                          <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1">
                              {/* Quick Add Daily Entity for this Villa & Date */}
                              <button
                                onClick={() => handleQuickAddDailyEntity(summary.villaId, summary.date)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Log Another Daily Work Entity for this Villa on this Date"
                                aria-label="Log Another Daily Work Entity for this Villa"
                              >
                                <Plus className="h-4 w-4" />
                              </button>

                              {/* Inspect First Entity */}
                              {summary.items[0] && (
                                <button
                                  onClick={() => setViewingItem(summary.items[0])}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="View Work Entity Dossier"
                                  aria-label="View Work Entity Dossier"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}

                              {/* Expand / Collapse Multiple Entities Sub-Rows */}
                              <button
                                onClick={() => toggleGroupExpand(summary.groupKey)}
                                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                  isExpanded ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                                title={isExpanded ? 'Collapse Daily Entities' : 'Expand Multiple Daily Entities'}
                                aria-label={isExpanded ? 'Collapse Daily Entities' : 'Expand Multiple Daily Entities'}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED SUB-TABLE: Nested Daily Entities for this Villa on this Date */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-slate-200">
                            <td colSpan={9} className="p-3 pl-8">
                              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                                  <span className="flex items-center gap-1.5">
                                    <Zap className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Individual Work Entities Logged for {summary.villaNo} on {summary.date} ({summary.items.length})</span>
                                  </span>
                                  <button
                                    onClick={() => handleQuickAddDailyEntity(summary.villaId, summary.date)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Entity to This Villa</span>
                                  </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {summary.items.map((it) => (
                                    <div key={it.entity.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${getWorkFieldBadge(it.workField)}`}>
                                          <Paintbrush className="h-3 w-3" />
                                          <span>{it.workField}</span>
                                        </span>
                                        <span className="font-mono font-bold text-blue-900">{it.metersWork} m²</span>
                                        <span className="text-slate-600 font-medium">{it.entity.workStage}</span>
                                        <span className="text-slate-400 font-mono text-[11px]">({it.entity.id})</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-mono">{it.entity.employeeCount} Workers · {it.entity.workingHours || 8}h</span>
                                        <span className="font-bold text-slate-900">{it.workProgress}% Done</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => setViewingItem(it)}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                                            title="View Dossier"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenEditModal(it)}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                                            title="Edit Entity"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 3: VILLA BY VILLA MONTHLY TOTALS (MONTHLY AGGREGATION)
          "Villa-by-Villa Daily Totals/ Monthly Totals, count personnel Villa-by-Villa"
          ======================================================== */}
      {ledgerViewMode === 'villa_monthly_summary' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                <span>Monthly Villa Work Entity &amp; Personnel Totals</span>
              </h3>
              <p className="text-xs text-indigo-700/80 mt-0.5">
                Monthly aggregated performance tracking total entities, cumulative meters executed, and monthly workforce headcount Villa-by-Villa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold">
              <span className="rounded-lg bg-indigo-100 text-indigo-900 px-2.5 py-1">
                {villaMonthlySummaries.length} Villa-Months Tracked
              </span>
              <button
                onClick={handleExportMonthlyTotalsPDF}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-800 transition-colors cursor-pointer"
                title="Export Official Villa-by-Villa Monthly Totals PDF Audit Report"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Monthly Totals</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Month Period</th>
                  <th className="py-3 px-4">Work Unit (Villa)</th>
                  <th className="py-3 px-4">Block &amp; Type</th>
                  <th className="py-3 px-4 text-center">Total Work Entities</th>
                  <th className="py-3 px-4">Total Meters Work (m²)</th>
                  <th className="py-3 px-4">Monthly Work Fields Breakdown</th>
                  <th className="py-3 px-4">Monthly Personnel (Villa-by-Villa)</th>
                  <th className="py-3 px-4">Avg Progress</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {villaMonthlySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <CalendarDays className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No Villa Monthly Totals found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Log daily work entities across calendar months to view monthly villa totals.
                      </p>
                    </td>
                  </tr>
                ) : (
                  villaMonthlySummaries.map((summary) => {
                    const isExpanded = expandedGroupKeys.has(summary.groupKey);

                    return (
                      <React.Fragment key={summary.groupKey}>
                        <tr className="hover:bg-slate-50/70 transition-colors group">
                          {/* Month Period */}
                          <td className="py-3 px-4 whitespace-nowrap align-top">
                            <div className="font-bold text-slate-900 font-mono text-xs">
                              {summary.monthLabel}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {summary.monthYear} · {summary.activeDaysCount} Days Active
                            </span>
                          </td>

                          {/* Work Unit (Villa) */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="rounded-md bg-indigo-900 text-white px-2 py-0.5 text-xs font-bold">
                                {summary.villaNo}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 truncate" title={summary.siteName}>
                              {summary.siteName}
                            </div>
                          </td>

                          {/* Block & Type */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-800">{summary.blockNo}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{summary.villaType}</div>
                          </td>

                          {/* Total Work Entities in Month */}
                          <td className="py-3 px-4 align-top text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-900 font-mono shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                              <span>{summary.entityCount} Entities</span>
                            </span>
                          </td>

                          {/* Total Meters Work in Month */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1 font-mono font-black text-sm text-blue-900">
                              <Ruler className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>{summary.totalMetersWork.toLocaleString()} m²</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Monthly volume completed
                            </div>
                          </td>

                          {/* Work Fields Breakdown */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              {summary.fieldBreakdown.map((fb, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold border shadow-2xs ${getWorkFieldBadge(fb.field)}`}
                                >
                                  <span>{fb.field}:</span>
                                  <strong className="font-mono">{fb.meters} m²</strong>
                                  <span className="opacity-75">({fb.count} logs)</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Monthly Personnel (Villa-by-Villa) */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 font-mono">
                                <Users className="h-3 w-3 text-slate-500" />
                                <span>{summary.totalManDays} Man-Days</span>
                              </span>
                            </div>
                            <div className="text-[10.5px] text-indigo-700 font-medium mt-1">
                              {summary.uniquePersonnelCount > 0
                                ? `${summary.uniquePersonnelCount} Assigned Crew Members`
                                : `Avg ~${summary.avgWorkersPerDay} workers/day`}
                            </div>
                          </td>

                          {/* Avg Progress */}
                          <td className="py-3 px-4 align-top whitespace-nowrap min-w-[110px]">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-slate-900">{summary.avgProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${summary.avgProgress}%` }}
                              />
                            </div>
                          </td>

                          {/* Actions: ONLY ICONS: Expand/Collapse & Inspect */}
                          <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1">
                              {summary.items[0] && (
                                <button
                                  onClick={() => setViewingItem(summary.items[0])}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                  title="View Latest Monthly Work Entity Dossier"
                                  aria-label="View Latest Monthly Work Entity Dossier"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => toggleGroupExpand(summary.groupKey)}
                                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                  isExpanded ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                                title={isExpanded ? 'Collapse Monthly Breakdown' : 'Expand Monthly Breakdown'}
                                aria-label={isExpanded ? 'Collapse Monthly Breakdown' : 'Expand Monthly Breakdown'}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED SUB-TABLE: Monthly Entities Breakdown */}
                        {isExpanded && (
                          <tr className="bg-indigo-50/40 border-y border-slate-200">
                            <td colSpan={9} className="p-3 pl-8">
                              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                                  <span>Monthly Logged Entities for {summary.villaNo} ({summary.monthLabel})</span>
                                  <span className="font-mono text-indigo-700 font-semibold">{summary.totalMetersWork} m² Total · {summary.items.length} Records</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {summary.items.map((it) => (
                                    <div key={it.entity.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-slate-900">{it.entity.date}</span>
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${getWorkFieldBadge(it.workField)}`}>
                                          <Paintbrush className="h-3 w-3" />
                                          <span>{it.workField}</span>
                                        </span>
                                        <span className="font-mono font-bold text-blue-900">{it.metersWork} m²</span>
                                        <span className="text-slate-600 truncate max-w-xs">{it.entity.workStage}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-mono">{it.entity.employeeCount} Personnel</span>
                                        <span className="font-bold text-slate-900">{it.workProgress}% Done</span>
                                        <button
                                          onClick={() => setViewingItem(it)}
                                          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                                          title="View Dossier"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW WORK ENTITY DOSSIER MODAL */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <HardHat className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Daily Work Entity Dossier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Log ID: <span className="font-mono font-bold text-slate-700">{viewingItem.entity.id}</span> · {viewingItem.entity.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    downloadDailyWorkEntityPDF(
                      viewingItem.entity,
                      viewingItem.villa,
                      corporateEntity,
                      baseCurrency,
                      viewingItem.siteName
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs cursor-pointer"
                  title="Download PDF Certificate"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Highlight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Work Unit</span>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {viewingItem.villaNo} ({viewingItem.blockNo})
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{viewingItem.siteName}</div>
                </div>

                {/* Work Field Card */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <span className="text-[10px] font-bold uppercase text-blue-700">Work Field</span>
                  <div className="mt-1 text-sm font-black text-blue-900 flex items-center gap-1">
                    <Paintbrush className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{viewingItem.workField}</span>
                  </div>
                  <div className="text-[11px] font-bold text-blue-700 font-mono mt-0.5">
                    {viewingItem.metersWork} m² executed
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Workforce</span>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {viewingItem.entity.employeeCount} Personnel
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {viewingItem.entity.workingHours || 8} Hours Shift
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Progress</span>
                  <div className="mt-1 text-sm font-bold text-emerald-600">
                    {viewingItem.workProgress}% Done
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 capitalize">
                    {viewingItem.entity.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Stage Progress</span>
                  <span className="font-bold text-slate-900">{viewingItem.workProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${viewingItem.workProgress}%` }}
                  />
                </div>
              </div>

              {/* Work Stage & Task */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="font-semibold text-slate-900 text-sm">
                  {viewingItem.entity.workStage}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {viewingItem.entity.taskSummary || 'Detailed operational tasks executed per approved drawings.'}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Lead Supervisor</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {viewingItem.entity.supervisorName || 'Site Engineer In Charge'}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Meters Work (m²)</span>
                  <div className="font-bold text-blue-900 mt-0.5 font-mono text-sm">
                    {viewingItem.metersWork} m²
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Weather &amp; Ambient</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {viewingItem.entity.weatherCondition || 'Clear 30°C'}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Equipment &amp; Plant Used</span>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {viewingItem.entity.equipmentUsed || 'Standard Hand Tools & Scaffolding'}
                  </div>
                </div>
              </div>

              {/* Assigned Employees List */}
              {viewingItem.entity.assignedEmployees && viewingItem.entity.assignedEmployees.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-900 mb-2">
                    Daily Assigned Personnel ({viewingItem.entity.assignedEmployees.length})
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {viewingItem.entity.assignedEmployees.map((emp, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {emp.employeeName.charAt(0)}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{emp.employeeName}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({emp.employeeId})</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {emp.role || 'Site Worker'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engineering Notes */}
              {viewingItem.entity.notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <div className="font-semibold text-amber-900">Engineering QA/QC &amp; Snagging Notes:</div>
                  <p className="text-amber-800 mt-1">{viewingItem.entity.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingItem(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT WORK ENTITY MODAL (SUPPORTS SINGLE & DAILY MULTIPLE ENTITIES BATCH) */}
      {editingItem && (
        <CreateOrEditDailyWorkModal
          isEdit={editingItem.isEdit}
          initialVillaId={editingItem.villaId}
          initialEntity={editingItem.entity}
          villas={villas}
          projects={projects}
          employees={employees}
          corporateEntity={corporateEntity}
          baseCurrency={baseCurrency}
          onClose={() => setEditingItem(null)}
          onSave={(villaId, entityData) => {
            if (editingItem.isEdit && editingItem.entity.id) {
              updateVillaDailyWorkEntity(villaId, editingItem.entity.id, entityData);
            } else {
              addVillaDailyWorkEntity(villaId, entityData as any);
            }
            setEditingItem(null);
          }}
          onSaveMultiple={(villaId, entities) => {
            addMultipleVillaDailyWorkEntities(villaId, entities as any);
            setEditingItem(null);
          }}
        />
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Daily Work Entity?
                </h3>
                <p className="text-xs text-slate-500">
                  This action permanently removes this execution log and workforce record.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 font-medium">
              {itemToDelete.label}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// CREATE OR EDIT MODAL SUBCOMPONENT
// Supports Single Entity & Daily Multiple Entities Villa-by-Villa
// ==========================================
interface CreateOrEditDailyWorkModalProps {
  isEdit: boolean;
  initialVillaId: string;
  initialEntity: Partial<VillaDailyWorkEntity>;
  villas: Villa[];
  projects: Project[];
  employees: Employee[];
  corporateEntity: CorporateLegalEntity;
  baseCurrency: string;
  onClose: () => void;
  onSave: (villaId: string, entity: Omit<VillaDailyWorkEntity, 'id' | 'villaId'>) => void;
  onSaveMultiple: (villaId: string, entities: Array<Omit<VillaDailyWorkEntity, 'id' | 'villaId'>>) => void;
}

interface MultiEntityDraftItem {
  id: string;
  workField: string;
  customWorkField: string;
  isCustom: boolean;
  metersWork: number;
  workStage: string;
  taskSummary: string;
  employeeCount: number;
  workingHours: number;
  workProgress: number;
  status: VillaDailyWorkEntity['status'];
}

const CreateOrEditDailyWorkModal: React.FC<CreateOrEditDailyWorkModalProps> = ({
  isEdit,
  initialVillaId,
  initialEntity,
  villas,
  projects,
  employees,
  corporateEntity,
  baseCurrency,
  onClose,
  onSave,
  onSaveMultiple,
}) => {
  // Mode switcher: Single Entity vs Daily Multiple Entities (Batch)
  const [modalMode, setModalMode] = useState<'single' | 'batch_multiple'>(
    !isEdit ? 'single' : 'single'
  );

  const [villaId, setVillaId] = useState(initialVillaId || (villas[0]?.id ?? ''));
  const [date, setDate] = useState(initialEntity.date || new Date().toISOString().substring(0, 10));

  // Single entity state
  const [workField, setWorkField] = useState<string>(initialEntity.workField || 'Primer Paint');
  const [customWorkField, setCustomWorkField] = useState<string>('');
  const [isCustomWorkField, setIsCustomWorkField] = useState<boolean>(
    Boolean(
      initialEntity.workField &&
      !['Primer Paint', 'Putty 1st', 'Putty 2st', 'Paint 1st', 'Paint Final'].includes(initialEntity.workField)
    )
  );
  const [metersWork, setMetersWork] = useState<number>(
    initialEntity.metersWork !== undefined ? initialEntity.metersWork : 150
  );
  const [workStage, setWorkStage] = useState(initialEntity.workStage || 'Interior Finishing — Primer Paint');
  const [taskSummary, setTaskSummary] = useState(initialEntity.taskSummary || '');
  const [employeeCount, setEmployeeCount] = useState<number>(initialEntity.employeeCount || 8);
  const [supervisorName, setSupervisorName] = useState(initialEntity.supervisorName || 'Eng. Mansour Al-Otaibi');
  const [workingHours, setWorkingHours] = useState<number>(initialEntity.workingHours || 8);
  const [equipmentUsed, setEquipmentUsed] = useState(initialEntity.equipmentUsed || 'Airless Sprayers, Laser Levels, Scaffolding');
  const [weatherCondition, setWeatherCondition] = useState(initialEntity.weatherCondition || 'Clear 30°C');
  const [workProgress, setWorkProgress] = useState<number>(initialEntity.workProgress !== undefined ? initialEntity.workProgress : 60);
  const [status, setStatus] = useState<VillaDailyWorkEntity['status']>(initialEntity.status || 'in_progress');
  const [notes, setNotes] = useState(initialEntity.notes || '');

  // Pre-configured & Registered Lead Site Supervisors
  const supervisorCandidates = useMemo(() => {
    const list: Array<{ value: string; label: string; role?: string }> = [
      { value: 'Eng. Mansour Al-Otaibi', label: 'Eng. Mansour Al-Otaibi', role: 'Principal Civil Site Engineer' },
      { value: 'Eng. Sultan Al-Ghamdi', label: 'Eng. Sultan Al-Ghamdi', role: 'Senior Structural Site Supervisor' },
      { value: 'Eng. Tariq Al-Harbi', label: 'Eng. Tariq Al-Harbi', role: 'Lead MEP Site Engineer' },
      { value: 'Fahad Al-Zahrani', label: 'Fahad Al-Zahrani', role: 'Civil QA/QC Site Inspector' },
      { value: 'Sarah Jenkins', label: 'Sarah Jenkins', role: 'Principal Delivery Manager & Site Lead' },
      { value: 'Eng. Khalid Al-Fassi', label: 'Eng. Khalid Al-Fassi', role: 'VP of Engineering & Construction' },
    ];

    employees.forEach((emp) => {
      if (!list.some((s) => s.value.toLowerCase() === emp.fullName.toLowerCase())) {
        list.push({
          value: emp.fullName,
          label: emp.fullName,
          role: `${emp.designation} (${emp.id})`,
        });
      }
    });

    if (
      initialEntity.supervisorName &&
      !list.some((s) => s.value.toLowerCase() === initialEntity.supervisorName!.toLowerCase())
    ) {
      list.unshift({
        value: initialEntity.supervisorName,
        label: initialEntity.supervisorName,
        role: 'Site Lead / Inspector',
      });
    }

    return list;
  }, [employees, initialEntity.supervisorName]);

  const [selectedSupervisorMode, setSelectedSupervisorMode] = useState<'dropdown' | 'custom'>('dropdown');
  const [customSupervisorInput, setCustomSupervisorInput] = useState('');

  // Assigned employee IDs
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(() => {
    return (initialEntity.assignedEmployees || []).map((e) => e.employeeId);
  });

  const handleToggleEmp = (empId: string) => {
    setSelectedEmpIds((prev) => {
      const next = prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId];
      if (next.length > employeeCount) {
        setEmployeeCount(next.length);
      }
      return next;
    });
  };

  // ==========================================
  // MULTI-ENTITY STATE (Daily multiple Entity Villa-by-Villa)
  // ==========================================
  const [multiEntityList, setMultiEntityList] = useState<MultiEntityDraftItem[]>([
    {
      id: 'draft-1',
      workField: 'Primer Paint',
      customWorkField: '',
      isCustom: false,
      metersWork: 165,
      workStage: 'Interior Finishing — Primer Paint',
      taskSummary: 'Application of high-penetration primer paint across ground floor interior walls and majlis ceiling.',
      employeeCount: 8,
      workingHours: 8,
      workProgress: 60,
      status: 'in_progress',
    },
    {
      id: 'draft-2',
      workField: 'Putty 1st',
      customWorkField: '',
      isCustom: false,
      metersWork: 120,
      workStage: 'First Coat Smoothing Putty',
      taskSummary: 'Application of 1st coat acrylic wall putty on entrance hallway and staircase corridors.',
      employeeCount: 6,
      workingHours: 8,
      workProgress: 40,
      status: 'in_progress',
    },
  ]);

  const handleAddMultiEntityRow = () => {
    const nextFields: Array<'Primer Paint' | 'Putty 1st' | 'Putty 2st' | 'Paint 1st' | 'Paint Final'> = [
      'Putty 2st',
      'Paint 1st',
      'Paint Final',
      'Primer Paint',
    ];
    const pickedField = nextFields[multiEntityList.length % nextFields.length];

    setMultiEntityList((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        workField: pickedField,
        customWorkField: '',
        isCustom: false,
        metersWork: 100,
        workStage: `Interior Finishing — ${pickedField}`,
        taskSummary: `Execution of ${pickedField} trade operations.`,
        employeeCount: 5,
        workingHours: 8,
        workProgress: 35,
        status: 'in_progress',
      },
    ]);
  };

  const handleRemoveMultiEntityRow = (id: string) => {
    if (multiEntityList.length <= 1) return;
    setMultiEntityList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateMultiEntityRow = (
    id: string,
    updates: Partial<MultiEntityDraftItem>
  ) => {
    setMultiEntityList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!villaId) return;

    const resolvedSupervisor = selectedSupervisorMode === 'dropdown'
      ? supervisorName
      : (customSupervisorInput.trim() || supervisorName);

    if (modalMode === 'single' || isEdit) {
      // Build assignedEmployees array
      const assigned = selectedEmpIds.map((id) => {
        const found = employees.find((e) => e.id === id);
        return {
          employeeId: id,
          employeeName: found?.fullName || id,
          role: found?.designation || 'Site Specialist',
        };
      });

      const finalCount = Math.max(employeeCount, assigned.length);
      const resolvedWorkField = isCustomWorkField ? (customWorkField.trim() || 'Custom Trade') : workField;

      onSave(villaId, {
        date,
        workStage,
        workField: resolvedWorkField,
        metersWork: Number(metersWork) || 0,
        taskSummary,
        employeeCount: finalCount,
        supervisorName: resolvedSupervisor,
        workingHours,
        equipmentUsed,
        weatherCondition,
        workProgress,
        status,
        notes,
        assignedEmployees: assigned,
      });
    } else {
      // Multiple entities batch save
      const entitiesToSave: Array<Omit<VillaDailyWorkEntity, 'id' | 'villaId'>> = multiEntityList.map((m) => {
        const resolvedField = m.isCustom ? (m.customWorkField.trim() || 'Custom Trade') : m.workField;
        return {
          date,
          workField: resolvedField,
          metersWork: Number(m.metersWork) || 0,
          workStage: m.workStage || `Interior Finishing — ${resolvedField}`,
          taskSummary: m.taskSummary || `Daily trade execution of ${resolvedField} for this villa.`,
          employeeCount: Number(m.employeeCount) || 5,
          supervisorName: resolvedSupervisor,
          workingHours: Number(m.workingHours) || 8,
          equipmentUsed,
          weatherCondition,
          workProgress: Number(m.workProgress) || 50,
          status: m.status,
          notes,
          assignedEmployees: [],
        };
      });

      onSaveMultiple(villaId, entitiesToSave);
    }
  };

  // Multi-entity live totals
  const multiTotalMeters = multiEntityList.reduce((acc, m) => acc + (Number(m.metersWork) || 0), 0);
  const multiTotalWorkers = multiEntityList.reduce((acc, m) => acc + (Number(m.employeeCount) || 0), 0);
  const selectedVillaObj = villas.find((v) => v.id === villaId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <HardHat className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEdit
                  ? 'Edit Daily Work Entity'
                  : modalMode === 'batch_multiple'
                  ? 'Log Daily Multiple Entities (Villa Batch Entry)'
                  : 'Log Daily Work Entity'}
              </h3>
              <p className="text-xs text-slate-500">
                Work Field (Primer, Putty 1st/2st, Paint 1st/Final), Meters Work (m²) &amp; Workforce Deployment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const targetVilla = villas.find((v) => v.id === villaId);
                const targetProj = projects.find((p) => p.id === targetVilla?.projectId);
                downloadDailyWorkEntityBlankPDF(corporateEntity, baseCurrency, {
                  villa: targetVilla,
                  project: targetProj,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Printable Blank Daily Work Entity Form (PDF) pre-filled for this Villa"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Blank Form</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mode Switcher for Creation: Single Entity vs Daily Multiple Entities */}
        {!isEdit && (
          <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  modalMode === 'single'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Work Entity
              </button>
              <button
                type="button"
                onClick={() => setModalMode('batch_multiple')}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  modalMode === 'batch_multiple'
                    ? 'bg-indigo-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-indigo-300" />
                <span>Daily Multiple Entities (Villa Batch)</span>
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
              {modalMode === 'batch_multiple'
                ? 'Log Primer, Putty & Paint trades concurrently for one villa'
                : 'Standard single trade entry'}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Work Unit (Villa) & Date (Global to both single and multi-entity) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Work Unit (Villa / Housing Unit) *
              </label>
              <select
                value={villaId}
                onChange={(e) => setVillaId(e.target.value)}
                disabled={isEdit}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden disabled:bg-slate-100"
                required
              >
                {villas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.villaNo} ({v.blockNo}) — {v.villaType} {v.customVilla ? '[CUSTOM]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Execution Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Lead Site Supervisor Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Lead Site Supervisor *
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedSupervisorMode === 'dropdown') {
                    setSelectedSupervisorMode('custom');
                    setCustomSupervisorInput(supervisorName);
                  } else {
                    setSelectedSupervisorMode('dropdown');
                  }
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {selectedSupervisorMode === 'dropdown' ? '+ Custom Supervisor' : '← Select from Dropdown'}
              </button>
            </div>

            {selectedSupervisorMode === 'dropdown' ? (
              <select
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                required
              >
                {supervisorCandidates.map((sup) => (
                  <option key={sup.value} value={sup.value}>
                    {sup.label} {sup.role ? `— ${sup.role}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customSupervisorInput}
                onChange={(e) => setCustomSupervisorInput(e.target.value)}
                placeholder="Enter supervisor / engineer full name..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                required
              />
            )}
          </div>

          {/* ========================================================
              BRANCH A: SINGLE WORK ENTITY MODE
              ======================================================== */}
          {modalMode === 'single' ? (
            <>
              {/* Work Field Dropdown & Meters Work */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Paintbrush className="h-3.5 w-3.5 text-blue-600" />
                      <span>Work Field Dropdown Menu *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomWorkField(!isCustomWorkField);
                        if (!isCustomWorkField) {
                          setCustomWorkField(workField);
                        }
                      }}
                      className="text-[10.5px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      {isCustomWorkField ? '← Preset Menu' : '+ Custom Trade'}
                    </button>
                  </div>

                  {!isCustomWorkField ? (
                    <div className="space-y-1">
                      <select
                        value={workField}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkField(val);
                          if (!taskSummary || taskSummary.includes('paint') || taskSummary.includes('putty') || taskSummary.includes('primer')) {
                            setTaskSummary(`Application and site execution of ${val} per architectural specifications.`);
                          }
                          if (!workStage || workStage.includes('Finishing')) {
                            setWorkStage(`Interior Finishing — ${val}`);
                          }
                        }}
                        className="w-full rounded-lg border border-blue-300 bg-white py-2 px-3 text-xs font-bold text-slate-900 focus:border-blue-900 focus:outline-hidden shadow-2xs"
                        required
                      >
                        <option value="Primer Paint">Primer Paint (primer paint)</option>
                        <option value="Putty 1st">Putty 1st</option>
                        <option value="Putty 2st">Putty 2st (Putty 2nd)</option>
                        <option value="Paint 1st">Paint 1st</option>
                        <option value="Paint Final">Paint Final</option>
                      </select>
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${getWorkFieldBadge(workField)}`}>
                        Active Field: {workField}
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customWorkField}
                      onChange={(e) => setCustomWorkField(e.target.value)}
                      placeholder="Enter custom work trade (e.g. Italian Marble, Tile)..."
                      className="w-full rounded-lg border border-blue-300 bg-white py-2 px-3 text-xs text-slate-900 focus:border-blue-900 focus:outline-hidden shadow-2xs"
                      required
                    />
                  )}
                </div>

                {/* Meters Work Input */}
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5 text-blue-600" />
                    <span>Entity Meters Work (m²) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={metersWork}
                      onChange={(e) => setMetersWork(Math.max(0, Number(e.target.value)))}
                      placeholder="e.g. 150"
                      className="w-full rounded-lg border border-blue-300 bg-white py-2 pl-3 pr-10 text-xs font-black text-slate-900 focus:border-blue-900 focus:outline-hidden font-mono shadow-2xs"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-700 font-mono">
                      m²
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-700 block mt-1">
                    Quantity of work completed today in square meters.
                  </span>
                </div>
              </div>

              {/* Work Stage & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Stage Description *
                  </label>
                  <input
                    type="text"
                    value={workStage}
                    onChange={(e) => setWorkStage(e.target.value)}
                    placeholder="e.g. Interior Finishing — Primer Paint"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                    required
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="pending_inspection">Pending Inspection</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>

              {/* Work Progress Slider & Input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Work Progress (% Completion) *
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={workProgress}
                      onChange={(e) => setWorkProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 text-xs"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={workProgress}
                  onChange={(e) => setWorkProgress(Number(e.target.value))}
                  className="w-full cursor-pointer accent-slate-900"
                />
              </div>

              {/* Task Summary */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Description &amp; Operations Undertaken *
                </label>
                <textarea
                  rows={2}
                  value={taskSummary}
                  onChange={(e) => setTaskSummary(e.target.value)}
                  placeholder="Detail specific activities performed today..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                  required
                />
              </div>

              {/* Workforce Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deployed Workforce Count (Personnel)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Daily Assigned Employees Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Daily Assigned Personnel ({selectedEmpIds.length} Selected)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Assign skilled technicians &amp; painters
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1">
                  {employees.slice(0, 15).map((emp) => {
                    const isChecked = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                          isChecked ? 'bg-blue-100/70 border border-blue-300' : 'hover:bg-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEmp(emp.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800">{emp.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({emp.id})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {emp.designation}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ========================================================
               BRANCH B: DAILY MULTIPLE ENTITIES VILLA-BY-VILLA (BATCH)
               ======================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <div>
                  <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                    <Zap className="h-4 w-4 text-indigo-600" />
                    <span>Multiple Daily Trades Executed for {selectedVillaObj?.villaNo || 'Selected Villa'}</span>
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Record multiple simultaneous work stages (Primer, Putty 1st, Putty 2st, Paint) on {date}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMultiEntityRow}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Trade Entity</span>
                </button>
              </div>

              {/* Dynamic list of multiple entity drafts */}
              <div className="space-y-3">
                {multiEntityList.map((rowItem, idx) => (
                  <div
                    key={rowItem.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">
                          {idx + 1}
                        </span>
                        <span>Trade Entity #{idx + 1}</span>
                      </span>

                      {multiEntityList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMultiEntityRow(rowItem.id)}
                          className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove this trade entity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Work Field Dropdown */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Work Field Dropdown *
                        </label>
                        <select
                          value={rowItem.workField}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateMultiEntityRow(rowItem.id, {
                              workField: val,
                              workStage: `Interior Finishing — ${val}`,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                          required
                        >
                          <option value="Primer Paint">Primer Paint</option>
                          <option value="Putty 1st">Putty 1st</option>
                          <option value="Putty 2st">Putty 2st</option>
                          <option value="Paint 1st">Paint 1st</option>
                          <option value="Paint Final">Paint Final</option>
                        </select>
                      </div>

                      {/* Meters Work */}
                      <div>
                        <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                          <Ruler className="h-3 w-3 text-blue-600" />
                          <span>Meters Work (m²) *</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={rowItem.metersWork}
                            onChange={(e) =>
                              handleUpdateMultiEntityRow(rowItem.id, {
                                metersWork: Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full rounded-lg border border-blue-300 bg-white py-1.5 pl-2.5 pr-8 text-xs font-bold font-mono text-slate-900"
                            required
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-700">
                            m²
                          </span>
                        </div>
                      </div>

                      {/* Personnel Count for this entity */}
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-900 mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3 text-indigo-600" />
                          <span>Personnel (Workers) *</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={rowItem.employeeCount}
                          onChange={(e) =>
                            handleUpdateMultiEntityRow(rowItem.id, {
                              employeeCount: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="w-full rounded-lg border border-indigo-200 bg-white py-1.5 px-2.5 text-xs font-bold font-mono text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                          Stage &amp; Task Description
                        </label>
                        <input
                          type="text"
                          value={rowItem.taskSummary}
                          onChange={(e) =>
                            handleUpdateMultiEntityRow(rowItem.id, { taskSummary: e.target.value })
                          }
                          placeholder="e.g. 1st coat putty application over entrance corridor..."
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                            Progress ({rowItem.workProgress}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={rowItem.workProgress}
                            onChange={(e) =>
                              handleUpdateMultiEntityRow(rowItem.id, {
                                workProgress: Number(e.target.value),
                              })
                            }
                            className="w-full cursor-pointer accent-indigo-600"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                            Status
                          </label>
                          <select
                            value={rowItem.status}
                            onChange={(e) =>
                              handleUpdateMultiEntityRow(rowItem.id, {
                                status: e.target.value as any,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800"
                          >
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch Live Totals Banner */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono font-bold">
                <span className="text-indigo-950 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  <span>Villa {selectedVillaObj?.villaNo || villaId} on {date}:</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-700">{multiEntityList.length} Work Entities</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-900">{multiTotalMeters.toLocaleString()} m² Total Meters</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-900">{multiTotalWorkers} Deployed Personnel</span>
                </div>
              </div>
            </div>
          )}

          {/* Equipment & Weather (Shared) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipment &amp; Sprayers Deployed
              </label>
              <input
                type="text"
                value={equipmentUsed}
                onChange={(e) => setEquipmentUsed(e.target.value)}
                placeholder="Airless Sprayers, Scaffolding, Sanders..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weather &amp; Ambient
              </label>
              <input
                type="text"
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value)}
                placeholder="e.g. Clear 30°C, Humidity 45%"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Engineering & Snagging Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Engineering QA/QC &amp; Inspection Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Plaster moisture approved; 2nd coat ready..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              {isEdit
                ? 'Save Changes'
                : modalMode === 'batch_multiple'
                ? `Log All ${multiEntityList.length} Daily Entities for Villa`
                : 'Log Work Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
