export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  // Common
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    refresh: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    confirm: string;
    close: string;
    yes: string;
    no: string;
    all: string;
    none: string;
    select: string;
    required: string;
    optional: string;
    actions: string;
    status: string;
    date: string;
    time: string;
    name: string;
    description: string;
    notes: string;
    details: string;
    view: string;
    download: string;
    upload: string;
    noData: string;
    showing: string;
    of: string;
    results: string;
    page: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    employees: string;
    attendance: string;
    payroll: string;
    branches: string;
    departments: string;
    recruitment: string;
    reports: string;
    settings: string;
    accounting: string;
    myRequests: string;
    allRequests: string;
    approvals: string;
    newRequest: string;
    myPortal: string;
    profile: string;
    logout: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    welcome: string;
    totalEmployees: string;
    activeToday: string;
    pendingLeaves: string;
    openPositions: string;
    recentActivity: string;
    quickActions: string;
  };

  // Employees
  employees: {
    title: string;
    addEmployee: string;
    editEmployee: string;
    employeeDetails: string;
    fullName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    branch: string;
    hireDate: string;
    salary: string;
    status: string;
    active: string;
    inactive: string;
    onLeave: string;
  };

  // Attendance
  attendance: {
    title: string;
    checkIn: string;
    checkOut: string;
    present: string;
    absent: string;
    late: string;
    earlyLeave: string;
    overtime: string;
    workingHours: string;
    totalHours: string;
    timesheet: string;
  };

  // Branches
  branches: {
    title: string;
    addBranch: string;
    branchName: string;
    address: string;
    manager: string;
    employeeCount: string;
  };

  // Payroll
  payroll: {
    title: string;
    baseSalary: string;
    bonus: string;
    deductions: string;
    netSalary: string;
    payslip: string;
    payPeriod: string;
    process: string;
    approve: string;
  };

  // Accounting
  accounting: {
    title: string;
    myRequests: string;
    allRequests: string;
    approvals: string;
    newRequest: string;
    requestNumber: string;
    requestType: string;
    requester: string;
    assignee: string;
    priority: string;
    slaDeadline: string;
    createdAt: string;
    updatedAt: string;

    // Request types
    reconciliation: string;
    payment: string;
    confirmation: string;

    // Statuses
    pending: string;
    inProgress: string;
    needsInfo: string;
    pendingApproval: string;
    approved: string;
    completed: string;
    rejected: string;
    cancelled: string;

    // Priority
    normal: string;
    urgent: string;

    // Actions
    actions: string;
    startProcessing: string;
    resumeProcessing: string;
    requestInfo: string;
    markNeedsInfo: string;
    markComplete: string;
    reject: string;
    approve: string;
    submitForApproval: string;
    sendForApproval: string;
    cancelRequest: string;
    addComment: string;

    // Form fields
    selectType: string;
    selectEntity: string;
    fromEntity: string;
    tenantName: string;
    tenantInn: string;
    contractNumber: string;
    contractPeriod: string;
    reconciliationPeriod: string;
    recipientName: string;
    recipientInn: string;
    amount: string;
    paymentCategory: string;
    paymentPurpose: string;
    invoiceNumber: string;
    clientName: string;
    clientInn: string;
    expectedAmount: string;
    expectedDate: string;

    // Payment categories
    category: string;
    officeSupplies: string;
    supplies: string;
    rent: string;
    utilities: string;
    services: string;
    equipment: string;
    marketing: string;
    salary: string;
    salaryHr: string;
    taxes: string;
    other: string;

    // Messages
    noRequests: string;
    createFirst: string;
    noApprovals: string;
    approvalRequired: string;
    chiefAccountantApproval: string;
    executiveApproval: string;

    // SLA
    slaOnTime: string;
    slaWarning: string;
    slaOverdue: string;
    slaDaysRemaining: string;
    slaHoursRemaining: string;
  };

  // Auth
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    forgotPassword: string;
    rememberMe: string;
    signIn: string;
    signOut: string;
    invalidCredentials: string;
  };

  // Settings
  settings: {
    title: string;
    general: string;
    notifications: string;
    security: string;
    language: string;
    theme: string;
    darkMode: string;
    lightMode: string;
  };

  // Errors
  errors: {
    generic: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    validationFailed: string;
    networkError: string;
    serverError: string;
  };

  // Success messages
  success: {
    saved: string;
    created: string;
    updated: string;
    deleted: string;
    submitted: string;
  };
}
