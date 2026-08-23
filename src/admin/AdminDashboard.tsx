import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { ToastContainer } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Profile } from '../pages/admin/Profile';
import { ChangePassword } from '../pages/admin/ChangePassword';
import { Settings } from '../pages/admin/Settings';

import { DashboardHome } from './components/modules/DashboardHome';
import { CmsModule } from './components/modules/CmsModule';
import { RegistrationManagement } from './components/modules/RegistrationManagement';
import { EventManagement } from './components/modules/EventManagement';
import { EventOverviewModule } from './components/modules/EventOverviewModule';
import { EventCardsModule } from './components/modules/EventCardsModule';
import { PaymentVerification } from './components/modules/PaymentVerification';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { AnalyticsModule } from './components/modules/AnalyticsModule';
import { ExportCenter } from './components/modules/ExportCenter';
import { EventParticipantExport } from './components/modules/EventParticipantExport';
import { AnnouncementCenter } from './components/modules/AnnouncementCenter';
import { GalleryManagement } from './components/modules/GalleryManagement';
import { CertificateManagement } from './components/modules/CertificateManagement';
import { CoordinatorManagement } from './components/modules/CoordinatorManagement';
import { RegistrationTeamManagement } from './components/modules/RegistrationTeamManagement';
import { CasyumFacultyCoordinatorManagement } from './components/modules/CasyumFacultyCoordinatorManagement';
import { ObserverManagement } from './components/modules/ObserverManagement';
import { ParticipantsModule } from './components/modules/ParticipantsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { PaymentSettingsModule } from './components/modules/PaymentSettingsModule';
import { CommunicationSettingsModule } from './components/modules/CommunicationSettingsModule';
import { AuditLogs } from './components/modules/AuditLogs';
import { EmployeeManagement } from './components/modules/EmployeeManagement';
import { EmailLogs } from './components/modules/EmailLogs';
import { ResultsModule } from './components/modules/ResultsModule';
import { SponsorManagement } from './components/modules/SponsorManagement';
import { SponsorshipEnquiries } from './components/modules/SponsorshipEnquiries';
import { TeamsModule } from './components/modules/TeamsModule';
import { TeamSettingsModule } from './components/modules/TeamSettingsModule';

const ModuleRouter: React.FC = () => {
  const { activeTab } = useAdmin();

  switch (activeTab) {
    case 'Dashboard':
      return <DashboardHome />;
    case 'CMS':
      return <CmsModule />;
    case 'Registrations':
      return <RegistrationManagement />;
    case 'Events':
      return <EventManagement />;
    case 'Event Overview':
      return <EventOverviewModule />;
    case 'Event Cards':
      return <EventCardsModule />;
    case 'Payments':
      return <PaymentVerification />;
    case 'Payment Settings':
      return <PaymentSettingsModule />;
    case 'Communication Settings':
      return <CommunicationSettingsModule />;
    case 'Attendance':
      return <AttendanceModule />;
    case 'Analytics':
      return <AnalyticsModule />;
    case 'Export Center':
      return <ExportCenter />;
    case 'Event Export':
      return <EventParticipantExport />;
    case 'Announcements':
      return <AnnouncementCenter />;
    case 'Gallery':
      return <GalleryManagement />;
    case 'Certificates':
      return <CertificateManagement />;
    case 'Coordinators':
      return <CoordinatorManagement />;
    case 'Registration Team':
      return <RegistrationTeamManagement />;
    case 'CASYUM Faculty Coordinators':
      return <CasyumFacultyCoordinatorManagement />;
    case 'Observers':
      return <ObserverManagement />;
    case 'Participants':
      return <ParticipantsModule />;
    case 'Teams':
      return <TeamsModule />;
    case 'Team Settings':
      return <TeamSettingsModule />;
    case 'Settings':
      return <SettingsModule />;
    case 'Audit Logs':
      return <AuditLogs />;
    case 'Employees':
      return <EmployeeManagement />;
    case 'Email Logs':
      return <EmailLogs />;
    case 'Results':
      return <ResultsModule />;
    case 'Sponsors':
      return <SponsorManagement />;
    case 'Sponsorship Enquiries':
      return <SponsorshipEnquiries />;
    default:
      return <DashboardHome />;
  }
};

interface AdminDashboardProps {
  onExitAdmin: () => void;
}

const AdminContent: React.FC = () => {
  const { toasts, dismissToast } = useAdmin();
  const navigate = useNavigate();
  return (
    <>
      <Routes>
        <Route path="/admin/profile" element={<ErrorBoundary onBack={() => navigate('/admin')}><Profile /></ErrorBoundary>} />
        <Route path="/admin/change-password" element={<ErrorBoundary onBack={() => navigate('/admin')}><ChangePassword /></ErrorBoundary>} />
        <Route path="/admin/settings" element={<ErrorBoundary onBack={() => navigate('/admin')}><Settings /></ErrorBoundary>} />
        <Route path="*" element={<ModuleRouter />} />
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin }) => {
  return (
    <AdminProvider>
      <AdminLayout onExitAdmin={onExitAdmin}>
        <AdminContent />
      </AdminLayout>
    </AdminProvider>
  );
};
