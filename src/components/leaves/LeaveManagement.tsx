import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { LeaveRequest } from '../../types';
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  X,
  AlertTriangle,
  User,
  Clock,
} from 'lucide-react';

export const LeaveManagement: React.FC = () => {
  const {
    leaveRequests,
    addLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    deleteLeaveRequest,
    canPerformHrAction,
    canPerformAdminAction,
    employees,
    t,
  } = useHRMS();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rejectModalReq, setRejectModalReq] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState(employees[0]?.id || 'EMP-1001');
  const [formLeaveType, setFormLeaveType] = useState<LeaveRequest['leaveType']>('Annual Vacation');
  const [formStartDate, setFormStartDate] = useState('2026-11-01');
  const [formEndDate, setFormEndDate] = useState('2026-11-05');
  const [formDays, setFormDays] = useState(5);
  const [formReason, setFormReason] = useState('');

  const filteredRequests = leaveRequests.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === formEmployeeId);
    if (!emp) return;

    addLeaveRequest({
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department,
      leaveType: formLeaveType,
      startDate: formStartDate,
      endDate: formEndDate,
      totalDays: Number(formDays),
      reason: formReason,
    });

    setCreateModalOpen(false);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;
    rejectLeaveRequest(rejectModalReq.id, rejectReason);
    setRejectModalReq(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.navLeaves}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Leave approval workflows, vacation accruals, and statutory time-off (Super Admin & HR Manager governance).
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Submit Leave Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 text-xs">
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`pb-2.5 px-3 font-semibold capitalize border-b-2 transition-colors ${
                statusFilter === st
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {st} ({leaveRequests.filter((r) => st === 'all' || r.status === st).length})
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          {canPerformHrAction
            ? 'Super Admin / HR Manager approval mode active'
            : 'Employee read-only view'}
        </span>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
              <th className="px-4 py-3">Request ID & Staff</th>
              <th className="px-4 py-3">Leave Type</th>
              <th className="px-4 py-3">Duration & Dates</th>
              <th className="px-4 py-3">Reason / Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Governance Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{req.employeeName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {req.id} · {req.employeeId}
                  </div>
                </td>

                <td className="px-4 py-3 font-medium text-slate-800">
                  {req.leaveType}
                  <div className="text-[11px] text-slate-400 font-normal">{req.department}</div>
                </td>

                <td className="px-4 py-3 font-mono text-[11px]">
                  <div className="font-semibold text-slate-800">{req.totalDays} Days</div>
                  <div className="text-slate-500">
                    {req.startDate} to {req.endDate}
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                  <div className="truncate">{req.reason}</div>
                  {req.rejectionReason && (
                    <div className="text-[10px] text-red-600 mt-0.5">
                      Rejected: {req.rejectionReason}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${
                      req.status === 'approved'
                        ? 'text-emerald-700'
                        : req.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>

                {/* Actions: View, Approve, Reject, Delete (Super Admin & HR Manager only) */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {canPerformHrAction && req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveLeaveRequest(req.id)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                          title="Approve Leave Request"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectModalReq(req)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Reject Leave Request"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {canPerformHrAction && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Permanently delete leave request record ${req.id}?`
                            )
                          ) {
                            deleteLeaveRequest(req.id);
                          }
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: Submit Leave Request */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Submit Time-Off Application</h3>
              <button onClick={() => setCreateModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateLeave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Employee</label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Leave Classification</label>
                <select
                  value={formLeaveType}
                  onChange={(e) => setFormLeaveType(e.target.value as LeaveRequest['leaveType'])}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  <option value="Annual Vacation">Annual Paid Vacation</option>
                  <option value="Sick Leave">Sick Leave (Medical Note)</option>
                  <option value="Emergency Leave">Emergency / Compassionate Leave</option>
                  <option value="Hajj Pilgrimage">Hajj Pilgrimage (Statutory Saudi Law)</option>
                  <option value="Paternity / Maternity">Paternity / Maternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Days</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={formDays}
                  onChange={(e) => setFormDays(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Handover Notes</label>
                <textarea
                  required
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Detail your request and contact person during leave..."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Reason */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Reject Leave Request</h3>
            <p className="text-xs text-slate-500 mt-1">
              Provide formal justification for rejecting {rejectModalReq.employeeName}&apos;s leave.
            </p>
            <form onSubmit={handleConfirmReject} className="mt-3 space-y-3 text-xs">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g., project freeze, staff shortage)..."
                className="w-full rounded-md border border-slate-200 p-2.5 outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 font-medium text-white hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
