import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AdminLayout } from './components/layout/AdminLayout';

import { DashboardHome } from './components/modules/DashboardHome';
import { RegistrationManagement } from './components/modules/RegistrationManagement';
import { EventManagement } from './components/modules/EventManagement';
import { PaymentVerification } from './components/modules/PaymentVerification';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { AnalyticsModule } from './components/modules/AnalyticsModule';
import { ExportCenter } from './components/modules/ExportCenter';
import { AnnouncementCenter } from './components/modules/AnnouncementCenter';
import { GalleryManagement } from './components/modules/GalleryManagement';
import { CertificateManagement } from './components/modules/CertificateManagement';
import { CoordinatorManagement } from './components/modules/CoordinatorManagement';
import { SettingsModule } from './components/modules/SettingsModule';
import { AuditLogs } from './components/modules/AuditLogs';

const ModuleRouter: React.FC = () => {
  const { activeTab } = useAdmin();

  switch (activeTab) {
    case 'Dashboard':
      return <DashboardHome />;
    case 'Registrations':
      return <RegistrationManagement />;
    case 'Events':
      return <EventManagement />;
    case 'Payments':
      return <PaymentVerification />;
    case 'Attendance':
      return <AttendanceModule />;
    case 'Analytics':
      return <AnalyticsModule />;
    case 'Export Center':
      return <ExportCenter />;
    case 'Announcements':
      return <AnnouncementCenter />;
    case 'Gallery':
      return <GalleryManagement />;
    case 'Certificates':
      return <CertificateManagement />;
    case 'Coordinators':
      return <CoordinatorManagement />;
    case 'Settings':
      return <SettingsModule />;
    case 'Audit Logs':
      return <AuditLogs />;
    default:
      return <DashboardHome />;
  }
};

interface AdminDashboardProps {
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin }) => {
  return (
    <AdminProvider>
      <AdminLayout onExitAdmin={onExitAdmin}>
        <ModuleRouter />
      </AdminLayout>
    </AdminProvider>
  );
};
