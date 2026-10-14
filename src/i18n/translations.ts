import { LanguageCode } from '../types';

export interface Translations {
  appName: string;
  tagline: string;
  // Navigation
  navDashboard: string;
  navEmployees: string;
  navOnboarding: string;
  navDepartments: string;
  navDesignations: string;
  navAttendance: string;
  navLeaves: string;
  navPayroll: string;
  navAccounting: string;
  navExpenses: string;
  navProjects: string;
  navAssets: string;
  navTemplates: string;
  navReports: string;
  navSettings: string;
  navAuditTrail: string;
  
  // Section Headers & Actions
  coreHrSection: string;
  timeAttendanceSection: string;
  financeSection: string;
  operationsSection: string;
  governanceSection: string;
  
  // Common UI words
  add: string;
  edit: string;
  delete: string;
  view: string;
  save: string;
  cancel: string;
  approve: string;
  reject: string;
  print: string;
  exportPdf: string;
  search: string;
  filter: string;
  status: string;
  actions: string;
  currency: string;
  role: string;
  all: string;
  pending: string;
  approved: string;
  rejected: string;
  total: string;
  month: string;
  year: string;
  switchRole: string;
  shareAccess: string;
  corporateEntity: string;
  baseSalary: string;
  annualSalary: string;
  monthlyPackage: string;
  iqamaPassport: string;
  
  // Timesheet specific
  timesheetTitle: string;
  timesheetSubtitle: string;
  friSatWeekend: string;
  logHours: string;
  regularHours: string;
  overtimeHours: string;
  present: string;
  absent: string;
  leave: string;
  weekend: string;
  
  // Role names
  roleSuperAdmin: string;
  roleHrManager: string;
  roleFinanceOfficer: string;
  roleProjectManager: string;
  roleEmployee: string;
}

