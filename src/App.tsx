// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Your Pages and Components
import Signin from "./components/custom/signin/Signin";
import Signup from "./components/custom/signup/Signup";
import ForgotPassword from "./components/custom/forgotPassword/ForgotPassword";
import ResetPassword from "./components/custom/resetPassword/ResetPassword";
import OnboardingStep from "./components/custom/onboard/Onboarding";
import DashboardLayout from "./components/custom/dashboard/layout/DashboardLayout";

// Routing and State
import AuthLayout from "./routes/AuthLayout";
import PublicLayout from "./routes/PublicLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import OnboardingGuard from "./routes/OnboardingGuard"; // Assuming this component exists
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useAppSelector } from "./app/hooks";
import { menuRoutes, additionalProtectedRoutes, ROLES } from "./appRoutes";

function App() {
  // This hook handles the initial session check (e.g., from localStorage)
  useAuthBootstrap();
  const { user, bootstrapped } = useAppSelector((state) => state.auth);

  // Show a loading screen until the initial auth state is determined
  if (!bootstrapped) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading session...
      </div>
    );
  }
  
  const defaultProtectedRoute = user?.role === ROLES.AGENT ? "/main-menu/agent/inbox" : "/main-menu/overview";

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Group 1: Public Routes */}
        {/* These are only accessible to unauthenticated users. */}
        {/* Authenticated users will be redirected to their dashboard. */}
        <Route element={<PublicLayout />}>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Group 2: Authenticated Routes */}
        {/* These are only accessible to authenticated users. */}
        {/* Unauthenticated users will be redirected to /signin. */}
        <Route element={<AuthLayout />}>
          <Route
            path="/onboarding"
            element={
              <OnboardingGuard>
                <OnboardingStep />
              </OnboardingGuard>
            }
          />

          {/* All routes within the main dashboard layout */}
          <Route path="/main-menu" element={<DashboardLayout />}>
            {/* Index route to redirect from /main-menu to the user's default page */}
            <Route
              index
              element={<Navigate to={defaultProtectedRoute} replace />}
            />

            {/* Render sidebar menu routes with role protection */}
            {menuRoutes.map(
              ({ path, component, allowedRoles, action }) =>
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

            {/* Render other protected routes with role protection */}
            {additionalProtectedRoutes.map(
              ({ path, component, allowedRoles }) => (
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
          </Route>
        </Route>

        {/* Fallback Route */}
        {/* If no other route matches, redirect to the root. */}
        {/* The root will then be handled by the layout guards. */}
        {/* e.g., an unauthenticated user at "/" will be sent to "/signin" */}
        {/* an authenticated user at "/" will be sent to their dashboard */}
        <Route path="/" element={<Navigate to={user ? defaultProtectedRoute : "/signin"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;