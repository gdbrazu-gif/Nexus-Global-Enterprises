import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  User,
  CreditCard,
  CalendarCheck,
  CalendarDays,
  Printer,
  Laptop,
  Coins,
  Send,
  CheckCircle,
} from 'lucide-react';

interface EmployeeSelfServiceProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const EmployeeSelfService: React.FC<EmployeeSelfServiceProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const {
    currentEmployeeUser,
    formatCurrency,
    baseCurrency,
    timesheetEntries,
    leaveRequests,
    addLeaveRequest,
    assets,
    corporateEntity,
  } = useHRMS();

  const emp = currentEmployeeUser;

  // Leave submission state
  const [leaveType, setLeaveType] = useState<'Annual Vacation' | 'Sick Leave' | 'Emergency Leave'>('Annual Vacation');
  const [startDate, setStartDate] = useState('2026-11-05');
  const [endDate, setEndDate] = useState('2026-11-12');
  const [days, setDays] = useState(6);
  const [reason, setReason] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Filter own timesheets for current month
  const ownTimesheets = timesheetEntries.filter(
    (e) => e.employeeId === emp.id && e.date.startsWith('2026-10')
  );

  // Filter own leaves
  const ownLeaves = leaveRequests.filter((r) => r.employeeId === emp.id);

  // Filter own assigned assets
  const ownAssets = assets.filter((a) => a.assignedToEmployeeId === emp.id);

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    addLeaveRequest({
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department,
      leaveType,
      startDate,
      endDate,
      totalDays: Number(days),
      reason,
    });
    setSubmittedSuccess(true);
    setReason('');
    setTimeout(() => setSubmittedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={emp.profileImage}
            alt={emp.fullName}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{emp.fullName}</h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                Single Own Profile Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Emp ID: {emp.id} · {emp.designation} ({emp.department})
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manager: {emp.managerName} · Joined: {emp.joiningDate}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 font-mono text-xs text-right">
            <span className="text-slate-400 text-[10px] block">MONTHLY TAKE-HOME</span>
            <span className="font-bold text-emerald-800 text-sm">
              {formatCurrency(emp.totalMonthlyPackage)}
            </span>
          </div>
          <button
            onClick={() => onSelectTab('employee-payslip')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            <span>View & Print Payslip</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => onSelectTab('employee-profile')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            currentTab === 'employee-profile'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Dossier & Legal Identity
        </button>
        <button
          onClick={() => onSelectTab('employee-timesheet')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            currentTab === 'employee-timesheet'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Attendance & Timesheet
        </button>
        <button
          onClick={() => onSelectTab('employee-leaves')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            currentTab === 'employee-leaves'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Leave Requests
        </button>
        <button
          onClick={() => onSelectTab('employee-payslip')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            currentTab === 'employee-payslip'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Salary Statement
        </button>
        <button
          onClick={() => onSelectTab('employee-assets')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
            currentTab === 'employee-assets'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Custody Assets
        </button>
      </div>

      {/* VIEW: Dossier & Legal Details */}
      {(currentTab === 'employee-profile' || currentTab === 'dashboard') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 font-mono">
            <h3 className="font-bold text-slate-900 text-sm font-sans border-b border-slate-100 pb-2">
              National ID, Iqama & Passport Credentials
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Iqama / National ID:</span>
                <span className="font-bold text-slate-900">{emp.iqamaNationalId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Passport Number:</span>
                <span className="font-bold text-slate-900">{emp.passportNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Passport Expiry:</span>
                <span className="text-slate-800">{emp.passportExpiry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nationality:</span>
                <span className="text-slate-800 font-sans font-medium">{emp.nationality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Corporate Email:</span>
                <span className="text-slate-800">{emp.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Phone:</span>
                <span className="text-slate-800">{emp.phone}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 font-mono">
            <h3 className="font-bold text-slate-900 text-sm font-sans border-b border-slate-100 pb-2">
              Banking & Compensation Particulars
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Base Salary:</span>
                <span className="font-bold text-slate-900">{formatCurrency(emp.monthlyBaseSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Annual Base (×12):</span>
                <span className="font-bold text-slate-900">{formatCurrency(emp.annualBaseSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Housing Allowance:</span>
                <span>{formatCurrency(emp.housingAllowance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transport Allowance:</span>
                <span>{formatCurrency(emp.transportAllowance)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-emerald-800 text-xs">
                <span>Total Monthly Package:</span>
                <span>{formatCurrency(emp.totalMonthlyPackage)}</span>
              </div>
              <div className="pt-2 text-[11px] text-slate-500">
                <span>Disbursement IBAN: </span>
                <span className="text-slate-800 font-semibold">{emp.bankIban}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Attendance & Timesheet */}
      {currentTab === 'employee-timesheet' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                My Monthly Timesheet Log (October 2026)
              </h3>
              <p className="text-slate-500">
                Audited daily work hours, overtime, and weekend schedule.
              </p>
            </div>
            <span className="font-mono text-slate-600 font-medium">31 Days Ledger</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-600">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Regular (h)</th>
                  <th className="p-2.5 text-right">Overtime (h)</th>
                  <th className="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownTimesheets.slice(0, 15).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-bold text-slate-800">{entry.date}</td>
                    <td className="p-2.5 capitalize font-sans">
                      <span
                        className={`text-[11px] font-semibold ${
                          entry.status === 'present'
                            ? 'text-emerald-700'
                            : entry.status === 'overtime'
                            ? 'text-amber-700'
                            : entry.status === 'weekend'
                            ? 'text-slate-400'
                            : 'text-blue-700'
                        }`}
                      >
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2.5 text-right tabular-nums">{entry.regularHours}</td>
                    <td className="p-2.5 text-right tabular-nums text-amber-700 font-bold">
                      {entry.overtimeHours > 0 ? `+${entry.overtimeHours}` : '-'}
                    </td>
                    <td className="p-2.5 font-sans text-slate-500 text-[11px]">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Leave Requests */}
      {currentTab === 'employee-leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submit Application */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Apply for Time-Off
            </h3>
            {submittedSuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-800 font-medium flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Application submitted to HR for review.
              </div>
            )}
            <form onSubmit={handleSubmitLeave} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Leave Classification</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none bg-white"
                >
                  <option value="Annual Vacation">Annual Paid Vacation</option>
                  <option value="Sick Leave">Sick Leave (Medical Note)</option>
                  <option value="Emergency Leave">Emergency / Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Days</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Handover & Reason</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Task handover details and contact emergency..."
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>

          {/* Past Requests */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              My Historical Applications
            </h3>
            {ownLeaves.length === 0 ? (
              <div className="text-slate-400 py-6 text-center">No leave applications on file.</div>
            ) : (
              <div className="space-y-2">
                {ownLeaves.map((l) => (
                  <div key={l.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{l.leaveType}</span>
                      <span
                        className={`text-[11px] font-semibold uppercase ${
                          l.status === 'approved'
                            ? 'text-emerald-700'
                            : l.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {l.startDate} to {l.endDate} ({l.totalDays} Days)
                    </div>
                    <div className="text-slate-600">{l.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Payslip Statement */}
      {currentTab === 'employee-payslip' && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-xs">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={corporateEntity.logoUrl}
                  alt="Logo"
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h2 className="text-base font-bold text-slate-900">{corporateEntity.companyName}</h2>
                  <p className="text-xs text-slate-600">{corporateEntity.legalName}</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold uppercase text-slate-900 block">PERSONAL PAYSLIP</span>
                <span className="font-mono text-slate-500">Period: October 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">EMPLOYEE NAME</span>
                <span className="font-bold text-slate-900 font-sans text-sm">{emp.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">EMPLOYEE ID / IQAMA</span>
                <span>{emp.id} / {emp.iqamaNationalId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">DESIGNATION</span>
                <span className="font-sans text-slate-800">{emp.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">NET MONTHLY PACKAGE</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {formatCurrency(emp.totalMonthlyPackage)}
                </span>
              </div>
            </div>

            <div className="flex justify-end no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Custody Assets */}
      {currentTab === 'employee-assets' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Corporate Assets in Custody
          </h3>
          {ownAssets.length === 0 ? (
            <div className="text-slate-400 py-6 text-center">No assigned assets currently.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownAssets.map((asset) => (
                <div key={asset.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{asset.name}</span>
                    <span className="font-mono text-slate-500 font-bold">{asset.assetTag}</span>
                  </div>
                  <div className="text-slate-600">Category: {asset.categoryName}</div>
                  <div className="font-mono text-slate-500 text-[11px]">
                    Serial: {asset.serialNumber} · Warranty to: {asset.warrantyExpiry}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
