import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  db,
  FIREBASE_BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  stripUndefined,
  clampSafeUrl,
  getUtf8ByteLength,
  getOrCreateDeviceSessionMeta,
  rotateDeviceSessionId,
} from '../firebase';
import {
  AccountingCategory,
  Asset,
  AssetCategory,
  AuditLog,
  Branch,
  CorporateLegalEntity,
  CustomPrivilege,
  Department,
  Designation,
  DeviceSession,
  Employee,
  Expense,
  InventoryInvoice,
  InventoryItem,
  LeaveRequest,
  ManpowerPOS,
  ManpowerSupplier,
  Project,
  RoleTier,
  StockMovement,
  SuppliedWorker,
  TemplateCustomization,
  TimesheetEntry,
  UserInvite,
  Villa,
  WorkspaceUserAccount,
} from '../types';
import { RoleMatrixMap, RBAC_ROLES } from '../data/rbacDefaults';

const DEFAULT_FALLBACK_LOGO = '/src/assets/images/corporate_logo_hrms_1791900623826.jpg';

function normalizeDocData<T>(raw: Record<string, unknown>, id: string): T {
  const copy: Record<string, unknown> = { ...raw };
  delete copy.serverUpdatedAt;
  delete copy.serverCreatedAt;
  delete copy.updatedByUid;
  if (!copy.id) {
    copy.id = id;
  }
  return copy as T;
}

function clampUtf8(value: string, maxBytes: number): string {
  if (getUtf8ByteLength(value) <= maxBytes) return value;
  let acc = '';
  let bytes = 0;
  for (const ch of value) {
    const chBytes = getUtf8ByteLength(ch);
    if (bytes + chBytes > maxBytes) break;
    acc += ch;
    bytes += chBytes;
  }
  return acc;
}

export function sanitizeRecordForCloud(
  record: Record<string, unknown>,
  uid?: string | null,
  includeCreated = false
): Record<string, unknown> {
  const clean = stripUndefined({ ...record });
  if ('profileImage' in clean) {
    if (typeof clean.profileImage === 'string') {
      clean.profileImage = clampSafeUrl(clean.profileImage, DEFAULT_FALLBACK_LOGO, 65536);
    } else {
      delete clean.profileImage;
    }
  }
  if ('logoUrl' in clean) {
    if (typeof clean.logoUrl === 'string') {
      clean.logoUrl = clampSafeUrl(clean.logoUrl, DEFAULT_FALLBACK_LOGO, 65536);
    } else {
      delete clean.logoUrl;
    }
  }
  if ('customLogoUrl' in clean) {
    if (typeof clean.customLogoUrl === 'string') {
      clean.customLogoUrl = clampSafeUrl(clean.customLogoUrl, DEFAULT_FALLBACK_LOGO, 65536);
    } else {
      delete clean.customLogoUrl;
    }
  }
  if ('photoURL' in clean) {
    if (typeof clean.photoURL === 'string') {
      clean.photoURL = clampSafeUrl(clean.photoURL, '', 1024);
    } else {
      delete clean.photoURL;
    }
  }
  if (uid) {
    clean.updatedByUid = uid;
  }
  clean.serverUpdatedAt = serverTimestamp();
  if (includeCreated) {
    clean.serverCreatedAt = serverTimestamp();
  }
  return clean;
}

