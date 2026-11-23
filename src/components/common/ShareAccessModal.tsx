import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { RoleTier } from '../../types';
import { Share2, Mail, Copy, Check, X } from 'lucide-react';
import { getBuiltInShareBaseUrl } from '../../utils/shareLink';

export const ShareAccessModal: React.FC = () => {
  const {
    shareAccessModalOpen,
    setShareAccessModalOpen,
    employees,
    branches,
    activeBranchId,
    cloudAuthorized,
    inviteWorkspaceUser,
    addAuditLog,
  } = useHRMS();

  const headOfficeBranch = branches.find(
    (b) => b.name.trim().toLowerCase() === 'head office'
  );
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || 'EMP-1001');
  const [recipientEmail, setRecipientEmail] = useState(employees[0]?.email || 'staff@nexusglobal.corp');
  const [recipientName, setRecipientName] = useState(employees[0]?.fullName || 'Workspace Member');
  const [customRoleTier, setCustomRoleTier] = useState<RoleTier>('employee');
  const [assignedBranchId, setAssignedBranchId] = useState<string>(
    activeBranchId !== 'all' ? activeBranchId : 'all'
  );
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!shareAccessModalOpen) return null;

  const builtInShareBase = getBuiltInShareBaseUrl();
  const accessUrl = `${builtInShareBase}/?branch=${encodeURIComponent(assignedBranchId)}&invite=${encodeURIComponent(recipientEmail.trim().toLowerCase())}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSending(true);
    try {
      if (cloudAuthorized && recipientEmail.trim()) {
        await inviteWorkspaceUser({
          email: recipientEmail.trim(),
          displayName: recipientName.trim() || recipientEmail.trim(),
          role: customRoleTier,
          branchId: assignedBranchId,
        });
      } else {
        addAuditLog(
          'CREATE',
          'Settings',
          `Shared system access link via email to ${recipientEmail} with role tier [${customRoleTier}] on branch [${assignedBranchId}].`
        );
      }
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setShareAccessModalOpen(false);
      }, 2000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send workspace invitation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Share Multi-User &amp; Branch Access
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShareAccessModalOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              {cloudAuthorized ? 'Cloud Workspace Invite Provisioned' : 'Access Link Prepared'}
            </h4>
            <p className="text-slate-500">
              Authorized onboarding link for <strong>{recipientEmail}</strong> on branch{' '}
              <strong>{assignedBranchId}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSendEmail(e)} className="space-y-3.5">
            {sendError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800">
                {sendError}
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Select Existing Personnel
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setSendError(null);
                  const emp = employees.find((x) => x.id === e.target.value);
                  if (emp) {
                    setRecipientEmail(emp.email);
                    setRecipientName(emp.fullName);
                    setCustomRoleTier(emp.roleTier);
                    if (emp.branchId) setAssignedBranchId(emp.branchId);
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
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setSendError(null);
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Assigned Role Tier
                </label>
                <select
                  value={customRoleTier}
                  onChange={(e) => setCustomRoleTier(e.target.value as RoleTier)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-mono"
                >
                  <option value="employee">Standard Employee</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="finance_officer">Finance Officer</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="branch_admin">Branch Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Assigned Branch Scope
                </label>
                <select
                  value={assignedBranchId}
                  onChange={(e) => setAssignedBranchId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  <option value="all">All Branches</option>
                  {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Built-In Share Link (Zero Setup, Free · Desktop, Tablet &amp; Mobile)
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
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 shrink-0 font-medium flex items-center gap-1 cursor-pointer"
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
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>
                  {sending
                    ? 'Provisioning...'
                    : cloudAuthorized
                    ? 'Provision & Send Invite'
                    : 'Send Access Invitation'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
