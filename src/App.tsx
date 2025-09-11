
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";

// Your Pages and Components
import Signin from "./components/custom/signin/Signin";
import Signup from "./components/custom/signup/Signup";
import OnboardingStep from "./components/custom/onboard/Onboarding";
import DashboardLayout from "./components/custom/dashboard/layout/DashboardLayout";


// Routing and State
import ProtectedRoute from "../src/routes/ProtectedRoute"; // Your role-based guard
import OnboardingGuard from "./routes/OnboardingGuard";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useAppSelector } from "./app/hooks";
import { menuRoutes, additionalProtectedRoutes, ROLES } from "./appRoutes";


const PrivateRoutes = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
};


const PublicRoutes = ({ isAuthenticated, redirectPath }: { isAuthenticated: boolean; redirectPath: string; }) => {
  return !isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};



function App() {

  useAuthBootstrap();
  const { user, bootstrapped } = useAppSelector((state) => state.auth);


  const isAuthenticated = !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);


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
  
        <Route element={<PublicRoutes isAuthenticated={isAuthenticated} redirectPath={defaultProtectedRoute} />}>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
        </Route>


        <Route element={<PrivateRoutes isAuthenticated={isAuthenticated} />}>
          <Route
            path="/onboarding"
            element={
              <OnboardingGuard>
                <OnboardingStep />
              </OnboardingGuard>
            }
          />

          <Route path="/main-menu" element={<DashboardLayout />}>

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
            

            <Route
              index
              element={<Navigate to={defaultProtectedRoute} replace />}
            />
          </Route>
        </Route>

   
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;