export async function upsertCloudDoc(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  const path = `${collectionName}/${docId}`;
  try {
    const normalized = normalizeCollectionRecord(collectionName, docId, { ...data, id: docId });
    if (!normalized) return;
    const payload = sanitizeRecordForCloud(normalized, uid, false);
    const ref = doc(db, collectionName, docId);
    if (collectionName === 'corporate_settings') {
      await setDoc(ref, payload, { merge: true });
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertCloudRbacRole(
  roleId: RoleTier,
  permissions: Record<string, boolean>,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  const path = `rbac_matrix/${roleId}`;
  try {
    const cleanPermissions: Record<string, boolean> = {};
    Object.entries(permissions || {}).forEach(([k, v]) => {
      if (typeof v === 'boolean') {
        cleanPermissions[k] = v;
      }
    });
    const payload = stripUndefined({
      roleId,
      permissions: cleanPermissions,
      updatedAt: new Date().toISOString().slice(0, 64),
      updatedByUid: uid,
      serverUpdatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'rbac_matrix', roleId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertCloudRbacMatrix(
  matrix: RoleMatrixMap,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString().slice(0, 64);
    RBAC_ROLES.forEach((role) => {
      const cleanPermissions: Record<string, boolean> = {};
      Object.entries(matrix[role.id] || {}).forEach(([k, v]) => {
        if (typeof v === 'boolean') {
          cleanPermissions[k] = v;
        }
      });
      batch.set(
        doc(db, 'rbac_matrix', role.id),
        stripUndefined({
          roleId: role.id,
          permissions: cleanPermissions,
          updatedAt: nowIso,
          updatedByUid: uid,
          serverUpdatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'rbac_matrix');
  }
}

export async function upsertCloudInvite(
  invite: UserInvite,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  const cleanEmail = invite.email.trim().toLowerCase();
  const path = `user_invites/${cleanEmail}`;
  try {
    const ref = doc(db, 'user_invites', cleanEmail);
    const existingSnap = await getDoc(ref);
    const cleanInvite: Record<string, unknown> = {
      id: cleanEmail,
      email: cleanEmail,
      displayName: (invite.displayName || cleanEmail.split('@')[0] || 'Invited User').slice(0, 100),
      role: invite.role,
      branchId: (invite.branchId || 'all').slice(0, 64),
      department: invite.department ? invite.department.slice(0, 80) : undefined,
      designation: invite.designation ? invite.designation.slice(0, 100) : undefined,
      status: invite.status || 'pending',
      hasAccessPasscode: typeof invite.hasAccessPasscode === 'boolean' ? invite.hasAccessPasscode : undefined,
      accessPasscodeHash: invite.accessPasscodeHash ? invite.accessPasscodeHash.slice(0, 128) : undefined,
      invitedByUid: uid,
      createdAt: (invite.createdAt || new Date().toISOString()).slice(0, 64),
    };
    const payload = sanitizeRecordForCloud(cleanInvite, uid, !existingSnap.exists());
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudWorkspaceUser(
  targetUid: string,
  actorUid?: string | null
): Promise<void> {
  if (!actorUid || !targetUid) return;
  try {
    await deleteDoc(doc(db, 'user_directory', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `user_directory/${targetUid}`);
  }
  try {
    await deleteDoc(doc(db, 'users', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
  }
}

export async function updateCloudWorkspaceUser(
  targetUid: string,
  dirData: Record<string, unknown>,
  userData: Record<string, unknown> | null,
  actorUid?: string | null
): Promise<void> {
  if (!actorUid) return;
  const dirPath = `user_directory/${targetUid}`;
  try {
    const dirRef = doc(db, 'user_directory', targetUid);
    const dirSnap = await getDoc(dirRef);
    const dirPayload = sanitizeRecordForCloud(
      { ...dirData, uid: targetUid },
      actorUid,
      !dirSnap.exists()
    );
    delete dirPayload.id;
    await setDoc(dirRef, dirPayload, { merge: true });

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDocServerFirst(userRef).catch(() => getDoc(userRef));
    if (userSnap.exists()) {
      const existingUser = userSnap.data() as Record<string, unknown>;
      const mergedUser: Record<string, unknown> = {
        uid: targetUid,
        email:
          (typeof userData?.email === 'string' && userData.email.trim())
            ? userData.email.trim()
            : existingUser.email,
        displayName: userData?.displayName ?? dirData.displayName ?? existingUser.displayName,
        photoURL: existingUser.photoURL,
        role: userData?.role ?? dirData.role ?? existingUser.role,
        branchId: userData?.branchId ?? dirData.branchId ?? existingUser.branchId,
        department: userData?.department ?? dirData.department ?? existingUser.department,
        designation: userData?.designation ?? dirData.designation ?? existingUser.designation,
        status: userData?.status ?? dirData.status ?? existingUser.status,
        lastLogin: existingUser.lastLogin,
      };
      const userPayload = sanitizeRecordForCloud(mergedUser, actorUid, false);
      if (existingUser.serverCreatedAt !== undefined) {
        userPayload.serverCreatedAt = existingUser.serverCreatedAt;
      }
      delete userPayload.id;
      if (typeof userPayload.email === 'string' && userPayload.email.trim()) {
        await setDoc(userRef, userPayload, { merge: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dirPath);
  }
}

export async function removeCloudDoc(
  collectionName: string,
  docId: string,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCloudAuditLog(
  log: AuditLog,
  uid?: string | null
): Promise<void> {
  if (!uid) return;
  const path = `audit_logs/${log.id}`;
  try {
    const payload = stripUndefined({
      id: log.id,
      timestamp: (log.timestamp || new Date().toISOString()).slice(0, 64),
      operatorName: (log.operatorName || 'Authorized User').slice(0, 100),
      operatorRole: (log.operatorRole || 'USER').slice(0, 64),
      operatorUid: uid,
      branchId: (log.branchId || 'all').slice(0, 64),
      actionType: (log.actionType || 'UPDATE').slice(0, 32),
      entityType: (log.entityType || 'Settings').slice(0, 32),
      details: (log.details || 'Action recorded').slice(0, 500),
      serverCreatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'audit_logs', log.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

async function getDocServerFirst(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('network')) {
      return await getDoc(ref);
    }
    throw err;
  }
}

export async function bootstrapAuthenticatedMember(
  firebaseUser: User
): Promise<{
  authorized: boolean;
  role: RoleTier;
  branchId: string;
  account: WorkspaceUserAccount | null;
}> {
  const uid = firebaseUser.uid;
  const email = clampUtf8((firebaseUser.email || '').trim().toLowerCase(), 120);
  const displayName =
    clampUtf8(
      (firebaseUser.displayName || email.split('@')[0] || 'Enterprise User').trim(),
      100
    ) || 'Enterprise User';
  const photoURL = clampSafeUrl(firebaseUser.photoURL || undefined, '', 1024);
  const nowIso = new Date().toISOString();
  const deviceMeta = getOrCreateDeviceSessionMeta(uid);
  const isBootstrapAdmin =
    Boolean(firebaseUser.emailVerified) && email === FIREBASE_BOOTSTRAP_ADMIN_EMAIL;

  // 1. Check authoritative server state of /users/{uid}
  let existingUser: Record<string, unknown> | null = null;
  try {
    const userSnap = await getDocServerFirst(doc(db, 'users', uid));
    if (userSnap.exists()) {
      existingUser = userSnap.data() as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('User profile server check:', error);
  }

  let resolvedRole: RoleTier = (existingUser?.role as RoleTier) || 'employee';
  let resolvedBranchId: string = clampUtf8(String(existingUser?.branchId || '').trim() || 'all', 64) || 'all';
  let resolvedStatus: 'active' | 'invited' | 'suspended' =
    (existingUser?.status as 'active' | 'invited' | 'suspended') || 'active';
  let resolvedDept: string | undefined =
    typeof existingUser?.department === 'string' ? clampUtf8(existingUser.department, 80) : undefined;
  let resolvedDesig: string | undefined =
    typeof existingUser?.designation === 'string' ? clampUtf8(existingUser.designation, 100) : undefined;

  if (isBootstrapAdmin) {
    resolvedRole = 'super_admin';
    resolvedStatus = 'active';
    if (!existingUser) {
      resolvedBranchId = 'all';
    }
    try {
      const adminDoc = await getDocServerFirst(doc(db, 'admins', uid));
      if (!adminDoc.exists()) {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          grantedBy: email,
          createdAt: nowIso,
          serverCreatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
    }
  }

  // 2. Check /user_invites/{email} for pending invitation (new member, re-invite, or pre-created stub)
  let claimingInvite = false;
  if (!isBootstrapAdmin && email && firebaseUser.emailVerified) {
    try {
      const inviteSnap = await getDocServerFirst(doc(db, 'user_invites', email));
      if (inviteSnap.exists()) {
        const inviteData = inviteSnap.data() as UserInvite;
        if (inviteData.status === 'pending') {
          resolvedRole = inviteData.role;
          resolvedBranchId = (inviteData.branchId || 'all').slice(0, 64);
          resolvedStatus = 'active';
          if (typeof inviteData.department === 'string' && inviteData.department.trim()) {
            resolvedDept = inviteData.department.trim().slice(0, 80);
          }
          if (typeof inviteData.designation === 'string' && inviteData.designation.trim()) {
            resolvedDesig = inviteData.designation.trim().slice(0, 100);
          }
          claimingInvite = true;
        }
      }
    } catch (error) {
      console.warn('Invite lookup skipped:', error);
    }
  }

  // Unauthorized uninvited or suspended/inactive user cannot access workspace collections
  if ((!existingUser && !isBootstrapAdmin && !claimingInvite) || resolvedStatus !== 'active') {
    return {
      authorized: false,
      role: resolvedRole,
      branchId: resolvedBranchId,
      account: null,
    };
  }

  // 3a. Upsert /users/{uid} FIRST (while invite is still 'pending' if claiming) using clean schema keys
  try {
    const userEmail =
      existingUser && typeof existingUser.email === 'string' && existingUser.email.trim()
        ? existingUser.email.trim().toLowerCase().slice(0, 120)
        : email.slice(0, 120);

    const userPayload: Record<string, unknown> = {
      uid,
      email: userEmail,
      displayName,
      photoURL,
      role: resolvedRole,
      branchId: resolvedBranchId,
      department: resolvedDept,
      designation: resolvedDesig,
      status: resolvedStatus,
      lastLogin: nowIso.slice(0, 64),
      updatedByUid: uid,
      serverUpdatedAt: serverTimestamp(),
    };
    if (!existingUser) {
      userPayload.serverCreatedAt = serverTimestamp();
    } else if (existingUser.serverCreatedAt !== undefined) {
      userPayload.serverCreatedAt = existingUser.serverCreatedAt;
    }

    await setDoc(doc(db, 'users', uid), stripUndefined(userPayload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  // 3b. Upsert /user_directory/{uid} (now that /users/{uid} is guaranteed active & server state can be read)
  try {
    let existingDir: Record<string, unknown> | null = null;
    try {
      const dirSnap = await getDocServerFirst(doc(db, 'user_directory', uid));
      if (dirSnap.exists()) {
        existingDir = dirSnap.data() as Record<string, unknown>;
      }
    } catch {
      existingDir = null;
    }

    const dirPayload: Record<string, unknown> = {
      uid,
      displayName,
      role: resolvedRole,
      branchId: resolvedBranchId,
      department:
        resolvedDept ||
        (typeof existingDir?.department === 'string' ? existingDir.department.slice(0, 80) : undefined),
      designation:
        resolvedDesig ||
        (typeof existingDir?.designation === 'string' ? existingDir.designation.slice(0, 100) : undefined),
      status: resolvedStatus,
      lastDeviceType: deviceMeta.deviceType,
      lastDeviceLabel: `${deviceMeta.platform} · ${deviceMeta.browser}`.slice(0, 120),
      lastActiveAt: nowIso.slice(0, 64),
      updatedByUid: uid,
      serverUpdatedAt: serverTimestamp(),
    };
    if (!existingDir) {
      dirPayload.serverCreatedAt = serverTimestamp();
    } else if (existingDir.serverCreatedAt !== undefined) {
      dirPayload.serverCreatedAt = existingDir.serverCreatedAt;
    }

    await setDoc(doc(db, 'user_directory', uid), stripUndefined(dirPayload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_directory/${uid}`);
  }

  // 3c. Register active device session (with UID-collision recovery)
  const buildSessionPayload = (sessionId: string) =>
    stripUndefined({
      id: sessionId,
      uid,
      userName: displayName,
      deviceType: deviceMeta.deviceType,
      platform: deviceMeta.platform.slice(0, 64),
      browser: deviceMeta.browser.slice(0, 64),
      branchId: (resolvedBranchId || 'all').trim().slice(0, 64) || 'all',
      lastSeenAt: nowIso.slice(0, 64),
      createdAt: nowIso.slice(0, 64),
      updatedByUid: uid,
      serverUpdatedAt: serverTimestamp(),
    });

  try {
    await setDoc(
      doc(db, 'device_sessions', deviceMeta.sessionId),
      buildSessionPayload(deviceMeta.sessionId),
      { merge: true }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('permission') || msg.includes('insufficient')) {
      const freshSessionId = rotateDeviceSessionId(uid);
      try {
        await setDoc(doc(db, 'device_sessions', freshSessionId), buildSessionPayload(freshSessionId));
      } catch (retryError) {
        handleFirestoreError(retryError, OperationType.WRITE, `device_sessions/${freshSessionId}`);
      }
    } else {
      handleFirestoreError(error, OperationType.WRITE, `device_sessions/${deviceMeta.sessionId}`);
    }
  }

  // 3d. Mark pending invite as claimed AFTER /users & /user_directory succeed
  if (claimingInvite && email) {
    try {
      await setDoc(
        doc(db, 'user_invites', email),
        {
          status: 'claimed',
          updatedByUid: uid,
          serverUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_invites/${email}`);
    }
  }

  return {
    authorized: resolvedStatus === 'active',
    role: resolvedRole,
    branchId: resolvedBranchId,
    account: {
      uid,
      email,
      displayName,
      photoURL,
      role: resolvedRole,
      branchId: resolvedBranchId,
      department: resolvedDept,
      designation: resolvedDesig,
      status: resolvedStatus,
      lastDeviceType: deviceMeta.deviceType,
      lastDeviceLabel: `${deviceMeta.platform} · ${deviceMeta.browser}`,
      lastActiveAt: nowIso,
    },
  };
}

export interface WorkspaceCloudSeedPayload {
  branches: Branch[];
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  timesheetEntries: TimesheetEntry[];
  leaveRequests: LeaveRequest[];
  accountingCategories: AccountingCategory[];
  expenses: Expense[];
  projects: Project[];
  villas: Villa[];
  assetCategories: AssetCategory[];
  assets: Asset[];
  manpowerSuppliers: ManpowerSupplier[];
  suppliedWorkers: SuppliedWorker[];
  manpowerPOSList: ManpowerPOS[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  inventoryInvoices: InventoryInvoice[];
  customPrivileges: CustomPrivilege[];
  corporateEntity: CorporateLegalEntity;
  customVillaTypes: string[];
  manpowerTrades: string[];
  inventoryCategories: string[];
  inventoryUOMs: string[];
  inventoryWarehouses: string[];
  templateConfigs: Record<string, TemplateCustomization>;
  rbacMatrix?: RoleMatrixMap;
  auditLogs: AuditLog[];
}

const COLLECTION_ALLOWED_KEYS: Record<string, Set<string>> = {
  branches: new Set([
    'id', 'code', 'name', 'city', 'region', 'country', 'address', 'phone',
    'email', 'managerName', 'isHeadquarters', 'status', 'createdAt', 'updatedAt',
  ]),
  employees: new Set([
    'id', 'fullName', 'email', 'phone', 'profileImage', 'department', 'operatingDepartment',
    'designation', 'roleTier', 'nationality', 'iqamaNationalId', 'passportNumber',
    'passportExpiry', 'joiningDate', 'status', 'employmentType', 'monthlyBaseSalary',
    'housingAllowance', 'transportAllowance', 'otherAllowances', 'annualBaseSalary',
    'totalMonthlyPackage', 'managerName', 'bankIban', 'gender', 'dateOfBirth',
    'bloodGroup', 'workLocation', 'probationPeriodMonths', 'noticePeriodDays',
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
    'bankName', 'advance', 'isOutsourced', 'supplierId', 'supplierName',
    'outsourcedWorkerId', 'trade', 'assignedProjectId', 'assignedProjectName',
    'branchId',
  ]),
  departments: new Set([
    'id', 'name', 'code', 'operatingUnit', 'headEmployeeId', 'headEmployeeName', 'location', 'branchId',
  ]),
  designations: new Set([
    'id', 'title', 'departmentId', 'gradeLevel', 'minSalary', 'maxSalary', 'branchId',
  ]),
  timesheet_entries: new Set([
    'id', 'employeeId', 'date', 'regularHours', 'overtimeHours', 'status', 'notes', 'updatedBy', 'updatedAt', 'branchId',
  ]),
  leave_requests: new Set([
    'id', 'employeeId', 'employeeName', 'department', 'leaveType', 'startDate', 'endDate',
    'totalDays', 'reason', 'status', 'reviewedBy', 'reviewDate', 'rejectionReason', 'branchId',
  ]),
  accounting_categories: new Set([
    'id', 'code', 'name', 'type', 'description', 'budgetCapSAR', 'status', 'branchId',
  ]),
  expenses: new Set([
    'id', 'expenseNumber', 'categoryId', 'categoryName', 'title', 'amountSAR', 'vendor', 'date',
    'projectId', 'projectName', 'submittedBy', 'status', 'receiptRef', 'notes', 'approvedBy', 'approvalDate', 'branchId',
  ]),
  projects: new Set([
    'id', 'code', 'name', 'client', 'department', 'location', 'budgetSAR', 'spentSAR', 'startDate',
    'endDate', 'status', 'leadName', 'assignedEmployeeId', 'assignedEmployeeName', 'assignedTeam', 'branchId',
  ]),
  villas: new Set([
    'id', 'blockNo', 'villaNo', 'villaType', 'villaQuantity', 'customVilla', 'customVillaSpecification',
    'projectId', 'projectName', 'assignedEmployeeId', 'assignedEmployeeName', 'floors', 'bedrooms',
    'builtUpAreaSqm', 'plotAreaSqm', 'estimatedCostSAR', 'contractPriceSAR', 'constructionStatus',
    'handoverTargetDate', 'clientName', 'contractorName', 'notes', 'dailyWorkEntities', 'branchId',
  ]),
  asset_categories: new Set([
    'id', 'name', 'code', 'description', 'assetsCount', 'branchId',
  ]),
  assets: new Set([
    'id', 'assetTag', 'name', 'categoryId', 'categoryName', 'serialNumber', 'assignedToEmployeeId',
    'assignedToEmployeeName', 'purchaseDate', 'costSAR', 'warrantyExpiry', 'status', 'branchId',
  ]),
  manpower_suppliers: new Set([
    'id', 'code', 'name', 'legalEntityName', 'crNumber', 'vatNumber', 'contactPerson', 'email', 'phone',
    'city', 'address', 'agreementStartDate', 'agreementEndDate', 'status', 'suppliedTrades',
    'deployedWorkersCount', 'paymentTerms', 'complianceScore', 'totalInvoicedSAR', 'notes', 'branchId',
  ]),
  supplied_workers: new Set([
    'id', 'supplierId', 'supplierName', 'fullName', 'designation', 'trade', 'assignedProjectId',
    'assignedProjectName', 'iqamaOrWorkPermit', 'hourlyRateSAR', 'monthlyHoursLogged', 'status',
    'joiningDate', 'contactPhone', 'linkedEmployeeId', 'isAddedToDirectory', 'branchId',
  ]),
  manpower_pos: new Set([
    'id', 'posNumber', 'supplierId', 'supplierName', 'issueDate', 'commencementDate', 'completionDate',
    'projectId', 'projectName', 'scopeOfWork', 'lineItems', 'subtotalSAR', 'vatRate', 'vatAmountSAR',
    'grandTotalSAR', 'paymentTerms', 'status', 'authorizedBy', 'notes', 'branchId',
  ]),
  inventory_items: new Set([
    'id', 'sku', 'name', 'category', 'description', 'warehouseLocation', 'quantityOnHand',
    'minReorderLevel', 'maxStockLevel', 'unitOfMeasure', 'unitCostSAR', 'supplierName',
    'lastRestockedDate', 'status', 'branchId',
  ]),
  stock_movements: new Set([
    'id', 'itemId', 'itemName', 'type', 'quantity', 'date', 'referenceDoc', 'operatorName', 'notes', 'branchId',
  ]),
  inventory_invoices: new Set([
    'id', 'invoiceNumber', 'date', 'dueDate', 'type', 'clientOrVendor', 'contactPerson',
    'referenceDoc', 'lineItems', 'subtotalSAR', 'vatRate', 'vatAmountSAR', 'grandTotalSAR',
    'paymentTerms', 'status', 'notes', 'branchId',
  ]),
  custom_privileges: new Set([
    'id', 'name', 'description', 'assignedUsersCount', 'permissions',
  ]),
  corporate_settings: new Set([
    'id', 'companyName', 'legalName', 'logoUrl', 'crNumber', 'vatNumber', 'email', 'phone',
    'address', 'bankName', 'accountTitle', 'iban', 'swiftCode', 'baseCurrency',
    'customVillaTypes', 'manpowerTrades', 'inventoryCategories', 'inventoryUOMs', 'inventoryWarehouses',
  ]),
  template_configs: new Set([
    'id', 'title', 'subtitle', 'showLogo', 'logoPosition', 'accentColor',
    'showWatermark', 'watermarkText', 'showLegalEntity', 'showSignatures',
    'showQrStamp', 'footerNote', 'letterheadHeaderStyle', 'headerCompanyName',
    'headerLegalName', 'headerCrNumber', 'headerVatNumber', 'headerAddress',
    'headerPhone', 'headerEmail', 'headerWebsite', 'customLogoUrl',
    'showContactFooterBar', 'refNumber', 'documentDate', 'showRecipientBlock',
    'recipientName', 'recipientTitle', 'recipientOrganization', 'subjectLine',
    'bodyContent', 'signatoryName', 'signatoryTitle', 'recipientSignatoryLabel',
  ]),
};

const clampStr = (obj: Record<string, unknown>, key: string, maxBytes: number) => {
  const val = obj[key];
  if (val === undefined || val === null) {
    delete obj[key];
    return;
  }
  if (typeof val === 'string') {
    obj[key] = clampUtf8(val, maxBytes);
  } else if (typeof val === 'number' || typeof val === 'boolean') {
    obj[key] = clampUtf8(String(val), maxBytes);
  } else {
    delete obj[key];
  }
};

const clampNonNegNum = (obj: Record<string, unknown>, key: string, maxVal?: number) => {
  if (obj[key] !== undefined) {
    const num = Number(obj[key]);
    let clean = Number.isFinite(num) ? Math.max(0, num) : 0;
    if (typeof maxVal === 'number') {
      clean = Math.min(maxVal, clean);
    }
    obj[key] = clean;
  }
};

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

const sanitizeStringArray = (val: unknown, maxItems: number, maxItemBytes = 120): string[] => {
  if (!Array.isArray(val)) return [];
  const out: string[] = [];
  for (const item of val) {
    if (out.length >= maxItems) break;
    if (typeof item === 'string') {
      const cleaned = clampUtf8(item, maxItemBytes);
      if (cleaned) out.push(cleaned);
    } else if (typeof item === 'number' || typeof item === 'boolean') {
      out.push(clampUtf8(String(item), maxItemBytes));
    }
  }
  return out;
};

const sanitizeMapArray = (val: unknown, maxItems: number): Array<Record<string, unknown>> => {
  if (!Array.isArray(val)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const item of val) {
    if (out.length >= maxItems) break;
    if (isPlainObject(item)) {
      out.push(stripUndefined({ ...item }));
    }
  }
  return out;
};

function normalizeCollectionRecord(col: string, rawId: string, raw: Record<string, unknown>): Record<string, unknown> | null {
  const cleanedId = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.\-]+/g, '_');
  const safeId = clampUtf8(cleanedId, 128);
  if (!safeId) return null;

  const allowed = COLLECTION_ALLOWED_KEYS[col];
  const out: Record<string, unknown> = { id: safeId };
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || k === 'id') continue;
    if (!allowed || allowed.has(k)) {
      out[k] = v;
    }
  }

  if ('branchId' in out) {
    clampStr(out, 'branchId', 64);
  }

  if (col === 'branches') {
    out.code = clampUtf8(String(out.code || safeId).trim(), 32) || 'BR';
    out.name = clampUtf8(String(out.name || 'Enterprise Branch').trim(), 120) || 'Branch';
    out.city = clampUtf8(String(out.city || 'Riyadh').trim(), 80) || 'Riyadh';
    out.country = clampUtf8(String(out.country || 'Saudi Arabia').trim(), 80) || 'Saudi Arabia';
    const validStatuses = ['active', 'inactive', 'opening_soon'];
    out.status = validStatuses.includes(String(out.status)) ? out.status : 'active';
    if (out.isHeadquarters !== undefined) out.isHeadquarters = Boolean(out.isHeadquarters);
    clampStr(out, 'region', 80);
    clampStr(out, 'address', 300);
    clampStr(out, 'phone', 40);
    clampStr(out, 'email', 120);
    clampStr(out, 'managerName', 100);
    clampStr(out, 'createdAt', 64);
    clampStr(out, 'updatedAt', 64);
  } else if (col === 'employees') {
    out.fullName = clampUtf8(String(out.fullName || 'Workspace Employee').trim(), 120) || 'Employee';
    out.department = clampUtf8(String(out.department || 'Operations').trim(), 160) || 'Operations';
    const validRoles = ['super_admin', 'branch_admin', 'hr_manager', 'finance_officer', 'project_manager', 'employee'];
    out.roleTier = validRoles.includes(String(out.roleTier)) ? out.roleTier : 'employee';
    const validEmpStatuses = ['active', 'on_leave', 'probation', 'inactive'];
    out.status = validEmpStatuses.includes(String(out.status)) ? out.status : 'active';
    clampStr(out, 'email', 120);
    clampStr(out, 'phone', 40);
    if ('profileImage' in out) {
      if (typeof out.profileImage === 'string') {
        out.profileImage = clampSafeUrl(out.profileImage, DEFAULT_FALLBACK_LOGO, 65536);
      } else {
        delete out.profileImage;
      }
    }
    clampStr(out, 'operatingDepartment', 160);
    clampStr(out, 'designation', 160);
    clampStr(out, 'nationality', 80);
    clampStr(out, 'iqamaNationalId', 64);
    clampStr(out, 'passportNumber', 64);
    clampStr(out, 'passportExpiry', 64);
    clampStr(out, 'joiningDate', 64);
    clampStr(out, 'employmentType', 64);
    clampStr(out, 'managerName', 120);
    clampStr(out, 'bankIban', 64);
    clampStr(out, 'bankName', 120);
    clampStr(out, 'gender', 32);
    clampStr(out, 'dateOfBirth', 64);
    clampStr(out, 'bloodGroup', 32);
    clampStr(out, 'workLocation', 200);
    clampStr(out, 'emergencyContactName', 120);
    clampStr(out, 'emergencyContactPhone', 40);
    clampStr(out, 'emergencyContactRelationship', 40);
    clampStr(out, 'supplierId', 64);
    clampStr(out, 'supplierName', 120);
    clampStr(out, 'outsourcedWorkerId', 64);
    clampStr(out, 'trade', 80);
    clampStr(out, 'assignedProjectId', 64);
    clampStr(out, 'assignedProjectName', 160);
    if (out.isOutsourced !== undefined) out.isOutsourced = Boolean(out.isOutsourced);
    if ('advance' in out) {
      if (isPlainObject(out.advance)) {
        const adv: Record<string, unknown> = {};
        if (out.advance.hasAdvance !== undefined) adv.hasAdvance = Boolean(out.advance.hasAdvance);
        if (out.advance.amountSAR !== undefined) {
          adv.amountSAR = out.advance.amountSAR;
          clampNonNegNum(adv, 'amountSAR');
        }
        if (out.advance.purpose !== undefined) {
          adv.purpose = out.advance.purpose;
          clampStr(adv, 'purpose', 300);
        }
        if (out.advance.installmentsCount !== undefined) {
          adv.installmentsCount = out.advance.installmentsCount;
          clampNonNegNum(adv, 'installmentsCount', 360);
        }
        if (out.advance.monthlyDeductionSAR !== undefined) {
          adv.monthlyDeductionSAR = out.advance.monthlyDeductionSAR;
          clampNonNegNum(adv, 'monthlyDeductionSAR');
        }
        if (out.advance.disbursementDate !== undefined) {
          adv.disbursementDate = out.advance.disbursementDate;
          clampStr(adv, 'disbursementDate', 64);
        }
        if (out.advance.disbursementMethod !== undefined) {
          adv.disbursementMethod = out.advance.disbursementMethod;
          clampStr(adv, 'disbursementMethod', 64);
        }
        if (out.advance.voucherNumber !== undefined) {
          adv.voucherNumber = out.advance.voucherNumber;
          clampStr(adv, 'voucherNumber', 64);
        }
        if (out.advance.notes !== undefined) {
          adv.notes = out.advance.notes;
          clampStr(adv, 'notes', 500);
        }
        out.advance = adv;
      } else {
        delete out.advance;
      }
    }
    clampNonNegNum(out, 'monthlyBaseSalary');
    clampNonNegNum(out, 'housingAllowance');
    clampNonNegNum(out, 'transportAllowance');
    clampNonNegNum(out, 'otherAllowances');
    clampNonNegNum(out, 'annualBaseSalary');
    clampNonNegNum(out, 'totalMonthlyPackage');
    clampNonNegNum(out, 'probationPeriodMonths', 120);
    clampNonNegNum(out, 'noticePeriodDays', 730);
  } else if (col === 'departments') {
    clampStr(out, 'name', 120);
    clampStr(out, 'code', 32);
    clampStr(out, 'operatingUnit', 120);
    clampStr(out, 'location', 160);
  } else if (col === 'designations') {
    clampStr(out, 'title', 120);
    clampNonNegNum(out, 'minSalary');
    clampNonNegNum(out, 'maxSalary');
  } else if (col === 'timesheet_entries') {
    clampNonNegNum(out, 'regularHours', 24);
    clampNonNegNum(out, 'overtimeHours', 24);
    clampStr(out, 'status', 32);
    clampStr(out, 'notes', 300);
  } else if (col === 'leave_requests') {
    clampNonNegNum(out, 'totalDays');
    clampStr(out, 'reason', 500);
  } else if (col === 'accounting_categories') {
    clampStr(out, 'code', 32);
    clampStr(out, 'name', 120);
    clampStr(out, 'description', 500);
    clampStr(out, 'status', 32);
    clampNonNegNum(out, 'budgetCapSAR');
  } else if (col === 'expenses') {
    clampNonNegNum(out, 'amountSAR');
    clampStr(out, 'title', 200);
    clampStr(out, 'notes', 500);
  } else if (col === 'projects') {
    clampNonNegNum(out, 'budgetSAR');
    clampNonNegNum(out, 'spentSAR');
    if ('assignedTeam' in out) {
      if (Array.isArray(out.assignedTeam)) {
        out.assignedTeam = out.assignedTeam
          .filter((item) => item !== undefined && item !== null)
          .slice(0, 200);
      } else {
        delete out.assignedTeam;
      }
    }
  } else if (col === 'villas') {
    if ('dailyWorkEntities' in out) {
      out.dailyWorkEntities = sanitizeMapArray(out.dailyWorkEntities, 500);
    }
    clampNonNegNum(out, 'estimatedCostSAR');
    clampNonNegNum(out, 'contractPriceSAR');
  } else if (col === 'asset_categories') {
    clampStr(out, 'name', 120);
    clampStr(out, 'code', 32);
    clampStr(out, 'description', 500);
    clampNonNegNum(out, 'assetsCount');
  } else if (col === 'assets') {
    clampNonNegNum(out, 'costSAR');
  } else if (col === 'manpower_suppliers') {
    if ('suppliedTrades' in out) {
      out.suppliedTrades = sanitizeStringArray(out.suppliedTrades, 100, 120);
    }
  } else if (col === 'supplied_workers') {
    clampNonNegNum(out, 'hourlyRateSAR');
  } else if (col === 'manpower_pos') {
    if ('lineItems' in out) {
      out.lineItems = sanitizeMapArray(out.lineItems, 200);
    }
    clampNonNegNum(out, 'grandTotalSAR');
  } else if (col === 'inventory_items') {
    clampNonNegNum(out, 'quantityOnHand');
    clampNonNegNum(out, 'unitCostSAR');
  } else if (col === 'stock_movements') {
    const validTypes = ['IN', 'OUT', 'ADJUSTMENT'];
    if ('type' in out && !validTypes.includes(String(out.type))) {
      out.type = 'ADJUSTMENT';
    }
    clampNonNegNum(out, 'quantity');
    clampStr(out, 'operatorName', 120);
    clampStr(out, 'notes', 500);
  } else if (col === 'inventory_invoices') {
    if ('lineItems' in out) {
      out.lineItems = sanitizeMapArray(out.lineItems, 200);
    }
    clampNonNegNum(out, 'grandTotalSAR');
  } else if (col === 'custom_privileges') {
    clampStr(out, 'name', 120);
    clampStr(out, 'description', 500);
    clampNonNegNum(out, 'assignedUsersCount');
    if ('permissions' in out) {
      if (isPlainObject(out.permissions)) {
        const cleanPerms: Record<string, boolean> = {};
        Object.entries(out.permissions)
          .slice(0, 32)
          .forEach(([k, v]) => {
            if (typeof v === 'boolean') cleanPerms[k] = v;
          });
        out.permissions = cleanPerms;
      } else {
        delete out.permissions;
      }
    }
  } else if (col === 'corporate_settings') {
    clampStr(out, 'companyName', 160);
    clampStr(out, 'legalName', 200);
    clampStr(out, 'crNumber', 64);
    clampStr(out, 'vatNumber', 64);
    clampStr(out, 'email', 120);
    clampStr(out, 'phone', 40);
    clampStr(out, 'address', 300);
    clampStr(out, 'bankName', 120);
    clampStr(out, 'accountTitle', 160);
    clampStr(out, 'iban', 64);
    clampStr(out, 'swiftCode', 32);
    clampStr(out, 'baseCurrency', 16);
    if ('customVillaTypes' in out) out.customVillaTypes = sanitizeStringArray(out.customVillaTypes, 200, 120);
    if ('manpowerTrades' in out) out.manpowerTrades = sanitizeStringArray(out.manpowerTrades, 200, 120);
    if ('inventoryCategories' in out) out.inventoryCategories = sanitizeStringArray(out.inventoryCategories, 200, 120);
    if ('inventoryUOMs' in out) out.inventoryUOMs = sanitizeStringArray(out.inventoryUOMs, 200, 120);
    if ('inventoryWarehouses' in out) out.inventoryWarehouses = sanitizeStringArray(out.inventoryWarehouses, 200, 120);
  } else if (col === 'template_configs') {
    out.title = clampUtf8(String(out.title || safeId.toUpperCase()).trim(), 160) || safeId.toUpperCase();
    clampStr(out, 'bodyContent', 20000);
  }

  return out;
}

export async function pushFullWorkspaceToCloud(
  payload: WorkspaceCloudSeedPayload,
  uid: string
): Promise<number> {
  const ops: Array<{ col: string; id: string; data: Record<string, unknown>; isAudit?: boolean }> = [];

  const queueRecords = (col: string, records: Array<{ id: string } & Record<string, unknown>>) => {
    records.forEach((rec) => {
      const normalized = normalizeCollectionRecord(col, rec.id, rec);
      if (normalized) {
        ops.push({ col, id: String(normalized.id), data: normalized });
      }
    });
  };

  queueRecords('branches', payload.branches as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('employees', payload.employees as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('departments', payload.departments as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('designations', payload.designations as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('leave_requests', payload.leaveRequests as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('accounting_categories', payload.accountingCategories as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('expenses', payload.expenses as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('projects', payload.projects as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('villas', payload.villas as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('asset_categories', payload.assetCategories as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('assets', payload.assets as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('manpower_suppliers', payload.manpowerSuppliers as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('supplied_workers', payload.suppliedWorkers as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('manpower_pos', payload.manpowerPOSList as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('inventory_items', payload.inventoryItems as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('inventory_invoices', payload.inventoryInvoices as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('custom_privileges', payload.customPrivileges as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('stock_movements', payload.stockMovements.slice(0, 100) as unknown as Array<{ id: string } & Record<string, unknown>>);
  queueRecords('timesheet_entries', payload.timesheetEntries.slice(0, 600) as unknown as Array<{ id: string } & Record<string, unknown>>);

  const ce = payload.corporateEntity;
  const normalizedCorp = normalizeCollectionRecord('corporate_settings', 'primary', {
    id: 'primary',
    companyName: ce.companyName,
    legalName: ce.legalName,
    logoUrl: ce.logoUrl,
    crNumber: ce.crNumber,
    vatNumber: ce.vatNumber,
    email: ce.email,
    phone: ce.phone,
    address: ce.address,
    bankName: ce.bankName,
    accountTitle: ce.accountTitle,
    iban: ce.iban,
    swiftCode: ce.swiftCode,
    baseCurrency: ce.baseCurrency,
    customVillaTypes: payload.customVillaTypes.slice(0, 200),
    manpowerTrades: payload.manpowerTrades.slice(0, 200),
    inventoryCategories: payload.inventoryCategories.slice(0, 200),
    inventoryUOMs: payload.inventoryUOMs.slice(0, 200),
    inventoryWarehouses: payload.inventoryWarehouses.slice(0, 200),
  });
  if (normalizedCorp) {
    ops.push({ col: 'corporate_settings', id: 'primary', data: normalizedCorp });
  }

  Object.entries(payload.templateConfigs).forEach(([key, cfg]) => {
    const normalizedTpl = normalizeCollectionRecord(
      'template_configs',
      key,
      cfg as unknown as Record<string, unknown>
    );
    if (normalizedTpl) {
      ops.push({ col: 'template_configs', id: String(normalizedTpl.id), data: normalizedTpl });
    }
  });

  if (payload.rbacMatrix) {
    RBAC_ROLES.forEach((role) => {
      const cleanPermissions: Record<string, boolean> = {};
      Object.entries(payload.rbacMatrix?.[role.id] || {}).forEach(([k, v]) => {
        if (typeof v === 'boolean') cleanPermissions[k] = v;
      });
      ops.push({
        col: 'rbac_matrix',
        id: role.id,
        data: {
          roleId: role.id,
          permissions: cleanPermissions,
          updatedAt: new Date().toISOString().slice(0, 64),
          __isRbacDoc: true,
        },
      });
    });
  }

  // Deduplicate against server audit_logs (fallback to getDocs if offline cache only, or skip if unreachable)
  let existingAuditIds = new Set<string>();
  let auditQuerySucceeded = false;
  try {
    const existingAuditSnap = await getDocsFromServer(collection(db, 'audit_logs'));
    existingAuditIds = new Set(existingAuditSnap.docs.map((d) => d.id));
    auditQuerySucceeded = true;
  } catch {
    try {
      const cachedAuditSnap = await getDocs(collection(db, 'audit_logs'));
      existingAuditIds = new Set(cachedAuditSnap.docs.map((d) => d.id));
      auditQuerySucceeded = true;
    } catch {
      auditQuerySucceeded = false;
    }
  }

  if (auditQuerySucceeded) {
    payload.auditLogs
      .slice(0, 50)
      .filter((log) => log.id && !existingAuditIds.has(log.id))
      .forEach((log) => {
        ops.push({
          col: 'audit_logs',
          id: log.id.replace(/\//g, '_').slice(0, 128),
          data: { ...log },
          isAudit: true,
        });
      });
  }

  // Group ops by collection cleanly so a batch failure always identifies exact collection & doc
  const CHUNK_SIZE = 400;
  let committedCount = 0;

  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      const ref = doc(db, op.col, op.id);
      if (op.isAudit) {
        const log = op.data as unknown as AuditLog;
        batch.set(
          ref,
          stripUndefined({
            id: op.id,
            timestamp: (log.timestamp || new Date().toISOString()).slice(0, 64),
            operatorName: (log.operatorName || 'Admin').slice(0, 100),
            operatorRole: (log.operatorRole || 'SUPER ADMIN').slice(0, 64),
            operatorUid: uid,
            branchId: (log.branchId || 'all').slice(0, 64),
            actionType: (log.actionType || 'CREATE').slice(0, 32),
            entityType: (log.entityType || 'Settings').slice(0, 32),
            details: (log.details || 'Synced record').slice(0, 500),
            serverCreatedAt: serverTimestamp(),
          })
        );
      } else if (op.col === 'rbac_matrix') {
        const rbacData = { ...op.data };
        delete rbacData.__isRbacDoc;
        batch.set(
          ref,
          stripUndefined({
            ...rbacData,
            updatedByUid: uid,
            serverUpdatedAt: serverTimestamp(),
          }),
          { merge: true }
        );
      } else if (op.col === 'corporate_settings') {
        batch.set(ref, sanitizeRecordForCloud(op.data, uid, false), { merge: true });
      } else {
        batch.set(ref, sanitizeRecordForCloud(op.data, uid, false));
      }
    });

    try {
      await batch.commit();
      committedCount += chunk.length;
    } catch {
      // Fallback: isolate per-collection batches to pinpoint & report any failing collection/doc
      const byCol = new Map<string, typeof chunk>();
      chunk.forEach((op) => {
        const list = byCol.get(op.col) || [];
        list.push(op);
        byCol.set(op.col, list);
      });

      for (const [colName, colOps] of byCol.entries()) {
        const colBatch = writeBatch(db);
        colOps.forEach((op) => {
          const ref = doc(db, op.col, op.id);
          if (op.isAudit) {
            const log = op.data as unknown as AuditLog;
            colBatch.set(
              ref,
              stripUndefined({
                id: op.id,
                timestamp: (log.timestamp || new Date().toISOString()).slice(0, 64),
                operatorName: (log.operatorName || 'Admin').slice(0, 100),
                operatorRole: (log.operatorRole || 'SUPER ADMIN').slice(0, 64),
                operatorUid: uid,
                branchId: (log.branchId || 'all').slice(0, 64),
                actionType: (log.actionType || 'CREATE').slice(0, 32),
                entityType: (log.entityType || 'Settings').slice(0, 32),
                details: (log.details || 'Synced record').slice(0, 500),
                serverCreatedAt: serverTimestamp(),
              })
            );
          } else if (op.col === 'rbac_matrix') {
            const rbacData = { ...op.data };
            delete rbacData.__isRbacDoc;
            colBatch.set(
              ref,
              stripUndefined({
                ...rbacData,
                updatedByUid: uid,
                serverUpdatedAt: serverTimestamp(),
              })
            );
          } else if (op.col === 'corporate_settings') {
            colBatch.set(ref, sanitizeRecordForCloud(op.data, uid, false), { merge: true });
          } else {
            colBatch.set(ref, sanitizeRecordForCloud(op.data, uid, false));
          }
        });

        try {
          await colBatch.commit();
          committedCount += colOps.length;
        } catch (colError) {
          // Probe individual docs in that failing collection to identify exact path
          for (const op of colOps) {
            const ref = doc(db, op.col, op.id);
            try {
              if (op.isAudit) {
                const existing = await getDocFromServer(ref).catch(() => null);
                if (existing && !existing.exists()) {
                  const log = op.data as unknown as AuditLog;
                  await setDoc(
                    ref,
                    stripUndefined({
                      id: op.id,
                      timestamp: (log.timestamp || new Date().toISOString()).slice(0, 64),
                      operatorName: (log.operatorName || 'Admin').slice(0, 100),
                      operatorRole: (log.operatorRole || 'SUPER ADMIN').slice(0, 64),
                      operatorUid: uid,
                      branchId: (log.branchId || 'all').slice(0, 64),
                      actionType: (log.actionType || 'CREATE').slice(0, 32),
                      entityType: (log.entityType || 'Settings').slice(0, 32),
                      details: (log.details || 'Synced record').slice(0, 500),
                      serverCreatedAt: serverTimestamp(),
                    })
                  );
                }
              } else if (op.col === 'rbac_matrix') {
                const rbacData = { ...op.data };
                delete rbacData.__isRbacDoc;
                await setDoc(
                  ref,
                  stripUndefined({
                    ...rbacData,
                    updatedByUid: uid,
                    serverUpdatedAt: serverTimestamp(),
                  })
                );
              } else if (op.col === 'corporate_settings') {
                await setDoc(ref, sanitizeRecordForCloud(op.data, uid, false), { merge: true });
              } else {
                await setDoc(ref, sanitizeRecordForCloud(op.data, uid, false));
              }
              committedCount += 1;
            } catch (docError) {
              handleFirestoreError(docError, OperationType.WRITE, `${colName}/${op.id}`);
            }
          }
        }
      }
    }
  }

  return committedCount;
}

export interface WorkspaceRealtimeCallbacks {
  uid?: string;
  role: RoleTier;
  onOwnUserProfile?: (profile: {
    role?: RoleTier;
    branchId?: string;
    status?: 'active' | 'invited' | 'suspended';
    displayName?: string;
    department?: string;
    designation?: string;
  }) => void;
  onBranches: (items: Branch[], isEmpty: boolean) => void;
  onEmployees: (items: Employee[]) => void;
  onDepartments: (items: Department[]) => void;
  onDesignations: (items: Designation[]) => void;
  onTimesheets: (items: TimesheetEntry[]) => void;
  onLeaves: (items: LeaveRequest[]) => void;
  onAccountingCategories: (items: AccountingCategory[]) => void;
  onExpenses: (items: Expense[]) => void;
  onProjects: (items: Project[]) => void;
  onVillas: (items: Villa[]) => void;
  onAssetCategories: (items: AssetCategory[]) => void;
  onAssets: (items: Asset[]) => void;
  onManpowerSuppliers: (items: ManpowerSupplier[]) => void;
  onSuppliedWorkers: (items: SuppliedWorker[]) => void;
  onManpowerPOS: (items: ManpowerPOS[]) => void;
  onInventoryItems: (items: InventoryItem[]) => void;
  onStockMovements: (items: StockMovement[]) => void;
  onInventoryInvoices: (items: InventoryInvoice[]) => void;
  onCustomPrivileges: (items: CustomPrivilege[]) => void;
  onCorporateSettings: (data: Record<string, unknown>) => void;
  onTemplateConfigs: (items: Record<string, TemplateCustomization>) => void;
  onRbacMatrix?: (partial: Partial<RoleMatrixMap>) => void;
  onAuditLogs: (items: AuditLog[]) => void;
  onUserDirectory: (items: WorkspaceUserAccount[]) => void;
  onUserInvites: (items: UserInvite[]) => void;
  onDeviceSessions: (items: DeviceSession[]) => void;
  onSyncActivity: () => void;
  onSyncError: (message: string) => void;
}

export function subscribeToWorkspaceCollections(
  cb: WorkspaceRealtimeCallbacks
): () => void {
  const unsubs: Unsubscribe[] = [];

  if (cb.uid && cb.onOwnUserProfile) {
    unsubs.push(
      onSnapshot(
        doc(db, 'users', cb.uid),
        (snap) => {
          if (snap.exists()) {
            const raw = snap.data() as Record<string, unknown>;
            cb.onOwnUserProfile?.({
              role: raw.role as RoleTier | undefined,
              branchId: typeof raw.branchId === 'string' ? raw.branchId : undefined,
              status: raw.status as 'active' | 'invited' | 'suspended' | undefined,
              displayName: typeof raw.displayName === 'string' ? raw.displayName : undefined,
              department: typeof raw.department === 'string' ? raw.department : undefined,
              designation: typeof raw.designation === 'string' ? raw.designation : undefined,
            });
          } else {
            cb.onOwnUserProfile?.({ status: 'suspended' });
          }
        },
        () => {
          // Handled cleanly if access is revoked mid-session
        }
      )
    );
  }

  const subCol = <T,>(
    colName: string,
    handler: (items: T[], empty: boolean) => void
  ) => {
    const unsub = onSnapshot(
      collection(db, colName),
      (snap) => {
        const list = snap.docs.map((d) =>
          normalizeDocData<T>(d.data() as Record<string, unknown>, d.id)
        );
        handler(list, snap.empty);
        cb.onSyncActivity();
      },
      (err) => {
        cb.onSyncError(err.message);
        handleFirestoreError(err, OperationType.LIST, colName);
      }
    );
    unsubs.push(unsub);
  };

  subCol<Branch>('branches', (items, empty) => {
    if (!empty) cb.onBranches(items, false);
    else cb.onBranches([], true);
  });
  subCol<Department>('departments', (items, empty) => { if (!empty) cb.onDepartments(items); });
  subCol<Designation>('designations', (items, empty) => { if (!empty) cb.onDesignations(items); });
  subCol<TimesheetEntry>('timesheet_entries', (items, empty) => { if (!empty) cb.onTimesheets(items); });
  subCol<LeaveRequest>('leave_requests', (items, empty) => { if (!empty) cb.onLeaves(items); });
  subCol<AccountingCategory>('accounting_categories', (items, empty) => { if (!empty) cb.onAccountingCategories(items); });
  subCol<Expense>('expenses', (items, empty) => { if (!empty) cb.onExpenses(items); });
  subCol<Project>('projects', (items, empty) => { if (!empty) cb.onProjects(items); });
  subCol<Villa>('villas', (items, empty) => { if (!empty) cb.onVillas(items); });
  subCol<AssetCategory>('asset_categories', (items, empty) => { if (!empty) cb.onAssetCategories(items); });
  subCol<Asset>('assets', (items, empty) => { if (!empty) cb.onAssets(items); });
  subCol<ManpowerSupplier>('manpower_suppliers', (items, empty) => { if (!empty) cb.onManpowerSuppliers(items); });
  subCol<SuppliedWorker>('supplied_workers', (items, empty) => { if (!empty) cb.onSuppliedWorkers(items); });
  subCol<ManpowerPOS>('manpower_pos', (items, empty) => { if (!empty) cb.onManpowerPOS(items); });
  subCol<InventoryItem>('inventory_items', (items, empty) => { if (!empty) cb.onInventoryItems(items); });
  subCol<StockMovement>('stock_movements', (items, empty) => { if (!empty) cb.onStockMovements(items); });
  subCol<InventoryInvoice>('inventory_invoices', (items, empty) => { if (!empty) cb.onInventoryInvoices(items); });
  subCol<CustomPrivilege>('custom_privileges', (items, empty) => { if (!empty) cb.onCustomPrivileges(items); });
  subCol<WorkspaceUserAccount>('user_directory', (items) => { cb.onUserDirectory(items); });

  if (cb.role === 'super_admin') {
    subCol<DeviceSession>('device_sessions', (items) => { cb.onDeviceSessions(items); });
  } else if (cb.uid) {
    const ownSessQ = query(collection(db, 'device_sessions'), where('uid', '==', cb.uid));
    unsubs.push(
      onSnapshot(
        ownSessQ,
        (snap) => {
          const list = snap.docs.map((d) =>
            normalizeDocData<DeviceSession>(d.data() as Record<string, unknown>, d.id)
          );
          cb.onDeviceSessions(list);
          cb.onSyncActivity();
        },
        (err) => {
          cb.onSyncError(err.message);
          handleFirestoreError(err, OperationType.LIST, 'device_sessions');
        }
      )
    );
  }

  // Audit logs ordered newest-first (governance/management roles only)
  if (cb.role === 'super_admin' || cb.role === 'branch_admin' || cb.role === 'hr_manager' || cb.role === 'finance_officer') {
    const auditQ = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
    unsubs.push(
      onSnapshot(
        auditQ,
        (snap) => {
          if (!snap.empty) {
            cb.onAuditLogs(
              snap.docs.map((d) =>
                normalizeDocData<AuditLog>(d.data() as Record<string, unknown>, d.id)
              )
            );
          }
          cb.onSyncActivity();
        },
        (err) => {
          cb.onSyncError(err.message);
          handleFirestoreError(err, OperationType.LIST, 'audit_logs');
        }
      )
    );
  }

  // Corporate settings primary doc
  unsubs.push(
    onSnapshot(
      doc(db, 'corporate_settings', 'primary'),
      (snap) => {
        if (snap.exists()) {
          cb.onCorporateSettings(
            normalizeDocData<Record<string, unknown>>(
              snap.data() as Record<string, unknown>,
              snap.id
            )
          );
          cb.onSyncActivity();
        }
      },
      (err) => {
        cb.onSyncError(err.message);
        handleFirestoreError(err, OperationType.GET, 'corporate_settings/primary');
      }
    )
  );

  // Template configs map
  unsubs.push(
    onSnapshot(
      collection(db, 'template_configs'),
      (snap) => {
        if (!snap.empty) {
          const map: Record<string, TemplateCustomization> = {};
          snap.docs.forEach((d) => {
            map[d.id] = normalizeDocData<TemplateCustomization>(
              d.data() as Record<string, unknown>,
              d.id
            );
          });
          cb.onTemplateConfigs(map);
        }
        cb.onSyncActivity();
      },
      (err) => {
        cb.onSyncError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'template_configs');
      }
    )
  );

  // RBAC role permission matrix real-time listener
  if (cb.onRbacMatrix) {
    unsubs.push(
      onSnapshot(
        collection(db, 'rbac_matrix'),
        (snap) => {
          if (!snap.empty) {
            const partial: Partial<RoleMatrixMap> = {};
            snap.docs.forEach((d) => {
              const raw = d.data() as { roleId?: string; permissions?: Record<string, boolean> };
              const roleKey = (raw.roleId || d.id) as RoleTier;
              if (raw.permissions && typeof raw.permissions === 'object') {
                partial[roleKey] = raw.permissions;
              }
            });
            cb.onRbacMatrix?.(partial);
          }
          cb.onSyncActivity();
        },
        (err) => {
          cb.onSyncError(err.message);
          handleFirestoreError(err, OperationType.LIST, 'rbac_matrix');
        }
      )
    );
  }

  // Role-restricted collections: only list /employees if manager/HR/admin, only list /user_invites if super_admin
  if (cb.role !== 'employee') {
    subCol<Employee>('employees', (items, empty) => {
      if (!empty) cb.onEmployees(items);
    });
  }

  if (cb.role === 'super_admin') {
    subCol<UserInvite>('user_invites', (items) => {
      cb.onUserInvites(items);
    });
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}
