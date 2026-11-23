import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { DEFAULT_TEMPLATE_CUSTOMIZATIONS } from '../../data/initialData';
import { TemplateCustomization, TemplateType } from '../../types';
import { downloadTemplateStudioPDF } from '../../utils/pdfGenerator';
import {
  Building2,
  Check,
  Download,
  FileText,
  Layers,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Upload,
  Globe,
} from 'lucide-react';

const ACCENT_PRESETS = [
  { label: 'Executive Navy', hex: '#0f172a' },
  { label: 'Corporate Blue', hex: '#1e3a8a' },
  { label: 'Emerald Seal', hex: '#047857' },
  { label: 'Amber Gold', hex: '#b45309' },
  { label: 'Teal Slate', hex: '#0f766e' },
];

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

  // Active template type (default to editable Corporate Letterhead)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('letterhead');

  // Customizer section tab
  const [editorSection, setEditorSection] = useState<'header' | 'content' | 'options'>('header');

  // Active employee for single preview
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || 'EMP-1001'
  );

  // Batch print & PDF download state
  const [isBatchMultiPrint, setIsBatchMultiPrint] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const defaultForType =
    DEFAULT_TEMPLATE_CUSTOMIZATIONS[selectedTemplate] || DEFAULT_TEMPLATE_CUSTOMIZATIONS.letterhead;

  const activeConfig: TemplateCustomization = {
    ...defaultForType,
    ...(templateConfigs[selectedTemplate] || {}),
  };

  // Resolved letterhead branding values (editable overrides fall back to corporateEntity)
  const displayCompanyName =
    (activeConfig.headerCompanyName ?? '').trim() || corporateEntity.companyName;
  const displayLegalName =
    (activeConfig.headerLegalName ?? '').trim() || corporateEntity.legalName;
  const displayCrNumber =
    (activeConfig.headerCrNumber ?? '').trim() || corporateEntity.crNumber;
  const displayVatNumber =
    (activeConfig.headerVatNumber ?? '').trim() || corporateEntity.vatNumber;
  const displayAddress =
    (activeConfig.headerAddress ?? '').trim() || corporateEntity.address;
  const displayPhone =
    (activeConfig.headerPhone ?? '').trim() || corporateEntity.phone;
  const displayEmail =
    (activeConfig.headerEmail ?? '').trim() || corporateEntity.email;
  const displayWebsite = (activeConfig.headerWebsite ?? '').trim();
  const displayLogoUrl =
    (activeConfig.customLogoUrl ?? '').trim() || corporateEntity.logoUrl;
  const headerStyle = activeConfig.letterheadHeaderStyle || 'executive';

  const currentEmp =
    employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  const handleUpdate = (field: keyof TemplateCustomization, value: unknown) => {
    updateTemplateConfig(selectedTemplate, { [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLogoError(false);
        handleUpdate('customLogoUrl', reader.result);
        showToast('Custom letterhead logo uploaded.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSyncFromCorporate = () => {
    setLogoError(false);
    updateTemplateConfig(selectedTemplate, {
      headerCompanyName: corporateEntity.companyName,
      headerLegalName: corporateEntity.legalName,
      headerCrNumber: corporateEntity.crNumber,
      headerVatNumber: corporateEntity.vatNumber,
      headerAddress: corporateEntity.address,
      headerPhone: corporateEntity.phone,
      headerEmail: corporateEntity.email,
      customLogoUrl: corporateEntity.logoUrl,
    });
    showToast('Synced letterhead header & contact details from Company Settings.');
  };

  const handleResetTemplate = () => {
    setLogoError(false);
    updateTemplateConfig(selectedTemplate, {
      ...defaultForType,
      headerCompanyName: '',
      headerLegalName: '',
      headerCrNumber: '',
      headerVatNumber: '',
      headerAddress: '',
      headerPhone: '',
      headerEmail: '',
      headerWebsite: '',
      customLogoUrl: '',
    });
    showToast('Restored default template layout & copy.');
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

  const handleDownloadPdf = async (isBatch: boolean) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await downloadTemplateStudioPDF({
        templateType: selectedTemplate,
        config: activeConfig,
        corporateEntity,
        employees: isBatch ? employees : currentEmp ? [currentEmp] : [],
        baseCurrency,
        isBatch,
      });
      showToast(
        isBatch
          ? `Downloaded batch A4 PDF (${employees.length} documents).`
          : `Downloaded editable ISO A4 PDF (${activeConfig.title}).`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const templateOptions: { id: TemplateType; label: string }[] = [
    { id: 'letterhead', label: 'Official Corporate Letterhead (Editable)' },
    { id: 'payslip', label: 'Monthly Payslip & Remuneration' },
    { id: 'offer_letter', label: 'Executive Offer Letter Contract' },
    { id: 'experience_cert', label: 'Experience & Service Certificate' },
    { id: 'timesheet_ledger', label: 'Monthly Timesheet Attendance Ledger' },
    { id: 'expense_voucher', label: 'Corporate Expense & Payment Voucher' },
    { id: 'asset_handover', label: 'Asset Custody & Handover Deed' },
  ];

  const todayIso = new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-slate-200 pb-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t.navTemplates}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Fully editable corporate letterhead stationery, executive correspondence, and vector A4 PDF engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Target employee select */}
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none max-w-[200px]"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.id})
              </option>
            ))}
          </select>

          {/* Single Print */}
          <button
            type="button"
            onClick={handlePrintSingle}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>

          {/* Batch Print */}
          <button
            type="button"
            onClick={handlePrintMultiple}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Print Batch ({employees.length})</span>
          </button>

          {/* Export Single A4 PDF */}
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={() => handleDownloadPdf(false)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isGeneratingPdf ? 'Generating...' : 'Download A4 PDF'}</span>
          </button>

          {/* Export Batch PDF */}
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={() => handleDownloadPdf(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Batch PDF ({employees.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {toastMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 no-print">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Main Studio Viewport: Left Editable Controls, Right Live A4 Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Full Letterhead & PDF Editor */}
        <div className="lg:col-span-5 space-y-4 no-print">
          {/* Template Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Document Template
              </span>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Reset current template to defaults"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="space-y-1">
              {templateOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedTemplate(opt.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer ${
                    selectedTemplate === opt.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selectedTemplate === opt.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sectioned Letterhead Customizer */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setEditorSection('header')}
                className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  editorSection === 'header'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Letterhead Header
              </button>
              <button
                type="button"
                onClick={() => setEditorSection('content')}
                className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  editorSection === 'content'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Body & Signatory
              </button>
              <button
                type="button"
                onClick={() => setEditorSection('options')}
                className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  editorSection === 'options'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Seals & Footer
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {/* TAB 1: EDITABLE LETTERHEAD HEADER & BRANDING */}
              {editorSection === 'header' && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Sliders className="h-3.5 w-3.5 text-slate-600" />
                      <span>Stationery Header & Identity</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncFromCorporate}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Sync Company Info
                    </button>
                  </div>

                  {/* Style & Logo Placement */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Letterhead Layout Style
                      </label>
                      <select
                        value={headerStyle}
                        onChange={(e) =>
                          handleUpdate(
                            'letterheadHeaderStyle',
                            e.target.value as TemplateCustomization['letterheadHeaderStyle']
                          )
                        }
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none bg-white font-medium"
                      >
                        <option value="executive">Executive Top Bar</option>
                        <option value="classic">Classic Stationery</option>
                        <option value="bordered">Formal Bordered Frame</option>
                        <option value="minimal">Minimal Typography</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Logo Placement
                      </label>
                      <select
                        value={activeConfig.logoPosition}
                        onChange={(e) => handleUpdate('logoPosition', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none bg-white font-medium"
                      >
                        <option value="left">Left Aligned</option>
                        <option value="center">Centered</option>
                        <option value="right">Right Aligned</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Letterhead Logo Uploader */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">Letterhead Emblem</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor="letterhead-logo-upload"
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Upload className="h-3 w-3" />
                          <span>Upload</span>
                        </label>
                        <input
                          id="letterhead-logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        {activeConfig.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoError(false);
                              handleUpdate('customLogoUrl', '');
                            }}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Use Company Logo
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Custom image URL or leave blank for corporate logo..."
                      value={activeConfig.customLogoUrl || ''}
                      onChange={(e) => {
                        setLogoError(false);
                        handleUpdate('customLogoUrl', e.target.value);
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Editable Company Header Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Header Company Name
                      </label>
                      <input
                        type="text"
                        placeholder={corporateEntity.companyName}
                        value={activeConfig.headerCompanyName ?? ''}
                        onChange={(e) => handleUpdate('headerCompanyName', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Legal Entity Subtitle
                      </label>
                      <input
                        type="text"
                        placeholder={corporateEntity.legalName}
                        value={activeConfig.headerLegalName ?? ''}
                        onChange={(e) => handleUpdate('headerLegalName', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">CR Number</label>
                      <input
                        type="text"
                        placeholder={corporateEntity.crNumber}
                        value={activeConfig.headerCrNumber ?? ''}
                        onChange={(e) => handleUpdate('headerCrNumber', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono tabular-nums outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">VAT / Tax ID</label>
                      <input
                        type="text"
                        placeholder={corporateEntity.vatNumber}
                        value={activeConfig.headerVatNumber ?? ''}
                        onChange={(e) => handleUpdate('headerVatNumber', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono tabular-nums outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  {/* Contact Bar Overrides */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <span className="font-semibold text-slate-800 block">
                      Stationery Contact Details
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={`Tel: ${corporateEntity.phone}`}
                        value={activeConfig.headerPhone ?? ''}
                        onChange={(e) => handleUpdate('headerPhone', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] outline-none focus:border-slate-400"
                      />
                      <input
                        type="text"
                        placeholder={`Email: ${corporateEntity.email}`}
                        value={activeConfig.headerEmail ?? ''}
                        onChange={(e) => handleUpdate('headerEmail', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Website (e.g. www.company.com)"
                        value={activeConfig.headerWebsite ?? ''}
                        onChange={(e) => handleUpdate('headerWebsite', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                      />
                      <input
                        type="text"
                        placeholder={corporateEntity.address}
                        value={activeConfig.headerAddress ?? ''}
                        onChange={(e) => handleUpdate('headerAddress', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block font-medium text-slate-700 mb-1.5">
                      Accent Theme Color
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeConfig.accentColor}
                          onChange={(e) => handleUpdate('accentColor', e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                        />
                        <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                          {activeConfig.accentColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            title={preset.label}
                            onClick={() => handleUpdate('accentColor', preset.hex)}
                            className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                              activeConfig.accentColor === preset.hex
                                ? 'scale-110 ring-2 ring-slate-400 border-white'
                                : 'border-slate-200'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: EDITABLE DOCUMENT BODY, RECIPIENT & SIGNATORY */}
              {editorSection === 'content' && (
                <>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={activeConfig.title}
                      onChange={(e) => handleUpdate('title', e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Document Subtitle
                    </label>
                    <input
                      type="text"
                      value={activeConfig.subtitle}
                      onChange={(e) => handleUpdate('subtitle', e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Reference No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REF/NXG/2026/0142"
                        value={activeConfig.refNumber ?? ''}
                        onChange={(e) => handleUpdate('refNumber', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono tabular-nums outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Document Date
                      </label>
                      <input
                        type="date"
                        value={activeConfig.documentDate || todayIso}
                        onChange={(e) => handleUpdate('documentDate', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono tabular-nums outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  {selectedTemplate === 'letterhead' && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-2">
                      <label className="flex items-center justify-between cursor-pointer font-semibold text-slate-800">
                        <span>Recipient / Attention Block</span>
                        <input
                          type="checkbox"
                          checked={activeConfig.showRecipientBlock !== false}
                          onChange={(e) => handleUpdate('showRecipientBlock', e.target.checked)}
                          className="rounded text-slate-900"
                        />
                      </label>

                      {activeConfig.showRecipientBlock !== false && (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            placeholder="Recipient Name (e.g. Director of Operations)"
                            value={activeConfig.recipientName ?? ''}
                            onChange={(e) => handleUpdate('recipientName', e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 outline-none focus:border-slate-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Title / Role"
                              value={activeConfig.recipientTitle ?? ''}
                              onChange={(e) => handleUpdate('recipientTitle', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 outline-none focus:border-slate-400"
                            />
                            <input
                              type="text"
                              placeholder="Organization"
                              value={activeConfig.recipientOrganization ?? ''}
                              onChange={(e) =>
                                handleUpdate('recipientOrganization', e.target.value)
                              }
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 outline-none focus:border-slate-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTemplate === 'letterhead' && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Subject Line (RE:)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Official Corporate Notice & Authorization"
                        value={activeConfig.subjectLine ?? ''}
                        onChange={(e) => handleUpdate('subjectLine', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold outline-none focus:border-slate-400"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {selectedTemplate === 'letterhead'
                        ? 'Editable Letterhead Content'
                        : 'Custom Document Body / Clauses'}
                    </label>
                    <textarea
                      rows={selectedTemplate === 'letterhead' ? 7 : 4}
                      placeholder="Write letter paragraphs, terms, or official notice text..."
                      value={activeConfig.bodyContent ?? ''}
                      onChange={(e) => handleUpdate('bodyContent', e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-2 outline-none focus:border-slate-400 leading-relaxed"
                    />
                  </div>

                  {/* Editable Signatory Block */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="font-semibold text-slate-800 block">
                      Signatories
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Signatory Name"
                        value={activeConfig.signatoryName ?? ''}
                        onChange={(e) => handleUpdate('signatoryName', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Signatory Title"
                        value={activeConfig.signatoryTitle ?? ''}
                        onChange={(e) => handleUpdate('signatoryTitle', e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: SEALS, WATERMARK & FOOTER OPTIONS */}
              {editorSection === 'options' && (
                <>
                  <div className="space-y-2.5">
                    <span className="font-semibold text-slate-800 block">
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
                        checked={activeConfig.showContactFooterBar !== false}
                        onChange={(e) =>
                          handleUpdate('showContactFooterBar', e.target.checked)
                        }
                        className="rounded text-slate-900"
                      />
                      <span>Show Contact & Address Footer Strip</span>
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
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] outline-none"
                      />
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeConfig.showSignatures}
                        onChange={(e) => handleUpdate('showSignatures', e.target.checked)}
                        className="rounded text-slate-900"
                      />
                      <span>Include Executive Signature Blocks</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeConfig.showQrStamp}
                        onChange={(e) => handleUpdate('showQrStamp', e.target.checked)}
                        className="rounded text-slate-900"
                      />
                      <span>Include Official Digital Verification QR & Seal</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block font-medium text-slate-700 mb-1">
                      Counter-Signature Subtitle
                    </label>
                    <input
                      type="text"
                      placeholder="Acknowledged & Accepted"
                      value={activeConfig.recipientSignatoryLabel ?? ''}
                      onChange={(e) =>
                        handleUpdate('recipientSignatoryLabel', e.target.value)
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Custom Regulatory Footer Note
                    </label>
                    <textarea
                      rows={3}
                      value={activeConfig.footerNote}
                      onChange={(e) => handleUpdate('footerNote', e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 outline-none text-[11px]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Live ISO A4 Letterhead & Document Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div
            className={`w-full max-w-[740px] bg-white border border-slate-300 shadow-md rounded-lg relative overflow-hidden print-container flex flex-col justify-between min-h-[560px] sm:min-h-[780px] lg:min-h-[920px] ${
              headerStyle === 'bordered' ? 'p-2 sm:p-4' : ''
            }`}
          >
            {/* Top Executive Accent Bar */}
            {headerStyle === 'executive' && (
              <div
                className="h-2.5 w-full shrink-0"
                style={{ backgroundColor: activeConfig.accentColor }}
              />
            )}

            <div
              className={`flex-1 flex flex-col justify-between relative ${
                headerStyle === 'bordered'
                  ? 'border-2 p-4 sm:p-7 md:p-10'
                  : 'p-4 sm:p-8 md:p-11'
              }`}
              style={
                headerStyle === 'bordered'
                  ? { borderColor: activeConfig.accentColor }
                  : undefined
              }
            >
              {/* Watermark Overlay */}
              {activeConfig.showWatermark && activeConfig.watermarkText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden">
                  <span className="text-6xl md:text-7xl font-black text-slate-900/[0.04] rotate-[-35deg] tracking-widest uppercase text-center">
                    {activeConfig.watermarkText}
                  </span>
                </div>
              )}

              <div>
                {/* Document Letterhead Header */}
                <div
                  className={`flex items-start justify-between gap-4 pb-5 ${
                    headerStyle === 'minimal' ? 'border-b border-slate-200' : 'border-b-2'
                  } ${
                    activeConfig.logoPosition === 'center'
                      ? 'flex-col items-center text-center'
                      : activeConfig.logoPosition === 'right'
                      ? 'flex-row-reverse'
                      : ''
                  }`}
                  style={
                    headerStyle !== 'minimal'
                      ? { borderColor: activeConfig.accentColor }
                      : undefined
                  }
                >
                  <div
                    className={`flex items-center gap-3.5 ${
                      activeConfig.logoPosition === 'center' ? 'flex-col' : ''
                    }`}
                  >
                    {activeConfig.showLogo && (
                      <div className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {!logoError && displayLogoUrl ? (
                          <img
                            src={displayLogoUrl}
                            alt="Corporate Emblem"
                            referrerPolicy="no-referrer"
                            onError={() => setLogoError(true)}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                    )}

                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {displayCompanyName}
                      </h2>
                      <p className="text-xs text-slate-600">{displayLegalName}</p>
                      {activeConfig.showLegalEntity && (
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                          CR: {displayCrNumber} · VAT ID: {displayVatNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`text-xs ${
                      activeConfig.logoPosition === 'center'
                        ? 'text-center mt-1'
                        : activeConfig.logoPosition === 'right'
                        ? 'text-left'
                        : 'text-right'
                    }`}
                  >
                    <div
                      className="font-bold uppercase tracking-wider text-xs sm:text-sm"
                      style={{ color: activeConfig.accentColor }}
                    >
                      {activeConfig.title}
                    </div>
                    {activeConfig.subtitle && (
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {activeConfig.subtitle}
                      </div>
                    )}
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums mt-1">
                      {activeConfig.refNumber ? `Ref: ${activeConfig.refNumber} · ` : ''}
                      Date: {activeConfig.documentDate || todayIso}
                    </div>
                  </div>
                </div>

                {/* Dynamic Document Content */}
                <div className="py-6 space-y-5 text-xs text-slate-800 relative">
                  {/* TEMPLATE: EDITABLE OFFICIAL LETTERHEAD */}
                  {selectedTemplate === 'letterhead' && (
                    <div className="space-y-5 font-sans">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                        <span>
                          OUR REF:{' '}
                          <strong className="text-slate-900">
                            {activeConfig.refNumber || 'REF/NXG/2026/001'}
                          </strong>
                        </span>
                        <span>
                          DATE:{' '}
                          <strong className="text-slate-900">
                            {activeConfig.documentDate || todayIso}
                          </strong>
                        </span>
                      </div>

                      {activeConfig.showRecipientBlock !== false && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-0.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            To / Recipient
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {activeConfig.recipientName || currentEmp?.fullName || 'Authorized Recipient'}
                          </div>
                          {(activeConfig.recipientTitle || activeConfig.recipientOrganization) && (
                            <div className="text-xs text-slate-600">
                              {[activeConfig.recipientTitle, activeConfig.recipientOrganization]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                        </div>
                      )}

                      {activeConfig.subjectLine && (
                        <div
                          className="border-b border-slate-200 pb-2 text-sm font-bold"
                          style={{ color: activeConfig.accentColor }}
                        >
                          SUBJECT: {activeConfig.subjectLine}
                        </div>
                      )}

                      <div className="space-y-3 text-[13px] leading-relaxed text-slate-800 whitespace-pre-line">
                        {activeConfig.bodyContent ||
                          'Enter correspondence body text in the Body & Signatory editor panel.'}
                      </div>
                    </div>
                  )}

                  {/* TEMPLATE: PAYSLIP */}
                  {selectedTemplate === 'payslip' && currentEmp && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">EMPLOYEE NAME</span>
                          <span className="font-bold text-slate-900 font-sans text-sm">
                            {currentEmp.fullName}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">
                            EMPLOYEE ID / IQAMA
                          </span>
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {currentEmp.id} / {currentEmp.iqamaNationalId}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">
                            DESIGNATION & DEPT
                          </span>
                          <span className="text-slate-800 font-sans">
                            {currentEmp.designation} ({currentEmp.department})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">
                            DISBURSEMENT IBAN
                          </span>
                          <span className="text-slate-800 tabular-nums">
                            {currentEmp.bankIban}
                          </span>
                        </div>
                      </div>

                      <table className="w-full border-collapse font-mono text-xs tabular-nums">
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
                            <td className="p-2.5 text-right font-sans text-slate-500">
                              NET SALARY
                            </td>
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

                  {/* TEMPLATE: OFFER LETTER */}
                  {selectedTemplate === 'offer_letter' && currentEmp && (
                    <div className="space-y-4 text-justify leading-relaxed font-sans">
                      <p>
                        Dear <strong>{currentEmp.fullName}</strong>,
                      </p>
                      <p>
                        On behalf of <strong>{displayCompanyName}</strong>, we are pleased to
                        offer you the position of <strong>{currentEmp.designation}</strong> in
                        our <strong>{currentEmp.department}</strong>.
                      </p>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono space-y-2 text-xs tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Commencement Date:</span>
                          <span className="font-bold text-slate-900">
                            {currentEmp.joiningDate}
                          </span>
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
                      <p className="whitespace-pre-line">
                        {activeConfig.bodyContent ||
                          'This offer is subject to Saudi Labor Regulations, government visa formalities via Qiwa platform, and standard medical fitness clearance.'}
                      </p>
                    </div>
                  )}

                  {/* TEMPLATE: EXPERIENCE CERTIFICATE */}
                  {selectedTemplate === 'experience_cert' && currentEmp && (
                    <div className="space-y-5 text-center leading-relaxed">
                      <div className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                        To Whom It May Concern
                      </div>
                      {activeConfig.bodyContent ? (
                        <p className="text-justify whitespace-pre-line">
                          {activeConfig.bodyContent}
                        </p>
                      ) : (
                        <>
                          <p className="text-justify">
                            This is to formally certify that{' '}
                            <strong>{currentEmp.fullName}</strong> (Holder of Iqama / National
                            ID:{' '}
                            <span className="font-mono">{currentEmp.iqamaNationalId}</span>)
                            has been employed with <strong>{displayLegalName}</strong> as{' '}
                            <strong>{currentEmp.designation}</strong> since{' '}
                            <strong>{currentEmp.joiningDate}</strong>.
                          </p>
                          <p className="text-justify">
                            During their tenure in the {currentEmp.department}, they
                            demonstrated outstanding professional expertise, integrity, and
                            diligence. We wish them continued success in their future career
                            endeavors.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* TEMPLATE: OTHER TEMPLATES */}
                  {['timesheet_ledger', 'expense_voucher', 'asset_handover'].includes(
                    selectedTemplate
                  ) &&
                    currentEmp && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 font-mono tabular-nums">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Subject Record:</span>
                            <span className="font-bold text-slate-900 font-sans">
                              {currentEmp.fullName} ({currentEmp.id})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Operating Unit:</span>
                            <span className="text-slate-800">
                              {currentEmp.operatingDepartment}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Base Currency:</span>
                            <span className="text-slate-800 font-bold">{baseCurrency}</span>
                          </div>
                        </div>
                        <p className="text-slate-600 whitespace-pre-line">
                          {activeConfig.bodyContent ||
                            `This certified record has been generated and validated by the ${displayCompanyName} Corporate Ledger Engine in accordance with internal corporate governance standards.`}
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Bottom Verification, Signatories & Contact Footer */}
              <div className="pt-4 space-y-5">
                {/* QR Code and Official Stamp */}
                {activeConfig.showQrStamp && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 border border-slate-300 rounded bg-slate-50 flex items-center justify-center p-1">
                        <QrCode className="h-full w-full text-slate-800" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          <span>
                            Doc Hash: #NEX-{selectedTemplate.toUpperCase().slice(0, 4)}-
                            {currentEmp?.id || '001'}
                          </span>
                        </div>
                        <div>Digital Authenticity: Verified Valid</div>
                      </div>
                    </div>

                    <div
                      className="h-16 w-16 rounded-full border-2 border-dashed flex items-center justify-center text-[9px] font-bold uppercase tracking-wider text-center rotate-[-12deg]"
                      style={{
                        borderColor: activeConfig.accentColor,
                        color: activeConfig.accentColor,
                      }}
                    >
                      Official
                      <br />
                      Seal
                    </div>
                  </div>
                )}

                {/* Signatures */}
                {activeConfig.showSignatures && (
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                    <div>
                      <div className="text-slate-500 block mb-6">
                        Authorized Corporate Signatory
                      </div>
                      <div className="border-b border-slate-400 pb-1 font-mono text-[11px] font-bold">
                        {activeConfig.signatoryName || 'Khalid Al-Fassi (Super Admin & Director)'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {activeConfig.signatoryTitle || `${displayCompanyName} Executive Office`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-500 block mb-6">
                        Recipient / Counter-Signature
                      </div>
                      <div className="border-b border-slate-400 pb-1 font-mono text-[11px] font-bold">
                        {selectedTemplate === 'letterhead'
                          ? activeConfig.recipientName || currentEmp?.fullName
                          : currentEmp?.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {activeConfig.recipientSignatoryLabel || 'Acknowledged & Accepted'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Footer Bar */}
                {activeConfig.showContactFooterBar !== false && (
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    {displayAddress && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{displayAddress}</span>
                      </span>
                    )}
                    {displayPhone && (
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{displayPhone}</span>
                      </span>
                    )}
                    {displayEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{displayEmail}</span>
                      </span>
                    )}
                    {displayWebsite && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-400" />
                        <span>{displayWebsite}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Regulatory Footer Note */}
                <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  {activeConfig.footerNote}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden container for batch multiple print */}
      {isBatchMultiPrint && (
        <div className="print-only">
          {employees.map((emp, index) => (
            <div
              key={emp.id}
              className={`p-8 bg-white text-slate-900 ${
                index < employees.length - 1 ? 'print-page-break' : ''
              }`}
            >
              <div
                className="flex items-start justify-between border-b-2 pb-4"
                style={{ borderColor: activeConfig.accentColor }}
              >
                <div className="flex items-center gap-3">
                  {activeConfig.showLogo && displayLogoUrl && (
                    <img
                      src={displayLogoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {displayCompanyName}
                    </h2>
                    <p className="text-xs text-slate-600">{displayLegalName}</p>
                    {activeConfig.showLegalEntity && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        CR: {displayCrNumber} · VAT: {displayVatNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span
                    className="font-bold uppercase block"
                    style={{ color: activeConfig.accentColor }}
                  >
                    {activeConfig.title}
                  </span>
                  <span className="font-mono text-slate-500">
                    Date: {activeConfig.documentDate || todayIso}
                  </span>
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
                  <span>
                    {emp.id} / {emp.iqamaNationalId}
                  </span>
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

              {selectedTemplate === 'letterhead' && activeConfig.bodyContent && (
                <div className="my-4 text-xs leading-relaxed whitespace-pre-line font-sans">
                  {activeConfig.bodyContent}
                </div>
              )}

              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <div className="border-b border-slate-400 pb-1 font-mono text-[11px]">
                    {activeConfig.signatoryName || 'Authorized Signatory'}
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