export const translations: Record<LanguageCode, Translations> = {
  en: {
    appName: 'Nexus Global HRMS',
    tagline: 'Enterprise ERP & Workforce Ledger',
    navDashboard: 'Executive Overview',
    navEmployees: 'Employee Directory',
    navOnboarding: 'Onboarding & Dossier',
    navDepartments: 'Departments & Units',
    navDesignations: 'Job Titles & Grades',
    navAttendance: 'Attendance & Time Ledger',
    navLeaves: 'Leave & Time-Off',
    navPayroll: 'Compensation & Payroll',
    navAccounting: 'Accounting Categories',
    navExpenses: 'Corporate Expenses',
    navProjects: 'Projects & Contracts',
    navAssets: 'Asset Registry & Ledger',
    navTemplates: 'Template Studio & PDF Engine',
    navReports: 'Reporting & Intelligence',
    navSettings: 'Corporate Settings & RBAC',
    navAuditTrail: 'Audit Trail & Compliance',

    coreHrSection: 'Personnel & Workforce',
    timeAttendanceSection: 'Time & Attendance',
    financeSection: 'Finance & Accounting',
    operationsSection: 'Projects & Assets',
    governanceSection: 'Studio & Governance',

    add: 'Create New',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View Dossier',
    save: 'Save Changes',
    cancel: 'Cancel',
    approve: 'Approve',
    reject: 'Reject',
    print: 'Print Document',
    exportPdf: 'Export to PDF',
    search: 'Search records...',
    filter: 'Filter',
    status: 'Status',
    actions: 'Actions',
    currency: 'Operating Currency',
    role: 'Operational Role',
    all: 'All',
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    total: 'Total',
    month: 'Month',
    year: 'Year',
    switchRole: 'Switch Role Persona',
    shareAccess: 'Share User Access',
    corporateEntity: 'Corporate Legal Entity',
    baseSalary: 'Monthly Base Salary',
    annualSalary: 'Annual Base Salary',
    monthlyPackage: 'Total Monthly Package',
    iqamaPassport: 'Iqama & Passport Dossier',

    timesheetTitle: 'Attendance & Monthly Timesheet Ledger',
    timesheetSubtitle: 'Active Workforce Time Matrix (Employees × Days, Fri/Sat Shaded)',
    friSatWeekend: 'Fri / Sat Weekend',
    logHours: 'Log / Adjust Daily Hours',
    regularHours: 'Regular Hours',
    overtimeHours: 'Overtime Hours',
    present: 'Present',
    absent: 'Absent',
    leave: 'Leave',
    weekend: 'Weekend Off',

    roleSuperAdmin: 'Super Admin',
    roleHrManager: 'HR Manager',
    roleFinanceOfficer: 'Finance Officer',
    roleProjectManager: 'Project Manager',
    roleEmployee: 'Standard Employee',
  },

  ar: {
    appName: 'نظام نكسس للموارد البشرية',
    tagline: 'نظام إدارة الموارد وتخطيط المشاريع للمؤسسات',
    navDashboard: 'لوحة التحكم التنفيذية',
    navEmployees: 'دليل الموظفين',
    navOnboarding: 'التعيين وملفات الإقامة',
    navDepartments: 'الأقسام والوحدات التشغيلية',
    navDesignations: 'المسميات الوظيفية والرتب',
    navAttendance: 'سجل الحضور وجدول الدوام',
    navLeaves: 'إدارة الإجازات والأذونات',
    navPayroll: 'الرواتب والتعويضات',
    navAccounting: 'تصنيفات الحسابات المالية',
    navExpenses: 'المصروفات المؤسسية',
    navProjects: 'المشاريع والعمليات',
    navAssets: 'سجل وإدارة الأصول',
    navTemplates: 'استوديو النماذج ومحرك الطباعة',
    navReports: 'التقارير والذكاء المالي',
    navSettings: 'إعدادات المنشأة والصلاحيات',
    navAuditTrail: 'سجل التدقيق والامتثال',

    coreHrSection: 'الموارد البشرية والموظفون',
    timeAttendanceSection: 'الوقت والدوام',
    financeSection: 'المالية والمحاسبة',
    operationsSection: 'المشاريع والأصول',
    governanceSection: 'النماذج والحوكمة',

    add: 'إضافة جديد',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض الملف',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    approve: 'موافقة واعتماد',
    reject: 'رفض',
    print: 'طباعة المستند',
    exportPdf: 'تصدير كملف PDF',
    search: 'بحث في السجلات...',
    filter: 'تصفية',
    status: 'الحالة',
    actions: 'الإجراءات',
    currency: 'عملة التشغيل الأساسية',
    role: 'الدور التشغيلي',
    all: 'الكل',
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    total: 'الإجمالي',
    month: 'الشهر',
    year: 'السنة',
    switchRole: 'تبديل الدور التشغيلي',
    shareAccess: 'مشاركة رابط الوصول عبر البريد',
    corporateEntity: 'الهوية القانونية للشركة',
    baseSalary: 'الراتب الأساسي الشهري',
    annualSalary: 'الراتب الأساسي السنوي',
    monthlyPackage: 'إجمالي الباقة الشهرية',
    iqamaPassport: 'بيانات الإقامة وجواز السفر',

    timesheetTitle: 'سجل الحضور وجدول الدوام الشهري',
    timesheetSubtitle: 'مصفوفة دوام الموظفين (الموظفون × أيام الشهر، عطلة الجمعة/السبت مظللة)',
    friSatWeekend: 'عطلة الجمعة والسبت',
    logHours: 'تسجيل / تعديل ساعات العمل',
    regularHours: 'الساعات النظامية',
    overtimeHours: 'الساعات الإضافية',
    present: 'حاضر',
    absent: 'غياب',
    leave: 'إجازة',
    weekend: 'عطلة نهاية الأسبوع',

    roleSuperAdmin: 'مدير عام بصلاحيات كاملة',
    roleHrManager: 'مدير الموارد البشرية',
    roleFinanceOfficer: 'المسؤول المالي',
    roleProjectManager: 'مدير المشاريع',
    roleEmployee: 'موظف عادي',
  },

  ur: {
    appName: 'Nexus Global HRMS',
    tagline: 'انٹرپرائز ہیومن ریسورس و ای آر پی',
    navDashboard: 'ایگزیکٹو ڈیش بورڈ',
    navEmployees: 'ملازمین کی ڈائرکٹری',
    navOnboarding: 'آن بورڈنگ و اقامہ دستاویزات',
    navDepartments: 'شعبہ جات و یونٹس',
    navDesignations: 'عہدے اور گریڈز',
    navAttendance: 'حاضری و ٹائم شیٹ لیجر',
    navLeaves: 'چھٹیوں کا انتظام',
    navPayroll: 'تنخواہیں اور معاوضہ',
    navAccounting: 'اکاؤنٹنگ کیٹیگریز',
    navExpenses: 'کارپوریٹ اخراجات',
    navProjects: 'پروجیکٹس اور کنٹریکٹس',
    navAssets: 'اثاثہ جات کا لیجر',
    navTemplates: 'ٹیمپلیٹ اسٹوڈیو اور پرنٹ انجن',
    navReports: 'رپورٹنگ اور انٹیلیجنس',
    navSettings: 'کمپنی سیٹنگز اور حقوق',
    navAuditTrail: 'آڈٹ ٹریل اور ریکارڈ',

    coreHrSection: 'افرادی قوت',
    timeAttendanceSection: 'وقت اور حاضری',
    financeSection: 'مالیات و اکاؤنٹس',
    operationsSection: 'پروجیکٹس اور اثاثے',
    governanceSection: 'ٹیمپلیٹس اور نظام',

    add: 'نیا شامل کریں',
    edit: 'ترمیم',
    delete: 'حذف',
    view: 'فائل دیکھیں',
    save: 'محفوظ کریں',
    cancel: 'منسوخ',
    approve: 'منظور',
    reject: 'مسترد',
    print: 'پرنٹ کریں',
    exportPdf: 'PDF ایکسپورٹ',
    search: 'تلاش کریں...',
    filter: 'فلٹر',
    status: 'حیثیت',
    actions: 'اقدامات',
    currency: 'کرنسی',
    role: 'آپریشنل رول',
    all: 'سبھی',
    pending: 'زیر غور',
    approved: 'منظور شدہ',
    rejected: 'مسترد شدہ',
    total: 'کل',
    month: 'مہینہ',
    year: 'سال',
    switchRole: 'رول تبدیل کریں',
    shareAccess: 'رسائی لنک شیئر کریں',
    corporateEntity: 'قانونی کمپنی معلومات',
    baseSalary: 'ماہانہ بنیادی تنخواہ',
    annualSalary: 'سالانہ بنیادی تنخواہ',
    monthlyPackage: 'کل ماہانہ پیکیج',
    iqamaPassport: 'اقامہ و پاسپورٹ فائل',

    timesheetTitle: 'ماہانہ ٹائم شیٹ و حاضری میٹرکس',
    timesheetSubtitle: 'ملازمین × ایام (جمعہ اور ہفتہ رخصت)',
    friSatWeekend: 'جمعہ و ہفتہ رخصت',
    logHours: 'اوقات کار درج کریں',
    regularHours: 'باقاعدہ گھنٹے',
    overtimeHours: 'اضافی وقت (اوور ٹائم)',
    present: 'حاضر',
    absent: 'غیر حاضر',
    leave: 'چھٹی',
    weekend: 'ویک اینڈ',

    roleSuperAdmin: 'سپر ایڈمن',
    roleHrManager: 'ایچ آر مینیجر',
    roleFinanceOfficer: 'فنانس آفیسر',
    roleProjectManager: 'پروجیکٹ مینیجر',
    roleEmployee: 'ملازم',
  },

  hi: {
    appName: 'Nexus Global HRMS',
    tagline: 'एंटरप्राइज वर्कफोर्स व ईआरपी प्लेटफॉर्म',
    navDashboard: 'कार्यकारी अवलोकन',
    navEmployees: 'कर्मचारी निर्देशिका',
    navOnboarding: 'ऑनबोर्डिंग व इकामा/पासपोर्ट',
    navDepartments: 'विभाग व इकाइयां',
    navDesignations: 'पदनाम और ग्रेड',
    navAttendance: 'उपस्थिति व टाइमशीट लेज़र',
    navLeaves: 'अवकाश प्रबंधन',
    navPayroll: 'वेतन एवं क्षतिपूर्ति',
    navAccounting: 'लेखा श्रेणियां',
    navExpenses: 'कॉर्पोरेट खर्च',
    navProjects: 'परियोजनाएं',
    navAssets: 'परिसंपत्ति रजिस्टर',
    navTemplates: 'टेम्पलेट स्टूडियो व प्रिंट',
    navReports: 'रिपोर्टिंग व एनालिटिक्स',
    navSettings: 'संस्था सेटिंग्स व आरबीएसी',
    navAuditTrail: 'ऑडिट ट्रेल',

    coreHrSection: 'मानव संसाधन',
    timeAttendanceSection: 'समय व उपस्थिति',
    financeSection: 'वित्त व लेखा',
    operationsSection: 'परियोजनाएं व संपत्तियां',
    governanceSection: 'स्टूडियो व प्रशासन',

    add: 'नया जोड़ें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    view: 'देखें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    approve: 'स्वीकृत करें',
    reject: 'अस्वीकार करें',
    print: 'प्रिंट करें',
    exportPdf: 'PDF निर्यात करें',
    search: 'खोजें...',
    filter: 'फ़िल्टर',
    status: 'स्थिति',
    actions: 'कार्रवाई',
    currency: 'मुद्रा',
    role: 'भूमिका',
    all: 'सभी',
    pending: 'लंबित',
    approved: 'स्वीकृत',
    rejected: 'अस्वीकृत',
    total: 'कुल',
    month: 'माह',
    year: 'वर्ष',
    switchRole: 'भूमिका बदलें',
    shareAccess: 'पहुंच लिंक साझा करें',
    corporateEntity: 'कॉर्पोरेट विवरण',
    baseSalary: 'मासिक मूल वेतन',
    annualSalary: 'वार्षिक मूल वेतन',
    monthlyPackage: 'कुल मासिक पैकेज',
    iqamaPassport: 'इकामा और पासपोर्ट',

    timesheetTitle: 'मासिक उपस्थिति व टाइमशीट',
    timesheetSubtitle: 'कर्मचारी × दिन ग्रिड (शुक्र/शनि सप्ताहांत)',
    friSatWeekend: 'शुक्र/शनि सप्ताहांत',
    logHours: 'घंटे दर्ज करें',
    regularHours: 'नियमित घंटे',
    overtimeHours: 'ओवरटाइम',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    leave: 'अवकाश',
    weekend: 'सप्ताहांत',

    roleSuperAdmin: 'सुपर एडमिन',
    roleHrManager: 'एचआर प्रबंधक',
    roleFinanceOfficer: 'वित्त अधिकारी',
    roleProjectManager: 'परियोजना प्रबंधक',
    roleEmployee: 'कर्मचारी',
  },

  fr: {
    appName: 'Nexus Global HRMS',
    tagline: 'Système ERP & Registre du Personnel',
    navDashboard: 'Vue Exécutive',
    navEmployees: 'Annuaire des Employés',
    navOnboarding: 'Intégration & Passeport',
    navDepartments: 'Départements & Unités',
    navDesignations: 'Postes & Titres',
    navAttendance: 'Présence & Feuille de Temps',
    navLeaves: 'Congés & Absences',
    navPayroll: 'Rémunération & Salaires',
    navAccounting: 'Catégories Comptables',
    navExpenses: 'Dépenses d’Entreprise',
    navProjects: 'Projets & Opérations',
    navAssets: 'Registre des Équipements',
    navTemplates: 'Studio de Modèles & PDF',
    navReports: 'Rapports & Intelligence',
    navSettings: 'Paramètres & Contrôle d’Accès',
    navAuditTrail: 'Journal d’Audit & Conformité',

    coreHrSection: 'Personnel & RH',
    timeAttendanceSection: 'Temps & Présences',
    financeSection: 'Finance & Comptabilité',
    operationsSection: 'Projets & Actifs',
    governanceSection: 'Modèles & Gouvernance',

    add: 'Créer Nouveau',
    edit: 'Modifier',
    delete: 'Supprimer',
    view: 'Voir Dossier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    approve: 'Approuver',
    reject: 'Rejeter',
    print: 'Imprimer Document',
    exportPdf: 'Exporter en PDF',
    search: 'Rechercher...',
    filter: 'Filtrer',
    status: 'Statut',
    actions: 'Actions',
    currency: 'Devise de Base',
    role: 'Rôle Opérationnel',
    all: 'Tous',
    pending: 'En Attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    total: 'Total',
    month: 'Mois',
    year: 'Année',
    switchRole: 'Changer de Persona',
    shareAccess: 'Partager l’Accès par Email',
    corporateEntity: 'Identité Légale & Bancaire',
    baseSalary: 'Salaire de Base Mensuel',
    annualSalary: 'Salaire de Base Annuel',
    monthlyPackage: 'Paquet Mensuel Global',
    iqamaPassport: 'Dossier Résidence & Passeport',

    timesheetTitle: 'Matrice Mensuelle des Temps & Présences',
    timesheetSubtitle: 'Matrice Employés × Jours (Vendredi/Samedi ombrés)',
    friSatWeekend: 'Week-end Ven / Sam',
    logHours: 'Enregistrer Heures Quotidiennes',
    regularHours: 'Heures Normales',
    overtimeHours: 'Heures Supplémentaires',
    present: 'Présent',
    absent: 'Absent',
    leave: 'En Congé',
    weekend: 'Week-end',

    roleSuperAdmin: 'Super Administrateur',
    roleHrManager: 'Directeur des RH',
    roleFinanceOfficer: 'Responsable Financier',
    roleProjectManager: 'Chef de Projet',
    roleEmployee: 'Employé',
  },

  es: {
    appName: 'Nexus Global HRMS',
    tagline: 'Sistema ERP y Control de Personal',
    navDashboard: 'Panel Ejecutivo',
    navEmployees: 'Directorio de Empleados',
    navOnboarding: 'Incorporación y Pasaporte',
    navDepartments: 'Departamentos y Áreas',
    navDesignations: 'Cargos y Puestos',
    navAttendance: 'Control de Horas y Asistencia',
    navLeaves: 'Permisos y Vacaciones',
    navPayroll: 'Compensación y Nómina',
    navAccounting: 'Categorías Contables',
    navExpenses: 'Gastos Corporativos',
    navProjects: 'Proyectos y Contratos',
    navAssets: 'Inventario de Activos',
    navTemplates: 'Estudio de Plantillas e Impresión',
    navReports: 'Reportes y Analítica',
    navSettings: 'Configuración y Roles RBAC',
    navAuditTrail: 'Registro de Auditoría',

    coreHrSection: 'Personal y Talento',
    timeAttendanceSection: 'Horas y Asistencia',
    financeSection: 'Finanzas y Contabilidad',
    operationsSection: 'Proyectos y Activos',
    governanceSection: 'Plantillas y Control',

    add: 'Crear Nuevo',
    edit: 'Editar',
    delete: 'Eliminar',
    view: 'Ver Expediente',
    save: 'Guardar Cambios',
    cancel: 'Cancelar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    print: 'Imprimir',
    exportPdf: 'Exportar a PDF',
    search: 'Buscar registros...',
    filter: 'Filtrar',
    status: 'Estado',
    actions: 'Acciones',
    currency: 'Moneda Base',
    role: 'Rol Operativo',
    all: 'Todos',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    total: 'Total',
    month: 'Mes',
    year: 'Año',
    switchRole: 'Cambiar Rol de Usuario',
    shareAccess: 'Compartir Enlace de Acceso',
    corporateEntity: 'Identidad Legal Corporativa',
    baseSalary: 'Salario Base Mensual',
    annualSalary: 'Salario Base Anual',
    monthlyPackage: 'Paquete Salarial Mensual',
    iqamaPassport: 'Expediente Iqama y Pasaporte',

    timesheetTitle: 'Matriz Mensual de Asistencia y Horas',
    timesheetSubtitle: 'Matriz Empleados × Días (Viernes/Sábado sombreado)',
    friSatWeekend: 'Fin de Semana Vie / Sáb',
    logHours: 'Registrar Horas Diarias',
    regularHours: 'Horas Ordinarias',
    overtimeHours: 'Horas Extras',
    present: 'Presente',
    absent: 'Ausente',
    leave: 'Permiso',
    weekend: 'Fin de Semana',

    roleSuperAdmin: 'Super Administrador',
    roleHrManager: 'Gerente de RRHH',
    roleFinanceOfficer: 'Oficial de Finanzas',
    roleProjectManager: 'Gerente de Proyectos',
    roleEmployee: 'Empleado',
  },
};
