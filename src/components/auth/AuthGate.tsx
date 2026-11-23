import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { LogOut, ShieldAlert } from 'lucide-react';

export const AuthGate: React.FC = () => {
  const {
    firebaseUser,
    authReady,
    cloudAuthorized,
    cloudAccessPending,
    cloudSyncError,
    signInWithGoogle,
    signOutCloud,
  } = useHRMS();

  const [googleError, setGoogleError] = useState<string | null>(null);
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setSigningInGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (!msg.toLowerCase().includes('popup-closed-by-user')) {
        setGoogleError(msg);
      }
    } finally {
      setSigningInGoogle(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-xs font-medium text-slate-500">Checking session...</div>
      </div>
    );
  }

  // View-only signed-out gate: render ONLY Sign in with Google
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          {googleError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-800 max-w-sm text-center">
              {googleError}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={signingInGoogle}
            className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50 cursor-pointer transition-colors"
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
            <span>{signingInGoogle ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Signed in with Google, checking authorization
  if (!cloudAuthorized && !cloudAccessPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Verifying Google account access...
          </p>
          <p className="text-xs text-slate-500">{firebaseUser.email}</p>
          <button
            type="button"
            onClick={() => void signOutCloud()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  // Signed in with Google, not invited / suspended
  if (cloudAccessPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">
                Workspace Authorization Required
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Signed in as <strong>{firebaseUser.email}</strong>.{' '}
                {cloudSyncError ||
                  'This Google account does not yet have an active invitation or permission to enter the workspace.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => void signOutCloud()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-xs font-medium text-slate-500">Entering workspace...</div>
    </div>
  );
};
