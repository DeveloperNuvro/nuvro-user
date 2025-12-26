// src/App.tsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";

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
  const { i18n } = useTranslation();

  // 🔧 FIX: Sync i18n language with user's language preference when user is loaded
  useEffect(() => {
    if (!bootstrapped) {
      console.log('⏳ Waiting for bootstrap to complete...');
      return; // Wait for bootstrap to complete
    }
    
    const supportedLanguages = ['en', 'es', 'bn'];
    
    if (user?.language) {
      // User is logged in - prioritize user's language from database
      const userLang = user.language.toLowerCase().trim();
      console.log('👤 User language detected:', { userLang, currentI18n: i18n.language, userLanguage: user.language });
      
      if (supportedLanguages.includes(userLang)) {
        // Check if i18n language is different from user language
        const currentLang = i18n.language?.split('-')[0]?.toLowerCase(); // Handle 'en-US' -> 'en'
        
        if (currentLang !== userLang) {
          console.log('🔄 Syncing i18n with user language:', { currentLang, userLang, userLanguage: user.language });
          
          // 🔧 FIX: Update localStorage FIRST
          localStorage.setItem('i18nextLng', userLang);
          
          // 🔧 FIX: Change i18n language
          i18n.changeLanguage(userLang).then(() => {
            // 🔧 FIX: Force set i18n language to ensure it's applied
            i18n.language = userLang;
            console.log('✅ i18n language synced with user language:', { userLang, i18nLanguage: i18n.language });
          }).catch((error) => {
            console.error('❌ Failed to sync user language with i18n:', error);
          });
        } else {
          // Already in sync, but ensure localStorage matches
          const savedLang = localStorage.getItem('i18nextLng');
          if (savedLang !== userLang) {
            localStorage.setItem('i18nextLng', userLang);
            console.log('🔄 Updated localStorage to match user language:', userLang);
          }
        }
      } else {
        console.warn('⚠️ Unsupported user language:', userLang);
      }
    } else {
      // No user logged in - use localStorage if available
      const savedLang = localStorage.getItem('i18nextLng');
      console.log('👤 No user, checking localStorage:', { savedLang, currentI18n: i18n.language });
      if (savedLang && supportedLanguages.includes(savedLang)) {
        const currentLang = i18n.language?.split('-')[0]?.toLowerCase();
        if (currentLang !== savedLang) {
          console.log('🔄 Loading saved language from localStorage:', savedLang);
          i18n.changeLanguage(savedLang).then(() => {
            i18n.language = savedLang; // Force set
          }).catch((error) => {
            console.error('❌ Failed to load saved language:', error);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language, bootstrapped]); // Remove i18n from dependencies to avoid infinite loop

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

        {/* Root Route - Redirect based on auth status */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={user ? (user.role === ROLES.AGENT ? "/main-menu/agent/inbox" : "/main-menu/overview") : "/signin"} 
              replace 
            />
          } 
        />

        {/* Fallback Route */}
        {/* If no other route matches, redirect to signin */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </>
  );
}

export default App;