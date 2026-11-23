import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import {
  Employee,
  CorporateLegalEntity,
  Expense,
  AccountingCategory,
  TimesheetEntry,
  ManpowerSupplier,
  SuppliedWorker,
  ManpowerPOS,
  Villa,
  VillaDailyWorkEntity,
  Project,
  TemplateCustomization,
  TemplateType,
} from '../types';

/**
 * Format currency number with comma separation
 */
const fmt = (num: number, currency: string) => {
  return `${num.toLocaleString()} ${currency}`;
};

/**
 * Corporate PDF Slate Gray Border System
 * - Table headers/footers use crisp Slate-600 (#475569) borders
 * - Table body gridlines use clear Slate-400 (#94a3b8) borders
 * - Subtle divider/card rules use neutral Slate-300 (#cbd5e1)
 */
export const PDF_BORDER_OUTER: [number, number, number] = [203, 213, 225]; // #cbd5e1 Slate-300
export const PDF_BORDER_HEAD: [number, number, number] = [71, 85, 105]; // #475569 Slate-600
export const PDF_BORDER_CELL: [number, number, number] = [148, 163, 184]; // #94a3b8 Slate-400
export const PDF_BORDER_INNER: [number, number, number] = [203, 213, 225]; // #cbd5e1 Slate-300

/**
 * Loads an image from a URL, local path, or base64 string, returning a base64 data URL
 * so jsPDF can embed it seamlessly into PDF badges and dossiers.
 */
export const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:image/')) return cleanUrl;

  // 1. Try fetch with blob (handles local assets and CORS-enabled CDNs)
  try {
    const response = await fetch(cleanUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    // Continue to Image element fallback
  }

  // 2. Try Image object + Canvas
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve(null);
    }, 3500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      } catch (e) {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = cleanUrl;
  });
};

/**
 * Generates and downloads a multi-page vector PDF workforce directory roster.
 */
export const downloadWorkforceDirectoryPDF = (
  employees: Employee[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  filterInfo?: { department?: string; roleTier?: string; search?: string }
): void => {
  // A4 Landscape: 841.89 pt x 595.28 pt
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch margins

  // Top Accent Bar (Navy / Slate-900)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    46
  );

  // Document Title & Generation Timestamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235); // Blue #2563eb
  doc.text('OFFICIAL WORKFORCE DIRECTORY & PERSONNEL ROSTER', margin, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${dateStr} at ${timeStr}  |  HR Governance Division`, margin, 78);

  // Executive KPI summary box
  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + e.monthlyBaseSalary, 0);
  const totalAnnualPayroll = employees.reduce((sum, e) => sum + e.annualBaseSalary, 0);

  const kpiBoxY = 88;
  const kpiBoxHeight = 36;
  doc.setFillColor(239, 246, 255); // #eff6ff
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.9);
  doc.roundedRect(margin, kpiBoxY, pageWidth - margin * 2, kpiBoxHeight, 4, 4, 'FD');

  const colW = (pageWidth - margin * 2) / 4;

  // KPI 1: Total Personnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PERSONNEL', margin + 12, kpiBoxY + 14);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${employees.length} Active Records`, margin + 12, kpiBoxY + 28);

  // KPI 2: Total Monthly Base Payroll
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`MONTHLY BASE PAYROLL (${baseCurrency})`, margin + colW + 12, kpiBoxY + 14);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(fmt(totalMonthlyPayroll, baseCurrency), margin + colW + 12, kpiBoxY + 28);

  // KPI 3: Total Annual Base Payroll
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ANNUAL BASE PAYROLL (${baseCurrency})`, margin + colW * 2 + 12, kpiBoxY + 14);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(fmt(totalAnnualPayroll, baseCurrency), margin + colW * 2 + 12, kpiBoxY + 28);

  // KPI 4: Filter / Roster Scope
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AUDIT / SCOPE', margin + colW * 3 + 12, kpiBoxY + 14);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const filterDesc =
    filterInfo?.department && filterInfo.department !== 'all'
      ? `${filterInfo.department}`
      : 'All Departments';
  doc.text(filterDesc.substring(0, 26), margin + colW * 3 + 12, kpiBoxY + 28);

  // Table Data Mapping
  const headers = [
    'ID',
    'Full Name & Email',
    'Department & Operating Unit',
    'Designation',
    'Tier',
    'Nationality',
    'Phone',
    'Iqama / Passport',
    `Monthly Base (${baseCurrency})`,
    `Annual Base (${baseCurrency})`,
    'Status',
  ];

  const bodyData = employees.map((emp) => [
    emp.id,
    emp.isOutsourced
      ? `${emp.fullName} [AGENCY]\nSupplier: ${emp.supplierName || 'Contractor'}${emp.trade ? ` · ${emp.trade}` : ''}`
      : `${emp.fullName}\n${emp.email || '-'}`,
    `${emp.department || '-'}\n${emp.operatingDepartment || emp.department || '-'}${emp.assignedProjectName ? `\nProj: ${emp.assignedProjectName}` : ''}`,
    emp.designation || '-',
    (emp.roleTier || 'employee').replace('_', ' ').toUpperCase(),
    emp.nationality || '-',
    emp.phone || '-',
    `ID: ${emp.iqamaNationalId || '-'}\nPass: ${emp.passportNumber || '-'}`,
    (emp.monthlyBaseSalary || 0).toLocaleString(),
    (emp.annualBaseSalary || 0).toLocaleString(),
    (emp.status || 'active').replace('_', ' ').toUpperCase(),
  ]);

  // Render Table via autoTable
  autoTable(doc, {
    startY: kpiBoxY + kpiBoxHeight + 12,
    head: [headers],
    body: bodyData,
    foot: [
      [
        'TOTALS',
        `${employees.length} Active Personnel`,
        '',
        '',
        '',
        '',
        '',
        '',
        totalMonthlyPayroll.toLocaleString(),
        totalAnnualPayroll.toLocaleString(),
        'VERIFIED',
      ],
    ],
    margin: { left: margin, right: margin, bottom: 44 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.8,
    },
    footStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.8,
    },
    styles: {
      fontSize: 7,
      font: 'helvetica',
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 }, // ID
      1: { cellWidth: 105 }, // Full Name & Email / Agency
      2: { cellWidth: 110 }, // Dept & Unit
      3: { cellWidth: 85 }, // Designation
      4: { cellWidth: 55 }, // Tier
      5: { cellWidth: 60 }, // Nationality
      6: { cellWidth: 70 }, // Phone
      7: { cellWidth: 75 }, // Iqama/Passport
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 60 }, // Monthly Base
      9: { halign: 'right', cellWidth: 60 }, // Annual Base
      10: { halign: 'center', cellWidth: 41 }, // Status
    },
    didDrawPage: (data) => {
      // Footer on every page
      const currentYear = new Date().getFullYear();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // Slate-400

      // Left Footer: Corporate & Confidentiality
      doc.text(
        `© ${currentYear} ${corporateEntity.legalName} · ISO A4 Landscape Certified Workforce Roster · CR: ${corporateEntity.crNumber}`,
        margin,
        pageHeight - 16
      );

      // Right Footer: Page Numbers
      const pageNumber = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages
        ? (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
        : data.pageNumber;
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber}`,
        pageWidth - margin - 50,
        pageHeight - 16
      );
    },
  });

  // Endorsement & Certification Blocks on final page
  let signY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  if (signY + 50 > pageHeight - 25) {
    doc.addPage();
    signY = 36;
  }

  const sigColW = (pageWidth - margin * 2) / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PREPARED BY (HR TIMEKEEPER / RECORDER)', margin, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Workforce Registry & Operations Division', margin, signY + 10);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.line(margin, signY + 30, margin + sigColW - 20, signY + 30);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature: _______________________ Date: ____/____/2026', margin, signY + 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('VERIFIED BY (HR & COMPLIANCE DIRECTOR)', margin + sigColW, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Corporate Governance & Qiwa Audit', margin + sigColW, signY + 10);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.line(margin + sigColW, signY + 30, margin + sigColW * 2 - 20, signY + 30);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature: _______________________ Date: ____/____/2026', margin + sigColW, signY + 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('APPROVED FOR PAYROLL (CFO / EXECUTIVE MGMT)', margin + sigColW * 2, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Finance & Treasury Division', margin + sigColW * 2, signY + 10);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.line(margin + sigColW * 2, signY + 30, margin + sigColW * 3, signY + 30);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature: _______________________ Date: ____/____/2026', margin + sigColW * 2, signY + 39);

  // Save the PDF
  const filename = `workforce_directory_a4_${corporateEntity.companyName.toLowerCase().replace(/\s+/g, '_')}_${now.toISOString().substring(0, 10)}.pdf`;
  doc.save(filename);
};

/**
 * Generates and downloads an official single-page Personnel Dossier PDF sheet.
 */
