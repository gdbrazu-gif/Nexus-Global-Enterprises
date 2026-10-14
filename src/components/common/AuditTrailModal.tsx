import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { ShieldCheck, Search, Filter, X, Clock, User } from 'lucide-react';

export const AuditTrailModal: React.FC = () => {
  const { auditModalOpen, setAuditModalOpen, auditLogs } = useHRMS();
  const [filterEntity, setFilterEntity] = useState('all');
  const [search, setSearch] = useState('');

  if (!auditModalOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    const matchesEntity = filterEntity === 'all' || log.entityType === filterEntity;
    const matchesSearch =
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.operatorName.toLowerCase().includes(search.toLowerCase()) ||
      log.actionType.toLowerCase().includes(search.toLowerCase());
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl text-xs space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Compliance Audit Trail & Event Ledger
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable chronological record of administrative actions, salary edits, timesheet entries, and role switches.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAuditModalOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by operator, action or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white font-medium"
          >
            <option value="all">All Entity Types</option>
            <option value="Employee">Employee</option>
            <option value="Timesheet">Timesheet</option>
            <option value="Salary">Salary</option>
            <option value="Leave">Leave</option>
            <option value="Expense">Expense</option>
            <option value="Settings">Settings / RBAC</option>
            <option value="Category">Category</option>
            <option value="Asset">Asset</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No matching audit logs recorded.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 transition-colors space-y-1.5 font-mono text-[11px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        log.actionType === 'DELETE'
                          ? 'bg-rose-100 text-rose-800'
                          : log.actionType === 'APPROVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.actionType === 'REJECT'
                          ? 'bg-red-100 text-red-800'
                          : log.actionType === 'SALARY_EDIT'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {log.actionType}
                    </span>
                    <span className="text-slate-600 font-sans font-semibold">
                      [{log.entityType}]
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-700 font-sans">{log.operatorName}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{log.timestamp}</span>
                </div>
                <div className="text-slate-800 font-sans text-xs">{log.details}</div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{filteredLogs.length} verified log entries</span>
          <button
            onClick={() => setAuditModalOpen(false)}
            className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 font-sans"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
