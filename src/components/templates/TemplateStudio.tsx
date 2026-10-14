import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { TemplateCustomization } from '../../types';
import {
  Printer,
  Sliders,
  FileText,
  Building,
  Check,
  Eye,
  Layers,
  Sparkles,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export const TemplateStudio: React.FC = () => {
  const {
    corporateEntity,
    templateConfigs,
    updateTemplateConfig,
    employees,
    formatCurrency,
    baseCurrency,
    t,
  } = useHRMS();

  // Active template type
  const [selectedTemplate, setSelectedTemplate] = useState<
    'payslip' | 'offer_letter' | 'experience_cert' | 'timesheet_ledger' | 'expense_voucher' | 'asset_handover'
  >('payslip');

  // Active employee for single preview
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || 'EMP-1001'
  );

  // Multi-print mode flag
  const [isBatchMultiPrint, setIsBatchMultiPrint] = useState(false);

  const activeConfig = templateConfigs[selectedTemplate] || {
    title: 'OFFICIAL DOCUMENT',
    subtitle: 'Nexus Global ERP',
    showLogo: true,
    logoPosition: 'left',
    accentColor: '#1e3a8a',
    showWatermark: true,
    watermarkText: 'CONFIDENTIAL',
    showLegalEntity: true,
    showSignatures: true,
    showQrStamp: true,
    footerNote: 'System generated copy.',
  };

  const currentEmp =
    employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  const handleUpdate = (field: keyof TemplateCustomization, value: any) => {
    updateTemplateConfig(selectedTemplate, { [field]: value });
  };

  const handlePrintSingle = () => {
    setIsBatchMultiPrint(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintMultiple = () => {
    setIsBatchMultiPrint(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const templateOptions = [
    { id: 'payslip', label: 'Monthly Payslip & Remuneration' },
    { id: 'offer_letter', label: 'Executive Offer Letter Contract' },
    { id: 'experience_cert', label: 'Experience & Service Certificate' },
    { id: 'timesheet_ledger', label: 'Monthly Timesheet Attendance Ledger' },
    { id: 'expense_voucher', label: 'Corporate Expense & Payment Voucher' },
    { id: 'asset_handover', label: 'Asset Custody & Handover Deed' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 no-print">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.navTemplates}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Design pixel-perfect corporate stationery and export single or multiple batch PDF documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Target employee select */}
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.id})
              </option>
            ))}
          </select>

          {/* Single Print */}
          <button
            onClick={handlePrintSingle}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Single Template</span>
          </button>

          {/* Multiple Batch Print */}
          <button
            onClick={handlePrintMultiple}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Print Multiple ({employees.length} Staff)</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport: Left Customizer Controls, Right Live A4 Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customization Settings (Hidden on print) */}
        <div className="lg:col-span-4 space-y-4 no-print">
          {/* Template Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Choose Document Template
            </label>
            <div className="space-y-1">
              {templateOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedTemplate(opt.id as any)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left ${
                    selectedTemplate === opt.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedTemplate === opt.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Customization Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sliders className="h-4 w-4 text-slate-600" />
              <h3 className="font-bold text-slate-900">Customizer & Visual Identity</h3>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                value={activeConfig.title}
                onChange={(e) => handleUpdate('title', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none font-semibold text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Document Subtitle</label>
              <input
                type="text"
                value={activeConfig.subtitle}
                onChange={(e) => handleUpdate('subtitle', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Accent Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeConfig.accentColor}
                    onChange={(e) => handleUpdate('accentColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                  />
                  <span className="font-mono text-[11px] text-slate-600">
                    {activeConfig.accentColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Logo Placement</label>
                <select
                  value={activeConfig.logoPosition}
                  onChange={(e) => handleUpdate('logoPosition', e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none bg-white"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                Layout Elements & Seals
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeConfig.showLogo}
                  onChange={(e) => handleUpdate('showLogo', e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Include Corporate Logo Emblem</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeConfig.showLegalEntity}
                  onChange={(e) => handleUpdate('showLegalEntity', e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Include Legal Registration & Tax / VAT Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeConfig.showWatermark}
                  onChange={(e) => handleUpdate('showWatermark', e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Show Security Watermark Text</span>
              </label>

              {activeConfig.showWatermark && (
                <input
                  type="text"
                  placeholder="Watermark text..."
                  value={activeConfig.watermarkText}
                  onChange={(e) => handleUpdate('watermarkText', e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] outline-none"
                />
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeConfig.showSignatures}
                  onChange={(e) => handleUpdate('showSignatures', e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Include Executive Signature & Sign-Off Blocks</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeConfig.showQrStamp}
                  onChange={(e) => handleUpdate('showQrStamp', e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Include Official Digital Verification QR Code</span>
              </label>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Custom Regulatory Footer Note
              </label>
              <textarea
                rows={2}
                value={activeConfig.footerNote}
                onChange={(e) => handleUpdate('footerNote', e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Document Preview (Rendered "same to same" for Print & PDF) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white border border-slate-300 shadow-md rounded-lg p-8 md:p-12 relative overflow-hidden print-container">
            {/* Watermark Overlay */}
            {activeConfig.showWatermark && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden">
                <span className="text-7xl md:text-8xl font-black text-slate-900/[0.04] rotate-[-35deg] tracking-widest uppercase">
                  {activeConfig.watermarkText}
                </span>
              </div>
            )}

            {/* Document Header */}
            <div
              className={`flex items-start justify-between border-b-2 pb-5 ${
                activeConfig.logoPosition === 'center'
                  ? 'flex-col items-center text-center'
                  : ''
              }`}
              style={{ borderColor: activeConfig.accentColor }}
            >
              {activeConfig.showLogo && (
                <div
                  className={`flex items-center gap-3 ${
                    activeConfig.logoPosition === 'center' ? 'mb-3' : ''
                  }`}
                >
                  <img
                    src={corporateEntity.logoUrl}
                    alt="Emblem"
                    className="h-14 w-14 object-contain"
                  />
                  {activeConfig.logoPosition !== 'center' && (
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {corporateEntity.companyName}
                      </h2>
                      <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                      {activeConfig.showLegalEntity && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          CR: {corporateEntity.crNumber} · VAT ID: {corporateEntity.vatNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeConfig.logoPosition === 'center' && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {corporateEntity.companyName}
                  </h2>
                  <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                  {activeConfig.showLegalEntity && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      CR: {corporateEntity.crNumber} · VAT ID: {corporateEntity.vatNumber}
                    </p>
                  )}
                </div>
              )}

              <div
                className={`text-xs ${
                  activeConfig.logoPosition === 'center' ? 'mt-3 text-center' : 'text-right'
                }`}
              >
                <div
                  className="font-bold uppercase tracking-wider text-sm"
                  style={{ color: activeConfig.accentColor }}
                >
                  {activeConfig.title}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">{activeConfig.subtitle}</div>
                <div className="font-mono text-[11px] text-slate-400 mt-1">
                  Date: {new Date().toISOString().substring(0, 10)}
                </div>
              </div>
            </div>

            {/* Document Dynamic Content based on Template Type */}
            <div className="py-6 space-y-6 text-xs text-slate-800">
              {/* SPECIFIC TEMPLATE: Payslip */}
              {selectedTemplate === 'payslip' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">EMPLOYEE NAME</span>
                      <span className="font-bold text-slate-900 font-sans text-sm">
                        {currentEmp.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">EMPLOYEE ID / IQAMA</span>
                      <span className="font-semibold text-slate-800">
                        {currentEmp.id} / {currentEmp.iqamaNationalId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">DESIGNATION & DEPT</span>
                      <span className="text-slate-800 font-sans">
                        {currentEmp.designation} ({currentEmp.department})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">DISBURSEMENT IBAN</span>
                      <span className="text-slate-800">{currentEmp.bankIban}</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-[11px] text-slate-700">
                        <th className="p-2 text-left font-sans">Remuneration Item</th>
                        <th className="p-2 text-right">Calculation Basis</th>
                        <th className="p-2 text-right">Amount ({baseCurrency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 font-sans">Basic Monthly Salary</td>
                        <td className="p-2 text-right text-slate-500">Contractual</td>
                        <td className="p-2 text-right font-semibold">
                          {formatCurrency(currentEmp.monthlyBaseSalary)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Housing Allowance</td>
                        <td className="p-2 text-right text-slate-500">25% Benchmark</td>
                        <td className="p-2 text-right">
                          {formatCurrency(currentEmp.housingAllowance)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Transportation Allowance</td>
                        <td className="p-2 text-right text-slate-500">Standard Transit</td>
                        <td className="p-2 text-right">
                          {formatCurrency(currentEmp.transportAllowance)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans">Other Allowances</td>
                        <td className="p-2 text-right text-slate-500">Professional</td>
                        <td className="p-2 text-right">
                          {formatCurrency(currentEmp.otherAllowances)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr
                        className="border-t-2 font-bold text-xs"
                        style={{ borderColor: activeConfig.accentColor }}
                      >
                        <td className="p-2.5 font-sans">TOTAL DISBURSED PACKAGE</td>
                        <td className="p-2.5 text-right font-sans text-slate-500">NET SALARY</td>
                        <td
                          className="p-2.5 text-right text-sm"
                          style={{ color: activeConfig.accentColor }}
                        >
                          {formatCurrency(currentEmp.totalMonthlyPackage)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* SPECIFIC TEMPLATE: Offer Letter */}
              {selectedTemplate === 'offer_letter' && (
                <div className="space-y-4 text-justify leading-relaxed font-sans">
                  <p>
                    Dear <strong>{currentEmp.fullName}</strong>,
                  </p>
                  <p>
                    On behalf of <strong>{corporateEntity.companyName}</strong>, we are pleased to offer you the position of <strong>{currentEmp.designation}</strong> in our <strong>{currentEmp.department}</strong>.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commencement Date:</span>
                      <span className="font-bold text-slate-900">{currentEmp.joiningDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Basic Salary:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(currentEmp.monthlyBaseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Annual Base Compensation:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(currentEmp.annualBaseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Monthly Package:</span>
                      <span className="font-bold text-emerald-800">
                        {formatCurrency(currentEmp.totalMonthlyPackage)}
                      </span>
                    </div>
                  </div>
                  <p>
                    This offer is subject to Saudi Labor Regulations, government visa formalities via Qiwa platform, and standard medical fitness clearance.
                  </p>
                </div>
              )}

              {/* SPECIFIC TEMPLATE: Experience Certificate */}
              {selectedTemplate === 'experience_cert' && (
                <div className="space-y-5 text-center leading-relaxed">
                  <div className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                    To Whom It May Concern
                  </div>
                  <p className="text-justify">
                    This is to formally certify that <strong>{currentEmp.fullName}</strong> (Holder of Iqama / National ID: <span className="font-mono">{currentEmp.iqamaNationalId}</span>) has been employed with <strong>{corporateEntity.legalName}</strong> as <strong>{currentEmp.designation}</strong> since <strong>{currentEmp.joiningDate}</strong>.
                  </p>
                  <p className="text-justify">
                    During their tenure in the {currentEmp.department}, they demonstrated outstanding professional expertise, integrity, and diligence. We wish them continued success in their future career endeavors.
                  </p>
                </div>
              )}

              {/* SPECIFIC TEMPLATE: Other Templates Fallback */}
              {['timesheet_ledger', 'expense_voucher', 'asset_handover'].includes(
                selectedTemplate
              ) && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subject Record:</span>
                      <span className="font-bold text-slate-900 font-sans">
                        {currentEmp.fullName} ({currentEmp.id})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operating Unit:</span>
                      <span className="text-slate-800">{currentEmp.operatingDepartment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Currency:</span>
                      <span className="text-slate-800 font-bold">{baseCurrency}</span>
                    </div>
                  </div>
                  <p className="text-slate-600">
                    This certified record has been generated and validated by the Nexus Global ERP Corporate Ledger Engine in accordance with internal corporate governance standards.
                  </p>
                </div>
              )}
            </div>

            {/* QR Code and Official Stamp */}
            {activeConfig.showQrStamp && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 border border-slate-300 rounded bg-slate-50 flex items-center justify-center p-1">
                    <QrCode className="h-full w-full text-slate-800" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    <div>Doc Hash: #NEX-{selectedTemplate.toUpperCase().slice(0, 4)}-{currentEmp.id}</div>
                    <div>Digital Authenticity: Verified Valid</div>
                  </div>
                </div>

                <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center rotate-[-12deg]">
                  Official
                  <br />
                  Seal
                </div>
              </div>
            )}

            {/* Signatures */}
            {activeConfig.showSignatures && (
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <div className="text-slate-500 block mb-6">Authorized Corporate Signatory</div>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px] font-bold">
                    Khalid Al-Fassi (Super Admin & Director)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Nexus Global Executive Office</div>
                </div>

                <div className="text-right">
                  <div className="text-slate-500 block mb-6">Candidate / Staff Signature</div>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px] font-bold">
                    {currentEmp.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Acknowledged & Accepted</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 pt-6 mt-6 border-t border-slate-100">
              {activeConfig.footerNote}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden container for batch multiple print that will only show when isBatchMultiPrint is true during print */}
      {isBatchMultiPrint && (
        <div className="print-only">
          {employees.map((emp, index) => (
            <div
              key={emp.id}
              className={`p-8 bg-white text-slate-900 ${
                index < employees.length - 1 ? 'print-page-break' : ''
              }`}
            >
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
                  <span className="font-bold text-slate-900 uppercase block">
                    {activeConfig.title}
                  </span>
                  <span className="font-mono text-slate-500">Period: October 2026</span>
                </div>
              </div>

              <div className="my-6 grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">STAFF NAME</span>
                  <span className="font-bold text-slate-900 text-sm font-sans">
                    {emp.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMPLOYEE ID / IQAMA</span>
                  <span>{emp.id} / {emp.iqamaNationalId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TITLE</span>
                  <span className="font-sans">{emp.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NET MONTHLY PACKAGE</span>
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(emp.totalMonthlyPackage)}
                  </span>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Signature: Authorized Signatory
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    Signature: {emp.fullName}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
