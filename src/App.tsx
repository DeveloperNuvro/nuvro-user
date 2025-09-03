import { useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

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


// TypeScript declaration for the global OneSignal object
declare global {
  interface Window {
    OneSignal: any; // Use `any` because OneSignal is dynamic
  }
}

function App() {
  useAuthBootstrap();
  const navigate = useNavigate();
  const { user, bootstrapped }: any = useAppSelector((state) => state.auth);

  const isAuthenticated =
    !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);

  const oneSignalInitStarted = useRef(false);

  // ✅ Effect for OneSignal Initialization
  useEffect(() => {
    if (oneSignalInitStarted.current) return;
    oneSignalInitStarted.current = true;

    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!oneSignalAppId) {
      console.error("VITE_ONESIGNAL_APP_ID is not set in your .env file.");
      return;
    }

    window.OneSignal = window.OneSignal || [];
    const OneSignal = window.OneSignal;

    OneSignal.push([
      "init",
      {
        appId: oneSignalAppId,
        allowLocalhostAsSecureOrigin: true,
      },
    ]);

    // Push a function to run after init
    OneSignal.push(() => {
      console.log("✅ OneSignal SDK Initialized and ready.");
      OneSignal.showSlidedownPrompt();

      OneSignal.on("notificationClick", (event: any) => {
        console.log("🔔 Notification clicked:", event);
        const conversationId =
          event.notification.additionalData?.conversationId;
        if (conversationId) {
          navigate(`/main-menu/inbox?conversationId=${conversationId}`);
        }
      });

    });
  }, [navigate]);

  // ✅ Effect for Managing the User's External ID
  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const OneSignal = window.OneSignal || [];

    if (isAuthenticated && user?._id) {
      console.log(`[OneSignal] Logging in with external ID: ${user._id}`);
      OneSignal.push(async () => {

        const perm = await OneSignal.getNotificationPermission?.();
        const playerId = await OneSignal.User?.PushSubscription?.getId?.();

        if (perm === 'granted' && playerId && user?._id) {
          await OneSignal.login(user._id);
          console.log("[OneSignal] External ID set after subscription.");
        } else {
          console.log("[OneSignal] Not subscribed yet; will try after prompt.");
        }

      });
    } else {
      OneSignal.push(() => {
        OneSignal.logout?.().catch((e: any) => console.error(e));
      });
    }
  }, [bootstrapped, isAuthenticated, user]);

  // Loader until session is bootstrapped
  if (!bootstrapped) {
    return (
      <div className= "flex items-center justify-center h-screen" >
      Loading session...
    </div>
    );
  }

  const defaultProtectedRoute =
    user?.role === ROLES.AGENT
      ? "/main-menu/agent/inbox"
      : "/main-menu/overview";

  return (
    <>
    <Toaster position= "top-right" richColors />
      <Routes>
      <Route path="/signin" element = {< Signin />} />
        < Route path = "/signup" element = {< Signup />} />
          < Route path = "/" element = {< Home />} />
            < Route element = {< AuthLayoutGuard />}>
              <Route
            path="/onboarding"
element = {
              < OnboardingGuard >
  <OnboardingStep />
  </OnboardingGuard>
            }
          />
  < Route path = "/main-menu" element = {< DashboardLayout />}>
    {
      menuRoutes.map(
        ({ path, component, allowedRoles, action }) =>
          !action && (
            <Route
                    key={ path }
                    path = { path }
                    element = {
                      < ProtectedRoute allowedRoles = { allowedRoles } >
      { component }
      </ProtectedRoute>
                    }
    />
                )
            )}
{
  additionalProtectedRoutes.map(
    ({ path, component, allowedRoles }) => (
      <Route
                  key= { path }
                  path = { path }
                  element = {
                    < ProtectedRoute allowedRoles = { allowedRoles } >
  { component }
  </ProtectedRoute>
                  }
                />
              )
            )}
<Route
              index
element = {< Navigate to = { defaultProtectedRoute } replace />}
            />
  </Route>
  </Route>
  < Route path = "*" element = {< Navigate to = "/" replace />} />
    </Routes>
    </>
  );
}

export default App;
