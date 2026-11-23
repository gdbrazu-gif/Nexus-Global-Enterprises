import React, { useState, useEffect, useMemo } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { SUPPORTED_CURRENCIES } from '../../data/initialData';
import { CorporateLegalEntity } from '../../types';
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Share2,
  Upload,
} from 'lucide-react';

const DEFAULT_LOGO_PATH = '/src/assets/images/corporate_logo_hrms_1791900623826.jpg';
const MAX_LOGO_URL_LENGTH = 65536;

function extractReadableErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Failed to save Corporate Identity settings.');
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Plain error string
  }
  return raw;
}

async function compressCorporateLogo(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unsupported or corrupted image format.'));
    image.src = rawDataUrl;
  });

  const maxDim = 240;
  const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
  const width = Math.max(1, Math.round((img.width || maxDim) * scale));
  const height = Math.max(1, Math.round((img.height || maxDim) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return rawDataUrl;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer transparent PNG for crisp letterheads & jsPDF compatibility
  const pngUrl = canvas.toDataURL('image/png');
  if (pngUrl.length <= MAX_LOGO_URL_LENGTH - 2048) {
    return pngUrl;
  }

  // Fallback to JPEG if PNG exceeds cloud storage budget
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of [0.85, 0.72, 0.55]) {
    const jpgUrl = canvas.toDataURL('image/jpeg', quality);
    if (jpgUrl.length <= MAX_LOGO_URL_LENGTH - 2048) {
      return jpgUrl;
    }
  }

  throw new Error('Selected logo image is still too large after compression. Please choose a smaller image.');
}

