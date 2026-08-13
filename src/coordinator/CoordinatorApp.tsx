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

const AttendanceRoute: React.FC = () => {
  const { assignedEvent } = useCoordinator();

  if (!assignedEvent) {
    return <NoEventAssigned />;
  }

  return <AttendancePage eventId={assignedEvent.id} eventName={assignedEvent.name} />;
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/coordinator/dashboard" replace />} />
        </Route>
      </Routes>
    </CoordinatorProvider>
  );
};
.