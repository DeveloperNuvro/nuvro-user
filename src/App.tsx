import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from 'sonner';

// Your Pages and Components
import Signin from "./components/custom/signin/Signin";
import Signup from "./components/custom/signup/Signup";
import OnboardingStep from "./components/custom/onboard/Onboarding";
import DashboardLayout from "./components/custom/dashboard/layout/DashboardLayout";
import Home from "./pages/Home";

// Routing and State
import ProtectedRoute from "../src/routes/ProtectedRoute";
import AuthLayoutGuard from "./routes/AuthLayoutGuard"; 
import OnboardingGuard from "./routes/OnboardingGuard";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useAppSelector } from "./app/hooks";
import { menuRoutes, additionalProtectedRoutes, ROLES } from "./appRoutes";

function App() {
  useAuthBootstrap();
  const bootstrapped = useAppSelector(state => state.auth.bootstrapped);
  const user = useAppSelector(state => state.auth.user);

  if (!bootstrapped) {
    return <div className="flex items-center justify-center h-screen">Loading session...</div>;
  }
  
  const defaultProtectedRoute = user?.role === ROLES.AGENT ? "/main-menu/agent/inbox" : "/main-menu/overview";

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* ======================================== */}
        {/* PUBLIC ROUTES */}
        {/* ======================================== */}
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Home />} />

        {/* ======================================== */}
        {/* PROTECTED ROUTES WRAPPER */}
        {/* ======================================== */}
        <Route element={<AuthLayoutGuard />}>
          {/* All routes inside here are guaranteed to have an authenticated user */}
          
          <Route
            path="/onboarding"
            element={
              <OnboardingGuard>
                <OnboardingStep />
              </OnboardingGuard>
            }
          />

          <Route path="/main-menu" element={<DashboardLayout />}>
            {/* Now we add role-based protection for each specific page */}
            {menuRoutes.map(({ path, component, allowedRoles, action }) =>
              !action && (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute allowedRoles={allowedRoles}>
                      {component}
                    </ProtectedRoute>
                  }
                />
              )
            )}

            {additionalProtectedRoutes.map(({ path, component, allowedRoles }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute allowedRoles={allowedRoles}>
                    {component}
                  </ProtectedRoute>
                }
              />
            ))}
            
            <Route index element={<Navigate to={defaultProtectedRoute} replace />} />
          </Route>
        </Route>

        {/* Fallback for any other route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;