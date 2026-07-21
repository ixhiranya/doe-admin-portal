import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { useApps } from './store/apps';
import { ppsLandingPath } from './lib/utils';
import { useDocumentDirection } from './i18n';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ModulePage } from './pages/ModulePage';
import { ApplicationListPage } from './pages/ApplicationListPage';
import { ApplicationFormPage } from './pages/ApplicationFormPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { ApplicationPreviewPage } from './pages/ApplicationPreviewPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BuildingsPage } from './pages/buildings/BuildingsPage';
import { BuildingDetailPage } from './pages/buildings/BuildingDetailPage';
import { PpsDashboardPage } from './pages/pps/DashboardPage';
import { PpsSubmissionsPage } from './pages/pps/SubmissionsPage';
import { PpsSubmissionDetailPage } from './pages/pps/SubmissionDetailPage';
import { SubmissionFormPage } from './pages/pps/SubmissionFormPage';
import { PpsMonitoringPage } from './pages/pps/MonitoringPage';
import { AssetsListPage } from './pages/gasRegister/AssetsListPage';
import { AssetDetailPage } from './pages/gasRegister/AssetDetailPage';
import { AssetCreatePage } from './pages/gasRegister/AssetCreatePage';
import { CustomersListPage } from './pages/gasRegister/CustomersListPage';
import { CustomerDetailPage } from './pages/gasRegister/CustomerDetailPage';
import { CustomerCreatePage } from './pages/gasRegister/CustomerCreatePage';
import { SuppliersListPage } from './pages/gasRegister/SuppliersListPage';
import { SupplierDetailPage } from './pages/gasRegister/SupplierDetailPage';
import { SupplierCreatePage } from './pages/gasRegister/SupplierCreatePage';
import { EmployeesListPage } from './pages/gasRegister/EmployeesListPage';
import { EmployeeDetailPage } from './pages/gasRegister/EmployeeDetailPage';
import { EmployeeCreatePage } from './pages/gasRegister/EmployeeCreatePage';
import { FleetListPage } from './pages/gasRegister/FleetListPage';
import { FleetDetailPage } from './pages/gasRegister/FleetDetailPage';
import { FleetCreatePage } from './pages/gasRegister/FleetCreatePage';
import { InflowListPage } from './pages/gasRegister/InflowListPage';
import { InflowDetailPage } from './pages/gasRegister/InflowDetailPage';
import { InflowCreatePage } from './pages/gasRegister/InflowCreatePage';
import { OutflowListPage } from './pages/gasRegister/OutflowListPage';
import { OutflowDetailPage } from './pages/gasRegister/OutflowDetailPage';
import { OutflowCreatePage } from './pages/gasRegister/OutflowCreatePage';
import { GasFlowReportsPage } from './pages/gasRegister/GasFlowReportsPage';
import { GasRegisterDashboardPage } from './pages/gasRegister/DashboardPage';
import { NotificationsPage as GasRegisterNotificationsPage } from './pages/gasRegister/NotificationsPage';
import { DriversListPage } from './pages/gasRegister/DriversListPage';
import { DriverDetailPage } from './pages/gasRegister/DriverDetailPage';
import { EngineersListPage } from './pages/gasRegister/EngineersListPage';
import { EngineerDetailPage } from './pages/gasRegister/EngineerDetailPage';
import { FleetMovementListPage } from './pages/gasRegister/FleetMovementListPage';
import { FleetMovementCreatePage } from './pages/gasRegister/FleetMovementCreatePage';
import { FleetMovementDetailPage } from './pages/gasRegister/FleetMovementDetailPage';
import { ConnectionListPage } from './pages/gasRegister/ConnectionListPage';
import { ConnectionCreatePage } from './pages/gasRegister/ConnectionCreatePage';
import { ConnectionDetailPage } from './pages/gasRegister/ConnectionDetailPage';
import { MaintenanceListPage } from './pages/gasRegister/MaintenanceListPage';
import { MaintenanceCreatePage } from './pages/gasRegister/MaintenanceCreatePage';
import { MaintenanceDetailPage } from './pages/gasRegister/MaintenanceDetailPage';
import { TechnicalMasterDataPage } from './pages/gasRegister/TechnicalMasterDataPage';
import { GasTypesPage } from './pages/gasRegister/technical/GasTypesPage';
import { ProductTypesPage } from './pages/gasRegister/technical/ProductTypesPage';
import { UnitsPage } from './pages/gasRegister/technical/UnitsPage';
import { CertificatesPage } from './pages/gasRegister/technical/CertificatesPage';
import { CategoriesPage } from './pages/gasRegister/technical/CategoriesPage';
import { ExecutiveLandingPage } from './pages/dashboards/ExecutiveLandingPage';
import { AmcDashboardPage } from './pages/dashboards/AmcDashboardPage';
import { NocDashboardPage } from './pages/dashboards/NocDashboardPage';
import { CocDashboardPage } from './pages/dashboards/CocDashboardPage';
import { MaesDashboardPage } from './pages/dashboards/MaesDashboardPage';
import { GasCompaniesDashboardPage } from './pages/dashboards/GasCompaniesDashboardPage';
import { HoeDashboardPage } from './pages/dashboards/HoeDashboardPage';
import { PetroleumDashboardPage } from './pages/dashboards/PetroleumDashboardPage';
import { InspectionsDashboardPage } from './pages/dashboards/InspectionsDashboardPage';
// Compliance & Enforcement Module (Integrated Compliance, Violations,
// Enforcement and Escalation SDD).
import { ViolationsListPage } from './pages/compliance/ViolationsListPage';
import { ViolationDetailPage } from './pages/compliance/ViolationDetailPage';
import { VapCommitteePage } from './pages/compliance/VapCommitteePage';
import { VapMeetingDetailPage } from './pages/compliance/VapMeetingDetailPage';
import { VapMinutesPreviewPage } from './pages/compliance/VapMinutesPreviewPage';
import { ComplianceDashboardPage } from './pages/compliance/ComplianceDashboardPage';
// Mobile Inspection App simulator (Doc 2 SDD) + matching web review pages.
import { MobileApp } from './pages/mobile/MobileApp';
import { InspectionsListPage } from './pages/inspections/InspectionsListPage';
import { InspectionDetailPage } from './pages/inspections/InspectionDetailPage';

