import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CasyumFacultyProvider, useCasyumFaculty } from './context/CasyumFacultyContext';
import { CasyumFacultyLayout } from './CasyumFacultyLayout';
import { ToastContainer } from './components/ToastContainer';
import { DashboardPage } from './pages/DashboardPage';
import { PaymentVerificationPage } from './pages/PaymentVerificationPage';
import { AllEventsPage } from './pages/AllEventsPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { RegistrationStatusPage } from './pages/RegistrationStatusPage';
import { AttendanceOverviewPage } from './pages/AttendanceOverviewPage';
import { ReportsPage } from './pages/ReportsPage';
import StaffReportsPage from '../reports/StaffReportsPage';
import { ProfilePage } from './pages/ProfilePage';

const CasyumFacultyContent: React.FC = () => {
  const { toasts, dismissToast } = useCasyumFaculty();
  return (
    <>
      <Routes>
        <Route element={<CasyumFacultyLayout />}>
          <Route index element={<Navigate to="/casyum-faculty/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="payment-verification" element={<PaymentVerificationPage />} />
          <Route path="events" element={<AllEventsPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="registration-status" element={<RegistrationStatusPage />} />
          <Route path="attendance" element={<AttendanceOverviewPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route
            path="participant-report"
            element={<StaffReportsPage scope={{ mode: 'full' }} />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/casyum-faculty/dashboard" replace />} />
        </Route>
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const CasyumFacultyApp: React.FC = () => {
  return (
    <CasyumFacultyProvider>
      <CasyumFacultyContent />
    </CasyumFacultyProvider>
  );
};