export const downloadEmployeeDossierPDF = (
  emp: Employee,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  // A4 Portrait: 595.28 pt x 841.89 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Top Navy Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 10, 'F');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    52
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('OFFICIAL WORKFORCE PERSONNEL DOSSIER', margin, 74);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 84, pageWidth - margin, 84);

  // Identity Card Section Box
  const cardY = 96;
  const cardHeight = 84;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardHeight, 6, 6, 'FD');

  // Employee Name, Designation, Department
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(emp.fullName, margin + 16, cardY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${emp.designation}  ·  ${emp.roleTier.replace('_', ' ').toUpperCase()}`, margin + 16, cardY + 40);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${emp.department}  (${emp.operatingDepartment})`, margin + 16, cardY + 54);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Employee ID: ${emp.id}   |   Joined: ${emp.joiningDate}`, margin + 16, cardY + 70);

  // Status Badge on the right
  doc.setFillColor(220, 252, 231); // #dcfce7
  doc.roundedRect(pageWidth - margin - 80, cardY + 16, 64, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52); // #166534
  doc.text(emp.status.toUpperCase(), pageWidth - margin - 68, cardY + 28);

  // Section 1: Identification & Legal Credentials Table
  const credsY = cardY + cardHeight + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Identification & Travel Credentials', margin, credsY);

  autoTable(doc, {
    startY: credsY + 6,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    body: [
      ['Nationality', emp.nationality || '-', 'Corporate Email', emp.email || '-'],
      ['Contact Phone', emp.phone || '-', 'Employment Type', emp.employmentType || 'Full-time'],
      ['Iqama / National ID', emp.iqamaNationalId || '-', 'Reporting Manager', emp.managerName || 'Executive Committee'],
      ['Passport Number', emp.passportNumber || '-', 'Passport Expiry', emp.passportExpiry || '-'],
    ],
  });

  // Section 2: Compensation Package Structure Table
  const compY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. Compensation & Remuneration Structure (${baseCurrency})`, margin, compY);

  autoTable(doc, {
    startY: compY + 6,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Compensation Component', `Amount (${baseCurrency})`, 'Frequency', 'Notes / Regulations']],
    body: [
      ['Monthly Base Salary', emp.monthlyBaseSalary.toLocaleString(), 'Monthly', 'Core contractual base remuneration'],
      ['Housing Allowance', emp.housingAllowance.toLocaleString(), 'Monthly', '25% standard statutory allocation'],
      ['Transport Allowance', emp.transportAllowance.toLocaleString(), 'Monthly', 'Mobility allowance according to grade'],
      ['Other Allowances', emp.otherAllowances.toLocaleString(), 'Monthly', 'Phone, utilities, and discretionary subsidies'],
      ['Total Monthly Package', emp.totalMonthlyPackage.toLocaleString(), 'Monthly', 'Combined monthly payroll disbursement'],
      ['Annual Base Remuneration', emp.annualBaseSalary.toLocaleString(), 'Annual', 'Statutory baseline (Monthly × 12)'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 90 },
      2: { cellWidth: 70 },
      3: { cellWidth: 215 },
    },
  });

  // Section 3: Banking & Payroll Information
  const bankY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Banking & Corporate Disbursement Details', margin, bankY);

  autoTable(doc, {
    startY: bankY + 6,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4.5, lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    body: [
      ['Disbursement Bank IBAN:', emp.bankIban || corporateEntity.iban],
      ['Corporate Entity Account:', `${corporateEntity.legalName} (CR: ${corporateEntity.crNumber})`],
      ['Compliance Framework:', 'Kingdom of Saudi Arabia Labor Law & GOSI / WPS Regulations'],
    ],
  });

  // Section 4: Endorsement & Legal Verification
  const signY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  const boxWidth = (pageWidth - margin * 2 - 20) / 2;

  // Box 1: Employee Endorsement
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.rect(margin, signY, boxWidth, 64, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPLOYEE SIGNATURE & ACKNOWLEDGEMENT', margin + 8, signY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(emp.fullName, margin + 8, signY + 54);

  // Box 2: Corporate HR Seal
  doc.rect(margin + boxWidth + 20, signY, boxWidth, 64, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CORPORATE LEGAL & HR COMPLIANCE SEAL', margin + boxWidth + 28, signY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${corporateEntity.legalName} · Verified`, margin + boxWidth + 28, signY + 54);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Personnel Dossier · ${corporateEntity.companyName} · Document Generated on ${new Date().toLocaleString()}`,
    margin,
    pageHeight - 20
  );

  const filename = `employee_dossier_${emp.id}_${emp.fullName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

/**
 * Robust print helper:
 * Opens a dedicated printable window or triggers a clean print with fallback.
 */
export const printCleanDocument = (
  elementId: string,
  onFallbackPDF?: () => void
): boolean => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      window.print();
      return true;
    }
    window.print();
    return true;
  } catch (err) {
    console.error('Print failed or blocked by iframe environment:', err);
    if (onFallbackPDF) {
      onFallbackPDF();
    }
    return false;
  }
};

export interface TimesheetLedgerSummaryItem {
  employee: Employee;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  presentDays: number;
  leaves: number;
  absences: number;
}

/**
 * Generates and downloads an official multi-page vector PDF for the Monthly Timesheet Ledger
 */
export const downloadMonthlyTimesheetLedgerPDF = (
  monthName: string,
  year: number,
  employeeSummaries: TimesheetLedgerSummaryItem[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  stats: {
    totalHours: number;
    totalRegular: number;
    totalOvertime: number;
    complianceRate: number;
    activeStaff: number;
    workingDays: number;
  },
  orientation: 'landscape' | 'portrait' = 'landscape'
): void => {
  const isPortrait = orientation === 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isPortrait ? 26 : 28;
  const contentWidth = pageWidth - margin * 2;

  // Navy Top Accent
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isPortrait ? 13 : 15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 30);

  // ISO A4 Document Badge (top-right)
  const badgeW = isPortrait ? 105 : 118;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(pageWidth - margin - badgeW, 18, badgeW, 18, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isPortrait ? 'ISO A4 PORTRAIT (210×297)' : 'ISO A4 LANDSCAPE (297×210)',
    pageWidth - margin - badgeW / 2,
    30,
    { align: 'center' }
  );

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    43
  );

  // Document Title & Period
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isPortrait ? 10.5 : 12);
  doc.setTextColor(30, 41, 59);
  doc.text(`MONTHLY WORKFORCE ATTENDANCE & TIMESHEET LEDGER — ${monthName.toUpperCase()} ${year}`, margin, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  doc.text(
    `Generated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}  |  Official GOSI & WPS Compliance Record`,
    margin,
    72
  );

  // KPI Summary Bar
  const kpiY = 80;
  const kpiHeight = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, kpiY, contentWidth, kpiHeight, 3, 3, 'FD');

  const colW = contentWidth / 5;

  // KPI 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL WORKFORCE', margin + 8, kpiY + 12);
  doc.setFontSize(isPortrait ? 8.8 : 9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.activeStaff} Staff`, margin + 8, kpiY + 25);

  // KPI 2
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL HOURS', margin + colW + 8, kpiY + 12);
  doc.setFontSize(isPortrait ? 8.8 : 9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.totalHours.toLocaleString()}h (${stats.totalRegular}h Reg)`, margin + colW + 8, kpiY + 25);

  // KPI 3
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERTIME (+OT)', margin + colW * 2 + 8, kpiY + 12);
  doc.setFontSize(isPortrait ? 8.8 : 9.8);
  doc.setTextColor(180, 83, 9);
  doc.text(`+${stats.totalOvertime.toLocaleString()}h Billable`, margin + colW * 2 + 8, kpiY + 25);

  // KPI 4
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('ATTENDANCE RATE', margin + colW * 3 + 8, kpiY + 12);
  doc.setFontSize(isPortrait ? 8.8 : 9.8);
  doc.setTextColor(22, 101, 52);
  doc.text(`${stats.complianceRate}% Compliance`, margin + colW * 3 + 8, kpiY + 25);

  // KPI 5
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('WORKING DAYS', margin + colW * 4 + 8, kpiY + 12);
  doc.setFontSize(isPortrait ? 8.8 : 9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.workingDays}d (Fri/Sat Off)`, margin + colW * 4 + 8, kpiY + 25);

  const totalAllReg = employeeSummaries.reduce((acc, s) => acc + s.regularHours, 0);
  const totalAllOT = employeeSummaries.reduce((acc, s) => acc + s.overtimeHours, 0);
  const totalAllHrs = employeeSummaries.reduce((acc, s) => acc + s.totalHours, 0);
  const totalAllPresent = employeeSummaries.reduce((acc, s) => acc + s.presentDays, 0);
  const totalAllLeaves = employeeSummaries.reduce((acc, s) => acc + s.leaves, 0);
  const totalAllAbs = employeeSummaries.reduce((acc, s) => acc + s.absences, 0);

  if (isPortrait) {
    // Portrait A4 (contentWidth = 543.28 pt)
    const tableData = employeeSummaries.map((item, idx) => {
      const rate = stats.workingDays > 0 ? Math.min(100, Math.round((item.presentDays / stats.workingDays) * 100)) : 0;
      return [
        String(idx + 1),
        item.employee.id,
        item.employee.fullName,
        `${item.employee.department}\n${item.employee.designation}`,
        `${item.regularHours}h`,
        item.overtimeHours > 0 ? `+${item.overtimeHours}h` : '-',
        `${item.totalHours}h`,
        `${item.presentDays}d`,
        `${item.leaves}/${item.absences}`,
        `${rate}%`,
        item.totalHours > 0 ? (item.overtimeHours > 0 ? 'Overtime' : 'Logged') : 'Default 0h',
      ];
    });

    autoTable(doc, {
      startY: kpiY + kpiHeight + 10,
      margin: { left: margin, right: margin, bottom: 54 },
      theme: 'grid',
      styles: {
        fontSize: 6.8,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: PDF_BORDER_CELL,
        lineWidth: 0.65,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.8,
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.75,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7,
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.75,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      head: [['#', 'ID', 'Full Name', 'Dept & Role', 'Reg', 'OT', 'Total', 'Pres', 'L/A', 'Rate', 'Status']],
      body: tableData,
      foot: [
        [
          '',
          'TOTAL',
          `${employeeSummaries.length} Personnel`,
          'All Filtered Units',
          `${totalAllReg}h`,
          `+${totalAllOT}h`,
          `${totalAllHrs}h`,
          `${totalAllPresent}d`,
          `${totalAllLeaves}/${totalAllAbs}`,
          `${stats.complianceRate}%`,
          'Certified',
        ],
      ],
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { fontStyle: 'bold', cellWidth: 44 },
        2: { fontStyle: 'bold', cellWidth: 88 },
        3: { cellWidth: 112 },
        4: { halign: 'right', cellWidth: 36 },
        5: { halign: 'right', cellWidth: 36, textColor: [180, 83, 9] },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 38 },
        7: { halign: 'center', cellWidth: 34 },
        8: { halign: 'center', cellWidth: 36 },
        9: { halign: 'center', cellWidth: 34 },
        10: { halign: 'center', cellWidth: 67 },
      },
    });
  } else {
    // Landscape A4 (contentWidth = 785.89 pt)
    const tableData = employeeSummaries.map((item, idx) => {
      const rate = stats.workingDays > 0 ? Math.min(100, Math.round((item.presentDays / stats.workingDays) * 100)) : 0;
      return [
        String(idx + 1),
        item.employee.id,
        item.employee.fullName,
        item.employee.department,
        item.employee.designation,
        `${item.regularHours}h`,
        item.overtimeHours > 0 ? `+${item.overtimeHours}h` : '-',
        `${item.totalHours}h`,
        `${item.presentDays} d`,
        item.leaves > 0 ? `${item.leaves} d` : '-',
        item.absences > 0 ? `${item.absences} d` : '-',
        `${rate}%`,
        item.totalHours > 0 ? (item.overtimeHours > 0 ? 'Overtime' : 'Logged') : 'Default 0h',
      ];
    });

    autoTable(doc, {
      startY: kpiY + kpiHeight + 10,
      margin: { left: margin, right: margin, bottom: 54 },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 3.5,
        textColor: [30, 41, 59],
        lineColor: PDF_BORDER_CELL,
        lineWidth: 0.65,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.75,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.75,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      head: [
        [
          '#',
          'Emp ID',
          'Full Name',
          'Department',
          'Designation',
          'Reg (h)',
          'OT (h)',
          'Total (h)',
          'Present',
          'Leaves',
          'Absences',
          'Rate',
          'Status',
        ],
      ],
      body: tableData,
      foot: [
        [
          '',
          'Total',
          `${employeeSummaries.length} Employees`,
          'All Filtered Units',
          'Aggregate Summary',
          `${totalAllReg}h`,
          `+${totalAllOT}h`,
          `${totalAllHrs}h`,
          `${totalAllPresent} d`,
          `${totalAllLeaves} d`,
          `${totalAllAbs} d`,
          `${stats.complianceRate}%`,
          'Certified',
        ],
      ],
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { fontStyle: 'bold', cellWidth: 52 },
        2: { fontStyle: 'bold', cellWidth: 115 },
        3: { cellWidth: 112 },
        4: { cellWidth: 104 },
        5: { halign: 'right', cellWidth: 50 },
        6: { halign: 'right', cellWidth: 48, textColor: [180, 83, 9] },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 52 },
        8: { halign: 'center', cellWidth: 50 },
        9: { halign: 'center', cellWidth: 45 },
        10: { halign: 'center', cellWidth: 45 },
        11: { halign: 'center', cellWidth: 40 },
        12: { halign: 'center', cellWidth: 50 },
      },
    });
  }

  const lastTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Sign-off verification boxes (break to new page if not enough room)
  let signY = lastTableY + 14;
  if (signY + 52 > pageHeight - 24) {
    doc.addPage();
    signY = 30;
  }
  const signBoxW = (contentWidth - 24) / 3;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.75);

  // Timekeeper
  doc.roundedRect(margin, signY, signBoxW, 44, 3, 3, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('1. TIMEKEEPER CERTIFICATION', margin + 8, signY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text('Audited by Workforce Operations', margin + 8, signY + 23);
  doc.text('Sign: _____________________', margin + 8, signY + 36);

  // HR Director
  doc.roundedRect(margin + signBoxW + 12, signY, signBoxW, 44, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('2. HR DIRECTOR VERIFICATION', margin + signBoxW + 20, signY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text('Approved: Mona Al-Hassan (HR Director)', margin + signBoxW + 20, signY + 23);
  doc.text('Sign: _____________________', margin + signBoxW + 20, signY + 36);

  // CFO
  doc.roundedRect(margin + (signBoxW + 12) * 2, signY, signBoxW, 44, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('3. CFO / PAYROLL AUTHORIZATION', margin + (signBoxW + 12) * 2 + 8, signY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text('Payroll Release: Tariq Mansoor (CFO)', margin + (signBoxW + 12) * 2 + 8, signY + 23);
  doc.text('Sign: _____________________', margin + (signBoxW + 12) * 2 + 8, signY + 36);

  // Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Monthly Timesheet Ledger · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Period: ${monthName} ${year}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `ISO A4 ${isPortrait ? 'Portrait' : 'Landscape'} · Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const cleanMonth = monthName.toLowerCase().replace(/\s+/g, '_');
  doc.save(`monthly_timesheet_ledger_${cleanMonth}_${year}_a4.pdf`);
};

/**
 * Generates and downloads an individual employee's detailed monthly timesheet breakdown PDF
 */
export const downloadEmployeeTimesheetPDF = (
  employee: Employee,
  monthName: string,
  year: number,
  dailyRows: {
    day: number;
    dateString: string;
    dayName: string;
    isWeekend: boolean;
    status: string;
    regularHours: number;
    overtimeHours: number;
    notes: string;
  }[],
  totals: {
    regular: number;
    overtime: number;
    totalHours: number;
    presentDays: number;
    leaves: number;
    absences: number;
  },
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;

  // Navy Top Accent
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 30);

  // ISO A4 Portrait badge
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(pageWidth - margin - 105, 18, 105, 18, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ISO A4 PORTRAIT (210×297)', pageWidth - margin - 52.5, 30, { align: 'center' });

  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Currency: ${baseCurrency}`,
    margin,
    43
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`EMPLOYEE MONTHLY TIMESHEET & ATTENDANCE RECORD — ${monthName.toUpperCase()} ${year}`, margin, 60);

  // Employee Profile Card Box
  const cardY = 70;
  const cardH = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cardY, contentWidth, cardH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(employee.fullName, margin + 10, cardY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `ID: ${employee.id}  |  Dept: ${employee.department}  |  Designation: ${employee.designation}`,
    margin + 10,
    cardY + 33
  );

  // Summary Metrics Box
  const kpiY = cardY + cardH + 8;
  const kpiH = 34;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...PDF_BORDER_CELL);
  doc.roundedRect(margin, kpiY, contentWidth, kpiH, 3, 3, 'FD');

  const colW = contentWidth / 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('REGULAR HOURS', margin + 10, kpiY + 12);
  doc.setFontSize(9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totals.regular} Hours`, margin + 10, kpiY + 25);

  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERTIME HOURS', margin + colW + 10, kpiY + 12);
  doc.setFontSize(9.8);
  doc.setTextColor(180, 83, 9);
  doc.text(`+${totals.overtime} Hours`, margin + colW + 10, kpiY + 25);

  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL WORK HOURS', margin + colW * 2 + 10, kpiY + 12);
  doc.setFontSize(9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totals.totalHours} Hours`, margin + colW * 2 + 10, kpiY + 25);

  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('DAYS PRESENT / L / A', margin + colW * 3 + 10, kpiY + 12);
  doc.setFontSize(9.8);
  doc.setTextColor(22, 101, 52);
  doc.text(`${totals.presentDays}d (${totals.leaves}L / ${totals.absences}A)`, margin + colW * 3 + 10, kpiY + 25);

  // Day-by-Day Table (contentWidth = 535.28 pt)
  const tableData = dailyRows.map((r) => {
    let statusLabel = r.status.toUpperCase().replace('_', ' ');
    if (r.isWeekend && r.overtimeHours === 0) statusLabel = 'WEEKEND OFF';
    return [
      `Day ${r.day}`,
      r.dateString,
      r.dayName,
      statusLabel,
      `${r.regularHours}h`,
      r.overtimeHours > 0 ? `+${r.overtimeHours}h` : '-',
      r.notes || '-',
    ];
  });

  autoTable(doc, {
    startY: kpiY + kpiH + 10,
    margin: { left: margin, right: margin, bottom: 52 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.6,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    head: [['Day', 'Date', 'Day', 'Shift / Attendance Status', 'Reg (h)', 'OT (h)', 'Audit Notes / Tasks']],
    body: tableData,
    foot: [
      [
        'TOTAL',
        `${dailyRows.length} Days`,
        '',
        `${totals.presentDays}d Present · ${totals.leaves}L · ${totals.absences}A`,
        `${totals.regular}h`,
        `+${totals.overtime}h`,
        `Total Logged: ${totals.totalHours} Hours`,
      ],
    ],
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 68 },
      2: { cellWidth: 42 },
      3: { cellWidth: 112, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 50 },
      5: { halign: 'right', cellWidth: 48, textColor: [180, 83, 9] },
      6: { cellWidth: 173 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowMeta = dailyRows[data.row.index];
        if (rowMeta?.isWeekend) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Signatures (break to new page if not enough room)
  let signY = finalY + 14;
  if (signY + 48 > pageHeight - 24) {
    doc.addPage();
    signY = 30;
  }
  const signBoxW = (contentWidth - 16) / 2;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.75);

  doc.roundedRect(margin, signY, signBoxW, 40, 3, 3, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('EMPLOYEE ACKNOWLEDGEMENT', margin + 8, signY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${employee.fullName} · Signature: _____________________`, margin + 8, signY + 29);

  doc.roundedRect(margin + signBoxW + 16, signY, signBoxW, 40, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('HR DIVISION AUTHORIZATION', margin + signBoxW + 24, signY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized by HR Operations · Period: ${monthName} ${year}`, margin + signBoxW + 24, signY + 29);

  // Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Employee Timesheet Ledger · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `ISO A4 Portrait · Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const cleanName = employee.fullName.toLowerCase().replace(/\s+/g, '_');
  doc.save(`timesheet_${employee.id}_${cleanName}_${monthName.toLowerCase()}_${year}_a4.pdf`);
};

/**
/**
 * Generates and downloads a vector PDF of the official Employee ID Badge
 * Strictly one-sided, sized exactly to the standard ISO/IEC 7810 ID-1 CR80 dimensions
 * (2.125" × 3.375" / 54 mm × 85.6 mm).
 */
export const downloadEmployeeIDBadgePDF = async (
  employee: Employee,
  corporateEntity: CorporateLegalEntity
): Promise<void> => {
  // CR80 standard dimensions: 54 mm × 85.6 mm (portrait) = 153.07 pt × 242.65 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [153, 243],
  });

  const pageWidth = 153;
  const pageHeight = 243;

  // Pre-generate authentic QR Code data URL for credential verification
  let qrDataUrl = '';
  try {
    const qrPayload = JSON.stringify({
      company: corporateEntity.companyName,
      employeeId: employee.id,
      fullName: employee.fullName,
      designation: employee.designation,
      department: employee.department,
      iqamaNationalId: employee.iqamaNationalId,
      verified: true,
    });
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 160,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (err) {
    console.error('Failed to generate badge QR code', err);
  }

  // Load employee profile image as base64 Data URL for embedding
  let profilePhotoDataUrl: string | null = null;
  if (employee.profileImage) {
    try {
      profilePhotoDataUrl = await loadImageAsDataUrl(employee.profileImage);
    } catch (err) {
      console.warn('Could not load profile photo for ID badge PDF:', err);
    }
  }

  // Also load corporate logo if available
  let corporateLogoDataUrl: string | null = null;
  if (corporateEntity.logoUrl) {
    try {
      corporateLogoDataUrl = await loadImageAsDataUrl(corporateEntity.logoUrl);
    } catch (err) {
      console.warn('Could not load corporate logo for ID badge PDF:', err);
    }
  }

  // ========================================================
  // === ONE-SIDED ID BADGE (CR80: 54 × 85.6 MM) ===
  // ========================================================

  // Base card background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border with subtle rounded corner guide
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.roundedRect(1, 1, pageWidth - 2, pageHeight - 2, 4, 4, 'S');

  // Lanyard Slot Cutout Punch Indicator at Top Center
  doc.setFillColor(226, 232, 240);
  doc.roundedRect((pageWidth - 22) / 2, 3.5, 22, 3, 1.5, 1.5, 'F');

  // Top Navy Header Bar (Corporate Brand Header)
  const headerY = 9;
  const headerH = 25;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, headerY, pageWidth, headerH, 'F');

  // Corporate logo or text
  if (corporateLogoDataUrl) {
    try {
      const logoFmt = corporateLogoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(corporateLogoDataUrl, logoFmt, 6, headerY + 4.5, 16, 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(corporateEntity.companyName.toUpperCase().slice(0, 24), 26, headerY + 11.5);
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(147, 197, 253);
      doc.text('OFFICIAL STAFF CREDENTIAL', 26, headerY + 18.5);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(corporateEntity.companyName.toUpperCase(), pageWidth / 2, headerY + 11, { align: 'center' });
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(147, 197, 253);
      doc.text('OFFICIAL STAFF IDENTIFICATION CREDENTIAL', pageWidth / 2, headerY + 18.5, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(corporateEntity.companyName.toUpperCase(), pageWidth / 2, headerY + 11, { align: 'center' });
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(147, 197, 253);
    doc.text('OFFICIAL STAFF IDENTIFICATION CREDENTIAL', pageWidth / 2, headerY + 18.5, { align: 'center' });
  }

  // Blue accent line under header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, headerY + headerH, pageWidth, 1.5, 'F');

  // Employee Photo Frame & Profile Image Rendering
  const photoW = 54;
  const photoH = 58;
  const photoX = (pageWidth - photoW) / 2;
  const photoY = headerY + headerH + 5; // 9 + 25 + 1.5 + 5 = 40.5

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (profilePhotoDataUrl) {
    try {
      const imgFormat = profilePhotoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(profilePhotoDataUrl, imgFormat, photoX + 1, photoY + 1, photoW - 2, photoH - 2);
    } catch (imgErr) {
      console.warn('doc.addImage failed, falling back to monogram avatar:', imgErr);
      doc.setFillColor(241, 245, 249);
      doc.rect(photoX + 1, photoY + 1, photoW - 2, photoH - 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      const initials = employee.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
      doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 5, { align: 'center' });
    }
  } else {
    // Monogram initials fallback
    doc.setFillColor(241, 245, 249);
    doc.rect(photoX + 1, photoY + 1, photoW - 2, photoH - 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    const initials = employee.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 5, { align: 'center' });
  }

  // Crisp border over photo
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.rect(photoX, photoY, photoW, photoH, 'S');

  // Active status indicator dot on photo corner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.circle(photoX + photoW - 3, photoY + photoH - 3, 3.5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.circle(photoX + photoW - 3, photoY + photoH - 3, 3.5, 'S');

  // Employee Name (Centered)
  const nameY = photoY + photoH + 8.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(employee.fullName, pageWidth / 2, nameY, { align: 'center' });

  // Designation (Centered, Blue)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(37, 99, 235);
  doc.text(employee.designation, pageWidth / 2, nameY + 7, { align: 'center' });

  // Department (Centered, Slate)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text(employee.department, pageWidth / 2, nameY + 13.5, { align: 'center' });

  // Centered ID Badge Pill
  const pillW = 54;
  const pillH = 9;
  const pillX = (pageWidth - pillW) / 2;
  const pillY = nameY + 16.5;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`ID: ${employee.id}`, pageWidth / 2, pillY + 6.5, { align: 'center' });

  // Compact Employee Details Box
  const infoY = pillY + pillH + 3.5;
  const infoW = pageWidth - 16;
  const infoH = 22;
  const infoX = 8;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(infoX, infoY, infoW, infoH, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Iqama / ID: ${employee.iqamaNationalId || '-'}`, infoX + 4, infoY + 6.5);
  doc.text(`Nationality: ${employee.nationality || '-'}`, infoX + 4, infoY + 12.5);
  doc.text(`Joined: ${employee.joiningDate || '-'}`, infoX + 4, infoY + 18.5);

  doc.text(`CR No: ${corporateEntity.crNumber || '-'}`, infoX + infoW / 2 + 2, infoY + 6.5);
  doc.text(`Status: ${(employee.status || 'active').replace('_', ' ').toUpperCase()}`, infoX + infoW / 2 + 2, infoY + 12.5);
  doc.text(`Blood: ${employee.bloodGroup || 'O+'}`, infoX + infoW / 2 + 2, infoY + 18.5);

  // Scannable QR Code (Prominently Centered)
  const qrSize = 39;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = infoY + infoH + 3.5;

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 2, 2, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  // Scan Verification Prompt below QR Code
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(5, 150, 105);
  doc.text('SCAN QR CODE TO VERIFY IDENTITY', pageWidth / 2, qrY + qrSize + 5.5, { align: 'center' });

  // Micro Security Bar at bottom of card
  const footerH = 11;
  const footerY = pageHeight - footerH;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, footerY, pageWidth, footerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `CR80 (54 × 85.6 MM) · PROPERTY OF ${corporateEntity.companyName.toUpperCase()}`,
    pageWidth / 2,
    footerY + 7,
    { align: 'center' }
  );

  const cleanName = employee.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`id_badge_${employee.id}_${cleanName}_54x85.6mm.pdf`);
};

/**
 * Generates and downloads an official vector PDF Salary & Joining Advance Agreement Voucher.
 */
export const downloadSalaryAdvanceVoucherPDF = (
  employee: Employee,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const advance = employee.advance || {
    hasAdvance: true,
    amountSAR: 5000,
    purpose: 'Joining & Relocation Advance',
    installmentsCount: 5,
    monthlyDeductionSAR: 1000,
    disbursementDate: new Date().toISOString().substring(0, 10),
    disbursementMethod: 'Bank Wire' as const,
    voucherNumber: `ADV-${new Date().getFullYear()}-${employee.id.replace('EMP-', '')}`,
    notes: 'Approved under corporate onboarding relocation assistance terms.',
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Navy Top Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 36);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    50
  );
  doc.text(
    `${corporateEntity.address}  |  Tel: ${corporateEntity.phone}  |  ${corporateEntity.email}`,
    margin,
    62
  );

  // Voucher Status Badge Box
  const vchNum = advance.voucherNumber || `ADV-${new Date().getFullYear()}-${employee.id.replace('EMP-', '')}`;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(pageWidth - margin - 170, 24, 170, 44, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text('VOUCHER NUMBER', pageWidth - margin - 160, 38);
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text(vchNum, pageWidth - margin - 160, 56);

  // Document Title Header
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.line(margin, 76, pageWidth - margin, 76);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('SALARY & JOINING ADVANCE DISBURSEMENT VOUCHER', margin, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Executed on: ${advance.disbursementDate}  |  Payroll & Human Capital Management Division`,
    margin,
    109
  );

  // Employee Information Banner
  autoTable(doc, {
    startY: 120,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 120 },
      1: { cellWidth: 160 },
      2: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 120 },
      3: { cellWidth: 115 },
    },
    body: [
      [
        'Employee Name:',
        employee.fullName,
        'Employee ID:',
        employee.id,
      ],
      [
        'Designation / Role:',
        employee.designation,
        'Department:',
        employee.department,
      ],
      [
        'Iqama / National ID:',
        employee.iqamaNationalId,
        'Nationality:',
        employee.nationality,
      ],
      [
        'Monthly Base Salary:',
        `${employee.monthlyBaseSalary.toLocaleString()} ${baseCurrency}`,
        'Date of Joining:',
        employee.joiningDate,
      ],
      [
        'Disbursal Account / IBAN:',
        employee.bankIban || corporateEntity.iban,
        'Payment Channel:',
        advance.disbursementMethod || 'Bank Wire',
      ],
    ],
  });

  // Advance Metrics Highlight Box
  // @ts-ignore
  const empTableEndY = doc.lastAutoTable?.finalY || 215;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, empTableEndY + 8, pageWidth - margin * 2, 60, 4, 4, 'FD');

  const metricWidth = (pageWidth - margin * 2) / 3;

  // Metric 1: Principal Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ADVANCE GRANTED', margin + 14, empTableEndY + 25);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${advance.amountSAR.toLocaleString()} ${baseCurrency}`, margin + 14, empTableEndY + 45);

  // Metric 2: Repayment Tenure
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RECOVERY DURATION', margin + metricWidth + 14, empTableEndY + 25);
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`${advance.installmentsCount} Monthly Cycles`, margin + metricWidth + 14, empTableEndY + 45);

  // Metric 3: Monthly Payroll Deduction
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MONTHLY DEDUCTION / RECOVERY', margin + metricWidth * 2 + 14, empTableEndY + 25);
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(`${advance.monthlyDeductionSAR.toLocaleString()} ${baseCurrency}`, margin + metricWidth * 2 + 14, empTableEndY + 45);

  // Repayment Amortization Schedule Table
  const scheduleRows = [];
  const installments = advance.installmentsCount || 1;
  const monthlyDed = advance.monthlyDeductionSAR || advance.amountSAR / installments;
  let remaining = advance.amountSAR;

  const baseDate = new Date(advance.disbursementDate);
  for (let i = 1; i <= installments; i++) {
    const cycleDate = new Date(baseDate);
    cycleDate.setMonth(cycleDate.getMonth() + i);
    const monthName = cycleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const recovery = i === installments ? remaining : monthlyDed;
    remaining = Math.max(0, remaining - recovery);

    scheduleRows.push([
      `Cycle #${i}`,
      `${monthName} Payroll`,
      `${recovery.toLocaleString()} ${baseCurrency}`,
      `${remaining.toLocaleString()} ${baseCurrency}`,
      'Scheduled Automatic Deduction',
    ]);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SCHEDULED REPAYMENT AMORTIZATION TABLE', margin, empTableEndY + 85);

  autoTable(doc, {
    startY: empTableEndY + 92,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Installment', 'Payroll Month', 'Deduction Amount', 'Remaining Balance', 'Status']],
    body: scheduleRows,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Terms and Agreement Declaration
  // @ts-ignore
  const schedEndY = doc.lastAutoTable?.finalY || 460;

  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.roundedRect(margin, schedEndY + 12, pageWidth - margin * 2, 70, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('LEGAL ACKNOWLEDGEMENT & SALARY RECOVERY AUTHORIZATION', margin + 12, schedEndY + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text(
    `1. The undersigned employee acknowledges receipt of ${advance.amountSAR.toLocaleString()} ${baseCurrency} as an advance on future earnings for purpose: "${advance.purpose}".\n` +
    `2. The employee explicitly authorizes ${corporateEntity.companyName} to deduct ${advance.monthlyDeductionSAR.toLocaleString()} ${baseCurrency} from their monthly salary beginning on the first regular payroll cycle.\n` +
    `3. In the event of contract termination or departure prior to full recovery, the unliquidated balance shall be deducted in full from the final end-of-service indemnity settlement and dues.\n` +
    `4. Notes: ${advance.notes || 'No special stipulations. Standard company recovery applies.'}`,
    margin + 12,
    schedEndY + 38,
    { maxWidth: pageWidth - margin * 2 - 24 }
  );

  // Signatures Section
  const sigY = schedEndY + 98;
  const colSigW = (pageWidth - margin * 2 - 30) / 2;

  // Employee Signature Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, sigY, colSigW, 76, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('WORKFORCE MEMBER ACKNOWLEDGEMENT', margin + 10, sigY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Employee: ${employee.fullName}`, margin + 10, sigY + 30);
  doc.text(`Iqama / ID: ${employee.iqamaNationalId}`, margin + 10, sigY + 42);

  doc.setFont('courier', 'bolditalic');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Signed: ${employee.fullName.split(' ')[0]} / Authorized`, margin + 10, sigY + 64);

  // Management Approval Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin + colSigW + 30, sigY, colSigW, 76, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CORPORATE FINANCE & HR DISBURSAL APPROVAL', margin + colSigW + 40, sigY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Corporate Entity: ${corporateEntity.legalName}`, margin + colSigW + 40, sigY + 30);
  doc.text(`Officer: Khalid Al-Ghamdi (Chief Financial Officer)`, margin + colSigW + 40, sigY + 42);

  doc.setFont('courier', 'bolditalic');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Approved & Disbursed via Central Treasury', margin + colSigW + 40, sigY + 64);

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Financial Instrument · ${corporateEntity.companyName} · Form ADV-2026-v2 · Confidential`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );

  doc.save(`salary_advance_voucher_${employee.id}_${vchNum}.pdf`);
};

export interface TimesheetSalaryLedgerRow {
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  contractMonthlyBase: number;
  expectedHours: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  hourlyBaseRate: number;
  timesheetRegularPay: number;
  timesheetOvertimePay: number;
  timesheetEarnedBase: number;
  totalAllowances: number;
  timesheetTotalPayable: number;
  contractTotalPackage: number;
  varianceSAR: number;
}

/**
 * Generates and downloads an official landscape Timesheet-Based Salary Ledger PDF.
 */
export const downloadTimesheetSalaryLedgerPDF = (
  rows: TimesheetSalaryLedgerRow[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  periodInfo: {
    monthName: string;
    year: number;
    expectedStandardHours: number;
    department?: string;
    overtimeMultiplier?: number;
    divisorMethodName?: string;
  }
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  // Top Navy Header Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 30);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    43
  );

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(
    `TIMESHEET-BASED WORKFORCE COMPENSATION & SALARY LEDGER — ${periodInfo.monthName.toUpperCase()} ${periodInfo.year}`,
    margin,
    62
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const otBasis = periodInfo.overtimeMultiplier !== undefined ? `${periodInfo.overtimeMultiplier.toFixed(1)}× Hourly Base Rate` : '1.0× Hourly Base Rate';
  const divisorNote = periodInfo.divisorMethodName ? `  |  Divisor: ${periodInfo.divisorMethodName}` : '';
  doc.text(
    `Generated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}  |  Standard Working Hours: ${periodInfo.expectedStandardHours} hrs${divisorNote}  |  Overtime Basis: ${otBasis}`,
    margin,
    74
  );

  // KPI Summary Bar
  const totalWorkforceHours = rows.reduce((acc, r) => acc + r.totalHours, 0);
  const totalRegularHours = rows.reduce((acc, r) => acc + r.regularHours, 0);
  const totalOvertimeHours = rows.reduce((acc, r) => acc + r.overtimeHours, 0);
  const totalCalculatedPayroll = rows.reduce((acc, r) => acc + r.timesheetTotalPayable, 0);
  const totalContractPayroll = rows.reduce((acc, r) => acc + r.contractTotalPackage, 0);
  const totalOvertimePay = rows.reduce((acc, r) => acc + r.timesheetOvertimePay, 0);
  const netVariance = totalCalculatedPayroll - totalContractPayroll;

  const kpiBoxY = 82;
  const kpiBoxH = 36;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, kpiBoxY, pageWidth - margin * 2, kpiBoxH, 4, 4, 'FD');

  const colW = (pageWidth - margin * 2) / 4;

  // KPI 1: Total Timesheet Hours Logged
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TIMESHEET HOURS', margin + 10, kpiBoxY + 13);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalWorkforceHours.toLocaleString()} hrs (${totalRegularHours} reg / ${totalOvertimeHours} OT)`, margin + 10, kpiBoxY + 27);

  // KPI 2: Timesheet-Based Calculated Payroll
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CALCULATED TIMESHEET PAYROLL (${baseCurrency})`, margin + colW + 10, kpiBoxY + 13);
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${totalCalculatedPayroll.toLocaleString()} ${baseCurrency}`, margin + colW + 10, kpiBoxY + 27);

  // KPI 3: Total Overtime Liability
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const otKpiLabel = `OVERTIME COMPENSATION (${periodInfo.overtimeMultiplier !== undefined ? periodInfo.overtimeMultiplier.toFixed(1) : '1.0'}×)`;
  doc.text(otKpiLabel, margin + colW * 2 + 10, kpiBoxY + 13);
  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`+${totalOvertimePay.toLocaleString()} ${baseCurrency}`, margin + colW * 2 + 10, kpiBoxY + 27);

  // KPI 4: Net Variance vs Contract Base
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VARIANCE VS CONTRACT', margin + colW * 3 + 10, kpiBoxY + 13);
  doc.setFontSize(9.5);
  doc.setTextColor(netVariance >= 0 ? 16 : 225, netVariance >= 0 ? 185 : 29, netVariance >= 0 ? 129 : 72);
  doc.text(`${netVariance >= 0 ? '+' : ''}${netVariance.toLocaleString()} ${baseCurrency}`, margin + colW * 3 + 10, kpiBoxY + 27);

  // Table Data with Signature Column
  const headers = [
    'Emp ID',
    'Personnel & Role',
    'Department',
    'Contract Base',
    'Hours (Reg/OT)',
    'Total Hrs',
    `Rate (${baseCurrency}/h)`,
    'Timesheet Base',
    'Allowances',
    'Payable Total',
    'Variance',
    'Signature',
  ];

  const bodyData = rows.map((r) => [
    r.employeeId,
    `${r.fullName}\n${r.designation}`,
    r.department,
    r.contractMonthlyBase.toLocaleString(),
    `${r.regularHours}h / +${r.overtimeHours}h`,
    `${r.totalHours} hrs`,
    `${r.hourlyBaseRate.toFixed(1)}`,
    r.timesheetEarnedBase.toLocaleString(),
    r.totalAllowances.toLocaleString(),
    r.timesheetTotalPayable.toLocaleString(),
    `${r.varianceSAR >= 0 ? '+' : ''}${r.varianceSAR.toLocaleString()}`,
    '', // Dedicated Signature area with printed sign-off guide line
  ]);

  // Total footer row
  const footData = [[
    'TOTAL',
    `${rows.length} Accounts`,
    '-',
    rows.reduce((a, b) => a + b.contractMonthlyBase, 0).toLocaleString(),
    `${totalRegularHours}h / +${totalOvertimeHours}h`,
    `${totalWorkforceHours} hrs`,
    '-',
    rows.reduce((a, b) => a + b.timesheetEarnedBase, 0).toLocaleString(),
    rows.reduce((a, b) => a + b.totalAllowances, 0).toLocaleString(),
    totalCalculatedPayroll.toLocaleString(),
    `${netVariance >= 0 ? '+' : ''}${netVariance.toLocaleString()}`,
    'AUDITED',
  ]];

  autoTable(doc, {
    startY: kpiBoxY + kpiBoxH + 12,
    head: [headers],
    body: bodyData,
    foot: footData,
    margin: { left: margin, right: margin, bottom: 42 },
    theme: 'grid', // Colored grid borders
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 7.2,
      fontStyle: 'bold',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 6.8,
      font: 'helvetica',
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
      lineColor: PDF_BORDER_CELL,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { cellWidth: 104 },
      2: { cellWidth: 80 },
      3: { halign: 'right', cellWidth: 56 },
      4: { halign: 'center', cellWidth: 58 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 46 },
      6: { halign: 'right', cellWidth: 46 },
      7: { halign: 'right', cellWidth: 58 },
      8: { halign: 'right', cellWidth: 50 },
      9: { halign: 'right', fontStyle: 'bold', cellWidth: 66 },
      10: { halign: 'right', cellWidth: 50 },
      11: { halign: 'center', cellWidth: 76 }, // Signature Column
    },
    didDrawCell: (data) => {
      // Draw a subtle signature guide line inside the body cells of the Signature column
      if (data.section === 'body' && data.column.index === 11) {
        const cell = data.cell;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(cell.x + 6, cell.y + cell.height - 4, cell.x + cell.width - 6, cell.y + cell.height - 4);
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `© ${now.getFullYear()} ${corporateEntity.legalName} · Timesheet-Based Payroll & Hours Audit Ledger · Confidential`,
        margin,
        pageHeight - 16
      );
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - margin - 40,
        pageHeight - 16
      );
    },
  });

  // Render Authorized Signature & Endorsement Blocks with colored borders
  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const remainingSpace = pageHeight - finalTableY - 32;

  if (remainingSpace < 65) {
    doc.addPage('a4', 'landscape');
    // Top Navy Header Accent Bar on new page
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 8, 'F');
  }

  const signBlockY = remainingSpace < 65 ? 36 : finalTableY + 14;
  const signBoxW = (pageWidth - margin * 2 - 24) / 3;
  const signBoxH = 46;

  const authSignatories = [
    { title: 'PREPARED BY (PAYROLL OFFICER)', subtitle: 'Timesheet & hourly calculation verified' },
    { title: 'REVIEWED BY (HR & AUDIT MANAGER)', subtitle: 'Statutory compliance & attendance audit' },
    { title: 'APPROVED BY (MANAGING DIRECTOR)', subtitle: 'Approved for disbursement & bank WPS' },
  ];

  authSignatories.forEach((item, idx) => {
    const boxX = margin + idx * (signBoxW + 12);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...PDF_BORDER_OUTER);
    doc.setLineWidth(0.75);
    doc.roundedRect(boxX, signBlockY, signBoxW, signBoxH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.title, boxX + 8, signBlockY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.subtitle, boxX + 8, signBlockY + 18);

    // Signature line
    doc.setDrawColor(...PDF_BORDER_CELL);
    doc.setLineWidth(0.6);
    doc.line(boxX + 8, signBlockY + 36, boxX + signBoxW - 8, signBlockY + 36);

    doc.setFontSize(4.8);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & Date Stamp', boxX + 8, signBlockY + 42);
  });

  doc.save(`timesheet_salary_ledger_${periodInfo.monthName.toLowerCase()}_${periodInfo.year}.pdf`);
};

