import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SponsorshipHeadProvider, useSponsorshipHead } from './context/SponsorshipHeadContext';
import { SponsorshipHeadLayout } from './SponsorshipHeadLayout';
import { ToastContainer } from './components/ToastContainer';
import { DashboardPage } from './pages/DashboardPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { EnquiryDetailPage } from './pages/EnquiryDetailPage';
import { ProfilePage } from './pages/ProfilePage';

const SponsorshipHeadContent: React.FC = () => {
  const { toasts, dismissToast } = useSponsorshipHead();
  return (
    <>
      <Routes>
        <Route element={<SponsorshipHeadLayout />}>
          <Route index element={<Navigate to="/sponsorship-head/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="enquiries/:enquiryId" element={<EnquiryDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/sponsorship-head/dashboard" replace />} />
        </Route>
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const SponsorshipHeadApp: React.FC = () => {
  return (
    <SponsorshipHeadProvider>
      <SponsorshipHeadContent />
    </SponsorshipHeadProvider>
  );
};

export default SponsorshipHeadApp;