import { MasterDataPage } from './pages/admin/MasterDataPage';
import { ConfigurationPage } from './pages/admin/ConfigurationPage';
import { TemplateManagementPage } from './pages/admin/TemplateManagementPage';
import { TemplateBuilderPage } from './pages/admin/TemplateBuilderPage';
import { FormulaConfigurationPage } from './pages/admin/FormulaConfigurationPage';

function Protected({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Default landing — Ahmed Al Mazrouei (adnoc.dist.2) lands on Submissions;
// everyone else on the centralized PPS dashboard.
function PpsLanding() {
  const user = useAuth((s) => s.user);
  return <Navigate to={ppsLandingPath(user?.id)} replace />;
}

export default function App() {
  // Re-pull applications and notifications from localStorage on every mount,
  // so the Zustand store stays in sync after a seed-version bump (HMR can
  // refresh localStorage without re-evaluating the apps module).
  const refresh = useApps((s) => s.refresh);
  useEffect(() => { refresh(); }, [refresh]);

  // Keeps <html dir> + <html lang> in sync with the active locale.
  useDocumentDirection();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Mobile simulator — outside AppLayout because the device frame is
          its own full-screen chrome (no web nav around it). */}
      <Route
        path="/mobile/*"
        element={
          <Protected>
            <MobileApp />
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<PpsLanding />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="module/:module" element={<ModulePage />} />
        <Route path="module/:module/:action" element={<ApplicationListPage />} />
        <Route path="module/:module/:action/new" element={<ApplicationFormPage mode="create" />} />
        <Route path="app/:appId" element={<ApplicationDetailPage />} />
        <Route path="app/:appId/edit" element={<ApplicationFormPage mode="edit" />} />
        <Route path="app/:appId/preview" element={<ApplicationPreviewPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="buildings/:buildingId" element={<BuildingDetailPage />} />
        <Route path="pps/dashboard" element={<PpsDashboardPage />} />
        <Route path="pps/dashboard/:productId" element={<PpsDashboardPage />} />
        <Route path="pps/submissions" element={<PpsSubmissionsPage />} />
        <Route path="pps/submissions/:id" element={<PpsSubmissionDetailPage />} />
        <Route path="pps/submissions/:id/edit" element={<SubmissionFormPage />} />
        <Route path="pps/monitoring" element={<PpsMonitoringPage />} />
        <Route path="gas-register" element={<Navigate to="/gas-register/dashboard" replace />} />
        <Route path="gas-register/dashboard" element={<GasRegisterDashboardPage />} />
        <Route path="gas-register/assets" element={<AssetsListPage />} />
        <Route path="gas-register/assets/new" element={<AssetCreatePage />} />
        <Route path="gas-register/assets/:assetId" element={<AssetDetailPage />} />
        <Route path="gas-register/customers" element={<CustomersListPage />} />
        <Route path="gas-register/customers/new" element={<CustomerCreatePage />} />
        <Route path="gas-register/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="gas-register/suppliers" element={<SuppliersListPage />} />
        <Route path="gas-register/suppliers/new" element={<SupplierCreatePage />} />
        <Route path="gas-register/suppliers/:supplierId" element={<SupplierDetailPage />} />
        <Route path="gas-register/employees" element={<EmployeesListPage />} />
        <Route path="gas-register/employees/new" element={<EmployeeCreatePage />} />
        <Route path="gas-register/employees/:employeeId" element={<EmployeeDetailPage />} />
        <Route path="gas-register/fleet" element={<FleetListPage />} />
        <Route path="gas-register/fleet/new" element={<FleetCreatePage />} />
        <Route path="gas-register/fleet/:fleetId" element={<FleetDetailPage />} />
        <Route path="gas-register/inflow" element={<InflowListPage />} />
        <Route path="gas-register/inflow/new" element={<InflowCreatePage />} />
        <Route path="gas-register/inflow/:inflowId" element={<InflowDetailPage />} />
        <Route path="gas-register/outflow" element={<OutflowListPage />} />
        <Route path="gas-register/outflow/new" element={<OutflowCreatePage />} />
        <Route path="gas-register/outflow/:outflowId" element={<OutflowDetailPage />} />
        <Route path="gas-register/gas-flow/reports" element={<GasFlowReportsPage />} />
        {/* ── BN 6: Drivers ── */}
        <Route path="gas-register/drivers" element={<DriversListPage />} />
        <Route path="gas-register/drivers/:driverId" element={<DriverDetailPage />} />
        {/* ── BN 7: Engineers ── */}
        <Route path="gas-register/engineers" element={<EngineersListPage />} />
        <Route path="gas-register/engineers/:engineerId" element={<EngineerDetailPage />} />
        {/* ── BN 11: Fleet Movement ── */}
        <Route path="gas-register/fleet-movement" element={<FleetMovementListPage />} />
        <Route path="gas-register/fleet-movement/new" element={<FleetMovementCreatePage />} />
        <Route path="gas-register/fleet-movement/:movementId" element={<FleetMovementDetailPage />} />
        {/* ── BN 13: Connection & Disconnection ── */}
        <Route path="gas-register/connection" element={<ConnectionListPage />} />
        <Route path="gas-register/connection/new" element={<ConnectionCreatePage />} />
        <Route path="gas-register/connection/:eventId" element={<ConnectionDetailPage />} />
        {/* ── BN 15: Maintenance ── */}
        <Route path="gas-register/maintenance" element={<MaintenanceListPage />} />
        <Route path="gas-register/maintenance/new" element={<MaintenanceCreatePage />} />
        <Route path="gas-register/maintenance/:recordId" element={<MaintenanceDetailPage />} />
        {/* ── BN 12: Company Registration · Notifications & Reminders ── */}
        <Route path="gas-register/notifications" element={<GasRegisterNotificationsPage />} />
        {/* ── BN 8: Technical Master Data — index + 5 sub-sections ── */}
        <Route path="gas-register/technical-master-data" element={<TechnicalMasterDataPage />} />
        <Route path="gas-register/technical-master-data/gas-types" element={<GasTypesPage />} />
        <Route path="gas-register/technical-master-data/product-types" element={<ProductTypesPage />} />
        <Route path="gas-register/technical-master-data/units" element={<UnitsPage />} />
        <Route path="gas-register/technical-master-data/certificates" element={<CertificatesPage />} />
        <Route path="gas-register/technical-master-data/categories" element={<CategoriesPage />} />
        {/* ─── Compliance & Enforcement (Integrated Compliance, Violations,
             Enforcement and Escalation SDD) ─── */}
        <Route path="compliance" element={<Navigate to="/compliance/dashboard" replace />} />
        <Route path="compliance/dashboard" element={<ComplianceDashboardPage />} />
        <Route path="compliance/violations" element={<ViolationsListPage />} />
        <Route path="compliance/violations/:violationId" element={<ViolationDetailPage />} />
        <Route path="compliance/vap" element={<VapCommitteePage />} />
        <Route path="compliance/vap/:meetingId" element={<VapMeetingDetailPage />} />
        <Route path="compliance/vap/:meetingId/minutes" element={<VapMinutesPreviewPage />} />
        {/* ─── Mobile Inspection Submissions · web review (Doc 2 SDD §7) ─── */}
        <Route path="inspections" element={<InspectionsListPage />} />
        <Route path="inspections/:id" element={<InspectionDetailPage />} />
        {/* ─── Centralized PPS Dashboards (SDD §2 + §3) ─── */}
        <Route path="pps-dashboard" element={<ExecutiveLandingPage />} />
        <Route path="pps-dashboard/amc" element={<AmcDashboardPage />} />
        <Route path="pps-dashboard/noc" element={<NocDashboardPage />} />
        <Route path="pps-dashboard/coc" element={<CocDashboardPage />} />
        <Route path="pps-dashboard/maes" element={<MaesDashboardPage />} />
        <Route path="pps-dashboard/gas-companies" element={<GasCompaniesDashboardPage />} />
        <Route path="pps-dashboard/hoe" element={<HoeDashboardPage />} />
        <Route path="pps-dashboard/petroleum" element={<PetroleumDashboardPage />} />
        <Route path="pps-dashboard/inspections" element={<InspectionsDashboardPage />} />

        {/* ─── Admin Modules ─── */}
        <Route path="admin/master-data" element={<MasterDataPage />} />
        <Route path="admin/configuration" element={<ConfigurationPage />} />
        <Route path="admin/template-management" element={<TemplateManagementPage />} />
        <Route path="admin/template-management/:id/builder" element={<TemplateBuilderPage />} />
        <Route path="admin/formula-configuration" element={<FormulaConfigurationPage />} />
      </Route>
      <Route path="*" element={<PpsLanding />} />
    </Routes>
  );
}