export interface EmployeePayslipPDFData {
  employee: Employee;
  monthName: string;
  year: number;
  payslipMode: 'timesheet' | 'contract';
  timesheet: {
    expectedHours: number;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    hourlyBaseRate: number;
    hourlyOvertimeRate: number;
    effectiveOvertimeMultiplier: number;
    timesheetRegularPay: number;
    timesheetOvertimePay: number;
    timesheetEarnedBase: number;
    totalAllowances: number;
    timesheetTotalPayable: number;
    contractTotalPackage: number;
    varianceSAR: number;
  };
  divisorMethodName?: string;
  isHolidayRateActive?: boolean;
}

/**
 * Generates and downloads an individual employee's official A4 Payslip & Remuneration Voucher PDF.
 */
export const downloadEmployeePayslipPDF = (
  data: EmployeePayslipPDFData,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const { employee, monthName, year, payslipMode, timesheet, divisorMethodName, isHolidayRateActive } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // 1. Top Navy Accent Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${corporateEntity.legalName}  |  CR: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}`,
    margin,
    45
  );

  // Document Title & Pay Period Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('OFFICIAL MONTHLY SALARY PAYSLIP & REMUNERATION STATEMENT', margin, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  doc.text(
    `Pay Period: ${monthName.toUpperCase()} ${year}  |  Calculation Basis: ${
      payslipMode === 'timesheet' ? 'Timesheet Logged Hours' : 'Fixed Monthly Contract'
    }  |  Issued: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
    margin,
    78
  );

  // 3. Employee Particulars Summary Box (2 columns)
  const empBoxY = 88;
  const empBoxH = 68;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, empBoxY, pageWidth - margin * 2, empBoxH, 4, 4, 'FD');

  const halfW = (pageWidth - margin * 2) / 2;

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPLOYEE NAME', margin + 12, empBoxY + 14);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(employee.fullName, margin + 12, empBoxY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPLOYEE ID & IQAMA / NAT ID', margin + 12, empBoxY + 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${employee.id}  ·  ${employee.iqamaNationalId} (${employee.nationality})`, margin + 12, empBoxY + 58);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DESIGNATION & DEPARTMENT', margin + halfW + 12, empBoxY + 14);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${employee.designation} (${employee.department})`, margin + halfW + 12, empBoxY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BANK DISBURSEMENT IBAN', margin + halfW + 12, empBoxY + 44);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(employee.bankIban || 'SA0000000000000000000000', margin + halfW + 12, empBoxY + 58);

  let currentY = empBoxY + empBoxH + 12;

  // 4. Timesheet Hours Audit & Rate Schedule (if timesheet mode)
  if (payslipMode === 'timesheet') {
    const tsBoxH = 46;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, tsBoxH, 4, 4, 'FD');

    const colW = (pageWidth - margin * 2) / 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text('STANDARD EXPECTED', margin + 12, currentY + 14);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${timesheet.expectedHours} hrs (${divisorMethodName || 'Standard'})`, margin + 12, currentY + 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text('LOGGED REGULAR HOURS', margin + colW + 12, currentY + 14);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${timesheet.regularHours.toFixed(1)} hrs`, margin + colW + 12, currentY + 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`OVERTIME HOURS (${timesheet.effectiveOvertimeMultiplier.toFixed(1)}×)`, margin + colW * 2 + 12, currentY + 14);
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9);
    doc.text(
      `+${timesheet.overtimeHours.toFixed(1)} hrs${isHolidayRateActive ? ' (Holiday)' : ''}`,
      margin + colW * 2 + 12,
      currentY + 30
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text(`HOURLY RATES (BASE / OT)`, margin + colW * 3 + 12, currentY + 14);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${timesheet.hourlyBaseRate.toFixed(1)} / ${timesheet.hourlyOvertimeRate.toFixed(1)} ${baseCurrency}`,
      margin + colW * 3 + 12,
      currentY + 30
    );

    currentY += tsBoxH + 12;
  }

  // 5. Itemized Remuneration Breakdown Table
  const tableData: (string | number)[][] = [];

  if (payslipMode === 'timesheet') {
    tableData.push([
      'Regular Working Hours Pay',
      `${timesheet.regularHours.toFixed(1)}h logged @ ${timesheet.hourlyBaseRate.toFixed(1)} ${baseCurrency}/hr`,
      `${timesheet.timesheetRegularPay.toLocaleString()} ${baseCurrency}`,
    ]);

    if (timesheet.overtimeHours > 0) {
      tableData.push([
        `Overtime Remuneration (${timesheet.effectiveOvertimeMultiplier.toFixed(1)}×)`,
        `${timesheet.overtimeHours.toFixed(1)}h OT @ ${timesheet.hourlyOvertimeRate.toFixed(1)} ${baseCurrency}/hr`,
        `+${timesheet.timesheetOvertimePay.toLocaleString()} ${baseCurrency}`,
      ]);
    }

    tableData.push([
      'Timesheet Earned Basic Salary Subtotal',
      'Regular Earned + Overtime Remuneration',
      `${timesheet.timesheetEarnedBase.toLocaleString()} ${baseCurrency}`,
    ]);
  } else {
    tableData.push([
      'Contractual Monthly Basic Salary',
      'Contract Agreement Baseline',
      `${employee.monthlyBaseSalary.toLocaleString()} ${baseCurrency}`,
    ]);
  }

  tableData.push([
    'Housing Allowance',
    'Fixed Monthly Corporate Allocation',
    `${employee.housingAllowance.toLocaleString()} ${baseCurrency}`,
  ]);

  tableData.push([
    'Transportation Allowance',
    'Fixed Monthly Corporate Allocation',
    `${employee.transportAllowance.toLocaleString()} ${baseCurrency}`,
  ]);

  if (employee.otherAllowances > 0) {
    tableData.push([
      'Other Corporate Professional Allowances',
      'Subsidized Professional Allowance',
      `${employee.otherAllowances.toLocaleString()} ${baseCurrency}`,
    ]);
  }

  const netPayable =
    payslipMode === 'timesheet' ? timesheet.timesheetTotalPayable : employee.totalMonthlyPackage;

  autoTable(doc, {
    startY: currentY,
    head: [['Compensation Element', 'Calculation Basis / Notes', `Amount (${baseCurrency})`]],
    body: tableData,
    foot: [
      [
        'NET SALARY PAYABLE (WPS PROTECTED)',
        `Full Monthly Remuneration · ${monthName} ${year}`,
        `${netPayable.toLocaleString()} ${baseCurrency}`,
      ],
    ],
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 5,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [16, 185, 129], // emerald-600
      fontSize: 9.5,
      fontStyle: 'bold',
      cellPadding: 6,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 200 },
      1: { cellWidth: 200, textColor: [100, 116, 139] },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 120 },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // 6. Annualized Comparison and WPS Certification Banner
  const infoY = finalY + 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, infoY, pageWidth - margin * 2, 38, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GOVERNANCE & STATUTORY COMPLIANCE', margin + 10, infoY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `This salary statement has been standards. ` +
      `Contract annual base: ${(employee.annualBaseSalary || employee.monthlyBaseSalary * 12).toLocaleString()} ${baseCurrency}. ` +
      `Disbursement channel: Corporate Payroll Clearing via  ${employee.bankIban || 'SA...'}.`,
    margin + 10,
    infoY + 26
  );

  // 7. Dual Signature Authorization Blocks
  const sigY = Math.min(infoY + 52, pageHeight - 75);
  const sigW = (pageWidth - margin * 2 - 20) / 2;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.rect(margin, sigY, sigW, 44, 'D');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('WORKFORCE MEMBER ACKNOWLEDGEMENT', margin + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${employee.fullName} (${employee.id})`, margin + 8, sigY + 24);
  doc.setFont('courier', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Signed electronically & verified', margin + 8, sigY + 36);

  // Payroll / HR Director Sign Box
  doc.rect(margin + sigW + 20, sigY, sigW, 44, 'D');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PAYROLL & TREASURY AUTHORIZATION', margin + sigW + 28, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Authorized Officer: Tariq Mansoor (CFO / Treasury)`, margin + sigW + 28, sigY + 24);
  doc.setFont('courier', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Corporate Treasury Disbursement Approved', margin + sigW + 28, sigY + 36);

  // Page Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `© ${now.getFullYear()} ${corporateEntity.legalName} · Official Salary Payslip · Confidential Document · Page 1 of 1`,
    margin,
    pageHeight - 14
  );

  const cleanName = employee.fullName.toLowerCase().replace(/\s+/g, '_');
  doc.save(`payslip_${employee.id}_${cleanName}_${monthName.toLowerCase()}_${year}.pdf`);
};

