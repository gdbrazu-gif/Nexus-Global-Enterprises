import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { ROLE_DISPLAY_LABELS } from '../../data/rbacDefaults';
import { RoleTier, WorkspaceUserAccount } from '../../types';
import {
  Cloud,
  CloudOff,
  Laptop,
  Tablet,
  Smartphone,
  Users,
  UserPlus,
  LogOut,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Trash2,
  X,
  RefreshCw,
  Building2,
  Eye,
  EyeOff,
  Pencil,
  KeyRound,
  Lock,
  Share2,
  Copy,
  Check,
  QrCode,
  Link2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { getBuiltInShareBaseUrl, getBuiltInShareHostname } from '../../utils/shareLink';

export const MultiUserDeviceManager: React.FC = () => {
  const {
    firebaseUser,
    authReady,
    cloudAuthorized,
    cloudAccessPending,
    syncStatus,
    lastSyncedAt,
    cloudSyncError,
    signInWithGoogle,
    signOutCloud,
    pushWorkspaceToCloudNow,
    userDirectory,
    userInvites,
    deviceSessions,
    currentDeviceMeta,
    inviteWorkspaceUser,
    updateWorkspaceUser,
    deleteWorkspaceUser,
    revokeUserInvite,
    removeDeviceSession,
    branches,
    getBranchName,
    canPerformAdminAction,
    setShareAccessModalOpen,
  } = useHRMS();

  const headOfficeBranch = branches.find(
    (b) => b.name.trim().toLowerCase() === 'head office'
  );
  const headOfficeBranchId = headOfficeBranch?.id || 'HEAD_OFFICE';

  // Invite / Add User Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'default' | 'head_office'>('default');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteRole, setInviteRole] = useState<RoleTier>('branch_admin');
  const [inviteBranchId, setInviteBranchId] = useState<string>('all');
  const [inviteDept, setInviteDept] = useState('Operations');
  const [inviteDesignation, setInviteDesignation] = useState('Branch Administrator');
  const [inviting, setInviting] = useState(false);
  const [directoryBranchFilter, setDirectoryBranchFilter] = useState<string>('all');

  // Authorized Workspace Users View / Edit / Delete Modal State
  const [viewUserTarget, setViewUserTarget] = useState<WorkspaceUserAccount | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<WorkspaceUserAccount | null>(null);
  const [editRole, setEditRole] = useState<RoleTier>('employee');
  const [editBranchId, setEditBranchId] = useState<string>('all');
  const [editStatus, setEditStatus] = useState<WorkspaceUserAccount['status']>('active');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  const [deleteUserTarget, setDeleteUserTarget] = useState<WorkspaceUserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pushingCloud, setPushingCloud] = useState(false);

  const builtInShareUrl = getBuiltInShareBaseUrl();
  const builtInShareHost = getBuiltInShareHostname();
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareDomainCopied, setShareDomainCopied] = useState(false);
  const [showShareQr, setShowShareQr] = useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = useState('');

  React.useEffect(() => {
    if (!showShareQr) return;
    let cancelled = false;
    void QRCode.toDataURL(builtInShareUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setShareQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setShareQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [showShareQr, builtInShareUrl]);

  const handleCopyBuiltInShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(builtInShareUrl);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2500);
    } catch {
      setActionError('Unable to copy share link to clipboard.');
    }
  };

  const handleCopyShareHostname = async () => {
    try {
      await navigator.clipboard.writeText(builtInShareHost);
      setShareDomainCopied(true);
      setTimeout(() => setShareDomainCopied(false), 2500);
    } catch {
      setActionError('Unable to copy hostname to clipboard.');
    }
  };

  const openInviteModal = (mode: 'default' | 'head_office' = 'default') => {
    setInviteMode(mode);
    setInvitePassword('');
    setShowInvitePassword(false);
    setActionError(null);
    if (mode === 'head_office') {
      setInviteRole('branch_admin');
      setInviteBranchId(headOfficeBranchId);
      setInviteDept('Head Office Administration');
      setInviteDesignation('Head Office Staff');
    } else {
      setInviteRole('branch_admin');
      setInviteBranchId('all');
      setInviteDept('Operations');
      setInviteDesignation('Branch Administrator');
    }
    setInviteOpen(true);
  };

  const generateTempPasscode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let out = '';
    const bytes = new Uint8Array(12);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      for (let i = 0; i < 12; i++) {
        out += chars[bytes[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 12; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    setInvitePassword(out);
    setShowInvitePassword(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    if (invitePassword.trim().length < 6) {
      setActionError('Please enter an access password of at least 6 characters.');
      return;
    }
    setInviting(true);
    setActionError(null);
    try {
      await inviteWorkspaceUser({
        email: inviteEmail.trim(),
        displayName: inviteName.trim(),
        role: inviteRole,
        branchId: inviteBranchId,
        department: inviteDept.trim(),
        designation: inviteDesignation.trim(),
        password: invitePassword.trim(),
      });
      setActionFeedback(
        `Invitation & access passcode provisioned for ${inviteEmail.trim().toLowerCase()} (${ROLE_DISPLAY_LABELS[inviteRole]}).`
      );
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setShowInvitePassword(false);
      setInviteOpen(false);
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to issue workspace invitation.'
      );
    } finally {
      setInviting(false);
    }
  };

  const openEditUserModal = (usr: WorkspaceUserAccount) => {
    setEditUserTarget(usr);
    setEditRole(usr.role);
    setEditBranchId(usr.branchId || 'all');
    setEditStatus(usr.status || 'active');
    setEditDepartment(usr.department || '');
    setEditDesignation(usr.designation || '');
    setActionError(null);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserTarget) return;
    setSavingUserEdit(true);
    setActionError(null);
    try {
      await updateWorkspaceUser(editUserTarget.uid, {
        role: editRole,
        branchId: editBranchId,
        status: editStatus,
        department: editDepartment.trim() || undefined,
        designation: editDesignation.trim() || undefined,
      });
      setActionFeedback(
        `Updated workspace access for ${editUserTarget.displayName} (${ROLE_DISPLAY_LABELS[editRole]}).`
      );
      setEditUserTarget(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update workspace user.'
      );
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    setActionError(null);
    try {
      await deleteWorkspaceUser(deleteUserTarget.uid);
      setActionFeedback(
        `Removed ${deleteUserTarget.displayName} from Authorized Workspace Users.`
      );
      setDeleteUserTarget(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete workspace user.'
      );
    } finally {
      setDeletingUser(false);
    }
  };

  const handleManualSync = async () => {
    setPushingCloud(true);
    setActionError(null);
    try {
      const count = await pushWorkspaceToCloudNow();
      setActionFeedback(`Synchronized ${count} enterprise records to Firestore cloud storage.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to synchronize workspace snapshot.'
      );
    } finally {
      setPushingCloud(false);
    }
  };

  const renderDeviceIcon = (type: 'Desktop' | 'Tablet' | 'Mobile') => {
    if (type === 'Mobile') return <Smartphone className="h-4 w-4 text-blue-600" />;
    if (type === 'Tablet') return <Tablet className="h-4 w-4 text-indigo-600" />;
    return <Laptop className="h-4 w-4 text-slate-700" />;
  };

  if (!firebaseUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          {actionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-800 max-w-sm text-center">
              {actionError}
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              setActionError(null);
              try {
                await signInWithGoogle();
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
                if (!msg.toLowerCase().includes('popup-closed-by-user')) {
                  setActionError(msg);
                }
              }
            }}
            disabled={!authReady}
            className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.23 1.18-3.25 0-6.01-2.2-6.99-5.16H1.01v3.14C3.03 21.17 7.19 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.01 14.01c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.15H1.01C.37 7.43 0 8.88 0 10.42s.37 2.99 1.01 4.27l4-2.68Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.19 0 3.03 2.83 1.01 6.85l4 3.14c.98-2.96 3.74-5.24 6.99-5.24Z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Multi-User Access &amp; Multi-Device Cloud Sync
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authenticate collaborators via Google Sign-In, provision Branch Admins &amp; team roles, and monitor real-time sessions across Desktop, Tablet, and Mobile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cloudAuthorized && (
            <button
              type="button"
              onClick={() => void handleManualSync()}
              disabled={pushingCloud}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className={`h-3.5 w-3.5 ${pushingCloud ? 'animate-pulse text-blue-600' : 'text-slate-600'}`} />
              <span>{pushingCloud ? 'Pushing Local Snapshot...' : 'Sync Workspace to Cloud'}</span>
            </button>
          )}

          {canPerformAdminAction && cloudAuthorized && (
            <>
              <button
                type="button"
                onClick={() => openInviteModal('head_office')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-700" />
                <span>Add Head Office User</span>
              </button>

              <button
                type="button"
                onClick={() => openInviteModal('default')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite User</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => void signOutCloud()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {cloudAccessPending && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Cloud Workspace Authorization Pending</p>
            <p className="text-amber-800">
              You are signed in as <strong>{firebaseUser?.email}</strong>, which has not yet been provisioned by an administrator. Ask your Super Admin to add an invitation for your email in Multi-User Access, then reload or click Sign In again.
            </p>
          </div>
        </div>
      )}

      {cloudSyncError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {cloudSyncError}
        </div>
      )}

      {/* Top Row: Cloud Connection Identity & Current Device Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Google Cloud Identity */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {cloudAuthorized ? (
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Cloud className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  <CloudOff className="h-5 w-5" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-slate-900">Real-Time Cloud Synchronization</h2>
                <p className="text-[11px] text-slate-500">
                  Multi-tab offline IndexedDB cache + cross-device Firestore live listener
                </p>
              </div>
            </div>

            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-700'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-700'
                  : syncStatus === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {syncStatus === 'local' ? 'Local Mode' : syncStatus}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            {firebaseUser.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {(firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {firebaseUser.displayName || 'Authenticated Collaborator'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate">
                {firebaseUser.email}
              </div>
            </div>
            {lastSyncedAt && (
              <div className="text-right text-[10px] text-slate-400 shrink-0">
                <div>Last Sync</div>
                <div className="font-mono">{new Date(lastSyncedAt).toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* This Device Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                {renderDeviceIcon(currentDeviceMeta.deviceType)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Current Browser &amp; Device Endpoint</h2>
                <p className="text-[11px] text-slate-500">
                  Responsive multi-device session fingerprint
                </p>
              </div>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-700">
              {currentDeviceMeta.deviceType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Form Factor
              </div>
              <div className="mt-1 font-bold text-slate-900">{currentDeviceMeta.deviceType}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Browser Engine
              </div>
              <div className="mt-1 font-bold text-slate-900">{currentDeviceMeta.browser}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                OS / Platform
              </div>
              <div className="mt-1 font-bold text-slate-900 truncate">{currentDeviceMeta.platform}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Built-In AI Studio Share Link (Zero Setup, Free) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Built-In AI Studio Share Link
                </h2>
                <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Zero Setup · Free
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Direct live link for invited collaborators to open the app and sign in with Google on Desktop, Tablet, or Mobile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShareQr((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5 text-slate-600" />
              <span>{showShareQr ? 'Hide QR Code' : 'Mobile QR Code'}</span>
            </button>

            {canPerformAdminAction && cloudAuthorized && (
              <button
                type="button"
                onClick={() => setShareAccessModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Create User Share Link</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            readOnly
            aria-label="Built-In Share Link URL"
            value={builtInShareUrl}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 outline-none select-all"
          />
          <button
            type="button"
            onClick={() => void handleCopyBuiltInShareUrl()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            {shareLinkCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied Link</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-600" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>
        </div>

        {showShareQr && shareQrDataUrl && (
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <img
              src={shareQrDataUrl}
              alt="QR Code for Built-In Share Link"
              className="h-32 w-32 rounded-lg border border-slate-200 bg-white p-1.5 shrink-0"
            />
            <div className="space-y-1 text-xs text-slate-600 text-center sm:text-left">
              <p className="font-bold text-slate-900">Scan to Open on Mobile or Tablet</p>
              <p>
                Team members scanning this QR code will land on the Google Sign-In screen. Only invited emails can access workspace data.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 text-[11px] text-blue-900">
          <span>
            Ensure{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] border border-blue-200">
              {builtInShareHost}
            </code>{' '}
            is listed under <strong>Firebase Console → Authentication → Settings → Authorized domains</strong> so Google Sign-In works on this link.
          </span>
          <button
            type="button"
            onClick={() => void handleCopyShareHostname()}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-50 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {shareDomainCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{shareDomainCopied ? 'Domain Copied' : 'Copy Domain'}</span>
          </button>
        </div>
      </div>

      {/* Multi-User Directory Table (Clean text columns + Icon-Only View/Edit/Delete actions) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Authorized Workspace Users ({userDirectory.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Directory of authorized Super Admins, Branch Admins, and operational workspace members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {userDirectory.length > 0 && (
              <select
                value={directoryBranchFilter}
                onChange={(e) => setDirectoryBranchFilter(e.target.value)}
                aria-label="Filter users by branch scope"
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="all">All Scopes ({userDirectory.length})</option>
                <option value={headOfficeBranchId}>Head Office Users</option>
                {branches
                  .filter((b) => b.id !== headOfficeBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name}
                    </option>
                  ))}
              </select>
            )}

            {!cloudAuthorized && (
              <span className="text-[11px] text-slate-400">
                Sign in with Google to manage live multi-user cloud accounts
              </span>
            )}
          </div>
        </div>

        {userDirectory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {cloudAuthorized
              ? 'Loading authenticated user directory...'
              : 'Connect with an authorized Google account to view and manage multi-user accounts.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role Tier</th>
                  <th className="px-4 py-3">Assigned Branch Scope</th>
                  <th className="px-4 py-3">Last Device</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userDirectory
                  .filter((usr) => {
                    if (directoryBranchFilter === 'all') return true;
                    if (directoryBranchFilter === headOfficeBranchId) {
                      return (
                        usr.branchId === headOfficeBranchId ||
                        usr.branchId === 'HEAD_OFFICE' ||
                        usr.branchId?.toLowerCase() === 'head office'
                      );
                    }
                    return usr.branchId === directoryBranchFilter;
                  })
                  .map((usr) => {
                  const isSelf = firebaseUser?.uid === usr.uid;
                  return (
                    <tr key={usr.uid} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{usr.displayName}</span>
                          {isSelf && (
                            <span className="text-[10px] font-mono text-slate-500">(You)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {usr.designation || usr.department || usr.uid.slice(0, 10)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {ROLE_DISPLAY_LABELS[usr.role] || usr.role}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {getBranchName(usr.branchId)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          {renderDeviceIcon(usr.lastDeviceType || 'Desktop')}
                          <span>{usr.lastDeviceLabel || usr.lastDeviceType || 'Web Browser'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize ${
                            usr.status === 'active'
                              ? 'text-emerald-700'
                              : usr.status === 'suspended'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              usr.status === 'active'
                                ? 'bg-emerald-600'
                                : usr.status === 'suspended'
                                ? 'bg-red-600'
                                : 'bg-amber-600'
                            }`}
                          />
                          <span>{usr.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewUserTarget(usr)}
                            title="View User Details"
                            aria-label={`View ${usr.displayName}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {canPerformAdminAction && cloudAuthorized && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditUserModal(usr)}
                                title="Edit User Access"
                                aria-label={`Edit ${usr.displayName}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => setDeleteUserTarget(usr)}
                                title={
                                  isSelf
                                    ? 'Cannot remove your active Super Admin account'
                                    : 'Delete User'
                                }
                                aria-label={`Delete ${usr.displayName}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending & Claimed Invitations */}
      {canPerformAdminAction && cloudAuthorized && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                User Onboarding Invitations ({userInvites.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Invited email addresses automatically receive workspace access &amp; their assigned role when they sign in with Google
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openInviteModal('head_office')}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
              >
                + Head Office User
              </button>
              <button
                type="button"
                onClick={() => openInviteModal('default')}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                + New Invite
              </button>
            </div>
          </div>

          {userInvites.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No external collaborator invitations yet. Click &ldquo;Invite User&rdquo; to authorize team members on additional devices.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Credential</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userInvites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-slate-800">{inv.email}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{inv.displayName}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {ROLE_DISPLAY_LABELS[inv.role] || inv.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{getBranchName(inv.branchId)}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {inv.hasAccessPasscode ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <Lock className="h-3 w-3" />
                            <span>Passcode Set</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Google SSO Only</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            inv.status === 'claimed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void revokeUserInvite(inv.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          title="Revoke Invitation"
                          aria-label={`Revoke invite for ${inv.email}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Multi-Device Active Sessions */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Connected Multi-Device Sessions ({deviceSessions.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Desktop workstations, tablets, and mobile phones currently synchronized to this enterprise tenant
              </p>
            </div>
          </div>
        </div>

        {deviceSessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Sign in with Google to register this device and view live active sessions across your team.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {deviceSessions.map((sess) => {
              const isThisDevice = sess.id === currentDeviceMeta.sessionId;
              return (
                <div
                  key={sess.id}
                  className={`rounded-xl border p-4 space-y-2.5 text-xs ${
                    isThisDevice ? 'border-slate-900 bg-slate-50/70' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {renderDeviceIcon(sess.deviceType)}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{sess.userName}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {sess.deviceType} · {sess.browser || 'Browser'}
                        </div>
                      </div>
                    </div>
                    {isThisDevice ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                        This Device
                      </span>
                    ) : (
                      (canPerformAdminAction || sess.uid === firebaseUser?.uid) && (
                        <button
                          type="button"
                          onClick={() => void removeDeviceSession(sess.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer shrink-0"
                          title="Remove Device Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{getBranchName(sess.branchId)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0 font-mono">
                      <Clock className="h-3 w-3" />
                      {sess.lastSeenAt ? new Date(sess.lastSeenAt).toLocaleTimeString() : 'Live'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite User Modal (Includes Password field & Branch Admin role) */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {inviteMode === 'head_office' ? 'Add Head Office User' : 'Invite Workspace User'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {inviteMode === 'head_office'
                    ? 'Authorize a Head Office user account with assigned role, Head Office scope, and access password'
                    : 'Pre-authorize a collaborator account with assigned role, branch scope, and access password'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="Close Invite Modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleInviteSubmit(e)} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@gmail.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Faisal Al-Otaibi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Password *</label>
                  <button
                    type="button"
                    onClick={generateTempPasscode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <KeyRound className="h-3 w-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 outline-none focus:border-slate-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword((prev) => !prev)}
                    aria-label={showInvitePassword ? 'Hide password' : 'Show password'}
                    title={showInvitePassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showInvitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[10.5px] text-slate-400">
                  Stored securely as a SHA-256 digest in Firestore; never exposed in plaintext.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as RoleTier)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                  >
                    <option value="branch_admin">Branch Admin</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="finance_officer">Finance Officer</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="employee">Standard Employee</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Branch Scope</label>
                    {inviteBranchId !== headOfficeBranchId && (
                      <button
                        type="button"
                        onClick={() => setInviteBranchId(headOfficeBranchId)}
                        className="text-[10.5px] font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        Set Head Office
                      </button>
                    )}
                  </div>
                  <select
                    value={inviteBranchId}
                    onChange={(e) => setInviteBranchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                  >
                    <option value="all">All Branches</option>
                    {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={inviteDesignation}
                    onChange={(e) => setInviteDesignation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? 'Provisioning...' : 'Issue Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Workspace User Modal */}
      {viewUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Workspace User Details</h2>
                <p className="text-[11px] text-slate-500">
                  Authorized profile, role assignment &amp; device telemetry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewUserTarget(null)}
                aria-label="Close User Details"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <div className="text-sm font-bold text-slate-900">{viewUserTarget.displayName}</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  UID: {viewUserTarget.uid}
                </div>
                {viewUserTarget.email && (
                  <div className="text-[11px] text-slate-600 mt-0.5">{viewUserTarget.email}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Role Tier
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {ROLE_DISPLAY_LABELS[viewUserTarget.role] || viewUserTarget.role}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Account Status
                  </div>
                  <div className="mt-1 font-semibold capitalize text-slate-900">
                    {viewUserTarget.status}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Assigned Branch Scope
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {getBranchName(viewUserTarget.branchId)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Department
                  </div>
                  <div className="mt-1 font-medium text-slate-800">
                    {viewUserTarget.department || '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Designation
                  </div>
                  <div className="mt-1 font-medium text-slate-800">
                    {viewUserTarget.designation || '—'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Last Device Endpoint
                  </div>
                  <div className="mt-1 font-medium text-slate-800">
                    {viewUserTarget.lastDeviceLabel || viewUserTarget.lastDeviceType || 'Web Browser'}
                  </div>
                </div>
                {viewUserTarget.lastActiveAt && (
                  <div className="text-right font-mono text-[10px] text-slate-500">
                    {new Date(viewUserTarget.lastActiveAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                {canPerformAdminAction && cloudAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewUserTarget;
                      setViewUserTarget(null);
                      openEditUserModal(target);
                    }}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Edit Access
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewUserTarget(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workspace User Modal */}
      {editUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Edit Authorized User</h2>
                <p className="text-[11px] text-slate-500">
                  Modify role tier, branch scope, status, and directory metadata for {editUserTarget.displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditUserTarget(null)}
                aria-label="Close Edit Modal"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveUserEdit(e)} className="p-5 space-y-3.5 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div className="font-bold text-slate-900">{editUserTarget.displayName}</div>
                <div className="text-[11px] font-mono text-slate-500">{editUserTarget.uid}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Tier</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as RoleTier)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="branch_admin">Branch Admin</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="finance_officer">Finance Officer</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="employee">Standard Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as WorkspaceUserAccount['status'])
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Branch Scope</label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                >
                  <option value="all">All Branches (Consolidated)</option>
                  {!headOfficeBranch && <option value="HEAD_OFFICE">Head Office</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUserTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {savingUserEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace User Confirmation Modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <h2 className="text-sm font-bold">Remove Workspace User</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                aria-label="Cancel Delete User"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p>
                Permanently remove <strong className="text-slate-900">{deleteUserTarget.displayName}</strong> ({ROLE_DISPLAY_LABELS[deleteUserTarget.role] || deleteUserTarget.role}) and revoke their cloud workspace access?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteUserTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => void handleConfirmDeleteUser()}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {deletingUser ? 'Removing...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
