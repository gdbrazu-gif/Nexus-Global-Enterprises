import React, { useState, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { InventoryItem, InventoryCategory, StockMovement, InventoryInvoice, InvoiceLineItem } from '../../types';
import {
  Boxes,
  Package,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertOctagon,
  TrendingDown,
  DollarSign,
  Laptop,
  ShieldAlert,
  Printer,
  Eye,
  FileText,
  Tag,
  Scale,
  Receipt,
  QrCode,
  Calendar,
  Building2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_BORDER_OUTER,
  PDF_BORDER_HEAD,
  PDF_BORDER_CELL,
} from '../../utils/pdfGenerator';

interface InventoryManagerProps {
  initialTab?: 'catalog' | 'invoices' | 'movements';
  onTabChange?: (tab: 'catalog' | 'invoices' | 'movements') => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  initialTab = 'catalog',
  onTabChange,
}) => {
  const {
    inventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustInventoryStock,
    transferInventoryItem,
    stockMovements,
    inventoryCategories,
    addInventoryCategory,
    deleteInventoryCategory,
    inventoryUOMs,
    addInventoryUOM,
    deleteInventoryUOM,
    inventoryWarehouses,
    addInventoryWarehouse,
    deleteInventoryWarehouse,
    inventoryInvoices,
    addInventoryInvoice,
    updateInventoryInvoice,
    deleteInventoryInvoice,
    employees,
    projects,
    branches,
    formatCurrency,
    baseCurrency,
    corporateEntity,
    canPerformAdminAction,
    canPerformBranchAdminAction,
    canPerformHrAction,
    canPerformFinanceAction,
    hasModulePermission,
    activeBranchId,
  } = useHRMS();

  const canManageInventory =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    hasModulePermission('inventory', 'create') ||
    hasModulePermission('inventory', 'update');
  const canDeleteInventory =
    canPerformAdminAction ||
    canPerformBranchAdminAction ||
    canPerformHrAction ||
    canPerformFinanceAction ||
    hasModulePermission('inventory', 'delete');

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'invoices' | 'movements'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: 'catalog' | 'invoices' | 'movements') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Custom Category, Custom UOM & Custom Warehouse Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [newUomName, setNewUomName] = useState('');
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');

  // Inline Quick Add in Add/Edit item form
  const [inlineCategoryInput, setInlineCategoryInput] = useState('');
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [inlineUomInput, setInlineUomInput] = useState('');
  const [showInlineUom, setShowInlineUom] = useState(false);
  const [inlineWarehouseInput, setInlineWarehouseInput] = useState('');
  const [showInlineWarehouse, setShowInlineWarehouse] = useState(false);

  // Quick Stock Movement Modal
  const [movementModalItem, setMovementModalItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementRef, setMovementRef] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'>('all');

  // SKU & Warehouse Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState<string>('');
  const [transferDestLocation, setTransferDestLocation] = useState<string>('');
  const [transferDestBranchId, setTransferDestBranchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferRef, setTransferRef] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Make Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InventoryInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InventoryInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InventoryInvoice | null>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    date: string;
    dueDate: string;
    type: 'Purchase' | 'Sales' | 'Material_Issue';
    clientOrVendor: string;
    contactPerson: string;
    referenceDoc: string;
    paymentTerms: string;
    status: 'draft' | 'issued' | 'paid' | 'cancelled';
    notes: string;
    autoAdjustStock: boolean;
    lineItems: InvoiceLineItem[];
  }>({
    invoiceNumber: '',
    date: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    type: 'Sales',
    clientOrVendor: '',
    contactPerson: '',
    referenceDoc: '',
    paymentTerms: 'Net 30 Days',
    status: 'issued',
    notes: 'Official inventory tax invoice issued under ZATCA compliance standard.',
    autoAdjustStock: true,
    lineItems: [],
  });

  // Selected item line in make invoice modal
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>('');
  const [selectedItemQty, setSelectedItemQty] = useState<number>(1);
  const [selectedItemPrice, setSelectedItemPrice] = useState<number>(0);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Item Form State
  const [itemFormData, setItemFormData] = useState({
    sku: '',
    name: '',
    category: 'IT Hardware',
    description: '',
    warehouseLocation: 'Riyadh HQ Central Store - Bin A-12',
    quantityOnHand: 10,
    minReorderLevel: 5,
    maxStockLevel: 50,
    unitOfMeasure: 'Pieces',
    unitCostSAR: 500,
    supplierName: '',
  });

  // Open Add Item Modal
  const handleOpenAddItem = () => {
    const nextSku = `SKU-ITM-${String(inventoryItems.length + 1).padStart(2, '0')}`;
    const defaultCat = inventoryCategories[0] || 'IT Hardware';
    const defaultUom = inventoryUOMs[0] || 'Pieces';
    const defaultWarehouse = inventoryWarehouses[0] || 'Riyadh HQ Central Store - Bin A-12';

    setItemFormData({
      sku: nextSku,
      name: '',
      category: defaultCat,
      description: '',
      warehouseLocation: defaultWarehouse,
      quantityOnHand: 10,
      minReorderLevel: 5,
      maxStockLevel: 50,
      unitOfMeasure: defaultUom,
      unitCostSAR: 500,
      supplierName: '',
    });
    setShowInlineCategory(false);
    setShowInlineUom(false);
    setShowInlineWarehouse(false);
    setIsAddItemOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      description: item.description,
      warehouseLocation: item.warehouseLocation,
      quantityOnHand: item.quantityOnHand,
      minReorderLevel: item.minReorderLevel,
      maxStockLevel: item.maxStockLevel,
      unitOfMeasure: item.unitOfMeasure,
      unitCostSAR: item.unitCostSAR,
      supplierName: item.supplierName || '',
    });
    setShowInlineCategory(false);
    setShowInlineUom(false);
    setShowInlineWarehouse(false);
  };

  // Save Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateInventoryItem(editingItem.id, itemFormData);
      showToast(`Updated item "${itemFormData.name}".`);
      setEditingItem(null);
    } else {
      let initialStatus: InventoryItem['status'] = 'in_stock';
      if (itemFormData.quantityOnHand <= 0) initialStatus = 'out_of_stock';
      else if (itemFormData.quantityOnHand <= itemFormData.minReorderLevel) initialStatus = 'low_stock';

      addInventoryItem({
        ...itemFormData,
        status: initialStatus,
        lastRestockedDate: new Date().toISOString().substring(0, 10),
      });
      showToast(`Added new item "${itemFormData.name}" to inventory.`);
      setIsAddItemOpen(false);
    }
  };

  // Inline Add Category
  const handleInlineAddCategory = () => {
    if (!inlineCategoryInput.trim()) return;
    addInventoryCategory(inlineCategoryInput.trim());
    setItemFormData((prev) => ({ ...prev, category: inlineCategoryInput.trim() }));
    setInlineCategoryInput('');
    setShowInlineCategory(false);
    showToast(`Added and selected custom category "${inlineCategoryInput.trim()}".`);
  };

  // Inline Add UOM
  const handleInlineAddUom = () => {
    if (!inlineUomInput.trim()) return;
    addInventoryUOM(inlineUomInput.trim());
    setItemFormData((prev) => ({ ...prev, unitOfMeasure: inlineUomInput.trim() }));
    setInlineUomInput('');
    setShowInlineUom(false);
    showToast(`Added and selected custom UOM "${inlineUomInput.trim()}".`);
  };

  // Inline Add Warehouse
  const handleInlineAddWarehouse = () => {
    const trimmed = inlineWarehouseInput.trim();
    if (!trimmed) return;
    addInventoryWarehouse(trimmed);
    setItemFormData((prev) => ({ ...prev, warehouseLocation: trimmed }));
    setInlineWarehouseInput('');
    setShowInlineWarehouse(false);
    showToast(`Added and selected custom warehouse "${trimmed}".`);
  };

  // Open Quick Movement Modal
  const handleOpenMovementModal = (item: InventoryItem, defaultType: 'IN' | 'OUT' = 'IN') => {
    setMovementModalItem(item);
    setMovementType(defaultType);
    setMovementQty(1);
    setMovementRef(defaultType === 'IN' ? 'PO-Restock' : 'Dispatched to Project/Employee');
    setMovementNotes('');
  };

  // Submit Stock Movement
  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalItem) return;
    if (movementQty <= 0 && movementType !== 'ADJUSTMENT') return;

    adjustInventoryStock(
      movementModalItem.id,
      movementQty,
      movementType,
      movementNotes,
      movementRef
    );

    showToast(
      `Recorded ${movementType === 'IN' ? 'Stock In (+' : movementType === 'OUT' ? 'Stock Out (-' : 'Adjustment ('}${movementQty} ${movementModalItem.unitOfMeasure}) for "${movementModalItem.name}".`
    );
    setMovementModalItem(null);
  };

  // Open SKU & Warehouse Transfer Modal
  const handleOpenTransferModal = (preselectedItem?: InventoryItem) => {
    const availableItems = inventoryItems.filter((it) => it.quantityOnHand > 0);
    const chosen =
      (preselectedItem && preselectedItem.quantityOnHand > 0 ? preselectedItem : null) ||
      availableItems[0] ||
      inventoryItems[0] ||
      null;

    setTransferError(null);
    setTransferSourceId(chosen?.id || '');
    setTransferDestLocation('');
    setTransferDestBranchId(chosen?.branchId || (activeBranchId !== 'all' ? activeBranchId : branches[0]?.id || 'BR-RUH'));
    setTransferQty(chosen && chosen.quantityOnHand > 0 ? Math.min(1, chosen.quantityOnHand) : 1);
    setTransferRef(`TRF-${new Date().getFullYear()}-${String(stockMovements.length + 1).padStart(3, '0')}`);
    setTransferNotes('');
    setTransferModalOpen(true);
  };

  const transferSourceItem = useMemo(
    () => inventoryItems.find((it) => it.id === transferSourceId) || null,
    [inventoryItems, transferSourceId]
  );

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceItem) {
      setTransferError('Please select a valid SKU item to transfer.');
      return;
    }
    const result = transferInventoryItem({
      sourceItemId: transferSourceItem.id,
      destinationLocation: transferDestLocation,
      quantity: transferQty,
      destinationBranchId: transferDestBranchId || undefined,
      reference: transferRef,
      notes: transferNotes,
    });
    if (!result.ok) {
      setTransferError(result.error || 'Unable to complete warehouse transfer.');
      return;
    }
    showToast(
      `Transferred ${transferQty} ${transferSourceItem.unitOfMeasure} of ${transferSourceItem.sku} to "${transferDestLocation.trim()}".`
    );
    setTransferModalOpen(false);
  };

  // Open Make Invoice Modal
  const handleOpenMakeInvoice = (preselectedItem?: InventoryItem) => {
    setEditingInvoice(null);
    const nextInvNum = `INV-${new Date().getFullYear()}-${String(inventoryInvoices.length + 1).padStart(3, '0')}`;
    let initialLineItems: InvoiceLineItem[] = [];

    if (preselectedItem) {
      initialLineItems.push({
        itemId: preselectedItem.id,
        sku: preselectedItem.sku,
        name: preselectedItem.name,
        unitOfMeasure: preselectedItem.unitOfMeasure,
        quantity: 1,
        unitPriceSAR: preselectedItem.unitCostSAR,
        totalSAR: preselectedItem.unitCostSAR,
      });
    }

    setInvoiceForm({
      invoiceNumber: nextInvNum,
      date: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      type: 'Sales',
      clientOrVendor: projects[0]?.name || 'Direct Enterprise Client',
      contactPerson: corporateEntity.accountTitle,
      referenceDoc: 'PO-' + Math.floor(1000 + Math.random() * 9000),
      paymentTerms: 'Net 30 Days (Bank Wire)',
      status: 'issued',
      notes: 'Certified Corporate Inventory Tax Invoice compliant with ZATCA electronic invoicing standard.',
      autoAdjustStock: true,
      lineItems: initialLineItems,
    });

    if (inventoryItems[0]) {
      setSelectedCatalogItemId(inventoryItems[0].id);
      setSelectedItemQty(1);
      setSelectedItemPrice(inventoryItems[0].unitCostSAR);
    }

    setIsInvoiceModalOpen(true);
  };

  // Open Edit Invoice Modal
  const handleOpenEditInvoice = (inv: InventoryInvoice) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      dueDate: inv.dueDate,
      type: inv.type,
      clientOrVendor: inv.clientOrVendor,
      contactPerson: inv.contactPerson || '',
      referenceDoc: inv.referenceDoc || '',
      paymentTerms: inv.paymentTerms,
      status: inv.status,
      notes: inv.notes || '',
      autoAdjustStock: false,
      lineItems: inv.lineItems && inv.lineItems.length > 0 ? [...inv.lineItems] : [],
    });

    if (inventoryItems[0]) {
      setSelectedCatalogItemId(inventoryItems[0].id);
      setSelectedItemQty(1);
      setSelectedItemPrice(inventoryItems[0].unitCostSAR);
    }

    setIsInvoiceModalOpen(true);
  };

  // Add line item to invoice
  const handleAddLineItemToInvoice = () => {
    const item = inventoryItems.find((i) => i.id === selectedCatalogItemId);
    if (!item || selectedItemQty <= 0) return;

    const existingIndex = invoiceForm.lineItems.findIndex((li) => li.itemId === item.id);
    if (existingIndex >= 0) {
      const updated = [...invoiceForm.lineItems];
      updated[existingIndex].quantity += selectedItemQty;
      updated[existingIndex].unitPriceSAR = selectedItemPrice;
      updated[existingIndex].totalSAR = updated[existingIndex].quantity * selectedItemPrice;
      setInvoiceForm({ ...invoiceForm, lineItems: updated });
    } else {
      const newLine: InvoiceLineItem = {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        quantity: selectedItemQty,
        unitPriceSAR: selectedItemPrice,
        totalSAR: selectedItemQty * selectedItemPrice,
      };
      setInvoiceForm({ ...invoiceForm, lineItems: [...invoiceForm.lineItems, newLine] });
    }
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setInvoiceForm({
      ...invoiceForm,
      lineItems: invoiceForm.lineItems.filter((_, idx) => idx !== index),
    });
  };

  // Invoice calculations
  const invoiceSubtotal = useMemo(() => {
    return invoiceForm.lineItems.reduce((acc, li) => acc + li.totalSAR, 0);
  }, [invoiceForm.lineItems]);

  const invoiceVat = useMemo(() => {
    return Math.round(invoiceSubtotal * 0.15 * 100) / 100;
  }, [invoiceSubtotal]);

  const invoiceGrandTotal = invoiceSubtotal + invoiceVat;

  // Save Invoice (Create or Update)
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceForm.lineItems.length === 0) {
      showToast('Please add at least one inventory item to the invoice.');
      return;
    }

    const payload = {
      invoiceNumber: invoiceForm.invoiceNumber,
      date: invoiceForm.date,
      dueDate: invoiceForm.dueDate,
      type: invoiceForm.type,
      clientOrVendor: invoiceForm.clientOrVendor,
      contactPerson: invoiceForm.contactPerson,
      referenceDoc: invoiceForm.referenceDoc,
      lineItems: invoiceForm.lineItems,
      subtotalSAR: invoiceSubtotal,
      vatRate: 15,
      vatAmountSAR: invoiceVat,
      grandTotalSAR: invoiceGrandTotal,
      paymentTerms: invoiceForm.paymentTerms,
      status: invoiceForm.status,
      notes: invoiceForm.notes,
    };

    if (editingInvoice) {
      updateInventoryInvoice(editingInvoice.id, payload);
      showToast(`Updated inventory invoice ${invoiceForm.invoiceNumber} (${formatCurrency(invoiceGrandTotal)}).`);
      setEditingInvoice(null);
    } else {
      addInventoryInvoice(payload);
      showToast(`Created official inventory invoice ${invoiceForm.invoiceNumber} (${formatCurrency(invoiceGrandTotal)}).`);
    }

    setIsInvoiceModalOpen(false);
  };

  // Download Invoice PDF
  const handleDownloadInvoicePDF = (inv: InventoryInvoice) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(corporateEntity.companyName.toUpperCase(), 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('CORPORATE INVENTORY TAX INVOICE & MATERIAL DELIVERY DEED', 14, 18);
    doc.text(`CR: ${corporateEntity.crNumber} | VAT: ${corporateEntity.vatNumber}`, 14, 23);

    doc.text(`INVOICE: ${inv.invoiceNumber}`, pageWidth - 14, 11, { align: 'right' });
    doc.text(`TYPE: ${inv.type.toUpperCase()}`, pageWidth - 14, 17, { align: 'right' });
    doc.text(`STATUS: ${inv.status.toUpperCase()}`, pageWidth - 14, 23, { align: 'right' });

    // Meta details section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE & RECIPIENT PARTICULARS', 14, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Bill To / Party: ${inv.clientOrVendor}`, 14, 42);
    if (inv.contactPerson) doc.text(`Attention: ${inv.contactPerson}`, 14, 47);
    if (inv.referenceDoc) doc.text(`Reference / PO: ${inv.referenceDoc}`, 14, 52);

    doc.text(`Invoice Date: ${inv.date}`, pageWidth - 14, 42, { align: 'right' });
    doc.text(`Due Date: ${inv.dueDate}`, pageWidth - 14, 47, { align: 'right' });
    doc.text(`Payment Terms: ${inv.paymentTerms}`, pageWidth - 14, 52, { align: 'right' });

    // Table of Items
    const tableData = inv.lineItems.map((li, idx) => [
      idx + 1,
      li.sku,
      li.name,
      li.unitOfMeasure,
      li.quantity,
      `${li.unitPriceSAR.toLocaleString()} SAR`,
      `${li.totalSAR.toLocaleString()} SAR`,
    ]);

    autoTable(doc, {
      startY: 57,
      theme: 'grid',
      head: [['#', 'SKU', 'Item Description', 'UOM', 'Qty', 'Unit Price', 'Line Total']],
      body: tableData,
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

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // Totals Box
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 90, finalY, 76, 26, 'F');
    doc.setDrawColor(...PDF_BORDER_OUTER);
    doc.setLineWidth(0.3);
    doc.rect(pageWidth - 90, finalY, 76, 26, 'S');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal (Excl. VAT):', pageWidth - 86, finalY + 6);
    doc.text(`${inv.subtotalSAR.toLocaleString()} SAR`, pageWidth - 18, finalY + 6, { align: 'right' });

    doc.text(`VAT (15% ZATCA):`, pageWidth - 86, finalY + 12);
    doc.text(`+${inv.vatAmountSAR.toLocaleString()} SAR`, pageWidth - 18, finalY + 12, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Grand Total:', pageWidth - 86, finalY + 20);
    doc.text(`${inv.grandTotalSAR.toLocaleString()} SAR`, pageWidth - 18, finalY + 20, { align: 'right' });

    // Notes
    if (inv.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Notes: ${inv.notes}`, 14, finalY + 8);
    }

    // Signatures
    const sigY = Math.max(finalY + 38, 240);
    doc.setDrawColor(...PDF_BORDER_OUTER);
    doc.setLineWidth(0.3);
    doc.line(14, sigY, 70, sigY);
    doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Warehouse Custodian / Issuer Signature', 14, sigY + 4);
    doc.text('Client / Recipient Acceptance Stamp', pageWidth - 14, sigY + 4, { align: 'right' });

    // Save
    doc.save(`${inv.invoiceNumber}_TAX_INVOICE.pdf`);
    showToast(`Downloaded PDF for Invoice ${inv.invoiceNumber}.`);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchLoc = locationFilter === 'all' || item.warehouseLocation.toLowerCase().includes(locationFilter.toLowerCase());
      const matchBranch = activeBranchId === 'all' || (item.branchId || 'BR-RUH') === activeBranchId;

      return matchSearch && matchCat && matchStatus && matchLoc && matchBranch;
    });
  }, [inventoryItems, searchQuery, categoryFilter, statusFilter, locationFilter, activeBranchId]);

  // Statistics
  const stats = useMemo(() => {
    const totalItemsCount = inventoryItems.length;
    const totalValuation = inventoryItems.reduce((acc, it) => acc + it.quantityOnHand * it.unitCostSAR, 0);
    const lowStockCount = inventoryItems.filter((it) => it.status === 'low_stock').length;
    const outOfStockCount = inventoryItems.filter((it) => it.status === 'out_of_stock').length;
    const totalUnitsOnHand = inventoryItems.reduce((acc, it) => acc + it.quantityOnHand, 0);
    const totalInvoicesValue = inventoryInvoices.reduce((acc, inv) => acc + inv.grandTotalSAR, 0);

    return {
      totalItemsCount,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      totalUnitsOnHand,
      totalInvoicesValue,
    };
  }, [inventoryItems, inventoryInvoices]);

  // Distinct locations + custom warehouses + registered branch hubs
  const distinctLocations = useMemo(() => {
    return Array.from(new Set(inventoryItems.map((i) => i.warehouseLocation))).filter(Boolean);
  }, [inventoryItems]);

  const allWarehouses = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const loc of [...inventoryWarehouses, ...distinctLocations]) {
      const trimmed = loc.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(trimmed);
      }
    }
    return list;
  }, [inventoryWarehouses, distinctLocations]);

  const warehouseTransferSuggestions = useMemo(() => {
    const branchHubs = branches.map((b) => `${b.name} (${b.city}) Store`);
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const loc of [...inventoryWarehouses, ...distinctLocations, ...branchHubs]) {
      const trimmed = loc.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(trimmed);
      }
    }
    if (!transferSourceItem) return combined;
    return combined.filter(
      (loc) => loc.trim().toLowerCase() !== transferSourceItem.warehouseLocation.trim().toLowerCase()
    );
  }, [inventoryWarehouses, distinctLocations, branches, transferSourceItem]);

  const filteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      if (movementTypeFilter === 'all') return true;
      if (movementTypeFilter === 'TRANSFER') {
        return Boolean(mov.referenceDoc && mov.referenceDoc.toLowerCase().includes('transfer'));
      }
      return mov.type === movementTypeFilter;
    });
  }, [stockMovements, movementTypeFilter]);

  // Export PDF Report of All Catalog
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(corporateEntity.companyName.toUpperCase(), 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CORPORATE INVENTORY & WAREHOUSE ASSET VALUATION LEDGER', 14, 16);
    doc.text(`CR: ${corporateEntity.crNumber} | VAT: ${corporateEntity.vatNumber}`, pageWidth - 14, 10, { align: 'right' });
    doc.text(`Valuation: ${stats.totalValuation.toLocaleString()} ${baseCurrency}`, pageWidth - 14, 16, { align: 'right' });

    const tableBody = inventoryItems.map((it, idx) => [
      idx + 1,
      it.sku,
      it.name,
      it.category,
      it.warehouseLocation,
      `${it.quantityOnHand} ${it.unitOfMeasure}`,
      `${it.minReorderLevel}`,
      `${it.unitCostSAR.toLocaleString()} SAR`,
      `${(it.quantityOnHand * it.unitCostSAR).toLocaleString()} SAR`,
      it.status.replace('_', ' ').toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 28,
      theme: 'grid',
      head: [
        [
          '#',
          'SKU Code',
          'Item Name & Specification',
          'Category',
          'Warehouse Location',
          'Qty On Hand',
          'Min Level',
          'Unit Cost',
          'Total Valuation',
          'Status',
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
        cellPadding: 2,
        lineColor: PDF_BORDER_CELL,
        lineWidth: 0.22,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`INVENTORY_STOCK_LEDGER_${new Date().toISOString().substring(0, 10)}.pdf`);
    showToast('Exported Inventory Stock Ledger PDF.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Corporate Inventory & Stock Ledger
              </h1>
              <p className="text-xs text-slate-500">
                Warehouse catalog, SKU &amp; inter-warehouse transfers, Make Invoice generator, custom categories &amp; UOM.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Category Button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Manage Custom Categories"
          >
            <Tag className="h-3.5 w-3.5 text-amber-600" />
            <span>New Category</span>
          </button>

          {/* Custom Warehouse Button */}
          <button
            type="button"
            onClick={() => setIsWarehouseModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Add or Manage Custom Warehouse Locations"
          >
            <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
            <span>Warehouse</span>
          </button>

          {canManageInventory && (
            <>
              <button
                type="button"
                onClick={handleOpenAddItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Item</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenTransferModal()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                title="Transfer SKU or Item to any Warehouse Location"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-700" />
                <span>Transfer SKU</span>
              </button>
            </>
          )}

          {/* Custom UOM Button */}
          <button
            type="button"
            onClick={() => setIsUomModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Manage Custom Units of Measure"
          >
            <Scale className="h-3.5 w-3.5 text-blue-600" />
            <span>UOM</span>
          </button>

          {/* Make Invoice Button */}
          <button
            type="button"
            onClick={() => handleOpenMakeInvoice()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
          >
            <Receipt className="h-3.5 w-3.5 text-indigo-600" />
            <span>Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Inventory Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {stats.totalValuation.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{baseCurrency}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Catalog SKUs</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{stats.totalItemsCount}</span>
            <span className="text-[11px] text-slate-500">({stats.totalUnitsOnHand.toLocaleString()} total units)</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">{stats.lowStockCount}</span>
            <span className="text-[11px] text-amber-700 font-semibold">Reorder Required</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Invoiced Settlement</span>
            <Receipt className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-indigo-700 font-mono">
              {stats.totalInvoicesValue.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{baseCurrency}</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleSelectTab('catalog')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Stock Catalog & Warehouse Ledger ({inventoryItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('invoices')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices & Delivery Vouchers ({inventoryInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('movements')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'movements'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Stock In / Out Movement History ({stockMovements.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Catalog view) */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50 border border-slate-200 p-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU code, item name, warehouse bin, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="all">All Categories ({inventoryCategories.length})</option>
              {inventoryCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (Alert)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="all">All Warehouses ({allWarehouses.length})</option>
              {allWarehouses.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 1: INVENTORY STOCK CATALOG
          ============================================================== */}
      {activeTab === 'catalog' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <tr>
                  <th className="px-3.5 py-3">SKU & Item Name</th>
                  <th className="px-3.5 py-3">Category</th>
                  <th className="px-3.5 py-3">Warehouse Location</th>
                  <th className="px-3.5 py-3 text-center">Stock Level (UOM)</th>
                  <th className="px-3.5 py-3 text-right">Unit Cost</th>
                  <th className="px-3.5 py-3 text-right">Total Valuation</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Boxes className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600 text-sm">No Inventory Items Found</p>
                      <p className="text-xs text-slate-400 mt-1">Try resetting search filters or add a new inventory SKU.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const stockPercent = Math.min(
                      100,
                      Math.round((item.quantityOnHand / Math.max(1, item.maxStockLevel)) * 100)
                    );

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1 py-0.2 font-semibold text-slate-700">
                              {item.sku}
                            </span>
                            {item.supplierName && <span className="text-slate-400">· {item.supplierName}</span>}
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 border border-amber-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">
                          {item.warehouseLocation}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="font-bold text-slate-900 font-mono text-xs">
                            {item.quantityOnHand} <span className="font-sans font-normal text-slate-500">{item.unitOfMeasure}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                            <span>Min: {item.minReorderLevel}</span>
                            <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.quantityOnHand <= 0
                                    ? 'bg-rose-500'
                                    : item.quantityOnHand <= item.minReorderLevel
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${stockPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(item.unitCostSAR)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.quantityOnHand * item.unitCostSAR)}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                              item.status === 'in_stock'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'low_stock'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.status === 'in_stock'
                                  ? 'bg-emerald-500'
                                  : item.status === 'low_stock'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* VIEW BUTTON REQUESTED */}
                            <button
                              type="button"
                              onClick={() => setViewingItem(item)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                              title="View Item Dossier & Specifications"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* MAKE INVOICE SHORTCUT FOR THIS ITEM */}
                            <button
                              type="button"
                              onClick={() => handleOpenMakeInvoice(item)}
                              className="rounded p-1 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              title="Make Invoice for this item"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </button>

                            {canManageInventory && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenMovementModal(item, 'IN')}
                                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  title="Receive Stock (Stock IN)"
                                >
                                  <ArrowDownLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenMovementModal(item, 'OUT')}
                                  className="rounded p-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  title="Issue Stock (Stock OUT)"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                                {item.quantityOnHand > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTransferModal(item)}
                                    className="rounded p-1 text-amber-600 hover:bg-amber-50 cursor-pointer"
                                    title="Transfer SKU / Item to another Warehouse Location"
                                  >
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(item)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                  title="Edit SKU"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {canDeleteInventory && (
                              <button
                                type="button"
                                onClick={() => setDeletingItem(item)}
                                className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* ==============================================================
          TAB 2: INVOICES & DELIVERY VOUCHERS (MAKE INVOICE)
          ============================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-indigo-50/60 border border-indigo-200 p-4">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-indigo-950">
                  Inventory Invoicing, Purchasing & Material Delivery Vouchers
                </h3>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Generate official sales invoices, supplier purchase orders, or material issuance deeds with 15% ZATCA tax calculation and instant PDF printing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenMakeInvoice()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs cursor-pointer shrink-0 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Make New Invoice</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                  <tr>
                    <th className="px-3.5 py-3">Invoice # & Date</th>
                    <th className="px-3.5 py-3">Type</th>
                    <th className="px-3.5 py-3">Client / Vendor / Project</th>
                    <th className="px-3.5 py-3">Line Items</th>
                    <th className="px-3.5 py-3 text-right">Subtotal</th>
                    <th className="px-3.5 py-3 text-right">VAT (15%)</th>
                    <th className="px-3.5 py-3 text-right">Grand Total</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">No Invoices Created Yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Make New Invoice" to issue a material delivery or purchase invoice.</p>
                      </td>
                    </tr>
                  ) : (
                    inventoryInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3 font-mono text-[11px]">
                          <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <div className="text-slate-400 text-[10px]">{inv.date}</div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${
                              inv.type === 'Purchase'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.type === 'Sales'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {inv.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-900">{inv.clientOrVendor}</div>
                          {inv.referenceDoc && (
                            <div className="text-[10px] text-slate-400 font-mono">Ref: {inv.referenceDoc}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="text-[11px] text-slate-700">
                            {inv.lineItems.length} item{inv.lineItems.length > 1 ? 's' : ''} (
                            {inv.lineItems.reduce((acc, li) => acc + li.quantity, 0)} units)
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {inv.lineItems.map((li) => li.name).join(', ')}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                          {formatCurrency(inv.subtotalSAR)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-500">
                          +{formatCurrency(inv.vatAmountSAR)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(inv.grandTotalSAR)}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'issued'
                                ? 'bg-blue-100 text-blue-800'
                                : inv.status === 'draft'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Invoice Modal */}
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                              title="View Invoice Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit Invoice / Delivery Voucher */}
                            {canManageInventory && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditInvoice(inv)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                title="Edit Invoice / Delivery Voucher"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Download PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoicePDF(inv)}
                              className="rounded p-1 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              title="Download Official Tax Invoice PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            {canDeleteInventory && (
                              <button
                                type="button"
                                onClick={() => setDeletingInvoice(inv)}
                                className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Delete Invoice"
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
          TAB 3: STOCK MOVEMENT HISTORY
          ============================================================== */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'all', label: 'All Movements' },
                  { id: 'TRANSFER', label: 'Warehouse Transfers' },
                  { id: 'IN', label: 'Stock IN (+)' },
                  { id: 'OUT', label: 'Stock OUT (-)' },
                  { id: 'ADJUSTMENT', label: 'Adjustments' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMovementTypeFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    movementTypeFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {canManageInventory && (
              <button
                type="button"
                onClick={() => handleOpenTransferModal()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>New SKU Transfer</span>
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                  <tr>
                    <th className="px-3.5 py-3">Movement ID & Date</th>
                    <th className="px-3.5 py-3">Item Name</th>
                    <th className="px-3.5 py-3">Type</th>
                    <th className="px-3.5 py-3 text-right">Quantity</th>
                    <th className="px-3.5 py-3">Reference / Document</th>
                    <th className="px-3.5 py-3">Operator</th>
                    <th className="px-3.5 py-3">Audit Justification Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">No Stock Movements Logged</p>
                        <p className="text-xs text-slate-400 mt-1">Stock In, Stock Out, and Warehouse Transfer transactions will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isTransfer = Boolean(mov.referenceDoc && mov.referenceDoc.toLowerCase().includes('transfer'));
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-3 font-mono text-[11px]">
                            <div className="font-semibold text-slate-900">{mov.id}</div>
                            <div className="text-slate-400 text-[10px]">{mov.date}</div>
                          </td>
                          <td className="px-3.5 py-3 font-semibold text-slate-900">
                            {mov.itemName}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-bold font-mono ${
                                  mov.type === 'IN'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : mov.type === 'OUT'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {mov.type === 'IN' && <ArrowDownLeft className="h-3 w-3" />}
                                {mov.type === 'OUT' && <ArrowUpRight className="h-3 w-3" />}
                                {mov.type}
                              </span>
                              {isTransfer && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  <ArrowLeftRight className="h-2.5 w-2.5" />
                                  <span>TRANSFER</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono font-bold text-xs">
                            {mov.type === 'IN' ? `+${mov.quantity}` : mov.type === 'OUT' ? `-${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">
                            {mov.referenceDoc || 'Manual Entry'}
                          </td>
                          <td className="px-3.5 py-3 text-slate-800">
                            {mov.operatorName}
                          </td>
                          <td className="px-3.5 py-3 text-slate-500 text-[11px]">
                            {mov.notes || 'Routine stock ledger movement.'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          VIEW ITEM DETAILS DOSSIER MODAL (REQUESTED: "View")
          ============================================================== */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingItem.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-800">{viewingItem.sku}</span>
                    <span>· {viewingItem.category}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Status and Valuation Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Quantity on Hand</span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {viewingItem.quantityOnHand} <span className="text-xs font-normal text-slate-500">{viewingItem.unitOfMeasure}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Unit Cost</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{formatCurrency(viewingItem.unitCostSAR)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Total Valuation</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    {formatCurrency(viewingItem.quantityOnHand * viewingItem.unitCostSAR)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Status</span>
                  <span
                    className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      viewingItem.status === 'in_stock'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingItem.status === 'low_stock'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingItem.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Warehouse Location & Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Warehouse className="h-4 w-4 text-slate-400" />
                    <span>Warehouse Storage Location</span>
                  </span>
                  <p className="font-mono text-slate-700 text-xs bg-slate-50 p-2 rounded">
                    {viewingItem.warehouseLocation}
                  </p>
                  {viewingItem.supplierName && (
                    <p className="text-[11px] text-slate-500">
                      Preferred Supplier: <strong>{viewingItem.supplierName}</strong>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                  <span className="font-bold text-slate-800 text-xs">Reorder Thresholds & Limits</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Min Reorder Level:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingItem.minReorderLevel} {viewingItem.unitOfMeasure}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Max Stock Level:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingItem.maxStockLevel} {viewingItem.unitOfMeasure}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <span className="font-bold text-slate-800 text-xs">Technical Description & Specification</span>
                  <p className="text-slate-600 leading-relaxed text-xs">{viewingItem.description}</p>
                </div>
              )}

              {/* Barcode / QR Authenticated Tag */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white rounded border border-slate-300 p-1 flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-slate-900" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block font-mono text-xs">{viewingItem.sku}</span>
                    <span className="text-[10px] text-slate-500">Scannable physical warehouse tag</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Restock Activity:</span>
                  <span className="font-mono text-slate-700 text-xs font-semibold">{viewingItem.lastRestockedDate}</span>
                </div>
              </div>

              {/* Item's Specific Recent Movements */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1.5">
                  Recent Movements for this SKU ({stockMovements.filter((m) => m.itemId === viewingItem.id).length})
                </span>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockMovements.filter((m) => m.itemId === viewingItem.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No movements logged yet for this item.
                          </td>
                        </tr>
                      ) : (
                        stockMovements
                          .filter((m) => m.itemId === viewingItem.id)
                          .slice(0, 4)
                          .map((m) => (
                            <tr key={m.id}>
                              <td className="px-3 py-1.5 font-mono text-[11px]">{m.date}</td>
                              <td className="px-3 py-1.5 font-bold font-mono">
                                <span className={m.type === 'IN' ? 'text-emerald-700' : 'text-blue-700'}>
                                  {m.type}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold">
                                {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                              </td>
                              <td className="px-3 py-1.5 font-mono text-[11px] truncate max-w-xs">{m.referenceDoc}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Actions Bar inside View Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itm = viewingItem;
                    setViewingItem(null);
                    handleOpenMovementModal(itm, 'IN');
                  }}
                  className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 font-semibold text-xs cursor-pointer flex items-center gap-1"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Receive Stock (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const itm = viewingItem;
                    setViewingItem(null);
                    handleOpenMovementModal(itm, 'OUT');
                  }}
                  className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 font-semibold text-xs cursor-pointer flex items-center gap-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Issue Stock (-)</span>
                </button>

                {canManageInventory && viewingItem.quantityOnHand > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const itm = viewingItem;
                      setViewingItem(null);
                      handleOpenTransferModal(itm);
                    }}
                    className="rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 font-semibold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>Transfer Warehouse</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const itm = viewingItem;
                    setViewingItem(null);
                    handleOpenMakeInvoice(itm);
                  }}
                  className="rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1.5 font-semibold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Make Invoice</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itm = viewingItem;
                    setViewingItem(null);
                    handleOpenEditItem(itm);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Edit Item
                </button>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: MAKE INVOICE (REQUESTED: "Make Invoice")
          ============================================================== */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingInvoice ? 'Edit Inventory Tax Invoice / Delivery Deed' : 'Make Inventory Tax Invoice / Delivery Deed'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingInvoice ? 'Update line items, quantities, client/vendor, and payment status.' : 'Create itemized sales, purchase, or material dispatch invoices with automatic 15% ZATCA VAT calculation.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setEditingInvoice(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="mt-4 space-y-4 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Type *</label>
                  <select
                    value={invoiceForm.type}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, type: e.target.value as any })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  >
                    <option value="Sales">Sales Invoice (Outgoing)</option>
                    <option value="Purchase">Purchase Invoice (Restock)</option>
                    <option value="Material_Issue">Material Issuance Deed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  >
                    <option value="issued">Issued / Unpaid</option>
                    <option value="paid">Paid & Settled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Client / Vendor / Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Riyadh Metro Line 3 or Jarir Corporate"
                    value={invoiceForm.clientOrVendor}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, clientOrVendor: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person / Attention</label>
                  <input
                    type="text"
                    placeholder="e.g. Eng. Fahad Al-Otaibi"
                    value={invoiceForm.contactPerson}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, contactPerson: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reference / PO #</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8821"
                    value={invoiceForm.referenceDoc}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, referenceDoc: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Line Items Selection Bar */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2.5">
                <span className="font-bold text-indigo-950 text-xs block">Add Items to Invoice</span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-500 mb-1">Select Catalog Item</label>
                    <select
                      value={selectedCatalogItemId}
                      onChange={(e) => {
                        setSelectedCatalogItemId(e.target.value);
                        const it = inventoryItems.find((i) => i.id === e.target.value);
                        if (it) setSelectedItemPrice(it.unitCostSAR);
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                    >
                      {inventoryItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.sku} - {it.name} ({it.quantityOnHand} {it.unitOfMeasure} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedItemQty}
                      onChange={(e) => setSelectedItemQty(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-[10px] text-slate-500 mb-1">Unit Price ({baseCurrency})</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={selectedItemPrice}
                      onChange={(e) => setSelectedItemPrice(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLineItemToInvoice}
                    className="rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2 font-mono">SKU</th>
                      <th className="px-3 py-2 text-center">Qty / UOM</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                      <th className="px-3 py-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceForm.lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No items added to invoice. Select an item above and click "+ Add Item".
                        </td>
                      </tr>
                    ) : (
                      invoiceForm.lineItems.map((li, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{li.name}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{li.sku}</td>
                          <td className="px-3 py-2 text-center font-mono font-semibold">
                            {li.quantity} {li.unitOfMeasure}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(li.unitPriceSAR)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(li.totalSAR)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-rose-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Calculation Box */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="space-y-1 text-slate-600">
                  <div className="text-[11px]">
                    Payment Terms: <strong>{invoiceForm.paymentTerms}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    VAT Registration No: {corporateEntity.vatNumber} (15% Standard ZATCA)
                  </div>
                </div>

                <div className="space-y-1 text-right text-xs">
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatCurrency(invoiceSubtotal)}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>VAT (15%):</span>
                    <span className="font-mono font-semibold text-slate-500">+{formatCurrency(invoiceVat)}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-700">{formatCurrency(invoiceGrandTotal)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Invoice Notes / Commercial Terms</label>
                <textarea
                  rows={2}
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Stock balance will automatically sync upon creation.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInvoiceModalOpen(false);
                      setEditingInvoice(null);
                    }}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-semibold text-white shadow-xs cursor-pointer"
                  >
                    {editingInvoice ? 'Update & Save Invoice' : 'Create & Save Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: VIEW INVOICE PARTICULARS
          ============================================================== */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Tax Invoice {viewingInvoice.invoiceNumber}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {viewingInvoice.type.toUpperCase()} · Issued on {viewingInvoice.date}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-medium">Billed To / Party</span>
                  <span className="font-bold text-slate-900 text-xs block">{viewingInvoice.clientOrVendor}</span>
                  {viewingInvoice.contactPerson && (
                    <span className="text-slate-500 text-[11px]">Attn: {viewingInvoice.contactPerson}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block font-medium">Settlement Terms</span>
                  <span className="font-semibold text-slate-900 text-xs block">{viewingInvoice.paymentTerms}</span>
                  <span className="text-slate-500 text-[11px]">Due: {viewingInvoice.dueDate}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 font-mono">SKU</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingInvoice.lineItems.map((li, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{li.name}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{li.sku}</td>
                        <td className="px-3 py-2 text-center font-mono">
                          {li.quantity} {li.unitOfMeasure}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(li.unitPriceSAR)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(li.totalSAR)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatCurrency(viewingInvoice.subtotalSAR)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT (15%):</span>
                  <span className="font-mono font-semibold text-slate-500">+{formatCurrency(viewingInvoice.vatAmountSAR)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-indigo-700">{formatCurrency(viewingInvoice.grandTotalSAR)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownloadInvoicePDF(viewingInvoice)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF Invoice</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingInvoice;
                    setViewingInvoice(null);
                    handleOpenEditInvoice(toEdit);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: MANAGE CUSTOM CATEGORIES (REQUESTED: "Custom Category")
          ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Manage Custom Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add Category Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type custom category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCategoryName.trim()) return;
                  addInventoryCategory(newCategoryName.trim());
                  showToast(`Added custom category "${newCategoryName.trim()}".`);
                  setNewCategoryName('');
                }}
                className="rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                Add Category
              </button>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Active Categories ({inventoryCategories.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50">
                {inventoryCategories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-slate-800 text-xs">{cat}</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteInventoryCategory(cat);
                        showToast(`Removed category "${cat}".`);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                      title="Remove category"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: MANAGE CUSTOM UOM (REQUESTED: "Custom Unit of Measure (UOM)")
          ============================================================== */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Manage Custom Units of Measure (UOM)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUomModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add UOM Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Meters (m), Liters (L), Pallets..."
                value={newUomName}
                onChange={(e) => setNewUomName(e.target.value)}
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newUomName.trim()) return;
                  addInventoryUOM(newUomName.trim());
                  showToast(`Added custom UOM "${newUomName.trim()}".`);
                  setNewUomName('');
                }}
                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                Add UOM
              </button>
            </div>

            {/* Existing UOMs List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Configured UOMs ({inventoryUOMs.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50">
                {inventoryUOMs.map((uom) => (
                  <div key={uom} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-slate-800 text-xs">{uom}</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteInventoryUOM(uom);
                        showToast(`Removed UOM "${uom}".`);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                      title="Remove UOM"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUomModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: MANAGE CUSTOM WAREHOUSES
          ============================================================== */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Manage Custom Warehouses</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWarehouseModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add Custom Warehouse Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Khobar Cold Storage Bay 2, Site Store C..."
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newWarehouseName.trim()) return;
                    addInventoryWarehouse(newWarehouseName.trim());
                    showToast(`Added custom warehouse "${newWarehouseName.trim()}".`);
                    setNewWarehouseName('');
                  }
                }}
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newWarehouseName.trim()) return;
                  addInventoryWarehouse(newWarehouseName.trim());
                  showToast(`Added custom warehouse "${newWarehouseName.trim()}".`);
                  setNewWarehouseName('');
                }}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                Add Warehouse
              </button>
            </div>

            {/* Existing Warehouses List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Configured Warehouses ({inventoryWarehouses.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50">
                {inventoryWarehouses.map((wh) => (
                  <div key={wh} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-slate-800 text-xs">{wh}</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteInventoryWarehouse(wh);
                        showToast(`Removed warehouse "${wh}".`);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                      title="Remove warehouse"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWarehouseModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: ADD / EDIT INVENTORY ITEM (WITH INLINE CUSTOM CATEGORY & UOM)
          ============================================================== */}
      {(isAddItemOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingItem ? 'Edit Inventory Item SKU' : 'Add New Inventory Item'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure item specifications, custom category, custom UOM, warehouse bin, and costs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddItemOpen(false);
                  setEditingItem(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.sku}
                    onChange={(e) => setItemFormData({ ...itemFormData, sku: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineCategory(!showInlineCategory)}
                      className="text-[10px] text-amber-700 hover:underline font-semibold cursor-pointer"
                    >
                      {showInlineCategory ? 'Select List' : '+ Custom Cat'}
                    </button>
                  </div>
                  {showInlineCategory ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Type custom category..."
                        value={inlineCategoryInput}
                        onChange={(e) => setInlineCategoryInput(e.target.value)}
                        className="w-full rounded-md border border-amber-300 px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleInlineAddCategory}
                        className="rounded bg-amber-600 text-white px-2 py-1.5 text-[11px] font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                    >
                      {inventoryCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Item Name & Model *</label>
                <input
                  type="text"
                  required
                  placeholder={'e.g. Dell UltraSharp 27" 4K USB-C Hub Monitors'}
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Technical Specification / Description</label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Key features, serial tracking details, model number..."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700">Warehouse Location *</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineWarehouse(!showInlineWarehouse)}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      {showInlineWarehouse ? 'Select List' : '+ Custom Warehouse'}
                    </button>
                  </div>
                  {showInlineWarehouse ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Type custom warehouse..."
                        value={inlineWarehouseInput}
                        onChange={(e) => setInlineWarehouseInput(e.target.value)}
                        className="w-full rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleInlineAddWarehouse}
                        className="rounded bg-emerald-600 text-white px-2 py-1.5 text-[11px] font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      value={itemFormData.warehouseLocation}
                      onChange={(e) => setItemFormData({ ...itemFormData, warehouseLocation: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                    >
                      {Array.from(
                        new Set([itemFormData.warehouseLocation, ...allWarehouses].filter(Boolean))
                      ).map((wh) => (
                        <option key={wh} value={wh}>
                          {wh}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700">Unit of Measure (UOM) *</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineUom(!showInlineUom)}
                      className="text-[10px] text-blue-700 hover:underline font-semibold cursor-pointer"
                    >
                      {showInlineUom ? 'Select List' : '+ Custom UOM'}
                    </button>
                  </div>
                  {showInlineUom ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="e.g. Meters (m), Liters..."
                        value={inlineUomInput}
                        onChange={(e) => setInlineUomInput(e.target.value)}
                        className="w-full rounded-md border border-blue-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleInlineAddUom}
                        className="rounded bg-blue-600 text-white px-2 py-1.5 text-[11px] font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={itemFormData.unitOfMeasure}
                      onChange={(e) => setItemFormData({ ...itemFormData, unitOfMeasure: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                    >
                      {inventoryUOMs.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Current Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={itemFormData.quantityOnHand}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantityOnHand: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    min={1}
                    value={itemFormData.minReorderLevel}
                    onChange={(e) => setItemFormData({ ...itemFormData, minReorderLevel: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Max Stock Level</label>
                  <input
                    type="number"
                    min={1}
                    value={itemFormData.maxStockLevel}
                    onChange={(e) => setItemFormData({ ...itemFormData, maxStockLevel: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Cost ({baseCurrency})</label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={itemFormData.unitCostSAR}
                    onChange={(e) => setItemFormData({ ...itemFormData, unitCostSAR: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Preferred Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Dell Saudi Distribution"
                    value={itemFormData.supplierName}
                    onChange={(e) => setItemFormData({ ...itemFormData, supplierName: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddItemOpen(false);
                    setEditingItem(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Enroll Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: QUICK STOCK MOVEMENT (IN / OUT / ADJUST)
          ============================================================== */}
      {movementModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Record Stock Movement</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {movementModalItem.sku} · {movementModalItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovementModalItem(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('IN')}
                    className={`rounded-lg border py-2 text-center font-bold text-xs cursor-pointer transition-colors ${
                      movementType === 'IN'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Stock IN (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('OUT')}
                    className={`rounded-lg border py-2 text-center font-bold text-xs cursor-pointer transition-colors ${
                      movementType === 'OUT'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Stock OUT (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('ADJUSTMENT')}
                    className={`rounded-lg border py-2 text-center font-bold text-xs cursor-pointer transition-colors ${
                      movementType === 'ADJUSTMENT'
                        ? 'border-purple-600 bg-purple-50 text-purple-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Physical Count
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {movementType === 'ADJUSTMENT' ? 'New Reconciled Total Quantity' : 'Quantity to Move'} ({movementModalItem.unitOfMeasure})
                </label>
                <input
                  type="number"
                  min={movementType === 'ADJUSTMENT' ? 0 : 1}
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm outline-none focus:border-slate-400"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  Current Balance: {movementModalItem.quantityOnHand} {movementModalItem.unitOfMeasure}
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reference Document / Recipient</label>
                <input
                  type="text"
                  placeholder="e.g. PO-8820 or Issued to Khalid Al-Fassi (EMP-1001)"
                  value={movementRef}
                  onChange={(e) => setMovementRef(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for movement..."
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovementModalItem(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: SKU & ITEM TRANSFER TO ANY WAREHOUSE LOCATION
          ============================================================== */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 text-xs my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    SKU &amp; Item Warehouse Transfer
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Relocate or split stock quantities across any corporate or regional warehouse bin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {transferError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 font-medium">
                {transferError}
              </div>
            )}

            <form onSubmit={handleSubmitTransfer} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select SKU &amp; Item *</label>
                <select
                  required
                  value={transferSourceId}
                  onChange={(e) => {
                    const next = inventoryItems.find((it) => it.id === e.target.value);
                    setTransferSourceId(e.target.value);
                    setTransferError(null);
                    if (next) {
                      setTransferQty(Math.min(1, next.quantityOnHand));
                      setTransferDestBranchId(next.branchId || branches[0]?.id || 'BR-RUH');
                    }
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-amber-500"
                >
                  {inventoryItems
                    .filter((it) => it.quantityOnHand > 0)
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.sku} · {it.name} — {it.warehouseLocation} ({it.quantityOnHand} {it.unitOfMeasure})
                      </option>
                    ))}
                </select>
              </div>

              {transferSourceItem && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                      Source Warehouse Location
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {transferSourceItem.warehouseLocation}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                      Available Balance
                    </span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {transferSourceItem.quantityOnHand} {transferSourceItem.unitOfMeasure}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Destination Warehouse Location (Select or Type Any Location) *
                  </label>
                  {transferDestLocation.trim() &&
                    !inventoryWarehouses.some(
                      (w) => w.trim().toLowerCase() === transferDestLocation.trim().toLowerCase()
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = transferDestLocation.trim();
                          addInventoryWarehouse(trimmed);
                          showToast(`Saved "${trimmed}" to custom warehouses.`);
                        }}
                        className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        + Save to Custom Warehouses
                      </button>
                    )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Type any custom warehouse location / bin or pick below..."
                  value={transferDestLocation}
                  onChange={(e) => {
                    setTransferDestLocation(e.target.value);
                    setTransferError(null);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-amber-500"
                />
                {warehouseTransferSuggestions.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Quick Pick Existing Warehouses &amp; Branch Hubs
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {warehouseTransferSuggestions.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setTransferDestLocation(loc);
                            setTransferError(null);
                            const matchedItemAtLoc = inventoryItems.find(
                              (i) => i.warehouseLocation.trim().toLowerCase() === loc.trim().toLowerCase()
                            );
                            const matchedBranch = branches.find(
                              (b) => loc.toLowerCase().includes(b.city.toLowerCase()) || loc.toLowerCase().includes(b.name.toLowerCase())
                            );
                            if (matchedItemAtLoc?.branchId) {
                              setTransferDestBranchId(matchedItemAtLoc.branchId);
                            } else if (matchedBranch) {
                              setTransferDestBranchId(matchedBranch.id);
                            }
                          }}
                          className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            transferDestLocation.trim().toLowerCase() === loc.trim().toLowerCase()
                              ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Quantity to Transfer *
                    </label>
                    {transferSourceItem && transferSourceItem.quantityOnHand > 0 && (
                      <div className="flex items-center gap-1.5">
                        {transferSourceItem.quantityOnHand > 1 && (
                          <button
                            type="button"
                            onClick={() => setTransferQty(Math.max(1, Math.floor(transferSourceItem.quantityOnHand / 2)))}
                            className="text-[10px] font-semibold text-slate-600 hover:underline cursor-pointer"
                          >
                            Half
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setTransferQty(transferSourceItem.quantityOnHand)}
                          className="text-[10px] font-semibold text-amber-700 hover:underline cursor-pointer"
                        >
                          Move All ({transferSourceItem.quantityOnHand})
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    max={transferSourceItem?.quantityOnHand || 1}
                    value={transferQty}
                    onChange={(e) => {
                      setTransferQty(Number(e.target.value));
                      setTransferError(null);
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Branch</label>
                  <select
                    value={transferDestBranchId}
                    onChange={(e) => setTransferDestBranchId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 outline-none focus:border-amber-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {transferSourceItem && transferDestLocation.trim() && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900">
                  {inventoryItems.some(
                    (it) =>
                      it.id !== transferSourceItem.id &&
                      it.sku.trim().toLowerCase() === transferSourceItem.sku.trim().toLowerCase() &&
                      it.warehouseLocation.trim().toLowerCase() === transferDestLocation.trim().toLowerCase()
                  ) ? (
                    <span>
                      <strong>Merge Transfer:</strong> Destination already stocks <strong>{transferSourceItem.sku}</strong>; transferring {transferQty} {transferSourceItem.unitOfMeasure} will increment that warehouse balance.
                    </span>
                  ) : transferQty >= transferSourceItem.quantityOnHand ? (
                    <span>
                      <strong>Full Relocation:</strong> Moves entire {transferSourceItem.sku} balance ({transferSourceItem.quantityOnHand} {transferSourceItem.unitOfMeasure}) to <strong>{transferDestLocation.trim()}</strong>.
                    </span>
                  ) : (
                    <span>
                      <strong>Split Transfer:</strong> Keeps {transferSourceItem.quantityOnHand - transferQty} {transferSourceItem.unitOfMeasure} at source and provisions {transferQty} {transferSourceItem.unitOfMeasure} under {transferSourceItem.sku} at <strong>{transferDestLocation.trim()}</strong>.
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transfer Reference / Gate Pass #</label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="e.g. TRF-2026-001"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custodian / Audit Notes</label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Driver, bin shelf, or project reason..."
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferSourceItem || transferSourceItem.quantityOnHand <= 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2 font-semibold text-white shadow-xs cursor-pointer"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Confirm Warehouse Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: DELETE ITEM CONFIRMATION
          ============================================================== */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Delete Inventory SKU?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deletingItem.name}</strong> ({deletingItem.sku})?
              Current warehouse stock of {deletingItem.quantityOnHand} {deletingItem.unitOfMeasure} will be purged.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInventoryItem(deletingItem.id);
                  showToast(`Deleted SKU "${deletingItem.sku}".`);
                  setDeletingItem(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: DELETE INVOICE CONFIRMATION
          ============================================================== */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900">Delete Invoice?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete invoice <strong>{deletingInvoice.invoiceNumber}</strong> ({formatCurrency(deletingInvoice.grandTotalSAR)})
              issued to <strong>{deletingInvoice.clientOrVendor}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInventoryInvoice(deletingInvoice.id);
                  showToast(`Deleted invoice "${deletingInvoice.invoiceNumber}".`);
                  setDeletingInvoice(null);
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