export interface DailyMatrixDayInfo {
  day: number;
  dayNameShort: string;
  isWeekend: boolean;
  dateString?: string;
}

/**
 * Generates and downloads an official printable BLANK Daily Matrix Grid PDF (Landscape A4).
 * Used by on-site timekeepers, project managers, and HR for physical sign-ins, shift tallies,
 * and certified manual attendance logging across all calendar days of the month.
 */
export const downloadDailyMatrixGridBlankPDF = (
  monthName: string,
  year: number,
  employees: Employee[],
  corporateEntity: CorporateLegalEntity,
  daysArray: DailyMatrixDayInfo[],
  filterInfo?: { department?: string; searchQuery?: string }
): void => {
  // A4 Landscape: 841.89 pt width x 595.28 pt height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 22;
  const contentWidth = pageWidth - margin * 2; // 797.89 pt

  // 1. Top Navy Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 7, 'F');

  // 2. Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 24);

  // ISO A4 Landscape Tag
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(pageWidth - margin - 130, 14, 130, 17, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('ISO A4 LANDSCAPE (297×210)', pageWidth - margin - 65, 25, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Official Site Workforce Timesheet Matrix`,
    margin,
    35
  );

  // 3. Document Title & Period
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text('DAILY ATTENDANCE & TIMESHEET MATRIX — BLANK SITE ROSTER', margin, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  const periodText = `PERIOD: ${monthName.toUpperCase()} ${year}  |  TOTAL ROSTER: ${employees.length} PERSONNEL${
    filterInfo?.department && filterInfo.department !== 'all' ? `  |  DEPARTMENT: ${filterInfo.department.toUpperCase()}` : ''
  }`;
  doc.text(periodText, margin, 59);

  // 4. Instructions & Legend Box
  const bannerY = 65;
  const bannerH = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, contentWidth, bannerH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SHIFT CODES & INSTRUCTIONS:', margin + 6, bannerY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'P: Present (8h)  |  1/2: Half Day (4h)  |  OT: Overtime (+hrs)  |  A: Absent  |  AL: Annual Leave  |  SL: Sick Leave  |  PH: Public Holiday  |  Shaded = Weekend (Fri/Sat).',
    margin + 112,
    bannerY + 9
  );
  doc.text(
    'All physical records must be in permanent ink. Any corrections or strike-throughs must be countersigned by the Site Timekeeper.',
    margin + 6,
    bannerY + 17
  );

  // 5. Build Table Columns and Data
  const numDays = daysArray.length;
  // Fixed columns: 16 (No) + 36 (ID) + 88 (Name) + 52 (Dept) + 25 (Reg) + 25 (OT) + 26 (Total) + 42 (Sign) = 310 pt
  const fixedWidths = 310;
  const availableForDays = contentWidth - fixedWidths; // ~487.89 pt (~15.74 pt/day for 31 days)
  const dayColWidth = availableForDays / numDays;

  const headRow: string[] = ['No.', 'Emp ID', 'Workforce Member', 'Dept'];
  daysArray.forEach((d) => {
    headRow.push(`${d.day}\n${d.dayNameShort.slice(0, 2)}`);
  });
  headRow.push('Reg', 'OT', 'Tot', 'Sign');

  const bodyRows = employees.map((emp, idx) => {
    const row: string[] = [
      String(idx + 1),
      emp.id,
      `${emp.fullName}\n${emp.designation}`,
      emp.department,
    ];

    daysArray.forEach((d) => {
      row.push(d.isWeekend ? 'OFF' : '');
    });

    row.push('', '', '', '');
    return row;
  });

  // Bottom physical tally footer row for daily headcount
  const footRow: string[] = ['', 'TALLY', `Daily Staff Headcount (${employees.length})`, 'Present / Day'];
  daysArray.forEach((d) => {
    footRow.push(d.isWeekend ? '-' : '');
  });
  footRow.push('', '', '', '');

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 36, halign: 'center', font: 'courier' },
    2: { cellWidth: 88, halign: 'left', fontStyle: 'bold' },
    3: { cellWidth: 52, halign: 'left' },
  };

  for (let i = 0; i < numDays; i++) {
    const colIdx = 4 + i;
    columnStyles[colIdx] = {
      cellWidth: dayColWidth,
      halign: 'center',
      valign: 'middle',
    };
  }

  const regColIdx = 4 + numDays;
  const otColIdx = 4 + numDays + 1;
  const totColIdx = 4 + numDays + 2;
  const signColIdx = 4 + numDays + 3;

  columnStyles[regColIdx] = { cellWidth: 25, halign: 'center', fontStyle: 'bold' };
  columnStyles[otColIdx] = { cellWidth: 25, halign: 'center', fontStyle: 'bold' };
  columnStyles[totColIdx] = { cellWidth: 26, halign: 'center', fontStyle: 'bold' };
  columnStyles[signColIdx] = { cellWidth: 42, halign: 'center' };

  autoTable(doc, {
    startY: bannerY + bannerH + 7,
    margin: { left: margin, right: margin, bottom: 60 },
    theme: 'grid',
    styles: {
      fontSize: 5.8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 0.6, right: 0.6 },
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.55,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.6,
      halign: 'center',
      valign: 'middle',
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.65,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 5.6,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.65,
    },
    columnStyles,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    didParseCell: (data) => {
      if (data.section === 'head') {
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length && daysArray[dayIndex].isWeekend) {
          data.cell.styles.fillColor = [51, 65, 85];
          data.cell.styles.textColor = [226, 232, 240];
        }
      } else if (data.section === 'body') {
        data.cell.styles.minCellHeight = 17;
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length) {
          if (daysArray[dayIndex].isWeekend) {
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.fontSize = 5;
          } else if (data.row.index % 2 === 1) {
            data.cell.styles.fillColor = [250, 251, 253];
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }
      } else if (data.section === 'foot') {
        data.cell.styles.minCellHeight = 15;
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length && daysArray[dayIndex].isWeekend) {
          data.cell.styles.fillColor = [226, 232, 240];
        }
      }
    },
  });

  // 6. Sign-off and Certification Blocks
  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (finalY + 50 > pageHeight - 18) {
    doc.addPage();
    finalY = 28;
  }

  const sigW = (contentWidth - 20) / 3;
  const sigH = 44;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.75);

  doc.roundedRect(margin, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('1. SITE TIMEKEEPER & ATTENDANCE RECORDER', margin + 6, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Full Name: _________________________________', margin + 6, finalY + 22);
  doc.text('Signature: _________________________________', margin + 6, finalY + 32);
  doc.text(`Date Verified: ____ / ____ / ${year}`, margin + 6, finalY + 40);

  doc.roundedRect(margin + sigW + 10, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('2. PROJECT SITE MANAGER / SUPERVISOR', margin + sigW + 16, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Full Name: _________________________________', margin + sigW + 16, finalY + 22);
  doc.text('Signature: _________________________________', margin + sigW + 16, finalY + 32);
  doc.text(`Date Verified: ____ / ____ / ${year}`, margin + sigW + 16, finalY + 40);

  doc.roundedRect(margin + (sigW + 10) * 2, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('3. HR GOVERNANCE & PAYROLL AUDIT', margin + (sigW + 10) * 2 + 6, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized: Corporate People Operations', margin + (sigW + 10) * 2 + 6, finalY + 22);
  doc.text('Signature: _________________________________', margin + (sigW + 10) * 2 + 6, finalY + 32);
  doc.text(`Date Authorized: ____ / ____ / ${year}`, margin + (sigW + 10) * 2 + 6, finalY + 40);

  // 7. Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Blank Physical Timekeeping Ledger  |  ${corporateEntity.companyName}  |  CR ${corporateEntity.crNumber}  |  Labor Law & WPS Compliance`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `ISO A4 Landscape · Ref: BLANK-MTX-${year}-${monthName.toUpperCase()} · Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const safeDept = filterInfo?.department && filterInfo.department !== 'all' ? `_${filterInfo.department.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
  const filename = `blank_daily_matrix_${monthName.toLowerCase()}_${year}${safeDept}_a4.pdf`;
  doc.save(filename);
};

/**
 * Generates and downloads an official Daily Matrix Grid PDF with populated working hours, overtime,
 * and attendance status codes (Landscape A4).
 */
export const downloadDailyMatrixGridWithHoursPDF = (
  monthName: string,
  year: number,
  employees: Employee[],
  corporateEntity: CorporateLegalEntity,
  daysArray: DailyMatrixDayInfo[],
  entriesMap: Map<string, TimesheetEntry>,
  defaultWorkHours: number,
  employeeTotals: Record<
    string,
    { regular: number; overtime: number; totalHours: number; presentDays: number; leaves: number; absences: number }
  >,
  filterInfo?: { department?: string; searchQuery?: string }
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 801.89 pt

  // 1. Top Navy Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 7, 'F');

  // 2. Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 24);

  // ISO A4 Landscape Tag
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(pageWidth - margin - 130, 14, 130, 17, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('ISO A4 LANDSCAPE (297×210)', pageWidth - margin - 65, 25, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Certified Workforce Working Hours & Shift Matrix`,
    margin,
    35
  );

  // 3. Document Title & Period
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text('DAILY ATTENDANCE & TIMESHEET MATRIX — LOGGED WORKING HOURS', margin, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  const periodText = `PERIOD: ${monthName.toUpperCase()} ${year}  |  ACTIVE ROSTER: ${employees.length} PERSONNEL${
    filterInfo?.department && filterInfo.department !== 'all' ? `  |  DEPARTMENT: ${filterInfo.department.toUpperCase()}` : ''
  }`;
  doc.text(periodText, margin, 59);

  // Calculate high-level totals
  let totalRegular = 0;
  let totalOvertime = 0;
  let totalHours = 0;
  employees.forEach((emp) => {
    const t = employeeTotals[emp.id];
    if (t) {
      totalRegular += t.regular;
      totalOvertime += t.overtime;
      totalHours += t.totalHours;
    }
  });

  // 4. Instructions & Legend Box
  const bannerY = 65;
  const bannerH = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, contentWidth, bannerH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RECORD KEY & AUDIT SUMMARY:', margin + 6, bannerY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Total Logged: ${totalHours.toLocaleString()}h (${totalRegular.toLocaleString()}h Reg + ${totalOvertime.toLocaleString()}h OT)  |  ` +
      'Codes: [8] = 8h Reg  |  [8+2] = Reg+OT  |  AL = Annual Leave  |  SL = Sick Leave  |  A = Absent  |  OFF = Weekend Rest',
    margin + 115,
    bannerY + 9
  );
  doc.text(
    'Certified under Saudi Labor Law & Wage Protection System (WPS). Fully reconciled with monthly compensation ledger.',
    margin + 6,
    bannerY + 17
  );

  // 5. Build Table Columns and Data
  const numDays = daysArray.length;
  // Fixed columns: 16 (No) + 35 (ID) + 88 (Name) + 50 (Dept) + 26 (Reg) + 24 (OT) + 26 (Tot) + 37 (Audit) = 302 pt
  const fixedWidths = 302;
  const availableForDays = contentWidth - fixedWidths; // ~499.89 pt (~16.12 pt/day for 31 days)
  const dayColWidth = availableForDays / numDays;

  const headRow: string[] = ['No.', 'Emp ID', 'Workforce Member', 'Dept'];
  daysArray.forEach((d) => {
    headRow.push(`${d.day}\n${d.dayNameShort.slice(0, 2)}`);
  });
  headRow.push('Reg', 'OT', 'Tot', 'Audit');

  const bodyRows = employees.map((emp, idx) => {
    const row: string[] = [
      String(idx + 1),
      emp.id,
      `${emp.fullName}\n${emp.designation}`,
      emp.department,
    ];

    daysArray.forEach((d) => {
      const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
      if (entry) {
        if (entry.status === 'annual_leave') {
          row.push('AL');
        } else if (entry.status === 'sick_leave') {
          row.push('SL');
        } else if (entry.status === 'absent') {
          row.push('A');
        } else if (entry.status === 'weekend') {
          row.push(entry.overtimeHours > 0 ? `+${entry.overtimeHours}` : 'OFF');
        } else if (entry.overtimeHours > 0) {
          row.push(entry.regularHours > 0 ? `${entry.regularHours}+${entry.overtimeHours}` : `+${entry.overtimeHours}`);
        } else {
          row.push(entry.regularHours > 0 ? `${entry.regularHours}` : '0');
        }
      } else if (d.isWeekend) {
        row.push('OFF');
      } else {
        row.push(defaultWorkHours > 0 ? `${defaultWorkHours}` : '0');
      }
    });

    const t = employeeTotals[emp.id] || { regular: 0, overtime: 0, totalHours: 0 };
    row.push(
      `${t.regular}`,
      t.overtime > 0 ? `+${t.overtime}` : '-',
      `${t.totalHours}`,
      t.totalHours > 0 ? 'Logged' : '-'
    );
    return row;
  });

  // Per-day staff present tally footer row
  const footRow: string[] = ['', 'TOTAL', `Daily Present Count (${employees.length})`, 'All Units'];
  daysArray.forEach((d) => {
    if (d.isWeekend) {
      footRow.push('-');
    } else {
      let present = 0;
      employees.forEach((emp) => {
        const entry = entriesMap.get(`${emp.id}_${d.dateString}`);
        if (entry) {
          if (entry.status === 'present' || entry.status === 'overtime') present++;
        } else if (defaultWorkHours > 0) {
          present++;
        }
      });
      footRow.push(String(present));
    }
  });
  footRow.push(`${totalRegular}`, totalOvertime > 0 ? `+${totalOvertime}` : '-', `${totalHours}`, 'Audit');

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 35, halign: 'center', font: 'courier' },
    2: { cellWidth: 88, halign: 'left', fontStyle: 'bold' },
    3: { cellWidth: 50, halign: 'left' },
  };

  for (let i = 0; i < numDays; i++) {
    const colIdx = 4 + i;
    columnStyles[colIdx] = {
      cellWidth: dayColWidth,
      halign: 'center',
      valign: 'middle',
    };
  }

  const regColIdx = 4 + numDays;
  const otColIdx = 4 + numDays + 1;
  const totColIdx = 4 + numDays + 2;
  const auditColIdx = 4 + numDays + 3;

  columnStyles[regColIdx] = { cellWidth: 26, halign: 'right', fontStyle: 'bold' };
  columnStyles[otColIdx] = { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] };
  columnStyles[totColIdx] = { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] };
  columnStyles[auditColIdx] = { cellWidth: 37, halign: 'center', textColor: [22, 101, 52] };

  autoTable(doc, {
    startY: bannerY + bannerH + 7,
    margin: { left: margin, right: margin, bottom: 60 },
    theme: 'grid',
    styles: {
      fontSize: 5.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 0.5, right: 0.5 },
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.55,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
      valign: 'middle',
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.65,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 5.5,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.65,
    },
    columnStyles,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    didParseCell: (data) => {
      if (data.section === 'head') {
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length && daysArray[dayIndex].isWeekend) {
          data.cell.styles.fillColor = [51, 65, 85];
          data.cell.styles.textColor = [226, 232, 240];
        }
      } else if (data.section === 'body') {
        data.cell.styles.minCellHeight = 16;
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length) {
          const val = String(data.cell.raw);
          if (daysArray[dayIndex].isWeekend) {
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.fontSize = 4.9;
          } else if (val === 'A') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'AL' || val === 'SL') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('+')) {
            data.cell.styles.fillColor = [254, 249, 195];
            data.cell.styles.textColor = [161, 98, 7];
            data.cell.styles.fontStyle = 'bold';
          } else if (val !== '0' && val !== '') {
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [6, 95, 70];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.row.index % 2 === 1) {
            data.cell.styles.fillColor = [250, 251, 253];
          }
        }
      } else if (data.section === 'foot') {
        const dayIndex = data.column.index - 4;
        if (dayIndex >= 0 && dayIndex < daysArray.length) {
          data.cell.styles.halign = 'center';
          if (daysArray[dayIndex].isWeekend) {
            data.cell.styles.fillColor = [226, 232, 240];
          }
        }
      }
    },
  });

  // Sign-off verification
  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (finalY + 50 > pageHeight - 18) {
    doc.addPage();
    finalY = 28;
  }

  const sigW = (contentWidth - 20) / 3;
  const sigH = 44;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.75);

  doc.roundedRect(margin, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('1. SITE TIMEKEEPER & ATTENDANCE AUDITOR', margin + 6, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Full Name: _________________________________', margin + 6, finalY + 22);
  doc.text('Hours Reconciled & Approved: [ Certified ]', margin + 6, finalY + 32);
  doc.text(`Date Verified: ____ / ____ / ${year}`, margin + 6, finalY + 40);

  doc.roundedRect(margin + sigW + 10, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('2. PROJECT SITE MANAGER / OPERATIONS HEAD', margin + sigW + 16, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Full Name: _________________________________', margin + sigW + 16, finalY + 22);
  doc.text('Signature: _________________________________', margin + sigW + 16, finalY + 32);
  doc.text(`Date Verified: ____ / ____ / ${year}`, margin + sigW + 16, finalY + 40);

  doc.roundedRect(margin + (sigW + 10) * 2, finalY, sigW, sigH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('3. HR GOVERNANCE & CENTRAL PAYROLL AUDIT', margin + (sigW + 10) * 2 + 6, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Certified for WPS Electronic Payroll Release', margin + (sigW + 10) * 2 + 6, finalY + 22);
  doc.text('Signature: _________________________________', margin + (sigW + 10) * 2 + 6, finalY + 32);
  doc.text(`Date Authorized: ____ / ____ / ${year}`, margin + (sigW + 10) * 2 + 6, finalY + 40);

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Daily Workforce Timesheet & Working Hours Matrix  |  ${corporateEntity.companyName}  |  CR ${corporateEntity.crNumber}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `ISO A4 Landscape · Ref: LOGGED-MTX-${year}-${monthName.toUpperCase()} · Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const safeDept = filterInfo?.department && filterInfo.department !== 'all' ? `_${filterInfo.department.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
  const filename = `daily_matrix_working_hours_${monthName.toLowerCase()}_${year}${safeDept}_a4.pdf`;
  doc.save(filename);
};

/**
 * Generates and downloads an official printable single Payment / Expense Voucher PDF (Portrait A4).
 */
export const downloadExpenseVoucherPDF = (
  expense: Expense,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // 1. Top Navy Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Corporate Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Corporate Treasury Settlement`,
    margin,
    52
  );

  // 3. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(29, 78, 216); // blue-700
  doc.text('OFFICIAL CORPORATE PAYMENT / EXPENSE VOUCHER', margin, 74);

  // Divider
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.line(margin, 82, pageWidth - margin, 82);

  // 4. Voucher Metadata Card
  const cardY = 92;
  const cardH = 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardH, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VOUCHER NUMBER', margin + 14, cardY + 18);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(expense.expenseNumber, margin + 14, cardY + 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUE DATE', margin + 180, cardY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(expense.date, margin + 180, cardY + 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('APPROVAL STATUS', pageWidth - margin - 120, cardY + 18);

  const statusColor: [number, number, number] =
    expense.status === 'approved'
      ? [22, 101, 52] // green
      : expense.status === 'rejected'
      ? [185, 28, 28] // red
      : [180, 83, 9]; // amber

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...statusColor);
  doc.text(expense.status.toUpperCase(), pageWidth - margin - 120, cardY + 34);

  // 5. Vendor & Classification Table
  const tableY = cardY + cardH + 16;
  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 6, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Attribute', 'Details', 'Attribute', 'Details']],
    body: [
      ['Payee / Vendor', expense.vendor, 'Accounting Category', expense.categoryName],
      ['Project Attribution', expense.projectName || 'General Corporate Operations', 'Receipt / Invoice Ref', expense.receiptRef || 'Direct Electronic Invoice'],
      ['Submitted By', expense.submittedBy, 'Authorized By', expense.approvedBy || 'Pending Admin Signoff'],
      ['Approval Date', expense.approvalDate || 'Pending', 'Currency Code', baseCurrency],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105, fillColor: [248, 250, 252] },
      1: { cellWidth: 150 },
      2: { fontStyle: 'bold', cellWidth: 105, fillColor: [248, 250, 252] },
      3: { cellWidth: 155 },
    },
  });

  // 6. Expenditure Specification & Amount
  const specY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY: specY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 8, textColor: [15, 23, 42], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Line Description / Expenditure Specification', `Amount (${baseCurrency})`]],
    body: [
      [
        `${expense.title}\n${expense.notes ? `Notes / Justification: ${expense.notes}` : 'No supplementary notes attached.'}`,
        `${expense.amountSAR.toLocaleString()} ${baseCurrency}`,
      ],
      [
        'TOTAL AUTHORIZED SETTLEMENT DISBURSEMENT',
        `${expense.amountSAR.toLocaleString()} ${baseCurrency}`,
      ],
    ],
    columnStyles: {
      0: { cellWidth: 380 },
      1: { cellWidth: 135, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  // 7. Payment Channel & Banking
  const bankY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bankY, pageWidth - margin * 2, 40, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CORPORATE SETTLEMENT CHANNEL', margin + 12, bankY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Disbursement Account: ${corporateEntity.bankName || 'The Saudi National Bank (SNB)'}  |  IBAN: ${corporateEntity.iban || 'SA44 1000 0001 2345 6789 0001'}`,
    margin + 12,
    bankY + 28
  );

  // 8. Triple Signature Blocks
  const sigY = bankY + 56;
  const sigW = (pageWidth - margin * 2 - 20) / 3;
  const sigH = 50;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  // Signature 1: Claimant
  doc.rect(margin, sigY, sigW, sigH, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('1. CLAIMANT / SUBMITTED BY', margin + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${expense.submittedBy}`, margin + 8, sigY + 26);
  doc.text(`Signature: ______________________`, margin + 8, sigY + 40);

  // Signature 2: Treasury Review
  doc.rect(margin + sigW + 10, sigY, sigW, sigH, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('2. TREASURY AUDIT & REVIEW', margin + sigW + 18, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Officer: Corporate Finance Desk', margin + sigW + 18, sigY + 26);
  doc.text('Status: Verified & Disbursed', margin + sigW + 18, sigY + 40);

  // Signature 3: Executive Approval
  doc.rect(margin + (sigW + 10) * 2, sigY, sigW, sigH, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('3. ADMIN / CFO AUTHORIZATION', margin + (sigW + 10) * 2 + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Signoff: ${expense.approvedBy || 'Pending'}`, margin + (sigW + 10) * 2 + 8, sigY + 26);
  doc.text(`Date: ${expense.approvalDate || '____ / ____ / 2026'}`, margin + (sigW + 10) * 2 + 8, sigY + 40);

  // 9. Document Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `© ${new Date().getFullYear()} ${corporateEntity.companyName} · Official Payment Voucher · ZATCA & Corporate Finance Compliance`,
    margin,
    pageHeight - 20
  );

  const cleanExpNum = expense.expenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`voucher_${cleanExpNum}.pdf`);
};

/**
 * Generates and downloads an official printable Corporate Expenses Ledger PDF (Landscape A4).
 */
export const downloadExpensesLedgerPDF = (
  expensesList: Expense[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  filterName?: string
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Navy Top Accent
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Corporate Operating Expenditure Ledger`,
    margin,
    44
  );

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(29, 78, 216);
  doc.text(
    `CORPORATE EXPENSES & EXPENDITURES LEDGER${filterName && filterName !== 'all' ? ` — ${filterName.toUpperCase()}` : ''}`,
    margin,
    62
  );

  const totalSum = expensesList.reduce((acc, e) => acc + e.amountSAR, 0);
  const approvedSum = expensesList
    .filter((e) => e.status === 'approved')
    .reduce((acc, e) => acc + e.amountSAR, 0);
  const pendingSum = expensesList
    .filter((e) => e.status === 'pending')
    .reduce((acc, e) => acc + e.amountSAR, 0);

  // KPI Summary Bar
  const kpiY = 74;
  const kpiH = 36;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, kpiY, pageWidth - margin * 2, kpiH, 4, 4, 'FD');

  const colW = (pageWidth - margin * 2) / 4;

  // KPI 1: Vouchers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VOUCHERS', margin + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${expensesList.length} Records`, margin + 12, kpiY + 27);

  // KPI 2: Total Sum
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL EXPENDITURE (${baseCurrency})`, margin + colW + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalSum.toLocaleString()} ${baseCurrency}`, margin + colW + 12, kpiY + 27);

  // KPI 3: Approved Sum
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`APPROVED SETTLEMENT (${baseCurrency})`, margin + colW * 2 + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text(`${approvedSum.toLocaleString()} ${baseCurrency}`, margin + colW * 2 + 12, kpiY + 27);

  // KPI 4: Pending Sum
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`PENDING AUTHORIZATION (${baseCurrency})`, margin + colW * 3 + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(`${pendingSum.toLocaleString()} ${baseCurrency}`, margin + colW * 3 + 12, kpiY + 27);

  // Table Data
  const tableData = expensesList.map((exp, idx) => [
    String(idx + 1),
    exp.expenseNumber,
    exp.title,
    exp.categoryName,
    exp.vendor,
    exp.projectName || 'General Ops',
    exp.date,
    exp.receiptRef || 'Direct',
    `${exp.amountSAR.toLocaleString()} ${baseCurrency}`,
    exp.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: kpiY + kpiH + 12,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 4.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['No.', 'Voucher Ref', 'Expense Description', 'Category', 'Payee / Vendor', 'Project', 'Date', 'Receipt Ref', `Amount (${baseCurrency})`, 'Status']],
    body: tableData,
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 55, font: 'courier', fontStyle: 'bold' },
      2: { cellWidth: 160 },
      3: { cellWidth: 95 },
      4: { cellWidth: 90 },
      5: { cellWidth: 80 },
      6: { cellWidth: 55, halign: 'center' },
      7: { cellWidth: 55 },
      8: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 65, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const val = String(data.cell.raw).toLowerCase();
        if (val === 'approved') {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (val === 'rejected') {
          data.cell.styles.textColor = [185, 28, 28];
        } else {
          data.cell.styles.textColor = [180, 83, 9];
        }
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Corporate Expenditure Ledger  |  ${corporateEntity.companyName}  |  Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-US')}  |  Confidential Financial Record`,
      pageWidth - margin - 180,
      pageHeight - 12
    );
  }

  doc.save(`corporate_expenses_ledger_${new Date().toISOString().substring(0, 10)}.pdf`);
};

