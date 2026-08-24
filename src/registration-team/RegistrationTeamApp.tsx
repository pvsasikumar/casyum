import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RegistrationTeamProvider } from './context/RegistrationTeamContext';
import { RegistrationTeamLayout } from './RegistrationTeamLayout';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyParticipantPage } from './pages/VerifyParticipantPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';

export const RegistrationTeamApp: React.FC = () => {
  return (
    <RegistrationTeamProvider>
      <Routes>
        <Route element={<RegistrationTeamLayout />}>
          <Route index element={<Navigate to="/registration-team/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="verify" element={<VerifyParticipantPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/registration-team/dashboard" replace />} />
        </Route>
      </Routes>
    </RegistrationTeamProvider>
  );
};
