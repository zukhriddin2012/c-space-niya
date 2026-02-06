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
    pending: string;
    unread: string;
    noBranch: string;
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
    orgChart: string;
    shiftPlanning: string;
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
    viewEmployeeInfo: string;
    fullName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    branch: string;
    hireDate: string;
    salary: string;
    perMonth: string;
    status: string;
    active: string;
    inactive: string;
    onLeave: string;
    probation: string;
    terminated: string;
    remote: string;
    // Employment types
    employmentType: string;
    fullTime: string;
    partTime: string;
    contract: string;
    internship: string;
    // Position levels
    level: string;
    allLevels: string;
    junior: string;
    middle: string;
    senior: string;
    executive: string;
    specialist: string;
    manager: string;
    support: string;
    // Monthly work hours section
    monthlyWorkHours: string;
    totalHours: string;
    daysPresent: string;
    daysLate: string;
    earlyLeaves: string;
    noAttendanceRecords: string;
    // Table headers
    date: string;
    checkIn: string;
    checkOut: string;
    hours: string;
    // Month names
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
  };

  // Employee Edit Form
  employeeEdit: {
    // Page
    title: string;
    subtitle: string;

    // Tabs
    tabProfile: string;
    tabEmployment: string;
    tabWages: string;
    tabDocuments: string;
    tabAdmin: string;

    // Profile section
    basicInfo: string;
    personalInfo: string;
    contactInfo: string;

    // Fields
    fullName: string;
    position: string;
    selectPosition: string;
    level: string;
    branch: string;
    noBranch: string;
    department: string;
    noDepartment: string;
    manager: string;
    reportsTo: string;
    noManager: string;
    managerHint: string;
    status: string;
    employmentType: string;
    hireDate: string;
    dateOfBirth: string;
    gender: string;
    notSpecified: string;
    male: string;
    female: string;
    phone: string;
    email: string;
    notes: string;

    // Wages section
    primaryWages: string;
    primaryWagesHint: string;
    additionalWages: string;
    additionalWagesHint: string;
    totalSalary: string;
    addWage: string;
    legalEntity: string;
    amount: string;
    noWagesYet: string;
    pendingChange: string;
    requestChange: string;

    // Documents section
    documentsTitle: string;
    uploadDocument: string;
    documentType: string;
    dragDropHint: string;
    noDocuments: string;
    termSheet: string;
    contract: string;
    passport: string;
    idCard: string;
    diploma: string;
    other: string;

    // Admin section
    systemRole: string;
    systemRoleHint: string;
    telegramStatus: string;
    connected: string;
    notConnected: string;
    disconnect: string;
    sendPin: string;
    sendPinTitle: string;
    sendPinDescription: string;
    sendPinBranchPassword: string;
    sendPinBranchPasswordPlaceholder: string;
    sendPinGenerateAndSend: string;
    sendPinSending: string;
    sendPinSent: string;
    sendPinSuccess: string;
    sendPinCancel: string;
    growthTeam: string;
    growthTeamHint: string;
    remoteWork: string;
    remoteWorkHint: string;

    // Termination
    terminationSection: string;
    requestTermination: string;
    terminationReason: string;
    terminationDate: string;
    pendingTermination: string;

    // Delete
    dangerZone: string;
    deleteEmployee: string;
    deleteWarning: string;
    typeDeleteConfirm: string;

    // Messages
    saveSuccess: string;
    saveError: string;
    uploadSuccess: string;
    deleteSuccess: string;
    unsavedChanges: string;
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
    remote: string;
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
    // Delete feature
    delete: string;
    deleteTitle: string;
    deleteMessage: string;
    deleteConfirm: string;
    deleting: string;
    cannotDeletePaid: string;
    // Paid status
    paid: string;
    blocked: string;
    paidTooltipAdvance: string;
    paidTooltipWage: string;
    paidTooltipDate: string;
    // Notifications
    notify: string;
    notifyButton: string;
    notified: string;
    notifyTitle: string;
    notifyMessage: string;
    notifyConfirm: string;
    notifySending: string;
    notifySent: string;
    // Bulk notifications
    notifyAllPaid: string;
    allNotified: string;
    notifyAllTitle: string;
    notifyAllMessage: string;
    notifyAllSummaryAdvance: string;
    notifyAllSummaryWage: string;
    notifyAllSummaryTotal: string;
    notifyAllSummaryEmployees: string;
    notifyAllConfirm: string;
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
    // Extended reports
    subtitle: string;
    subtitleShort: string;
    thisWeek: string;
    thisMonth: string;
    thisQuarter: string;
    thisYear: string;
    customRange: string;
    avgAttendanceRate: string;
    totalDisbursed: string;
    totalEmployees: string;
    turnoverRate: string;
    retentionAnalysis: string;
    dailyWeeklyMonthly: string;
    salaryDisbursements: string;
    employeeDistribution: string;
    quickExport: string;
    downloadPreConfigured: string;
    employeeDirectory: string;
    allEmployeesContact: string;
    monthlyPayroll: string;
    currentMonthSalary: string;
    attendanceSummary: string;
    thisMonthAttendance: string;
    branchOverview: string;
    staffDistribution: string;
    advancedAnalytics: string;
    advancedAnalyticsDesc: string;
    advancedAnalyticsDescShort: string;
    exportReport: string;
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
    // SEC-008: Password reset
    resetPassword: string;
    resetPasswordTitle: string;
    resetPasswordDescription: string;
    newPassword: string;
    confirmPassword: string;
    passwordsDoNotMatch: string;
    passwordResetSuccess: string;
    passwordRequirements: string;
    passwordStrength: string;
    passwordWeak: string;
    passwordFair: string;
    passwordGood: string;
    passwordStrong: string;
    passwordVeryStrong: string;
    // SEC-015: Rate limiting
    tooManyAttempts: string;
    tryAgainIn: string;
    // SEC-017: Session management
    sessionExpiringSoon: string;
    sessionExpired: string;
    sessionWillExpire: string;
    staySignedIn: string;
    signInAgain: string;
    remaining: string;
    // SEC-020: Toast messages
    errorOccurred: string;
    sessionExpiredMessage: string;
    permissionDenied: string;
    networkError: string;
    // Login page
    platformSubtitle: string;
    signInTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    signingIn: string;
    forgotPasswordAlert: string;
    loginFailed: string;
    copyright: string;
    // Reset password page
    securityUpdateRequired: string;
    securityUpdateMessage: string;
    setNewPassword: string;
    setNewPasswordDesc: string;
    enterNewPasswordPlaceholder: string;
    confirmNewPasswordPlaceholder: string;
    updatingPassword: string;
    updatePasswordButton: string;
    needHelp: string;
    passwordUpdated: string;
    passwordUpdatedMessage: string;
    redirectingToDashboard: string;
    meetPasswordRequirements: string;
    failedToUpdatePassword: string;
    // Password strength
    passwordAtLeastChars: string;
    passwordUppercase: string;
    passwordLowercase: string;
    passwordNumber: string;
    passwordSpecialChar: string;
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
    // Extended settings
    subtitle: string;
    subtitleShort: string;
    rolesPermissions: string;
    branchSettings: string;
    receptionConfig: string;
    languageSavedNotice: string;
    permissions: string;
    viewPermissions: string;
    total: string;
    branchSettingsDesc: string;
    branchSettingsManagedElsewhere: string;
    goToBranches: string;
    notificationSettings: string;
    notificationSettingsDesc: string;
    lateArrivalAlerts: string;
    lateArrivalAlertsDesc: string;
    leaveRequests: string;
    leaveRequestsDesc: string;
    payrollReminders: string;
    payrollRemindersDesc: string;
    weeklyReports: string;
    weeklyReportsDesc: string;
    securitySettings: string;
    securitySettingsDesc: string;
    twoFactorAuth: string;
    comingSoon: string;
    twoFactorAuthDesc: string;
    sessionTimeout: string;
    sessionTimeoutDesc: string;
    passwordRequirements: string;
    minEightChars: string;
    atLeastOneUppercase: string;
    atLeastOneNumber: string;
    receptionConfigDesc: string;
    thirtyMinutes: string;
    oneHour: string;
    fourHours: string;
    eightHours: string;
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

  // Reception Mode
  reception: {
    // Page titles
    title: string;
    incomeStatement: string;
    transactions: string;
    expenses: string;
    settings: string;
    recordSales: string;
    recordExpenses: string;
    manageSettings: string;

    // Date periods
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    lastMonth: string;
    thisQuarter: string;
    thisYear: string;
    allTime: string;
    customRange: string;
    quickSelect: string;
    selectYear: string;
    fullYear: string;
    quarterOf: string;
    monthOf: string;
    from: string;
    to: string;
    applyRange: string;
    resetToToday: string;

    // Financial stats
    paid: string;
    debt: string;
    opex: string;
    capex: string;
    operatingProfit: string;
    profit: string;
    topExpenseCategories: string;
    noExpensesInPeriod: string;
    incomeByServiceType: string;
    recentActivity: string;
    noTransactionsInPeriod: string;
    noRecentActivity: string;

    // Transactions
    newTransaction: string;
    searchTransactions: string;
    moreFilters: string;
    allServices: string;
    allPayments: string;
    noTransactionsFound: string;
    showingTransactions: string;
    transactionDetails: string;
    voidTransaction: string;

    // Form fields
    customer: string;
    customerClient: string;
    serviceType: string;
    amount: string;
    paymentMethod: string;
    transactionDate: string;
    transactionCode: string;
    selectService: string;
    selectPayment: string;
    searchOrCreateClient: string;
    enterCode: string;
    optionalNotes: string;

    // Expenses
    newExpense: string;
    searchExpenses: string;
    expenseDetails: string;
    voidExpense: string;
    subject: string;
    expenseType: string;
    expenseDate: string;
    noExpensesFound: string;
    showingExpenses: string;
    selectExpenseType: string;
    enterSubject: string;
    cashBank: string;

    // Status
    active: string;
    voided: string;
    voidReason: string;
    voiding: string;
    creating: string;
    enterReason: string;

    // Settings tabs
    serviceTypes: string;
    expenseTypes: string;
    paymentMethods: string;
    branchAccess: string;
    addNewItem: string;
    editItem: string;
    grantAccess: string;
    grantingAccess: string;
    revokeAccess: string;
    noAccessGrants: string;
    itemName: string;
    itemCode: string;
    itemIcon: string;
    requiresCode: string;
    sortOrder: string;

    // Table headers
    date: string;
    service: string;
    payment: string;
    branch: string;
    status: string;
    actions: string;

    // Client
    createClient: string;
    clientName: string;
    clientType: string;
    company: string;
    individual: string;
    industry: string;
    phone: string;
    email: string;
  };

  // Legal Requests
  legalRequests: {
    title: string;
    newRequest: string;
    requestNumber: string;
    requestType: string;
    submittedBy: string;
    assignedTo: string;
    contractPreparation: string;
    supplementaryAgreement: string;
    contractTermination: string;
    websiteRegistration: string;
    guaranteeLetter: string;
    submitted: string;
    underReview: string;
    inProgress: string;
    ready: string;
    completed: string;
    rejected: string;
    contractType: string;
    paymentForm: string;
    serviceCost: string;
    paymentPeriod: string;
    startDate: string;
    endDate: string;
    areaSqm: string;
    officeNumber: string;
    workstations: string;
    registrationRequired: string;
    additionalConditions: string;
    changeType: string;
    changeDescription: string;
    effectiveDate: string;
    terminationDate: string;
    hasDebt: string;
    debtAmount: string;
    companyName: string;
    inn: string;
    branchName: string;
    contactPerson: string;
    guaranteeAmount: string;
    beneficiary: string;
    purpose: string;
    addComment: string;
    assignToMe: string;
    updateStatus: string;
    noRequests: string;
    createFirst: string;
    submitSuccess: string;
    statusUpdated: string;
  };

  // Maintenance Issues
  maintenanceIssues: {
    title: string;
    reportIssue: string;
    issueNumber: string;
    hvac: string;
    plumbing: string;
    electrical: string;
    furniture: string;
    cleaning: string;
    building: string;
    itNetwork: string;
    safety: string;
    other: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    urgency: string;
    category: string;
    slaDeadline: string;
    slaBreached: string;
    slaOnTrack: string;
    slaHoursRemaining: string;
    open: string;
    inProgress: string;
    resolved: string;
    location: string;
    description: string;
    photos: string;
    addPhotos: string;
    assignedTo: string;
    noIssues: string;
    reportSuccess: string;
    statusUpdated: string;
  };

  // Operator Switch
  operatorSwitch: {
    title: string;
    switchOperator: string;
    enterPin: string;
    pinPlaceholder: string;
    crossBranch: string;
    searchEmployee: string;
    currentOperator: string;
    clearOperator: string;
    switchSuccess: string;
    invalidPin: string;
    accountLocked: string;
    tryAgainIn: string;
    pinSet: string;
    pinUpdated: string;
    setPin: string;
    updatePin: string;
    newPin: string;
    confirmPin: string;
    pinsDoNotMatch: string;
  };

  // Shifts
  shifts: {
    title: string;
    weeklySchedule: string;
    dayShift: string;
    nightShift: string;
    noShifts: string;
    today: string;
    thisWeek: string;
    previousWeek: string;
    nextWeek: string;
  };
}
