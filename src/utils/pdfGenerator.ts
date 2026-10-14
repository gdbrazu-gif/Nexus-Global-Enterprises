import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, CorporateLegalEntity } from '../types';

/**
 * Format currency number with comma separation
 */
const fmt = (num: number, currency: string) => {
  return `${num.toLocaleString()} ${currency}`;
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
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
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
    `${emp.fullName}\n${emp.email}`,
    `${emp.department}\n${emp.operatingDepartment}`,
    emp.designation,
    emp.roleTier.replace('_', ' ').toUpperCase(),
    emp.nationality,
    emp.phone,
    `ID: ${emp.iqamaNationalId}\nPass: ${emp.passportNumber}`,
    emp.monthlyBaseSalary.toLocaleString(),
    emp.annualBaseSalary.toLocaleString(),
    emp.status.toUpperCase(),
  ]);

  // Render Table via autoTable
  autoTable(doc, {
    startY: kpiBoxY + kpiBoxHeight + 12,
    head: [headers],
    body: bodyData,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4,
    },
    styles: {
      fontSize: 7,
      font: 'helvetica',
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 }, // ID
      1: { cellWidth: 100 }, // Full Name & Email
      2: { cellWidth: 110 }, // Dept & Unit
      3: { cellWidth: 90 }, // Designation
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
        `© ${currentYear} ${corporateEntity.legalName} · Confidential Human Resources & Workforce Ledger`,
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

  // Save the PDF
  const filename = `workforce_directory_${corporateEntity.companyName.toLowerCase().replace(/\s+/g, '_')}_${now.toISOString().substring(0, 10)}.pdf`;
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
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    body: [
      ['Nationality', emp.nationality, 'Corporate Email', emp.email],
      ['Contact Phone', emp.phone, 'Employment Type', emp.employmentType],
      ['Iqama / National ID', emp.iqamaNationalId, 'Reporting Manager', emp.managerName || 'Executive Committee'],
      ['Passport Number', emp.passportNumber, 'Passport Expiry', emp.passportExpiry],
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
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
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
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 4 },
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
  doc.setDrawColor(203, 213, 225);
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
      // Direct print fallback
      window.print();
      return true;
    }

    // Try native window.print() first
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
