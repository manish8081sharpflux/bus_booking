import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { BusVerificationPage } from '@/pages/bus-verification-page';
import { AdminDashboardPage } from '@/pages/admin-dashboard';
import { AllBusesPage, AdminBookingsPage, AdminPaymentsPage, AdminTripsPage, LiveTripsPage, SettlementsPage, SupportPage, AuditLogsPage, ReportsPage, PromotionsPage } from '@/pages/admin-operations';
import {
  AccountAddOperatorPage,
  AccountApiKeysPage,
  AccountCompanyProfilePage,
  AccountIntegrationsPage,
  AccountNotificationsPage,
  AccountOperatorsPage,
  AccountOverviewPage,
  AccountPermissionsTogglePage,
  AccountRolesPage,
  AccountTeamMembersPage,
} from '@/pages/account';
import { UsersPage } from '@/pages/account/members/users';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<AdminDashboardPage />} />

          <Route path="/account/members/operators" element={<AccountOperatorsPage />} />
          <Route path="/account/members/add-operator" element={<AccountAddOperatorPage />} />
          <Route path="/account/members/users" element={<UsersPage />} />
          <Route path="/account/members/team-members" element={<AccountTeamMembersPage />} />
          <Route path="/account/members/roles" element={<AccountRolesPage />} />
          <Route path="/account/members/permissions-toggle" element={<AccountPermissionsTogglePage />} />

          <Route path="/bus-verification" element={<BusVerificationPage />} />
          <Route path="/admin/buses" element={<AllBusesPage />} />
          <Route path="/admin/trips" element={<AdminTripsPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/live-trips" element={<LiveTripsPage />} />
          <Route path="/admin/settlements" element={<SettlementsPage />} />
          <Route path="/admin/support" element={<SupportPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/promotions" element={<PromotionsPage />} />

          <Route path="/account/home/company-profile" element={<AccountCompanyProfilePage />} />
          <Route path="/account/api-keys" element={<AccountApiKeysPage />} />
          <Route path="/account/integrations" element={<AccountIntegrationsPage />} />
          <Route path="/account/notifications" element={<AccountNotificationsPage />} />
          <Route path="/account/security/overview" element={<AccountOverviewPage />} />
        </Route>
      </Route>

      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" replace />} />
    </Routes>
  );
}
