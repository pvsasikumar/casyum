import StaffReportsPage from '../../reports/StaffReportsPage';

/**
 * Registration Desk report — full participant report (search, filters,
 * summary, PDF/Excel export) backed by the shared reports module. Scope is
 * 'full': the desk role is allowed to read all participants and
 * registrations under the Firestore rules.
 */
export const ReportsPage = () => <StaffReportsPage scope={{ mode: 'full' }} />;
