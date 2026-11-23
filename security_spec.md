# Firestore Security Specification — Enterprise HRMS, Multi-Branch & Multi-Device ERP

## 1. Access Roles & Identity Model
- **Super Admin (`isAdmin()`)**:
  - Verified bootstrap email `gdbrazu@gmail.com` (`request.auth.token.email_verified == true`), OR
  - Presence of `/admins/{request.auth.uid}`, OR
  - `/users/{request.auth.uid}` with `role == 'super_admin' && status == 'active'`.
- **Active Workspace Member (`isWorkspaceMember()`)**:
  - `isAdmin()` OR `/users/{request.auth.uid}` exists with `status == 'active'`.
- **Department / HR / Finance / Project Managers (`isManagerOrHr()`)**:
  - `isAdmin()` OR active member with `role in ['hr_manager', 'finance_officer', 'project_manager']`.

## 2. PII & Least Privilege Invariants
1. **Catch-All Default Deny**: `match /{document=**} { allow read, write: if false; }` is enforced at the root of `match /databases/{database}/documents`.
2. **PII Isolation (`/users/{userId}`)**:
   - Stores sensitive account `email`.
   - `get`: strictly `isOwner(userId) || isAdmin()`.
   - `list`: strictly `isAdmin()`.
   - Self-creation allowed ONLY with `role == 'employee'` and `status == 'active'` (unless redeeming a verified `/user_invites/{email}` doc matching `request.auth.token.email` and exact `role`/`branchId`), preventing role self-escalation.
   - `role`, `status`, and `branchId` cannot be self-escalated on `update` unless `isAdmin()`.
3. **Non-PII Collaborator Directory (`/user_directory/{userId}`)**:
   - Explicitly omits `email`, `phone`, `address`, and IP addresses (`keys().hasOnly(...)` enforced).
   - Readable by active workspace members (`isWorkspaceMember()`); writable by owner (device/presence updates with `role`/`status` unchanged) or `isAdmin()`.
4. **Device Sessions (`/device_sessions/{sessionId}`)**:
   - Tracks Desktop / Tablet / Mobile presence per signed-in user.
   - Readable by `isOwner(resource.data.uid) || isAdmin()`; writable only for own `uid` or by `isAdmin()`.
5. **Append-Only Audit Trail (`/audit_logs/{logId}`)**:
   - `create` allowed for `isWorkspaceMember()` with validated string lengths (`details <= 500`, `id <= 64`, `timestamp <= 64`).
   - `update` and `delete` strictly forbidden (`if false`).
6. **Multi-Branch & Operational Collections**:
   - `/branches/{branchId}`, `/projects/{projectId}`, `/villas/{villaId}`, `/expenses/{expenseId}`, `/timesheet_entries/{entryId}`, `/leave_requests/{leaveId}`, `/inventory_items/{itemId}`, `/inventory_invoices/{invoiceId}`, `/stock_movements/{movementId}`, `/manpower_suppliers/{supplierId}`, `/supplied_workers/{workerId}`, `/manpower_pos/{posId}`, `/departments/{deptId}`, `/designations/{desId}`, `/accounting_categories/{catId}`, `/assets/{assetId}`, `/asset_categories/{catId}`, `/corporate_settings/{settingId}`, `/template_configs/{templateId}`, `/rbac_matrix/{roleId}`, `/custom_privileges/{privId}`.
   - Read requires `isWorkspaceMember()` (with `isValidId()` on `get`); write enforces document ID alignment, bounded strings/lists, server timestamps (`serverUpdatedAt == request.time`), and role boundaries.
7. **Employee Directory (`/employees/{employeeId}`)**:
   - Contains salary and PII; readable only by `isAdmin()`, `isManagerOrHr()`, or the matching employee (`resource.data.email == request.auth.token.email`); writable only by `isAdmin()` or HR Manager (`role == 'hr_manager'`).

## 3. Dirty Dozen Attack Scenarios Verified Against Rules
1. **Unauthenticated read/list on `/users`, `/employees`, `/branches`, `/expenses`, `/audit_logs`** -> Denied (`request.auth == null`).
2. **External random Google user (`attacker@gmail.com`) without `/user_invites` or `/users` trying to read `/branches` or `/employees`** -> Denied (`!isWorkspaceMember()`).
3. **Employee self-escalating `/users/{uid}` `role` to `'super_admin'` on create or update** -> Denied (`role == 'employee'` enforced on uninvited signup, immutable on self-update).
4. **Forged `operatorUid` mismatch in `/audit_logs` or `uid` spoofing in `/device_sessions`** -> Denied (`uid == request.auth.uid`).
5. **Updating or deleting an entry in `/audit_logs`** -> Denied (`allow update, delete: if false`).
6. **Oversized string (> max bounds) or injected arbitrary nested keys** -> Denied (`hasOnly(...)` + `.size() <= N`).
7. **Non-admin creating or deleting a Branch in `/branches`** -> Denied (`isAdmin()` required for branch create/delete).
8. **Deleting another user's `/device_sessions` doc** -> Denied (`isOwner(resource.data.uid) || isAdmin()`).
9. **Forcing past/future timestamps on `serverUpdatedAt`** -> Denied (`serverUpdatedAt == request.time`).
10. **Standard employee attempting to list all `/users` accounts to harvest emails** -> Denied (`allow list: if isAdmin()`).
11. **Standard employee attempting to approve own `/leave_requests` or `/expenses`** -> Denied (`status == 'pending'` on employee create; approval requires `isManagerOrHr()` / `isAdmin()`).
12. **Client attempting to write an unknown collection `/secret_dump/1`** -> Denied (catch-all `match /{document=**} { allow read, write: if false; }`).