/**
 * Generates and downloads an official Chart of Accounts & Budget Categories Ledger PDF (Landscape A4).
 */
export const downloadAccountingCategoriesPDF = (
  categories: AccountingCategory[],
  expensesList: Expense[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Navy Top Accent
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Chart of Accounts & Budget Allocations`,
    margin,
    44
  );

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(29, 78, 216);
  doc.text('ACCOUNTING CATEGORIES & BUDGET ALLOCATION LEDGER', margin, 62);

  const totalBudget = categories.reduce((sum, c) => sum + (c.budgetCapSAR || 0), 0);
  let totalSpent = 0;

  const tableData = categories.map((cat, idx) => {
    const catExpenses = expensesList.filter((e) => e.categoryId === cat.id);
    const spent = catExpenses.reduce((sum, e) => sum + e.amountSAR, 0);
    totalSpent += spent;
    const remaining = (cat.budgetCapSAR || 0) - spent;
    const pct = cat.budgetCapSAR > 0 ? Math.round((spent / cat.budgetCapSAR) * 100) : 0;

    return [
      String(idx + 1),
      cat.code,
      cat.name,
      cat.type,
      cat.description || '-',
      `${(cat.budgetCapSAR || 0).toLocaleString()} ${baseCurrency}`,
      `${spent.toLocaleString()} ${baseCurrency}`,
      `${remaining.toLocaleString()} ${baseCurrency}`,
      `${pct}%`,
      cat.status.toUpperCase(),
    ];
  });

  // KPI Summary Bar
  const kpiY = 74;
  const kpiH = 36;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, kpiY, pageWidth - margin * 2, kpiH, 4, 4, 'FD');

  const colW = (pageWidth - margin * 2) / 4;

  // KPI 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ACTIVE CATEGORIES', margin + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${categories.length} Accounts`, margin + 12, kpiY + 27);

  // KPI 2
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL BUDGET ALLOCATION (${baseCurrency})`, margin + colW + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalBudget.toLocaleString()} ${baseCurrency}`, margin + colW + 12, kpiY + 27);

  // KPI 3
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL ACTUAL SPENT (${baseCurrency})`, margin + colW * 2 + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text(`${totalSpent.toLocaleString()} ${baseCurrency}`, margin + colW * 2 + 12, kpiY + 27);

  // KPI 4
  const overallUtil = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERALL BUDGET UTILIZATION', margin + colW * 3 + 12, kpiY + 13);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${overallUtil}% Utilized`, margin + colW * 3 + 12, kpiY + 27);

  autoTable(doc, {
    startY: kpiY + kpiH + 12,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 4.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['No.', 'Code', 'Category Name', 'Type', 'Description', `Budget Cap (${baseCurrency})`, `Spent (${baseCurrency})`, `Remaining (${baseCurrency})`, 'Util %', 'Status']],
    body: tableData,
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 70, font: 'courier', fontStyle: 'bold' },
      2: { cellWidth: 130, fontStyle: 'bold' },
      3: { cellWidth: 85 },
      4: { cellWidth: 155 },
      5: { cellWidth: 75, halign: 'right' },
      6: { cellWidth: 75, halign: 'right' },
      7: { cellWidth: 75, halign: 'right' },
      8: { cellWidth: 40, halign: 'center' },
      9: { cellWidth: 45, halign: 'center' },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Chart of Accounts & Budget Categories Ledger  |  ${corporateEntity.companyName}  |  Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-US')}  |  Corporate Governance Division`,
      pageWidth - margin - 180,
      pageHeight - 12
    );
  }

  doc.save(`accounting_categories_chart_of_accounts.pdf`);
};

/**
 * Generates and downloads an official Manpower Purchase Order / Service Order (POS) PDF (A4 Portrait)
 */
