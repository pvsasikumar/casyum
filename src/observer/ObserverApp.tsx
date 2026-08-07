import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ObserverProvider, useObserver } from './context/ObserverContext';
import { ObserverLayout } from './ObserverLayout';
import { ToastContainer } from './components/ToastContainer';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { ReportsPage } from './pages/ReportsPage';
import { WinnersPage } from './pages/WinnersPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { ProfilePage } from './pages/ProfilePage';

const ObserverContent: React.FC = () => {
  const { toasts, dismissToast } = useObserver();
  return (
    <>
      <Routes>
        <Route element={<ObserverLayout />}>
          <Route index element={<Navigate to="/observer/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetailsPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="winners" element={<WinnersPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/observer/dashboard" replace />} />
        </Route>
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const ObserverApp: React.FC = () => {
  return (
    <ObserverProvider>
      <ObserverContent />
    </ObserverProvider>
  );
};