export const OrganizationSettings: React.FC = () => {
  const {
    corporateEntity,
    updateCorporateEntity,
    baseCurrency,
    setShareAccessModalOpen,
    canPerformAdminAction,
    cloudAuthorized,
  } = useHRMS();

  const [legalForm, setLegalForm] = useState<CorporateLegalEntity>({ ...corporateEntity });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setLegalForm({ ...corporateEntity });
    setLogoError(false);
    setLogoUploadError(null);
  }, [corporateEntity]);

  const isCloudReadOnly = cloudAuthorized && !canPerformAdminAction;

  const hasUnsavedChanges = useMemo(() => {
    return (
      legalForm.companyName !== corporateEntity.companyName ||
      legalForm.legalName !== corporateEntity.legalName ||
      legalForm.logoUrl !== corporateEntity.logoUrl ||
      legalForm.crNumber !== corporateEntity.crNumber ||
      legalForm.vatNumber !== corporateEntity.vatNumber ||
      legalForm.email !== corporateEntity.email ||
      legalForm.phone !== corporateEntity.phone ||
      legalForm.address !== corporateEntity.address ||
      legalForm.bankName !== corporateEntity.bankName ||
      legalForm.accountTitle !== corporateEntity.accountTitle ||
      legalForm.iban !== corporateEntity.iban ||
      legalForm.swiftCode !== corporateEntity.swiftCode ||
      (legalForm.baseCurrency || 'SAR') !== (corporateEntity.baseCurrency || 'SAR')
    );
  }, [legalForm, corporateEntity]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }

    setLogoUploadError(null);
    setSaveError(null);

    try {
      const optimizedDataUrl = await compressCorporateLogo(file);
      setLogoError(false);
      setLegalForm((prev) => ({ ...prev, logoUrl: optimizedDataUrl }));
    } catch (err) {
      setLogoUploadError(extractReadableErrorMessage(err));
    }
  };

  const handleResetUnsaved = () => {
    setLegalForm({ ...corporateEntity });
    setLogoError(false);
    setLogoUploadError(null);
    setSaveError(null);
  };

  const handleCopyValue = (fieldKey: string, value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleSaveCorporate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isCloudReadOnly) return;

    const trimmedLogoUrl = (legalForm.logoUrl || '').trim();
    if (trimmedLogoUrl.length > MAX_LOGO_URL_LENGTH) {
      setSaveError(
        `Corporate emblem URL exceeds the ${MAX_LOGO_URL_LENGTH.toLocaleString()} character cloud limit. Upload a file to auto-compress or enter a shorter URL.`
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateCorporateEntity(legalForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(extractReadableErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveCorporate} className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Corporate Identity & Legal Entity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official trading name, statutory registration credentials, corporate emblem, and payroll treasury banking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{cloudAuthorized ? 'Saved & synced to cloud' : 'Saved to directory'}</span>
            </span>
          )}

          {hasUnsavedChanges && !isCloudReadOnly && (
            <button
              type="button"
              onClick={handleResetUnsaved}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving || isCloudReadOnly}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Corporate Identity'}</span>
          </button>
        </div>
      </div>

      {isCloudReadOnly && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Read-only preview:</span> Only Super Admin users can commit updates to Corporate Identity & Legal Entity settings in the cloud workspace.
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{saveError}</div>
        </div>
      )}

      {/* Main Two-Column Enterprise Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Structured Configuration Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Brand Identity & Logo */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  01. Brand Identity & Official Emblem
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appears on portal headers, PDF timesheets, salary statements, and contractor vouchers.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {legalForm.baseCurrency || baseCurrency} Ledger
              </span>
            </div>

            {/* Logo Upload & Path Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-4 border-b border-slate-100">
              <div className="h-20 w-20 rounded-xl border border-slate-200 bg-slate-900 p-2 flex items-center justify-center shrink-0 overflow-hidden">
                {!logoError && legalForm.logoUrl ? (
                  <img
                    src={legalForm.logoUrl}
                    alt={`${legalForm.companyName} emblem`}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 w-full space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="company-logo-upload"
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 ${
                      isCloudReadOnly ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-600" />
                    <span>Upload Logo</span>
                  </label>
                  <input
                    id="company-logo-upload"
                    type="file"
                    accept="image/*"
                    disabled={isCloudReadOnly}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isCloudReadOnly}
                    onClick={() => {
                      setLogoError(false);
                      setLogoUploadError(null);
                      setLegalForm((prev) => ({ ...prev, logoUrl: DEFAULT_LOGO_PATH }));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Emblem</span>
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="corporate-logo-url"
                    className="block text-[11px] font-medium text-slate-500 mb-1"
                  >
                    Asset Path or Compressed Data URI (auto-optimized to fit cloud & PDF headers)
                  </label>
                  <input
                    id="corporate-logo-url"
                    type="text"
                    disabled={isCloudReadOnly}
                    value={legalForm.logoUrl}
                    onChange={(e) => {
                      setLogoError(false);
                      setLogoUploadError(null);
                      setLegalForm({ ...legalForm, logoUrl: e.target.value });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 font-mono text-[11px] text-slate-700 outline-none focus:border-slate-400 focus:bg-white disabled:opacity-60 transition-colors"
                  />
                  {logoUploadError && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">{logoUploadError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Trading Name & Registered Legal Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="corporate-trading-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Company Trading Name
                </label>
                <input
                  id="corporate-trading-name"
                  type="text"
                  required
                  disabled={isCloudReadOnly}
                  value={legalForm.companyName}
                  onChange={(e) => setLegalForm({ ...legalForm, companyName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-legal-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Full Legal Registered Entity Name
                </label>
                <input
                  id="corporate-legal-name"
                  type="text"
                  required
                  disabled={isCloudReadOnly}
                  value={legalForm.legalName}
                  onChange={(e) => setLegalForm({ ...legalForm, legalName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Statutory Registry & Official Contact */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                02. Statutory Registration & Contact Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Commercial registry numbers, VAT taxation identifier, and primary corporate correspondence details.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="corporate-cr-number"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Commercial Registration (CR Number)
                </label>
                <input
                  id="corporate-cr-number"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.crNumber}
                  onChange={(e) => setLegalForm({ ...legalForm, crNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-vat-number"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Tax / VAT Registration ID
                </label>
                <input
                  id="corporate-vat-number"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.vatNumber}
                  onChange={(e) => setLegalForm({ ...legalForm, vatNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="corporate-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Official Company Email
                </label>
                <input
                  id="corporate-email"
                  type="email"
                  required
                  disabled={isCloudReadOnly}
                  value={legalForm.email}
                  onChange={(e) => setLegalForm({ ...legalForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Company Phone
                </label>
                <input
                  id="corporate-phone"
                  type="text"
                  required
                  disabled={isCloudReadOnly}
                  value={legalForm.phone}
                  onChange={(e) => setLegalForm({ ...legalForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="corporate-address"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Official Corporate Address
              </label>
              <input
                id="corporate-address"
                type="text"
                required
                disabled={isCloudReadOnly}
                value={legalForm.address}
                onChange={(e) => setLegalForm({ ...legalForm, address: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
              />
            </div>
          </section>

          {/* Section 3: Corporate Bank Account & Payroll Settlement */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                03. Treasury Banking & Payroll Settlement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary settlement bank credentials and base operating currency referenced across WPS payroll transfers and vendor remittances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="corporate-bank-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Bank Name
                </label>
                <input
                  id="corporate-bank-name"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.bankName}
                  onChange={(e) => setLegalForm({ ...legalForm, bankName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-account-title"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Account Title
                </label>
                <input
                  id="corporate-account-title"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.accountTitle}
                  onChange={(e) => setLegalForm({ ...legalForm, accountTitle: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="corporate-iban"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Corporate IBAN
                </label>
                <input
                  id="corporate-iban"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.iban}
                  onChange={(e) => setLegalForm({ ...legalForm, iban: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-swift"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  SWIFT / BIC Code
                </label>
                <input
                  id="corporate-swift"
                  type="text"
                  disabled={isCloudReadOnly}
                  value={legalForm.swiftCode}
                  onChange={(e) => setLegalForm({ ...legalForm, swiftCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono tabular-nums text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="corporate-base-currency"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Base Operating Currency
                </label>
                <select
                  id="corporate-base-currency"
                  disabled={isCloudReadOnly}
                  value={legalForm.baseCurrency || 'SAR'}
                  onChange={(e) => setLegalForm({ ...legalForm, baseCurrency: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50 transition-colors"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right 4 Columns: Live Official Document Letterhead & Entity Summary */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-22">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Preview Banner */}
            <div className="bg-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                  {!logoError && legalForm.logoUrl ? (
                    <img
                      src={legalForm.logoUrl}
                      alt="Corporate Letterhead Preview"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoError(true)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {legalForm.companyName || 'Company Trading Name'}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">
                    {legalForm.legalName || 'Registered Legal Entity'}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Registry Ledger Rows */}
            <div className="p-5 space-y-4 text-xs">
              <div className="text-[11px] font-semibold text-slate-500 border-b border-slate-100 pb-2">
                Official Letterhead & Registry Snapshot
              </div>

              <div className="divide-y divide-slate-100">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500">CR Number</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums truncate">
                      {legalForm.crNumber || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('cr', legalForm.crNumber)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy CR Number"
                    >
                      {copiedField === 'cr' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500">Tax / VAT ID</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums truncate">
                      {legalForm.vatNumber || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('vat', legalForm.vatNumber)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy VAT Registration ID"
                    >
                      {copiedField === 'vat' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500">Bank Settlement</span>
                  <span className="font-medium text-slate-800 truncate text-right">
                    {legalForm.bankName || '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500">Corporate IBAN</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums truncate max-w-[155px]">
                      {legalForm.iban || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('iban', legalForm.iban)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy IBAN"
                    >
                      {copiedField === 'iban' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500">SWIFT / BIC</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {legalForm.swiftCode || '—'}
                  </span>
                </div>
              </div>

              {/* Contact Metadata List (Unboxed, clean icons as functional indicators) */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11.5px] text-slate-600">
                <div className="flex items-start gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="truncate">{legalForm.email || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="font-mono tabular-nums">{legalForm.phone || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{legalForm.address || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Landmark className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="truncate">{legalForm.accountTitle || '—'}</span>
                </div>
              </div>

              {/* Portal Access Provisioning Trigger */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShareAccessModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>Share User Access via Email</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
};