export const downloadManpowerPOSPDF = (
  pos: ManpowerPOS,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // 1. Navy Top Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Procurement & Contract Services`,
    margin,
    45
  );

  // 3. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text('MANPOWER SERVICE PURCHASE ORDER (POS / LPO)', margin, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Official Labor Contracting Instrument  |  Form REF: POS-${pos.posNumber}  |  Saudi Labor Law & Ajeer Compliant`,
    margin,
    78
  );

  // 4. Metadata Card (2 Columns: Order Info & Supplier Info)
  const cardY = 88;
  const cardH = 74;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardH, 4, 4, 'FD');

  const halfW = (pageWidth - margin * 2) / 2;

  // Left column: POS Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('POS / ORDER NUMBER', margin + 12, cardY + 14);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.text(pos.posNumber, margin + 12, cardY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ASSIGNED PROJECT / SITE', margin + 12, cardY + 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(pos.projectName || 'General Field Operations', margin + 12, cardY + 58);

  // Right column: Supplier Info & Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MANPOWER SUPPLIER / CONTRACTOR', margin + halfW + 12, cardY + 14);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(pos.supplierName, margin + halfW + 12, cardY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PERIOD & PAYMENT TERMS', margin + halfW + 12, cardY + 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${pos.commencementDate} to ${pos.completionDate}  ·  ${pos.paymentTerms}`, margin + halfW + 12, cardY + 58);

  // Scope of Work Banner
  const scopeY = cardY + cardH + 10;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...PDF_BORDER_CELL);
  doc.roundedRect(margin, scopeY, pageWidth - margin * 2, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('SCOPE OF MANPOWER SERVICE:', margin + 8, scopeY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(pos.scopeOfWork || 'Deployment of certified technical manpower on site under corporate supervision.', margin + 8, scopeY + 22);

  // 5. Line Items Table
  const tableData = pos.lineItems.map((li, idx) => [
    String(idx + 1),
    li.tradeOrSkill,
    li.designation,
    li.workerName || 'Assigned Tradesperson',
    `${li.headcount} Pax`,
    `${li.hoursPerWorker} hrs`,
    `${li.totalHours} hrs`,
    `${li.hourlyRateSAR.toLocaleString()} ${baseCurrency}`,
    `${li.totalSAR.toLocaleString()} ${baseCurrency}`,
  ]);

  autoTable(doc, {
    startY: scopeY + 36,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 4.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [
      ['No.', 'Trade / Skill Category', 'Designation Title', 'Assigned Worker', 'Qty', 'Hrs/Pax', 'Total Hrs', 'Rate/hr', `Total (${baseCurrency})`],
    ],
    body: tableData,
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 105, fontStyle: 'bold' },
      2: { cellWidth: 95 },
      3: { cellWidth: 90, textColor: [71, 85, 105] },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 42, halign: 'right' },
      6: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 45, halign: 'right' },
      8: { cellWidth: 46, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // 6. Totals Box & Calculation
  const totalBoxW = 220;
  const totalBoxX = pageWidth - margin - totalBoxW;
  const totalBoxY = finalTableY + 10;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 64, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Net:', totalBoxX + 10, totalBoxY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${pos.subtotalSAR.toLocaleString()} ${baseCurrency}`, totalBoxX + totalBoxW - 10, totalBoxY + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`VAT (${pos.vatRate}%):`, totalBoxX + 10, totalBoxY + 32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${pos.vatAmountSAR.toLocaleString()} ${baseCurrency}`, totalBoxX + totalBoxW - 10, totalBoxY + 32, { align: 'right' });

  doc.setDrawColor(...PDF_BORDER_CELL);
  doc.line(totalBoxX + 10, totalBoxY + 40, totalBoxX + totalBoxW - 10, totalBoxY + 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235);
  doc.text('GRAND TOTAL:', totalBoxX + 10, totalBoxY + 54);
  doc.text(`${pos.grandTotalSAR.toLocaleString()} ${baseCurrency}`, totalBoxX + totalBoxW - 10, totalBoxY + 54, { align: 'right' });

  // 7. Terms & Compliance Declaration
  const termsY = totalBoxY + 74;
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.roundedRect(margin, termsY, pageWidth - margin * 2, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14);
  doc.text('LEGAL & SAUDI LABOR COMPLIANCE STIPULATIONS:', margin + 8, termsY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 53, 15);
  doc.text(
    '1. Supplier certifies all personnel hold valid Iqamas, Qiwa work authorization, and active Ajeer temporary assignment contracts.\n' +
    '2. Invoices must be supported by certified monthly timesheet attendance summaries duly signed by the Project Site Manager.\n' +
    '3. Supplier remains solely responsible for medical insurance, GOSI contributions, occupational safety, and WPS salary disbursement.',
    margin + 8,
    termsY + 22,
    { maxWidth: pageWidth - margin * 2 - 16 }
  );

  // 8. Signatures
  const sigY = Math.min(termsY + 54, pageHeight - 65);
  const sigW = (pageWidth - margin * 2 - 20) / 3;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.setFillColor(255, 255, 255);

  doc.roundedRect(margin, sigY, sigW, 46, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROCUREMENT & CONTRACTS', margin + 6, sigY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`Issued by: ${pos.authorizedBy || 'Corporate Procurement'}`, margin + 6, sigY + 22);
  doc.text(`Date: ${pos.issueDate}`, margin + 6, sigY + 32);
  doc.text('Status: APPROVED & DISPATCHED', margin + 6, sigY + 41);

  doc.roundedRect(margin + sigW + 10, sigY, sigW, 46, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT SITE MANAGER', margin + sigW + 16, sigY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site: ${pos.projectName || 'General Site'}`, margin + sigW + 16, sigY + 22);
  doc.text('Workforce Reception Authorized', margin + sigW + 16, sigY + 32);
  doc.text('Signature: ______________________', margin + sigW + 16, sigY + 41);

  doc.roundedRect(margin + (sigW + 10) * 2, sigY, sigW, 46, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER ACCEPTANCE & STAMP', margin + (sigW + 10) * 2 + 6, sigY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Supplier: ${pos.supplierName}`, margin + (sigW + 10) * 2 + 6, sigY + 22);
  doc.text('Authorized Representative Signature', margin + (sigW + 10) * 2 + 6, sigY + 32);
  doc.text('Stamp & Date: ___________________', margin + (sigW + 10) * 2 + 6, sigY + 41);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Corporate Service Purchase Order  |  ${corporateEntity.companyName}  |  Ref: ${pos.posNumber}  |  Page 1 of 1`,
    margin,
    pageHeight - 12
  );

  doc.save(`service_order_pos_${pos.posNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
};

/**
 * Generates and downloads an official Manpower Supplier Dossier & Compliance Profile PDF
 */
export const downloadManpowerSupplierDossierPDF = (
  supplier: ManpowerSupplier,
  workers: SuppliedWorker[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Corporate Legal Records  |  CR: ${corporateEntity.crNumber}  |  VAT: ${corporateEntity.vatNumber}`, margin, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text('MANPOWER SUPPLIER COMPLIANCE DOSSIER & PROFILE', margin, 66);

  // Supplier Card
  const cardY = 78;
  const cardH = 88;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardH, 4, 4, 'FD');

  const halfW = (pageWidth - margin * 2) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(supplier.name, margin + 12, cardY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Legal Name: ${supplier.legalEntityName}`, margin + 12, cardY + 34);
  doc.text(`CR Number: ${supplier.crNumber}  |  VAT ID: ${supplier.vatNumber}`, margin + 12, cardY + 48);
  doc.text(`City & Address: ${supplier.city}, ${supplier.address || 'Kingdom of Saudi Arabia'}`, margin + 12, cardY + 62);
  doc.text(`Supplied Trades: ${supplier.suppliedTrades.join(', ')}`, margin + 12, cardY + 76);

  // Right Side Metrics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COMPLIANCE SCORE & STATUS', margin + halfW + 12, cardY + 20);
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text(`${supplier.complianceScore}% Verified (${supplier.status.toUpperCase()})`, margin + halfW + 12, cardY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Agreement Period: ${supplier.agreementStartDate} to ${supplier.agreementEndDate}`, margin + halfW + 12, cardY + 50);
  doc.text(`Payment Terms: ${supplier.paymentTerms}`, margin + halfW + 12, cardY + 64);
  doc.text(`Total Invoiced: ${supplier.totalInvoicedSAR.toLocaleString()} ${baseCurrency}`, margin + halfW + 12, cardY + 78);

  // Active Deployed Personnel Table
  const tableData = workers.map((w, idx) => [
    String(idx + 1),
    w.id,
    w.fullName,
    w.trade,
    w.designation,
    w.assignedProjectName || 'General Site',
    w.iqamaOrWorkPermit,
    `${w.hourlyRateSAR} ${baseCurrency}`,
    `${w.monthlyHoursLogged}h`,
    w.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: cardY + cardH + 14,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 4.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['No.', 'Worker ID', 'Full Name', 'Trade / Skill', 'Designation', 'Project', 'Iqama / Permit', 'Rate/hr', 'Hours', 'Status']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No personnel currently registered under this supplier', '-', '-', '-', '-', '-', '-', '-']],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Signatures
  const sigY = Math.min(finalY + 20, pageHeight - 65);
  const sigW = (pageWidth - margin * 2 - 20) / 2;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, sigY, sigW, 44, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('CORPORATE VENDOR MANAGEMENT', margin + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Supplier contract vetted and compliant with Qiwa & Ajeer frameworks.', margin + 8, sigY + 26);
  doc.text(`Authorized by: Head of Procurement  ·  Date: ${new Date().toLocaleDateString()}`, margin + 8, sigY + 36);

  doc.roundedRect(margin + sigW + 20, sigY, sigW, 44, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER CORPORATE REPRESENTATIVE', margin + sigW + 28, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contact: ${supplier.contactPerson} (${supplier.phone})`, margin + sigW + 28, sigY + 26);
  doc.text('Certified Corporate Seal & Signature', margin + sigW + 28, sigY + 36);

  doc.save(`manpower_supplier_${supplier.code.toLowerCase()}_dossier.pdf`);
};

/**
 * Generates and downloads an individual Supplied Worker Deployment Dossier & Ajeer Labor Record PDF
 */
export const downloadSuppliedWorkerDossierPDF = (
  worker: SuppliedWorker,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 34);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Outsourced Workforce Management  |  CR: ${corporateEntity.crNumber}  |  VAT: ${corporateEntity.vatNumber}`, margin, 47);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text('SUPPLIED WORKER DEPLOYMENT DOSSIER & SITE CREDENTIAL', margin, 70);

  // Profile Card
  const cardY = 84;
  const cardH = 135;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardH, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(worker.fullName, margin + 14, cardY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(`${worker.trade}  ·  ${worker.designation}`, margin + 14, cardY + 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Worker ID: ${worker.id}`, margin + 14, cardY + 54);
  doc.text(`Iqama / Work Permit #: ${worker.iqamaOrWorkPermit}`, margin + 14, cardY + 68);
  doc.text(`Sponsoring Supplier: ${worker.supplierName}`, margin + 14, cardY + 82);
  doc.text(`Assigned Project: ${worker.assignedProjectName || 'General Project Site'}`, margin + 14, cardY + 96);
  doc.text(`Mobilization Date: ${worker.joiningDate}  |  Contact Phone: ${worker.contactPhone || 'On File'}`, margin + 14, cardY + 110);
  doc.text(`Deployment Status: ${worker.status.toUpperCase()}  |  Compliance: Ajeer Verified`, margin + 14, cardY + 124);

  // Financial Commitment Table
  const tableY = cardY + cardH + 16;
  const monthlyCost = worker.hourlyRateSAR * worker.monthlyHoursLogged;

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 6, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Attribute', 'Particulars', 'Financial Rate']],
    body: [
      ['Contracted Hourly Rate', 'Standard approved labor contracting tariff', `${worker.hourlyRateSAR.toLocaleString()} ${baseCurrency}/hr`],
      ['Monthly Logged Hours', 'Verified by site timesheet ledger', `${worker.monthlyHoursLogged} Hours`],
      ['Monthly Gross Commitment', 'Payable to supplier upon verified timesheet claim', `${monthlyCost.toLocaleString()} ${baseCurrency}`],
      ['Contracting Agency', 'Prime labor supplier entity', worker.supplierName],
      ['Project Site Assignment', 'Designated operational work front', worker.assignedProjectName || 'Central Site Deployment'],
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Authorization Signatures
  const sigY = Math.min(finalY + 24, pageHeight - 80);
  const sigW = (pageWidth - margin * 2 - 20) / 2;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, sigY, sigW, 50, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT SITE SUPERVISION', margin + 8, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Worker received on site and cleared for safety protocols.', margin + 8, sigY + 28);
  doc.text('Site Superintendent Signature: ______________________', margin + 8, sigY + 40);

  doc.roundedRect(margin + sigW + 20, sigY, sigW, 50, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('HR & WORKFORCE GOVERNANCE', margin + sigW + 28, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text('Permit cross-referenced with Qiwa/Ajeer portal records.', margin + sigW + 28, sigY + 28);
  doc.text('Compliance Officer Signature: ______________________', margin + sigW + 28, sigY + 40);

  doc.save(`supplied_worker_${worker.id.toLowerCase()}_dossier.pdf`);
};

/**
 * Generates and downloads an official landscape Villa & Units Contracting Master Ledger PDF.
 */
export const downloadVillaLedgerPDF = (
  villas: Villa[],
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  filterInfo?: { project?: string; status?: string; block?: string }
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  // Top Navy Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 28);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Classification: General Contracting & Villa Construction`,
    margin,
    41
  );

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text('PROJECTS & VILLA CONTRACTING MASTER LEDGER', margin, 58);

  const now = new Date();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const filterDesc = [
    filterInfo?.project ? `Project: ${filterInfo.project}` : null,
    filterInfo?.block ? `Block: ${filterInfo.block}` : null,
    filterInfo?.status ? `Status: ${filterInfo.status}` : null,
  ].filter(Boolean).join('  |  ');
  doc.text(
    `Generated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}  |  Records: ${villas.length} Villa Units${filterDesc ? `  |  Filter: ${filterDesc}` : ''}`,
    margin,
    70
  );

  // Metrics Bar
  const totalUnits = villas.reduce((sum, v) => sum + (v.villaQuantity || 1), 0);
  const totalContractVal = villas.reduce((sum, v) => sum + ((v.contractPriceSAR || 0) * (v.villaQuantity || 1)), 0);
  const totalCustomCount = villas.filter((v) => v.customVilla).length;
  const completedCount = villas.filter((v) => v.constructionStatus === 'completed' || v.constructionStatus === 'handover_ready').length;

  const kpiBoxY = 78;
  const kpiBoxH = 34;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, kpiBoxY, pageWidth - margin * 2, kpiBoxH, 4, 4, 'FD');

  const colW = (pageWidth - margin * 2) / 4;

  // Metric 1: Total Units
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VILLA UNITS', margin + 10, kpiBoxY + 12);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalUnits} Units (${villas.length} Records)`, margin + 10, kpiBoxY + 26);

  // Metric 2: Total Contract Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL CONTRACT VALUE (${baseCurrency})`, margin + colW + 10, kpiBoxY + 12);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${totalContractVal.toLocaleString()} ${baseCurrency}`, margin + colW + 10, kpiBoxY + 26);

  // Metric 3: Custom Villas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CUSTOM BESPOKE VILLAS', margin + colW * 2 + 10, kpiBoxY + 12);
  doc.setFontSize(10);
  doc.setTextColor(147, 51, 234); // purple
  doc.text(`${totalCustomCount} Custom Spec Units`, margin + colW * 2 + 10, kpiBoxY + 26);

  // Metric 4: Handover & Completed
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('HANDOVER READY / COMPLETED', margin + colW * 3 + 10, kpiBoxY + 12);
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235); // blue
  doc.text(`${completedCount} / ${villas.length} Units`, margin + colW * 3 + 10, kpiBoxY + 26);

  // Table
  const tableData = villas.map((v) => [
    v.blockNo,
    v.villaNo,
    v.customVilla ? `${v.villaType} [CUSTOM]` : v.villaType,
    `${v.villaQuantity || 1}`,
    v.assignedEmployeeName ? `${v.projectName || 'General'}\nEng: ${v.assignedEmployeeName}` : (v.projectName || 'General Compound'),
    v.constructionStatus.toUpperCase().replace('_', ' '),
    v.builtUpAreaSqm ? `${v.builtUpAreaSqm} m²` : '-',
    (v.contractPriceSAR || 0).toLocaleString(),
    ((v.contractPriceSAR || 0) * (v.villaQuantity || 1)).toLocaleString(),
    v.handoverTargetDate || 'Scheduled',
    v.clientName || 'Private Client',
  ]);

  autoTable(doc, {
    startY: kpiBoxY + kpiBoxH + 12,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      'Block No.',
      'Villa No.',
      'Villa Type',
      'Qty',
      'Project',
      'Status',
      'Built Area',
      `Unit Price (${baseCurrency})`,
      `Total Value (${baseCurrency})`,
      'Handover Date',
      'Client / Purchaser',
    ]],
    body: tableData,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 450;

  // Signatures / Stamps
  const sigY = Math.min(finalY + 16, pageHeight - 65);
  const sigW = (pageWidth - margin * 2 - 30) / 3;

  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, sigY, sigW, 45, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT CHIEF ENGINEER', margin + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Specifications and structural quantities verified.', margin + 8, sigY + 24);
  doc.text('Signature: __________________________', margin + 8, sigY + 36);

  doc.roundedRect(margin + sigW + 15, sigY, sigW, 45, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('COMMERCIAL & CONTRACTS MANAGER', margin + sigW + 23, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text('Ledger balances reconciled with master contracts.', margin + sigW + 23, sigY + 24);
  doc.text('Signature: __________________________', margin + sigW + 23, sigY + 36);

  doc.roundedRect(margin + (sigW + 15) * 2, sigY, sigW, 45, 3, 3, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('MANAGING DIRECTOR / EXECUTIVE OFFICE', margin + (sigW + 15) * 2 + 8, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text('Approved for corporate construction execution.', margin + (sigW + 15) * 2 + 8, sigY + 24);
  doc.text('Signature: __________________________', margin + (sigW + 15) * 2 + 8, sigY + 36);

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Property Deed & Engineering Ledger · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Riyadh, KSA`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  doc.save(`akash_villa_contracting_ledger_${now.toISOString().slice(0, 10)}.pdf`);
};

/**
 * Generates and downloads an individual Villa Specification & Contract Deed PDF.
 */
export const downloadVillaSpecificationDeedPDF = (
  villa: Villa,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Top Navy Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  General Contracting & Real Estate Development`,
    margin,
    46
  );

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text('VILLA SPECIFICATION & CONTRACT DEED', margin, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reference Deed ID: VIL-DEED-${villa.blockNo}-${villa.villaNo}  |  Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 80);

  // Header Box: Block & Villa Number Banner
  const bannerY = 92;
  const bannerH = 50;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, pageWidth - margin * 2, bannerH, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`BLOCK NO: ${villa.blockNo}    |    VILLA NO: ${villa.villaNo}`, margin + 14, bannerY + 22);

  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(`Type: ${villa.villaType}   ${villa.customVilla ? '★ [CUSTOM BESPOKE SPECIFICATION]' : '[STANDARD BLUEPRINT]'}`, margin + 14, bannerY + 38);

  const statusBadge = `STATUS: ${villa.constructionStatus.toUpperCase().replace('_', ' ')}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text(statusBadge, pageWidth - margin - 150, bannerY + 22);

  // Parameters Table
  const tableY = bannerY + bannerH + 16;
  const paramRows = [
    ['Block Identification', villa.blockNo, 'Villa Unit Identification', villa.villaNo],
    ['Villa Architecture Type', villa.villaType, 'Villa Quantity in Batch', `${villa.villaQuantity || 1} Unit(s)`],
    ['Custom Villa Designation', villa.customVilla ? 'YES — Custom Client Architectural Layout' : 'Standard Approved Layout', 'Assigned Project / Compound', villa.projectName || 'Central Development'],
    ['Levels / Floors', villa.floors ? `${villa.floors} Floors` : 'G + 1 Floor', 'Bedrooms / Suites', villa.bedrooms ? `${villa.bedrooms} Bedrooms` : '4 Bedrooms'],
    ['Built-Up Area (BUA)', villa.builtUpAreaSqm ? `${villa.builtUpAreaSqm.toLocaleString()} m²` : 'N/A', 'Plot / Land Area', villa.plotAreaSqm ? `${villa.plotAreaSqm.toLocaleString()} m²` : 'N/A'],
    ['Contract Price / Unit', `${(villa.contractPriceSAR || 0).toLocaleString()} ${baseCurrency}`, 'Estimated Direct Cost', `${(villa.estimatedCostSAR || 0).toLocaleString()} ${baseCurrency}`],
    ['Total Batch Value', `${((villa.contractPriceSAR || 0) * (villa.villaQuantity || 1)).toLocaleString()} ${baseCurrency}`, 'Target Handover Date', villa.handoverTargetDate || 'Scheduled in Contract'],
    ['Assigned Supervising Engineer', villa.assignedEmployeeName || 'Site Engineering Division', 'Assigned Project Link', villa.projectName || 'General Development Compound'],
    ['Client / Purchaser Name', villa.clientName || 'Private Client', 'Contracting General Lead', villa.contractorName || corporateEntity.companyName],
  ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Specification Attribute', 'Value', 'Technical Field', 'Particulars']],
    body: paramRows,
  });

  const finalParamY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 330;

  // Custom Specification Box if customVilla is true
  let customBoxEndY = finalParamY;
  if (villa.customVilla || villa.customVillaSpecification) {
    customBoxEndY = finalParamY + 12;
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.roundedRect(margin, customBoxEndY, pageWidth - margin * 2, 58, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text('CUSTOM BESPOKE ARCHITECTURAL & INTERIOR SPECIFICATIONS', margin + 12, customBoxEndY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    const specText = villa.customVillaSpecification || 'Custom architectural adjustments including upgraded Italian marble flooring, concealed smart VRF AC systems, infinity plunge pool, and reinforced structural spans per client variation deed.';
    doc.text(specText, margin + 12, customBoxEndY + 30, { maxWidth: pageWidth - margin * 2 - 24 });
    customBoxEndY += 66;
  }

  // Contract Terms / Scope of Works
  const termsY = customBoxEndY + 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, termsY, pageWidth - margin * 2, 65, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('SCOPE OF WORKS & STRUCTURAL WARRANTY CLAUSES', margin + 12, termsY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `1. Akash Global Contracting commits to structural completion in accordance with Saudi Building Code (SBC) standards.\n` +
    `2. Ten (10) years decennial insurance liability applies to foundations and reinforced concrete skeleton.\n` +
    `3. Finishes, MEP fixtures, and waterproofing carry a comprehensive two (2) year defects liability period (DLP).\n` +
    `4. Handover protocol requires joint physical inspection, municipality completion certificate, and final bill of quantities reconciliation.\n` +
    `5. Notes: ${villa.notes || 'Executed in compliance with master contract specifications and architectural blueprints.'}`,
    margin + 12,
    termsY + 28,
    { maxWidth: pageWidth - margin * 2 - 24 }
  );

  // Signatures Section
  const sigY = Math.min(termsY + 76, pageHeight - 85);
  const sigW = (pageWidth - margin * 2 - 20) / 2;

  // Contractor Sign Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, sigY, sigW, 60, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTHORIZED CONTRACTOR SIGNATURE', margin + 10, sigY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`${corporateEntity.companyName}`, margin + 10, sigY + 26);
  doc.text('Managing Director / Authorized Representative', margin + 10, sigY + 36);
  doc.text('Stamp & Signature: _________________________', margin + 10, sigY + 50);

  // Client Sign Box
  doc.roundedRect(margin + sigW + 20, sigY, sigW, 60, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASER / CLIENT ACCEPTANCE', margin + sigW + 30, sigY + 14);

  doc.setFont('helvetica', 'normal');
  doc.text(`Client Name: ${villa.clientName || 'Private Owner'}`, margin + sigW + 30, sigY + 26);
  doc.text('Acknowledged specifications, payment milestones, and handover schedule.', margin + sigW + 30, sigY + 36);
  doc.text('Signature: _________________________', margin + sigW + 30, sigY + 50);

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Property Deed · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Riyadh, KSA · Form VIL-DEED-2026`,
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  doc.save(`villa_${villa.blockNo}_${villa.villaNo}_specification_deed.pdf`);
};

/**
 * Generates and downloads a vector PDF specification deed for a master project.
 */
export const downloadProjectSpecificationPDF = (
  project: Project,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  projectVillas: Villa[] = []
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`CR: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base: ${baseCurrency}`, margin, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('MASTER CONTRACTING PROJECT CHARTER & EXECUTION DEED', margin, 68);

  const bannerY = 82;
  const bannerH = 46;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, pageWidth - margin * 2, bannerH, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${project.name.toUpperCase()} (${project.code})`, margin + 14, bannerY + 20);

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Client: ${project.client}  |  Status: ${project.status.toUpperCase().replace('_', ' ')}  |  Lead: ${project.assignedEmployeeName || project.leadName}`, margin + 14, bannerY + 35);

  const tableY = bannerY + bannerH + 16;
  const totalUnits = projectVillas.reduce((s, v) => s + (v.villaQuantity || 1), 0);
  const totalContractVal = projectVillas.reduce((s, v) => s + (v.contractPriceSAR || 0) * (v.villaQuantity || 1), 0);

  const paramRows = [
    ['Project Master Code', project.code, 'Client Entity', project.client],
    ['Department Operating Unit', project.department, 'Project Status', project.status.toUpperCase().replace('_', ' ')],
    ['Assigned Project Lead / Employee', project.assignedEmployeeName || project.leadName, 'Execution Period', `${project.startDate} to ${project.endDate}`],
    ['Budget Allocated', `${project.budgetSAR.toLocaleString()} ${baseCurrency}`, 'Disbursed Expenditure', `${project.spentSAR.toLocaleString()} ${baseCurrency}`],
    ['Associated Housing Units', `${projectVillas.length} Records (${totalUnits} Total Units)`, 'Contracted Villa Value', `${totalContractVal.toLocaleString()} ${baseCurrency}`],
  ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
    head: [['Project Charter Attribute', 'Value', 'Technical Field', 'Particulars']],
    body: paramRows,
  });

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 280;

  // Assigned Multiple Employees / Site Leadership Team
  if (project.assignedTeam && project.assignedTeam.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ASSIGNED MULTIPLE PROJECT WORKFORCE & SITE LEADERSHIP', margin, currentY + 16);

    const teamRows = project.assignedTeam.map((m, idx) => [
      `${idx + 1}`,
      m.employeeId,
      m.employeeName,
      m.role || 'Supervising Member',
      m.department || 'Operations',
      m.assignedDate || project.startDate,
    ]);

    autoTable(doc, {
      startY: currentY + 22,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['#', 'Staff ID', 'Workforce Name', 'Assigned Project Role', 'Department', 'Assignment Date']],
      body: teamRows,
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
      styles: { fontSize: 7, cellPadding: 3.5, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || currentY + 40;
  }

  if (projectVillas.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ALLOCATED VILLAS & HOUSING UNITS REGISTER', margin, currentY + 16);

    const villaRows = projectVillas.map((v) => [
      v.blockNo,
      v.villaNo,
      v.customVilla ? `${v.villaType} [CUSTOM]` : v.villaType,
      `${v.villaQuantity || 1}`,
      v.assignedEmployeeName || 'Unassigned',
      v.constructionStatus.toUpperCase().replace('_', ' '),
      `${((v.contractPriceSAR || 0) * (v.villaQuantity || 1)).toLocaleString()} ${baseCurrency}`,
    ]);

    autoTable(doc, {
      startY: currentY + 22,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['Block', 'Villa No.', 'Type', 'Qty', 'Assigned Engineer', 'Status', 'Total Value']],
      body: villaRows,
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', lineColor: PDF_BORDER_HEAD, lineWidth: 0.75 },
      styles: { fontSize: 7, cellPadding: 4, textColor: [30, 41, 59], lineColor: PDF_BORDER_CELL, lineWidth: 0.65 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Project Charter Deed · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Riyadh, KSA`,
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  doc.save(`project_${project.code}_charter_deed.pdf`);
};

/**
 * Generates and downloads an individual Daily Work Entity Progress & Execution Certificate.
 */
export const downloadDailyWorkEntityPDF = (
  entity: VillaDailyWorkEntity,
  villa: Villa | undefined,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  projectName?: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Header Navy Accent Bar
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 32);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(corporateEntity.legalName, margin, 45);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    57
  );

  // Document Title Banner
  const bannerY = 72;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, bannerY, contentWidth, 38, 4, 4, 'F');
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, contentWidth, 38, 4, 4, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DAILY WORK ENTITY INSPECTION & EXECUTION REPORT', margin + 14, bannerY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Entity ID: ${entity.id}  ·  Log Date: ${entity.date}  ·  Status: ${entity.status.toUpperCase().replace('_', ' ')}`, margin + 14, bannerY + 30);

  // Status Badge
  const badgeColors: Record<string, [number, number, number]> = {
    completed: [16, 185, 129],
    in_progress: [59, 130, 246],
    pending_inspection: [245, 158, 11],
    delayed: [239, 68, 68],
  };
  const badgeColor = badgeColors[entity.status] || [100, 116, 139];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(pageWidth - margin - 120, bannerY + 10, 106, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(entity.status.toUpperCase().replace('_', ' '), pageWidth - margin - 67, bannerY + 22, { align: 'center' });

  let curY = 126;

  // Key Summary Cards
  const cardW = (contentWidth - 16) / 3;
  const cardH = 46;

  // Card 1: Work Unit & Site
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY, cardW, cardH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SITE & WORK UNIT', margin + 8, curY + 13);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${villa?.villaNo || 'Unit N/A'} (${villa?.blockNo || 'Block N/A'})`, margin + 8, curY + 26);
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(projectName || villa?.projectName || 'Primary Development Site', margin + 8, curY + 38);

  // Card 2: Workforce Deployed
  const card2X = margin + cardW + 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, curY, cardW, cardH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DEPLOYED WORKFORCE', card2X + 8, curY + 13);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${entity.employeeCount} Personnel`, card2X + 8, curY + 27);
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Shift Hours: ${entity.workingHours || 8}h · Supervisor: ${entity.supervisorName || 'Eng. On-Duty'}`, card2X + 8, curY + 38);

  // Card 3: Work Progress
  const card3X = card2X + cardW + 8;
  const progressVal = entity.workProgress !== undefined ? entity.workProgress : (entity.status === 'completed' ? 100 : 65);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card3X, curY, cardW, cardH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STAGE PROGRESS', card3X + 8, curY + 13);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`${progressVal}% Completed`, card3X + 8, curY + 27);
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Weather: ${entity.weatherCondition || 'Clear 30°C'}`, card3X + 8, curY + 38);

  curY += cardH + 14;

  // Technical Breakdown Table
  const techDetails = [
    ['Work Field & Trade', entity.workField || 'Finishing & Painting', 'Meters Work Executed', `${entity.metersWork !== undefined ? entity.metersWork : 0} m²`],
    ['Work Stage & Phase', entity.workStage, 'Villa Unit Type', villa?.villaType || 'Residential Villa'],
    ['Site Location / Site', projectName || villa?.projectName || 'Contracting Site', 'Block / Sector', villa?.blockNo || 'Block A'],
    ['Lead Site Supervisor', entity.supervisorName || 'Eng. Assigned', 'Equipment Deployed', entity.equipmentUsed || 'Standard Hand Tools & Scaffolding'],
    ['Work Shift Duration', `${entity.workingHours || 8} Hours`, 'Weather / Ambient', entity.weatherCondition || 'Clear 30°C'],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['Specification', 'Execution Metric', 'Specification', 'Execution Metric']],
    body: techDetails,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105, fillColor: [248, 250, 252] },
      1: { cellWidth: 155 },
      2: { fontStyle: 'bold', cellWidth: 105, fillColor: [248, 250, 252] },
      3: { cellWidth: 155 },
    },
  });

  const finalY1 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 14 : curY + 110;

  // Task Summary Section
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, finalY1, contentWidth, 54, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY WORK EXECUTION & TASK NARRATIVE', margin + 10, finalY1 + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const taskLines = doc.splitTextToSize(entity.taskSummary || 'Daily operations executed according to approved method statements and drawings.', contentWidth - 20);
  doc.text(taskLines, margin + 10, finalY1 + 27);

  let nextY = finalY1 + 64;

  // Assigned Workforce Roster Table
  if (entity.assignedEmployees && entity.assignedEmployees.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`DAILY ASSIGNED WORKFORCE PERSONNEL (${entity.assignedEmployees.length} EMPLOYEES)`, margin, nextY);

    const empRows = entity.assignedEmployees.map((emp, idx) => [
      `${idx + 1}`,
      emp.employeeId,
      emp.employeeName,
      emp.role || 'Site Technician',
      'Assigned Active',
    ]);

    autoTable(doc, {
      startY: nextY + 6,
      margin: { left: margin, right: margin },
      head: [['#', 'Employee ID', 'Full Name', 'Site Trade / Role', 'Attendance Status']],
      body: empRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 3.5,
        lineColor: PDF_BORDER_HEAD,
        lineWidth: 0.75,
      },
      styles: {
        fontSize: 7,
        cellPadding: 3.5,
        textColor: [30, 41, 59],
        lineColor: PDF_BORDER_CELL,
        lineWidth: 0.65,
      },
    });

    nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : nextY + 70;
  }

  // Engineering Notes / QA Snagging
  if (entity.notes) {
    doc.setFillColor(254, 252, 232); // warm yellow tint
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, nextY, contentWidth, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 98, 7);
    doc.text('ENGINEERING QA/QC & MUNICIPALITY INSPECTION NOTES:', margin + 8, nextY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 63, 18);
    const noteLines = doc.splitTextToSize(entity.notes, contentWidth - 16);
    doc.text(noteLines, margin + 8, nextY + 23);

    nextY += 44;
  }

  // Signatures & Sign-off Block
  const sigBoxY = Math.max(nextY + 10, pageHeight - 110);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);

  const sigColW = (contentWidth - 24) / 3;

  // Site Supervisor
  doc.line(margin, sigBoxY + 36, margin + sigColW, sigBoxY + 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(entity.supervisorName || 'Site Engineer', margin, sigBoxY + 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Site Supervisor / Engineer in Charge', margin, sigBoxY + 56);

  // QA/QC Consultant Inspector
  const sig2X = margin + sigColW + 12;
  doc.line(sig2X, sigBoxY + 36, sig2X + sigColW, sigBoxY + 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Consultant QA/QC Inspector', sig2X, sigBoxY + 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Engineering Consultant Approval', sig2X, sigBoxY + 56);

  // Project Director
  const sig3X = sig2X + sigColW + 12;
  doc.line(sig3X, sigBoxY + 36, sig3X + sigColW, sigBoxY + 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Contracting Project Director', sig3X, sigBoxY + 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${corporateEntity.companyName}`, sig3X, sigBoxY + 56);

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Daily Site Execution Record · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Riyadh, KSA`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  doc.save(`daily_work_entity_${entity.id}_${entity.date}.pdf`);
};

/**
 * Generates and downloads the Complete Daily Work Entity Ledger PDF report.
 */
export const downloadDailyWorkLedgerPDF = (
  items: Array<{
    entity: VillaDailyWorkEntity;
    villa?: Villa;
    project?: Project;
  }>,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Header Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 30);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`DAILY WORK ENTITY & SITE EXECUTION LEDGER · COMPLETE AUDIT REPORT`, margin, 43);
  doc.text(
    `Generated on: ${new Date().toLocaleDateString()}  |  CR: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Currency: ${baseCurrency}`,
    margin,
    55
  );

  const totalWorkers = items.reduce((acc, it) => acc + (it.entity.employeeCount || 0), 0);
  const totalMeters = items.reduce((acc, it) => acc + (it.entity.metersWork || 0), 0);
  const avgProgress = items.length > 0
    ? Math.round(items.reduce((acc, it) => acc + (it.entity.workProgress || (it.entity.status === 'completed' ? 100 : 60)), 0) / items.length)
    : 0;

  // Ledger Table
  const rows = items.map((it) => {
    const progress = it.entity.workProgress !== undefined ? it.entity.workProgress : (it.entity.status === 'completed' ? 100 : 60);
    const assignedSummary = it.entity.assignedEmployees && it.entity.assignedEmployees.length > 0
      ? it.entity.assignedEmployees.map((e) => e.employeeName).slice(0, 2).join(', ') + (it.entity.assignedEmployees.length > 2 ? ` (+${it.entity.assignedEmployees.length - 2})` : '')
      : `${it.entity.employeeCount} workers`;

    return [
      it.entity.date,
      it.entity.id,
      it.project?.name || it.villa?.projectName || 'Site Project',
      it.villa?.villaNo || 'N/A',
      it.villa?.blockNo || 'N/A',
      it.entity.workField || 'Finishing & Paint',
      it.entity.metersWork !== undefined ? `${it.entity.metersWork} m²` : '—',
      assignedSummary,
      it.entity.workStage,
      `${progress}%`,
      it.entity.status.toUpperCase().replace('_', ' '),
    ];
  });

  autoTable(doc, {
    startY: 68,
    margin: { left: margin, right: margin },
    head: [[
      'Date',
      'Entity ID',
      'Site / Project',
      'Work Unit',
      'Block No.',
      'Work Field',
      'Meters (m²)',
      'Daily Assigned Employees',
      'Work Stage & Task',
      'Progress',
      'Status',
    ]],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      cellPadding: 4,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.75,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Total Entities: ${items.length} · Total Work Meters: ${totalMeters.toLocaleString()} m² · Total Workforce: ${totalWorkers} Workers · Avg Progress: ${avgProgress}% · ${corporateEntity.companyName}`,
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  doc.save(`daily_work_entity_ledger_${new Date().toISOString().substring(0, 10)}.pdf`);
};

/**
 * Generates and downloads Villa-by-Villa Daily Totals or Monthly Totals PDF report.
 */
export const downloadDailyWorkVillaTotalsPDF = (
  type: 'daily' | 'monthly',
  rows: Array<{
    period: string;
    villaNo: string;
    siteName: string;
    blockNo: string;
    villaType: string;
    entityCount: number;
    totalMetersWork: number;
    totalPersonnel: number;
    uniquePersonnelCount?: number;
    workFieldsSummary: string;
    avgProgress: number;
  }>,
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  // Header Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 28);

  const reportTitle = type === 'monthly'
    ? 'VILLA-BY-VILLA MONTHLY WORK ENTITY & PERSONNEL TOTALS REPORT (OFFICIAL AUDIT)'
    : 'VILLA-BY-VILLA DAILY WORK ENTITY & PERSONNEL TOTALS REPORT (SITE AUDIT)';

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(reportTitle, margin, 40);
  doc.text(
    `Official Field Audit  |  Generated on: ${new Date().toLocaleDateString()}  |  CR: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}`,
    margin,
    51
  );

  const totalEntities = rows.reduce((acc, r) => acc + r.entityCount, 0);
  const totalMeters = rows.reduce((acc, r) => acc + r.totalMetersWork, 0);
  const totalPersonnel = rows.reduce((acc, r) => acc + r.totalPersonnel, 0);

  // Summary Metrics Bar at top
  const summaryBoxY = 57;
  const summaryBoxH = 22;
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, summaryBoxY, contentWidth, summaryBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `TOTAL AGGREGATED UNITS: ${rows.length}   |   TOTAL WORK ENTITIES: ${totalEntities}   |   TOTAL METERS WORK: ${totalMeters.toLocaleString()} m²   |   ${type === 'monthly' ? 'TOTAL MAN-DAYS' : 'TOTAL WORKERS'}: ${totalPersonnel} PERSONNEL`,
    margin + 10,
    summaryBoxY + 14
  );

  const tableRows = rows.map((r) => [
    r.period,
    r.villaNo,
    r.siteName,
    `${r.blockNo} · ${r.villaType}`,
    `${r.entityCount} ${r.entityCount === 1 ? 'Entity' : 'Entities'}`,
    `${r.totalMetersWork.toLocaleString()} m²`,
    r.workFieldsSummary,
    `${r.totalPersonnel} ${type === 'monthly' ? 'Man-Days' : 'Workers'}${r.uniquePersonnelCount ? ` (${r.uniquePersonnelCount} Headcount)` : ''}`,
    `${r.avgProgress}%`,
    '', // Authorized Initials / Signature column
  ]);

  autoTable(doc, {
    startY: summaryBoxY + summaryBoxH + 6,
    margin: { left: margin, right: margin },
    head: [[
      type === 'monthly' ? 'Month Period' : 'Execution Date',
      'Work Unit (Villa)',
      'Site / Project',
      'Block & Type',
      'Total Entities',
      'Meters Work (m²)',
      'Work Fields Breakdown',
      type === 'monthly' ? 'Monthly Personnel' : 'Personnel Count',
      'Avg Progress',
      'Authorized Sign',
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      cellPadding: 4,
      lineWidth: 0.75,
      lineColor: PDF_BORDER_HEAD,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.65,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 65, fontStyle: 'bold' },
      2: { cellWidth: 95 },
      3: { cellWidth: 80 },
      4: { cellWidth: 55, halign: 'center' },
      5: { cellWidth: 65, fontStyle: 'bold', halign: 'right' },
      6: { cellWidth: 155 },
      7: { cellWidth: 85, halign: 'center' },
      8: { cellWidth: 50, halign: 'center' },
      9: { cellWidth: 58, halign: 'center' }, // Signature column
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : pageHeight - 65;

  // Executive Sign-off Certification Block (3 Columns)
  if (finalY + 45 < pageHeight - 18) {
    const sigColW = (contentWidth - 16) / 3;

    // Col 1: Lead Site Supervisor
    doc.setDrawColor(...PDF_BORDER_OUTER);
    doc.setLineWidth(0.75);
    doc.line(margin, finalY + 22, margin + sigColW, finalY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Lead Site Engineer / Supervisor', margin, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Sign: ___________________  Date: ___/___/2026', margin, finalY + 39);

    // Col 2: QA/QC Finishing Consultant
    const sig2X = margin + sigColW + 8;
    doc.line(sig2X, finalY + 22, sig2X + sigColW, finalY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('QA/QC Finishing Inspector & Consultant', sig2X, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Stamp & Sign: _____________  Date: ___/___/2026', sig2X, finalY + 39);

    // Col 3: Project Director
    const sig3X = sig2X + sigColW + 8;
    doc.line(sig3X, finalY + 22, sig3X + sigColW, finalY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Project Director & Commercial Controller', sig3X, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${corporateEntity.companyName}`, sig3X, finalY + 39);
  }

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Total Aggregations: ${rows.length} · Total Work Entities: ${totalEntities} · Cumulative Meters Work: ${totalMeters.toLocaleString()} m² · ${corporateEntity.companyName} · CR: ${corporateEntity.crNumber}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  const filename = type === 'monthly'
    ? `villa_monthly_totals_${new Date().toISOString().substring(0, 10)}.pdf`
    : `villa_daily_totals_${new Date().toISOString().substring(0, 10)}.pdf`;

  doc.save(filename);
};

/**
 * Generates and downloads a standardized A4 Printable Blank Daily Work Entity Field Log Sheet.
 */
export const downloadDailyWorkEntityBlankPDF = (
  corporateEntity: CorporateLegalEntity,
  baseCurrency: string,
  optionalContext?: {
    villa?: Villa;
    project?: Project;
  }
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Navy Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 7, 'F');

  // 2. Corporate Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(corporateEntity.companyName.toUpperCase(), margin, 27);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(corporateEntity.legalName, margin, 38);
  doc.text(
    `CR Number: ${corporateEntity.crNumber}  |  VAT ID: ${corporateEntity.vatNumber}  |  Base Currency: ${baseCurrency}  |  Kingdom of Saudi Arabia`,
    margin,
    49
  );

  // 3. Document Title Banner
  const bannerY = 58;
  const bannerH = 34;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, bannerY, contentWidth, bannerH, 3, 3, 'F');
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, bannerY, contentWidth, bannerH, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('DAILY WORK ENTITY & SITE EXECUTION LOG — BLANK FIELD DOCKET', margin + 12, bannerY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Form Ref: DWE-BLANK-FORM-2026  ·  Certified On-Site Workforce Allocation & Daily Progress Sheet',
    margin + 12,
    bannerY + 26
  );

  // Badge: BLANK TEMPLATE
  doc.setFillColor(51, 65, 85);
  doc.roundedRect(pageWidth - margin - 105, bannerY + 8, 95, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BLANK FIELD FORM', pageWidth - margin - 57, bannerY + 20, { align: 'center' });

  let curY = bannerY + bannerH + 8;

  // 4. Section: Site, Work Unit & Execution Parameters (Ruled Form Grid)
  const projName = optionalContext?.project?.name || optionalContext?.villa?.projectName || '';
  const villaNo = optionalContext?.villa?.villaNo || '';
  const blockNo = optionalContext?.villa?.blockNo || '';
  const villaType = optionalContext?.villa?.villaType || '';

  const siteInfoData = [
    [
      'Project / Site Name:',
      projName || '________________________________________________',
      'Execution Date:',
      '______ / ______ / 2026',
    ],
    [
      'Work Unit (Villa No):',
      villaNo || '________________________',
      'Block / Sector No:',
      blockNo || '________________________',
    ],
    [
      'Villa / Unit Type:',
      villaType || '________________________',
      'Shift / Duration:',
      '[  ] 8 Hours   [  ] 10 Hours   [  ] Other: _____',
    ],
    [
      'Lead Site Supervisor:',
      '________________________________________________',
      'Ambient / Weather:',
      '[  ] Clear   [  ] Dusty   [  ] Rain  ( ____ °C )',
    ],
    [
      'Target Meters Work (m²):',
      '[  ____________________  m²  ]',
      'Total Labor Deployed:',
      '[ ________ Workers on Site ]',
    ],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: siteInfoData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110, fillColor: [248, 250, 252] },
      1: { cellWidth: 160 },
      2: { fontStyle: 'bold', cellWidth: 110, fillColor: [248, 250, 252] },
      3: { cellWidth: 151 },
    },
  });

  curY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : curY + 80;

  // 5. Section: Work Field Trade Classification & Finishing Stage Checklist
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('WORK FIELD TRADE CLASSIFICATION & FINISHING STAGE (TICK APPLICABLE)', margin, curY);

  const stageBoxY = curY + 4;
  const stageBoxH = 38;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, stageBoxY, contentWidth, stageBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 8;
  const col2X = margin + 180;
  const col3X = margin + 355;

  doc.text('[  ] Primer Paint (High-Penetration Seal)', col1X, stageBoxY + 12);
  doc.text('[  ] Putty 1st (Wall Prep & 1st Putty)', col2X, stageBoxY + 12);
  doc.text('[  ] Putty 2st (Fine 2nd Smoothing Putty)', col3X, stageBoxY + 12);

  doc.text('[  ] Paint 1st (Anti-Fungal Matte/Silk)', col1X, stageBoxY + 26);
  doc.text('[  ] Paint Final (Silk Topcoat & Trim)', col2X, stageBoxY + 26);
  doc.text('[  ] Custom Trade: ____________________', col3X, stageBoxY + 26);

  curY = stageBoxY + stageBoxH + 8;

  // 6. Section: Daily Multiple Entity & Trade Execution Breakdown (Ruled Table)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY MULTIPLE ENTITY & TRADE EXECUTION (METERS WORK BREAKDOWN)', margin, curY);

  const multiTradeRows: string[][] = [
    ['1', 'Primer Paint', '', '', '', '8h', '___ %', '[ ] Pass  [ ] Snag', ''],
    ['2', 'Putty 1st', '', '', '', '8h', '___ %', '[ ] Pass  [ ] Snag', ''],
    ['3', 'Putty 2st', '', '', '', '8h', '___ %', '[ ] Pass  [ ] Snag', ''],
    ['4', 'Paint 1st / Final', '', '', '', '8h', '___ %', '[ ] Pass  [ ] Snag', ''],
  ];

  autoTable(doc, {
    startY: curY + 4,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'Work Field Trade',
      'Execution Area / Location',
      'Meters Work (m²)',
      'Workers',
      'Shift',
      'Progress',
      'QA Inspection',
      'Supervisor Sign',
    ]],
    body: multiTradeRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      cellPadding: 3,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.7,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 100, fontStyle: 'bold' },
      2: { cellWidth: 120 },
      3: { cellWidth: 70, halign: 'center' },
      4: { cellWidth: 42, halign: 'center' },
      5: { cellWidth: 32, halign: 'center' },
      6: { cellWidth: 45, halign: 'center' },
      7: { cellWidth: 60, halign: 'center' },
      8: { cellWidth: 46, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  curY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : curY + 85;

  // 7. Section: Daily Assigned Workforce Personnel (Blank Roster Table: 6 rows)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY ASSIGNED WORKFORCE ATTENDANCE & TIMESHEET ROSTER', margin, curY);

  const blankLaborRows: string[][] = [];
  for (let r = 1; r <= 6; r++) {
    blankLaborRows.push([
      `${r}`,
      '', // Full Name
      '', // Iqama / Emp ID
      '', // Trade / Role
      '', // Check In
      '', // Check Out
      '', // OT (h)
      '', // Signature / Initials
    ]);
  }

  autoTable(doc, {
    startY: curY + 4,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'Worker / Staff Full Name',
      'Employee / Iqama ID',
      'Designation / Trade Role',
      'In',
      'Out',
      'OT',
      'Worker Signature / Initial',
    ]],
    body: blankLaborRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      cellPadding: 3,
      lineColor: PDF_BORDER_HEAD,
      lineWidth: 0.7,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: PDF_BORDER_CELL,
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 155 },
      2: { cellWidth: 85 },
      3: { cellWidth: 110 },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
      7: { cellWidth: 61, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  curY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : curY + 120;

  // 8. Section: Machinery & QA/QC Notes (Split 2 Columns)
  const splitBoxW = (contentWidth - 8) / 2;
  const splitBoxH = 46;

  // Left: Machinery / Tools Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PLANT, MACHINERY & EQUIPMENT USED:', margin, curY);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY + 3, splitBoxW, splitBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('[  ] Airless Sprayers         [  ] Laser Alignment Theodolite', margin + 6, curY + 14);
  doc.text('[  ] Orbital Sanders         [  ] Mobile Scaffolding Units', margin + 6, curY + 25);
  doc.text('Other Tools / Sprayers: ___________________________', margin + 6, curY + 36);

  // Right: Engineering QA/QC Remarks
  const rightX = margin + splitBoxW + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ENGINEERING QA/QC REMARKS & SNAGGING:', rightX, curY);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.roundedRect(rightX, curY + 3, splitBoxW, splitBoxH, 2, 2, 'FD');

  doc.setDrawColor(...PDF_BORDER_CELL);
  doc.line(rightX + 6, curY + 16, rightX + splitBoxW - 6, curY + 16);
  doc.line(rightX + 6, curY + 28, rightX + splitBoxW - 6, curY + 28);
  doc.line(rightX + 6, curY + 40, rightX + splitBoxW - 6, curY + 40);

  curY = curY + splitBoxH + 10;

  // 9. Signatures Block (3 Columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('FORMAL DAILY SITE SIGN-OFF & CERTIFICATION', margin, curY);

  const sigBoxY = curY + 3;
  const sigColW = (contentWidth - 16) / 3;

  // Col 1: Lead Site Supervisor
  doc.setDrawColor(...PDF_BORDER_OUTER);
  doc.setLineWidth(0.75);
  doc.line(margin, sigBoxY + 30, margin + sigColW, sigBoxY + 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Lead Site Supervisor / Engineer', margin, sigBoxY + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sign: ___________________  Date: ___/___/2026', margin, sigBoxY + 47);

  // Col 2: QA/QC Consultant
  const sig2X = margin + sigColW + 8;
  doc.line(sig2X, sigBoxY + 30, sig2X + sigColW, sigBoxY + 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Consultant QA/QC Inspector', sig2X, sigBoxY + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Stamp & Sign: _____________  Date: ___/___/2026', sig2X, sigBoxY + 47);

  // Col 3: Project Director
  const sig3X = sig2X + sigColW + 8;
  doc.line(sig3X, sigBoxY + 30, sig3X + sigColW, sigBoxY + 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Project Director / Authorized Officer', sig3X, sigBoxY + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${corporateEntity.companyName}`, sig3X, sigBoxY + 47);

  // 10. Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Blank Physical Site Execution Form · ${corporateEntity.companyName} · CR ${corporateEntity.crNumber} · Riyadh, KSA`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  const fileSuffix = optionalContext?.villa?.villaNo
    ? `_${optionalContext.villa.villaNo.replace(/\s+/g, '_')}`
    : '';
  doc.save(`daily_work_entity_blank_form${fileSuffix}.pdf`);
};

/**
 * Hex color helper (#rrggbb) -> [r, g, b]
 */
const hexToRgbTuple = (hex: string): [number, number, number] => {
  const clean = (hex || '#0f172a').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

/**
 * Generates and downloads a single or batch ISO A4 Vector PDF from Template Studio & Letterhead Engine.
 */
export const downloadTemplateStudioPDF = async (options: {
  templateType: TemplateType;
  config: TemplateCustomization;
  corporateEntity: CorporateLegalEntity;
  employees: Employee[];
  baseCurrency: string;
  isBatch?: boolean;
}): Promise<void> => {
  const { templateType, config, corporateEntity, employees, baseCurrency, isBatch } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const [accR, accG, accB] = hexToRgbTuple(config.accentColor || '#0f172a');

  // Resolve editable header values with corporateEntity fallbacks
  const companyName = (config.headerCompanyName ?? '').trim() || corporateEntity.companyName;
  const legalName = (config.headerLegalName ?? '').trim() || corporateEntity.legalName;
  const crNumber = (config.headerCrNumber ?? '').trim() || corporateEntity.crNumber;
  const vatNumber = (config.headerVatNumber ?? '').trim() || corporateEntity.vatNumber;
  const contactAddress = (config.headerAddress ?? '').trim() || corporateEntity.address;
  const contactPhone = (config.headerPhone ?? '').trim() || corporateEntity.phone;
  const contactEmail = (config.headerEmail ?? '').trim() || corporateEntity.email;
  const contactWebsite = (config.headerWebsite ?? '').trim();
  const logoSrc = (config.customLogoUrl ?? '').trim() || corporateEntity.logoUrl;
  const headerStyle = config.letterheadHeaderStyle || 'executive';

  const logoDataUrl = config.showLogo ? await loadImageAsDataUrl(logoSrc) : null;
  const logoImgFmt =
    logoDataUrl && (logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg'))
      ? 'JPEG'
      : 'PNG';

  const targetEmployees =
    employees.length > 0
      ? isBatch
        ? employees
        : [employees[0]]
      : [
          {
            id: 'EMP-0001',
            fullName: 'Authorized Recipient',
            designation: 'Operations',
            department: 'Administration',
            operatingDepartment: 'Headquarters',
            iqamaNationalId: 'N/A',
            bankIban: corporateEntity.iban,
            joiningDate: new Date().toISOString().substring(0, 10),
            monthlyBaseSalary: 0,
            housingAllowance: 0,
            transportAllowance: 0,
            otherAllowances: 0,
            totalMonthlyPackage: 0,
            annualBaseSalary: 0,
          } as Employee,
        ];

  const renderLetterheadShell = (emp: Employee) => {
    // Bordered layout outer frame
    if (headerStyle === 'bordered') {
      doc.setDrawColor(accR, accG, accB);
      doc.setLineWidth(1.2);
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
    } else if (headerStyle === 'executive') {
      doc.setFillColor(accR, accG, accB);
      doc.rect(0, 0, pageWidth, 10, 'F');
    }

    // Optional Diagonal Watermark
    if (config.showWatermark && config.watermarkText) {
      doc.saveGraphicsState();
      try {
        doc.setTextColor(232, 236, 242);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(46);
        doc.text(config.watermarkText.toUpperCase(), pageWidth / 2, pageHeight / 2 + 30, {
          align: 'center',
          angle: 35,
        });
      } finally {
        doc.restoreGraphicsState();
      }
    }

    const headerTopY = headerStyle === 'executive' ? 28 : 34;
    let headerBottomY = headerTopY + 56;
    const logoSize = 44;

    if (config.logoPosition === 'center') {
      let curY = headerTopY;
      if (config.showLogo && logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, logoImgFmt, pageWidth / 2 - logoSize / 2, curY, logoSize, logoSize);
          curY += logoSize + 8;
        } catch {
          // Ignore image embed failure
        }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(companyName, pageWidth / 2, curY + 10, { align: 'center' });
      curY += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(legalName, pageWidth / 2, curY + 6, { align: 'center' });
      curY += 12;

      if (config.showLegalEntity) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`CR: ${crNumber}  ·  VAT ID: ${vatNumber}`, pageWidth / 2, curY + 4, {
          align: 'center',
        });
        curY += 12;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(accR, accG, accB);
      doc.text(config.title || 'OFFICIAL DOCUMENT', pageWidth / 2, curY + 8, { align: 'center' });
      curY += 14;

      if (config.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(config.subtitle, pageWidth / 2, curY + 4, { align: 'center' });
        curY += 12;
      }

      headerBottomY = curY + 6;
    } else {
      const isRightLogo = config.logoPosition === 'right';
      const logoX = isRightLogo ? pageWidth - margin - logoSize : margin;
      const textX = isRightLogo ? margin : margin + (config.showLogo && logoDataUrl ? logoSize + 12 : 0);

      if (config.showLogo && logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, logoImgFmt, logoX, headerTopY, logoSize, logoSize);
        } catch {
          // Ignore image embed failure
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(15, 23, 42);
      doc.text(companyName, textX, headerTopY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(legalName, textX, headerTopY + 26);

      if (config.showLegalEntity) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`CR: ${crNumber}  ·  VAT ID: ${vatNumber}`, textX, headerTopY + 38);
      }

      // Document Title & Subtitle on opposite side if left-aligned, or below if right-aligned
      const docMetaX = isRightLogo ? pageWidth - margin - (config.showLogo && logoDataUrl ? logoSize + 12 : 0) : pageWidth - margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(accR, accG, accB);
      doc.text(config.title || 'OFFICIAL DOCUMENT', docMetaX, headerTopY + 13, { align: 'right' });

      if (config.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const subLines = doc.splitTextToSize(config.subtitle, 200);
        doc.text(subLines.slice(0, 2), docMetaX, headerTopY + 25, { align: 'right' });
      }

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const docDateVal = config.documentDate || new Date().toISOString().substring(0, 10);
      const refText = config.refNumber ? `Ref: ${config.refNumber}  ·  ` : '';
      doc.text(`${refText}Date: ${docDateVal}`, docMetaX, headerTopY + 42, { align: 'right' });

      headerBottomY = headerTopY + 52;
    }

    // Accent Divider under Header
    if (headerStyle !== 'minimal') {
      doc.setDrawColor(accR, accG, accB);
      doc.setLineWidth(1.8);
      doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
    } else {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
    }

    // Contact Strip inside Footer area (drawn on every page)
    const footerContactY = pageHeight - 48;
    if (config.showContactFooterBar !== false) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.6);
      doc.line(margin, footerContactY - 8, pageWidth - margin, footerContactY - 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const contactParts = [
        contactAddress,
        contactPhone ? `Tel: ${contactPhone}` : '',
        contactEmail ? `Email: ${contactEmail}` : '',
        contactWebsite || '',
      ].filter(Boolean);
      const contactLine = contactParts.join('   |   ');
      doc.text(contactLine.slice(0, 130), pageWidth / 2, footerContactY + 2, { align: 'center' });
    }

    // Custom Regulatory Footer Note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const noteLines = doc.splitTextToSize(config.footerNote || '', contentWidth);
    doc.text(noteLines.slice(0, 2), pageWidth / 2, pageHeight - 30, { align: 'center' });

    // Prevent unused variable warning on emp when header is generic
    void emp;

    return headerBottomY + 20;
  };

  for (let i = 0; i < targetEmployees.length; i++) {
    const emp = targetEmployees[i];
    if (i > 0) doc.addPage();

    let curY = renderLetterheadShell(emp);

    // =========================================================================
    // TEMPLATE CONTENT ROUTING
    // =========================================================================
    if (templateType === 'letterhead') {
      const refNum = config.refNumber || `REF/${new Date().getFullYear()}/001`;
      const docDateVal = config.documentDate || new Date().toISOString().substring(0, 10);

      // Reference & Date Meta Row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`OUR REF: ${refNum}`, margin, curY);
      doc.text(`DATE: ${docDateVal}`, pageWidth - margin, curY, { align: 'right' });
      curY += 18;

      // Recipient Block
      if (config.showRecipientBlock !== false) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentWidth, 46, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('TO / RECIPIENT:', margin + 10, curY + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(config.recipientName || emp.fullName, margin + 10, curY + 26);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const recSub = [config.recipientTitle, config.recipientOrganization].filter(Boolean).join(' · ');
        doc.text(recSub || `${emp.designation} · ${emp.department}`, margin + 10, curY + 38);

        curY += 62;
      }

      // Subject Line
      if (config.subjectLine) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(accR, accG, accB);
        const subjLines = doc.splitTextToSize(`SUBJECT: ${config.subjectLine}`, contentWidth);
        doc.text(subjLines, margin, curY);
        curY += subjLines.length * 14 + 8;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.6);
        doc.line(margin, curY - 4, pageWidth - margin, curY - 4);
        curY += 10;
      }

      // Editable Body Paragraphs (with automatic page break)
      const bodyStr =
        config.bodyContent ||
        'Dear Sir / Madam,\n\nPlease treat this official correspondence as certified corporate documentation issued under our statutory corporate authority.';
      const paragraphs = bodyStr.split('\n');
      const maxContentY = pageHeight - 175;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) {
          curY += 8;
          continue;
        }
        const wrapped = doc.splitTextToSize(trimmed, contentWidth);
        for (const line of wrapped) {
          if (curY > maxContentY) {
            doc.addPage();
            curY = renderLetterheadShell(emp);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(30, 41, 59);
          }
          doc.text(line, margin, curY);
          curY += 14;
        }
        curY += 6;
      }
    } else if (templateType === 'payslip') {
      // Employee Info Grid Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 56, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('EMPLOYEE NAME', margin + 12, curY + 14);
      doc.text('EMPLOYEE ID / IQAMA', margin + contentWidth / 2, curY + 14);
      doc.text('DESIGNATION & DEPT', margin + 12, curY + 38);
      doc.text('DISBURSEMENT IBAN', margin + contentWidth / 2, curY + 38);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(emp.fullName, margin + 12, curY + 26);
      doc.text(`${emp.id} / ${emp.iqamaNationalId}`, margin + contentWidth / 2, curY + 26);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`${emp.designation} (${emp.department})`, margin + 12, curY + 50);
      doc.text(emp.bankIban || 'Direct Bank Transfer', margin + contentWidth / 2, curY + 50);

      curY += 72;

      autoTable(doc, {
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Remuneration Item', 'Calculation Basis', `Amount (${baseCurrency})`]],
        body: [
          ['Basic Monthly Salary', 'Contractual Base', fmt(emp.monthlyBaseSalary, baseCurrency)],
          ['Housing Allowance', '25% Benchmark', fmt(emp.housingAllowance, baseCurrency)],
          ['Transportation Allowance', 'Standard Transit', fmt(emp.transportAllowance, baseCurrency)],
          ['Other Allowances', 'Professional Allowance', fmt(emp.otherAllowances, baseCurrency)],
        ],
        foot: [['TOTAL DISBURSED PACKAGE', 'NET MONTHLY PAY', fmt(emp.totalMonthlyPackage, baseCurrency)]],
        theme: 'grid',
        headStyles: { fillColor: [accR, accG, accB], textColor: [255, 255, 255], fontSize: 8.5, lineColor: [accR, accG, accB], lineWidth: 0.75 },
        footStyles: { fillColor: [241, 245, 249], textColor: [accR, accG, accB], fontStyle: 'bold', fontSize: 9, lineColor: [accR, accG, accB], lineWidth: 0.75 },
        styles: { fontSize: 8.5, cellPadding: 6, lineColor: [accR, accG, accB], lineWidth: 0.6 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      });

      curY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    } else if (templateType === 'offer_letter') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Dear ${emp.fullName},`, margin, curY);
      curY += 18;

      const intro = `On behalf of ${companyName}, we are pleased to offer you the position of ${emp.designation} within our ${emp.department}.`;
      const introLines = doc.splitTextToSize(intro, contentWidth);
      doc.text(introLines, margin, curY);
      curY += introLines.length * 14 + 12;

      autoTable(doc, {
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Offer Terms & Remuneration Schedule', 'Verified Value']],
        body: [
          ['Commencement Date', emp.joiningDate],
          ['Monthly Basic Salary', fmt(emp.monthlyBaseSalary, baseCurrency)],
          ['Annual Base Compensation', fmt(emp.annualBaseSalary, baseCurrency)],
          ['Total Monthly Package', fmt(emp.totalMonthlyPackage, baseCurrency)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [accR, accG, accB], textColor: [255, 255, 255], fontSize: 8.5, lineColor: [accR, accG, accB], lineWidth: 0.75 },
        styles: { fontSize: 8.5, cellPadding: 6, lineColor: [accR, accG, accB], lineWidth: 0.6 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      });

      curY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
      const clause =
        config.bodyContent ||
        'This offer is subject to Saudi Labor Regulations, government visa formalities via the Qiwa platform, and standard medical fitness clearance.';
      const clauseLines = doc.splitTextToSize(clause, contentWidth);
      doc.text(clauseLines, margin, curY);
      curY += clauseLines.length * 14 + 16;
    } else if (templateType === 'experience_cert') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('TO WHOM IT MAY CONCERN', pageWidth / 2, curY + 6, { align: 'center' });
      curY += 28;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const certBody =
        config.bodyContent ||
        `This is to formally certify that ${emp.fullName} (Holder of Iqama / National ID: ${emp.iqamaNationalId}) has been employed with ${legalName} as ${emp.designation} since ${emp.joiningDate}.\n\nDuring their tenure in the ${emp.department}, they demonstrated outstanding professional expertise, integrity, and diligence. We wish them continued success in their future career endeavors.`;
      const certParas = certBody.split('\n');
      for (const p of certParas) {
        if (!p.trim()) {
          curY += 8;
          continue;
        }
        const wrapped = doc.splitTextToSize(p.trim(), contentWidth);
        doc.text(wrapped, margin, curY);
        curY += wrapped.length * 14 + 8;
      }
    } else {
      autoTable(doc, {
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Document Record Attribute', 'Verified Value']],
        body: [
          ['Subject Record', `${emp.fullName} (${emp.id})`],
          ['Designation & Department', `${emp.designation} · ${emp.department}`],
          ['Operating Unit', emp.operatingDepartment],
          ['Base Operating Currency', baseCurrency],
          ['Issuing Legal Entity', `${companyName} (CR: ${crNumber})`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [accR, accG, accB], textColor: [255, 255, 255], fontSize: 8.5, lineColor: [accR, accG, accB], lineWidth: 0.75 },
        styles: { fontSize: 8.5, cellPadding: 6, lineColor: [accR, accG, accB], lineWidth: 0.6 },
      });
      curY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const note =
        config.bodyContent ||
        `This certified record has been generated and validated by the ${companyName} Corporate Ledger Engine in accordance with internal corporate governance standards.`;
      const noteWrapped = doc.splitTextToSize(note, contentWidth);
      doc.text(noteWrapped, margin, curY);
      curY += noteWrapped.length * 14 + 12;
    }

    // =========================================================================
    // QR VERIFICATION STAMP & SIGNATORIES (Pinned neatly near bottom)
    // =========================================================================
    const sigSectionY = Math.max(curY + 16, pageHeight - 168);

    if (config.showQrStamp) {
      try {
        const hashCode = `NEX-${templateType.toUpperCase().slice(0, 4)}-${emp.id}-${crNumber}`;
        const qrDataUrl = await QRCode.toDataURL(
          JSON.stringify({ entity: companyName, cr: crNumber, doc: templateType, ref: config.refNumber || hashCode }),
          { width: 120, margin: 1 }
        );
        doc.addImage(qrDataUrl, 'PNG', margin, sigSectionY - 12, 42, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Doc Hash: #${hashCode}`, margin + 50, sigSectionY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text('Digital Authenticity: Verified Corporate Record', margin + 50, sigSectionY + 16);
      } catch {
        // Fallback if QR code fails
      }

      // Circular Official Seal Stamp on right
      doc.setDrawColor(accR, accG, accB);
      doc.setLineWidth(0.9);
      doc.circle(pageWidth - margin - 26, sigSectionY + 8, 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(accR, accG, accB);
      doc.text('OFFICIAL', pageWidth - margin - 26, sigSectionY + 5, { align: 'center' });
      doc.text('SEAL', pageWidth - margin - 26, sigSectionY + 14, { align: 'center' });
    }

    if (config.showSignatures) {
      const signY = pageHeight - 102;
      const sigName = config.signatoryName || 'Khalid Al-Fassi (Super Admin & Director)';
      const sigTitle = config.signatoryTitle || `${companyName} Executive Office`;
      const rightLabel = config.recipientSignatoryLabel || 'Acknowledged & Accepted';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Authorized Corporate Signatory', margin, signY);
      doc.text('Recipient / Counter-Signature', pageWidth - margin, signY, { align: 'right' });

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.8);
      doc.line(margin, signY + 24, margin + 190, signY + 24);
      doc.line(pageWidth - margin - 190, signY + 24, pageWidth - margin, signY + 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(sigName, margin, signY + 35);
      doc.text(
        templateType === 'letterhead' ? config.recipientName || emp.fullName : emp.fullName,
        pageWidth - margin,
        signY + 35,
        { align: 'right' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(sigTitle, margin, signY + 45);
      doc.text(rightLabel, pageWidth - margin, signY + 45, { align: 'right' });
    }
  }

  // Page numbering footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ISO A4 · Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 14, {
      align: 'right',
    });
  }

  const safeSlug = templateType.replace(/[^a-z0-9_]/gi, '_');
  const fileName = isBatch
    ? `${safeSlug}_batch_${targetEmployees.length}_documents.pdf`
    : `${safeSlug}_${(targetEmployees[0]?.id || 'document').toLowerCase()}.pdf`;
  doc.save(fileName);
};

