import { Routes, Route } from "react-router-dom";
import Signin from "./components/custom/signin/Signin";
import Signup from "./components/custom/signup/Signup";
import OnboardingStep from "./components/custom/onboard/Onboarding";
import DashboardLayout from "./components/custom/dashboard/layout/DashboardLayout";
import AiModelPage from "./pages/AiModelPage";
import TrainModelForm from "./components/custom/aiModel/TrainModel";
import AIAgent from "./components/custom/aiAgent/AiAgent";
import AiAgentPage from "./pages/AiAgentPage";
import CreateAiAgent from "./components/custom/aiAgent/CreateAiAgent";
import ComingSoon from "./components/custom/comingSoon/ComingSoon";
import Home from "./pages/Home";
import PrivateRoute from "./routes/PrivateRoutes";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useAppSelector } from "./app/hooks";
import OnboardingGuard from "./routes/OnboardingGuard";
import SingleAiAgent from "./pages/SingleAiAgent";
import ChatInbox from "./pages/ChatInbox";
import { Toaster } from 'sonner'
import CustomersPage from "./pages/AllCustomerPage";
import AllTicketPage from "./pages/AllTicketPage";


function App() {

  // useAuthBootstrap is a custom hook that refreshes the access token on app load
  useAuthBootstrap();
  const bootstrapped = useAppSelector(state => state.auth.bootstrapped);
  if (!bootstrapped) return <div className="text-center ">Loading session...</div>;

  return (
    <>
     <Toaster position="top-right" richColors />
    <Routes>
      {/* Public Routes */}
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={
          <OnboardingGuard>
            <OnboardingStep />
          </OnboardingGuard>
        } />

        <Route path="/main-menu" element={<DashboardLayout />}>
          <Route path="ai-model" element={<AiModelPage />} />
          <Route path="ai-model/train-model" element={<TrainModelForm />} />

          <Route path="overview" element={<ComingSoon />} />
          <Route path="inbox" element={<ChatInbox />} />
          <Route path="ticket" element={<AllTicketPage />} />

          <Route path="ai-agent" element={<AIAgent />} />
          <Route path="ai-agent/setup" element={<AiAgentPage />} />
          <Route path="ai-agent/create" element={<CreateAiAgent />} />
          <Route path="ai-agent/:id" element={<SingleAiAgent />} />


          <Route path="customers" element={<CustomersPage />} />
          <Route path="analytics" element={<ComingSoon />} />
          <Route path="plan" element={<ComingSoon />} />
          <Route path="help" element={<ComingSoon />} />
          <Route path="settings" element={<ComingSoon />} />
          <Route path="logout" element={<ComingSoon />} />
        </Route>
      </Route>
    </Routes>
    
    </>
  );
}

export default App;
