// Reception Mode Components
// These are lazy-loaded in DashboardContent when Reception Mode is active

export { default as ReceptionDashboard } from './ReceptionDashboard';
export { default as ReceptionTransactions } from './ReceptionTransactions';
export { default as ReceptionExpenses } from './ReceptionExpenses';
export { default as ReceptionSettings } from './ReceptionSettings';

// Branch Components
export { BranchSelector } from './BranchSelector';
export { BranchSwitchModal } from './BranchSwitchModal';

// Client Components
export { ClientAutocomplete } from './ClientAutocomplete';
export { CreateClientModal } from './CreateClientModal';
export type { ClientOption } from './ClientAutocomplete';
