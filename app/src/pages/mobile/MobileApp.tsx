import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MobileShell } from '../../components/mobile/MobileShell';
import { useAuth } from '../../store/auth';
import { SplashScreen } from './SplashScreen';
import { MobileSignInScreen } from './SignInScreen';
import { HomeScreen } from './HomeScreen';
import { MapScreen } from './MapScreen';
import { BuildingScreen } from './BuildingScreen';
import { InspectionWizard } from './InspectionWizard';
import { HistoryScreen } from './HistoryScreen';
import { MeScreen } from './MeScreen';
import { RouteScreen } from './RouteScreen';

// ============================================================================
// MobileApp — root of the mobile simulator. Everything under /mobile/* is
// rendered inside the MobileShell, which wraps content in a device frame.
//
// Auth note: the inspector role must be signed in for the mobile flows to
// behave correctly. If a non-inspector user is on the web side, we still
// allow them into the simulator but the sign-in screen lets them switch.
// ============================================================================

export function MobileApp() {
  const user = useAuth((s) => s.user);
  const location = useLocation();

  // Inspector / senior / section head / regulation / director have full access.
  // Anyone else is redirected to the in-simulator sign-in to pick a role.
  const inspectorRoles = ['inspector', 'senior_inspector', 'section_head', 'regulation_team', 'director'];
  const isAuthed = !!user && inspectorRoles.includes(user.role);

  return (
    <MobileShell>
      <Routes>
        {/* Cold-start always lands on the splash so the brand intro plays */}
        <Route index element={<SplashScreen />} />
        <Route path="splash"               element={<SplashScreen />} />
        <Route path="signin"               element={<MobileSignInScreen />} />
        <Route path="home"                 element={isAuthed ? <HomeScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="map"                  element={isAuthed ? <MapScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="route"                element={isAuthed ? <RouteScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="history"              element={isAuthed ? <HistoryScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="me"                   element={isAuthed ? <MeScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="building/:id"         element={isAuthed ? <BuildingScreen /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="inspection/:id/*"     element={isAuthed ? <InspectionWizard /> : <Navigate to="/mobile/signin" replace />} />
        <Route path="*" element={<Navigate to="/mobile" replace />} />
      </Routes>
    </MobileShell>
  );
}
