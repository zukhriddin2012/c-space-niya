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
    today: string;
    yesterday: string;
    lastWeek: string;
    monthStart: string;
    allBranches: string;
    allStatus: string;
    apply: string;
    reset: string;
    export: string;
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
    feedback: string;
    feedbackInbox: string;
    tableView: string;
    boardView: string;
    devBoard: string;
    peopleManagement: string;
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
    // Extended dashboard translations
    overview: string;
    heresYourOverview: string;
    fullTime: string;
    partTime: string;
    presentToday: string;
    absentToday: string;
    lateArrivals: string;
    hoursWorked: string;
    daysPresent: string;
    pendingApprovals: string;
    activeBranches: string;
    monthlyWageBudget: string;
    monthlyPayroll: string;
    unreadFeedback: string;
    activeCandidates: string;
    onProbation: string;
    branchStaffing: string;
    employeeLevels: string;
    branchAttendance: string;
    noActivityToday: string;
    noBranchData: string;
    checkedInAt: string;
    checkedOutFrom: string;
    arrivedLateAt: string;
    employees: string;
    junior: string;
    middle: string;
    senior: string;
    executive: string;
    viewAll: string;
    // Role-specific
    executiveDashboard: string;
    hrDashboard: string;
    recruitmentDashboard: string;
    accountingDashboard: string;
    accountantDashboard: string;
    legalDashboard: string;
    branchDashboard: string;
    manageOperations: string;
    companyOverview: string;
    managePaymentRequests: string;
    processPaymentRequests: string;
    manageCandidates: string;
    // Stats
    keyMetrics: string;
    toProcess: string;
    inProgress: string;
    completedToday: string;
    processedToday: string;
    totalThisMonth: string;
    awaitingMyApproval: string;
    pendingRequests: string;
    // Quick links
    reports: string;
    feedbackInbox: string;
    addEmployee: string;
    recruitmentBoard: string;
    kanbanBoard: string;
    tableView: string;
    giveFeedback: string;
    myRequests: string;
    myPortal: string;
    leaveRequests: string;
    allRequests: string;
    // Employee dashboard
    profileNotLinked: string;
    contactHR: string;
    recentAttendance: string;
    noAttendanceRecords: string;
    // Branch manager
    branchEmployees: string;
    absentLate: string;
    todaysAttendance: string;
    allPresentOnTime: string;
    absent: string;
    late: string;
    // My recent requests
    myRecentRequests: string;
    noRecentRequests: string;
    noPendingApprovals: string;
    review: string;
    awaiting: string;
    terminationRequest: string;
    wageChange: string;
    paymentRequests: string;
    interviewStage: string;
    underReview: string;
    hiredThisMonth: string;
    pipelineOverview: string;
    openBoard: string;
    screening: string;
    interview: string;
    probation: string;
    hired: string;
    recruitmentPipeline: string;
    totalCandidates: string;
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
    // Employment types
    employmentType: string;
    fullTime: string;
    partTime: string;
    contract: string;
    internship: string;
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
    onTime: string;
    overnight: string;
    presentNow: string;
    sessions: string;
    verifiedBy: string;
    ip: string;
    gps: string;
    manual: string;
    // Button labels
    remind: string;
    sending: string;
    manualCheckout: string;
    confirmCheckout: string;
    // Reminder column
    reminder: string;
    reminderSent: string;
    reminderScheduled: string;
    reminderResponded: string;
    reminderCompleted: string;
    reminderAutoCheckout: string;
  };

  // Branches
  branches: {
    title: string;
    addBranch: string;
    branchName: string;
    address: string;
    manager: string;
    employeeCount: string;
    // Status labels
    operational: string;
    underConstruction: string;
    rented: string;
    facilityManagement: string;
    // UI labels
    nightShift: string;
    smartLock: string;
    staff: string;
    present: string;
    budget: string;
    todaysPresence: string;
    noGeofence: string;
    geofenceConfigured: string;
    editSettings: string;
    viewDetails: string;
    attendance: string;
    geofenced: string;
    noFence: string;
    rate: string;
    // Summary stats
    totalBranches: string;
    withStaff: string;
    totalStaff: string;
    presentNow: string;
    monthlyBudget: string;
    allBranches: string;
    // Empty state
    noBranchesYet: string;
    getStarted: string;
    subtitle: string;
    noAddress: string;
    communityManager: string;
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
    // Extended payroll
    payrollManagement: string;
    monthlyPayroll: string;
    totalEmployees: string;
    totalAmount: string;
    processed: string;
    pending: string;
    approved: string;
    rejected: string;
    generatePayroll: string;
    exportReport: string;
    viewDetails: string;
    employee: string;
    position: string;
    department: string;
    grossSalary: string;
    status: string;
    actions: string;
    noPayrollData: string;
    selectMonth: string;
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

  // Recruitment
  recruitment: {
    title: string;
    candidates: string;
    addCandidate: string;
    pipeline: string;
    // Stages
    screening: string;
    interview1: string;
    interview2: string;
    underReview: string;
    probation: string;
    hired: string;
    rejected: string;
    // Candidate details
    name: string;
    email: string;
    phone: string;
    position: string;
    appliedDate: string;
    stage: string;
    notes: string;
    resume: string;
    // Actions
    moveToStage: string;
    scheduleInterview: string;
    sendOffer: string;
    reject: string;
    hire: string;
    // Stats
    totalCandidates: string;
    activeApplications: string;
    hiredThisMonth: string;
    openPositions: string;
    // Table
    noCandidates: string;
    searchCandidates: string;
  };

  // Reports
  reports: {
    title: string;
    generateReport: string;
    exportPdf: string;
    exportExcel: string;
    dateRange: string;
    // Report types
    attendanceReport: string;
    attendanceDesc: string;
    payrollReport: string;
    payrollDesc: string;
    headcountReport: string;
    headcountDesc: string;
    turnoverReport: string;
    turnoverDesc: string;
    performanceReport: string;
    performanceDesc: string;
    leaveReport: string;
    leaveDesc: string;
    // Status
    generating: string;
    ready: string;
    download: string;
    noReports: string;
  };

  // Profile
  profile: {
    title: string;
    personalInfo: string;
    contactInfo: string;
    employmentInfo: string;
    // Fields
    fullName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    gender: string;
    male: string;
    female: string;
    // Employment
    employeeId: string;
    department: string;
    position: string;
    branch: string;
    hireDate: string;
    employmentType: string;
    manager: string;
    // Actions
    editProfile: string;
    changePassword: string;
    uploadPhoto: string;
    saveChanges: string;
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
    selectLanguage: string;
    english: string;
    russian: string;
    uzbek: string;
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
