import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { Share2, Mail, Copy, Check, X, ShieldCheck, User } from 'lucide-react';

export const ShareAccessModal: React.FC = () => {
  const {
    shareAccessModalOpen,
    setShareAccessModalOpen,
    employees,
    corporateEntity,
    addAuditLog,
  } = useHRMS();

  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || 'EMP-1001');
  const [recipientEmail, setRecipientEmail] = useState(employees[0]?.email || 'staff@nexusglobal.corp');
  const [customRoleTier, setCustomRoleTier] = useState('employee');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!shareAccessModalOpen) return null;

  const accessUrl = `https://nexusglobal.erp.corp/portal/access?token=NX-TOKEN-${selectedEmpId}-${Date.now().toString().slice(-6)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    addAuditLog(
      'CREATE',
      'Settings',
      `Shared system access link via email to ${recipientEmail} with role tier [${customRoleTier}].`
    );
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setShareAccessModalOpen(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Share User Access Link via Email
            </h3>
          </div>
          <button
            onClick={() => setShareAccessModalOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Access Invitation Dispatched</h4>
            <p className="text-slate-500">
              A secure onboarding link has been transmitted to <strong>{recipientEmail}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Select Existing Personnel
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  const emp = employees.find((x) => x.id === e.target.value);
                  if (emp) {
                    setRecipientEmail(emp.email);
                    setCustomRoleTier(emp.roleTier);
                  }
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Recipient Email Address
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Assigned Role Permission Tier
              </label>
              <select
                value={customRoleTier}
                onChange={(e) => setCustomRoleTier(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-mono"
              >
                <option value="employee">Standard Employee (Self-Service Profile Only)</option>
                <option value="project_manager">Project Manager</option>
                <option value="finance_officer">Finance Officer</option>
                <option value="hr_manager">HR Manager</option>
                <option value="super_admin">Super Admin (Full ERP Access)</option>
              </select>
            </div>

            {/* Generated Link Display */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Generated Secure Single Sign-On Access Link
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={accessUrl}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 shrink-0 font-medium flex items-center gap-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareAccessModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send Email Invitation</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
