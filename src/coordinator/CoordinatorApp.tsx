import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CoordinatorProvider, useCoordinator } from './context/CoordinatorContext';
import { CoordinatorLayout } from './CoordinatorLayout';
import { NoEventAssigned } from './components/NoEventAssigned';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { EventOverviewPage } from './pages/EventOverviewPage';
import { EventDescriptionPage } from './pages/EventDescriptionPage';
import { ResultsPage } from './pages/ResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamsPage } from './pages/TeamsPage';
import StaffReportsPage from '../reports/StaffReportsPage';

const AttendanceRoute: React.FC = () => {
  const { assignedEvent } = useCoordinator();

  if (!assignedEvent) {
    return <NoEventAssigned />;
  }

  return <AttendancePage eventId={assignedEvent.id} eventName={assignedEvent.name} />;
};

/**
 * Coordinator report — scoped to the coordinator's assigned events. Every
 * Firestore query is constrained per event id so the data window matches what
 * the security rules already enforce for this role.
 */
const ReportsRoute: React.FC = () => {
  const { assignedEvents } = useCoordinator();

  if (!assignedEvents || assignedEvents.length === 0) {
    return <NoEventAssigned />;
  }

  return (
    <StaffReportsPage
      scope={{ mode: 'assigned', eventIds: assignedEvents.map((e) => String(e.id)) }}
    />
  );
};

export const CoordinatorApp: React.FC = () => {
  return (
    <CoordinatorProvider>
      <Routes>
        <Route element={<CoordinatorLayout />}>
          <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="attendance" element={<AttendanceRoute />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="event-overview" element={<EventOverviewPage />} />
          <Route path="event-description" element={<EventDescriptionPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="reports" element={<ReportsRoute />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/coordinator/dashboard" replace />} />
        </Route>
      </Routes>
    </CoordinatorProvider>
  );
};