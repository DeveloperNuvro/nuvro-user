// src/appRoutes.ts

import React from "react";
// Icons
import { FiGrid, FiUsers, FiTrendingUp } from "react-icons/fi";
import { GoInbox } from "react-icons/go";
import { LuTicket } from "react-icons/lu";
import { SiProbot } from "react-icons/si";
import { TbBoxModel2 } from "react-icons/tb";
import { MdOutlinePayment } from "react-icons/md";
import { IoSettingsOutline, IoLogOut } from "react-icons/io5";
// Import all necessary page components from your project
import DashboardOverviewPage from "./pages/OverviewPage";
import ChatInbox from "./pages/ChatInbox";
import AgentInbox from "./pages/AgentInbox";
import ChannelPage from "./pages/ChannelPage";
import HumanAgentPage from "./pages/HumanAgentPage";
import AllTicketPage from "./pages/AllTicketPage";
import AiModelPage from "./pages/AiModelPage";
import AiAgentPage from "./pages/AiAgentPage";
import CustomersPage from "./pages/AllCustomerPage";
import AnalysisPage from "./pages/AnalysisPage";
import ReportingPage from "./pages/ReportingPage";
import { PricingPage } from "./pages/PricingPage";
import AccountSettingsPage from "./pages/AccountSettingPage";
import TrainModelForm from "./components/custom/aiModel/TrainModel";
import UpdateAIModelForm from "./components/custom/aiModel/UpdateAIModelForm";
import CreateAiAgent from "./components/custom/aiAgent/CreateAiAgent";
import SingleAiAgent from "./pages/SingleAiAgent";
import { BillingManagement } from "./pages/BillingManagement";
import ComingSoon from "./components/custom/comingSoon/ComingSoon";
import WorkflowPage from "./pages/WorkflowPage";

// Define roles for consistency
export const ROLES = {
  BUSINESS: 'business',
  AGENT: 'agent',
};

// Interface for routes that appear in the sidebar menu
export interface MenuRoute {
  path: string; // PATH IS NOW RELATIVE (e.g., "overview", NOT "/main-menu/overview")
  component: React.ReactElement;
  label: string;
  icon: React.ReactElement;
  allowedRoles: string[];
  section: "Main Menu" | "Business" | "Account";
  action?: 'logout';
}

// Interface for protected routes that DO NOT appear in the menu
interface AdditionalRoute {
    path: string; // PATH IS NOW RELATIVE
    component: React.ReactElement;
    allowedRoles: string[];
}

// Routes that will be used to build the sidebar menu
export const menuRoutes: MenuRoute[] = [
  // --- Business & Admin Menu ---
  { path: "overview", component: <DashboardOverviewPage />, label: "Overview", icon: <FiGrid className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "inbox", component: <ChatInbox />, label: "Inbox", icon: <GoInbox className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "channel", component: <ChannelPage />, label: "Channel", icon: <GoInbox className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "human-agent", component: <HumanAgentPage />, label: "Human Agent", icon: <FiUsers className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "ticket", component: <AllTicketPage /> , label: "Ticket", icon: <LuTicket className="mr-2" />, allowedRoles: [ROLES.BUSINESS, ROLES.AGENT], section: "Main Menu" },
  { path: "ai-model", component: <AiModelPage />, label: "AI Model", icon: <TbBoxModel2 className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "ai-agent/setup", component: <AiAgentPage />, label: "AI Agent", icon: <SiProbot className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Main Menu" },
  { path: "customers", component: <CustomersPage />, label: "Customers", icon: <FiUsers className="mr-2" />, allowedRoles: [ROLES.BUSINESS, ROLES.AGENT], section: "Business" },
  { path: "analytics", component: <AnalysisPage />, label: "Analytics", icon: <FiTrendingUp className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Business" },
  { path: "reporting", component: <ReportingPage />, label: "Reporting", icon: <FiTrendingUp className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Business" },
  { path: "pricing", component: <PricingPage />, label: "Plan & Payment", icon: <MdOutlinePayment className="mr-2" />, allowedRoles: [ROLES.BUSINESS], section: "Account" },

  // --- Agent Menu ---
  { path: "agent/inbox", component: <AgentInbox />, label: "Inbox", icon: <GoInbox className="mr-2" />, allowedRoles: [ROLES.AGENT], section: "Main Menu" },

  // --- Shared Menu ---
  { path: "settings", component: <AccountSettingsPage />, label: "Settings", icon: <IoSettingsOutline className="mr-2" />, allowedRoles: [ROLES.BUSINESS, ROLES.AGENT], section: "Account" },
  { path: "logout", component: <></>, label: "Log Out", icon: <IoLogOut className="mr-2" />, allowedRoles: [ROLES.BUSINESS, ROLES.AGENT], section: "Account", action: "logout" },
];

// Additional protected routes that are not in the sidebar
export const additionalProtectedRoutes: AdditionalRoute[] = [
    { path: "ai-model/train-model", component: <TrainModelForm />, allowedRoles: [ROLES.BUSINESS] },
    { path: "ai-model/update/:id", component: <UpdateAIModelForm />, allowedRoles: [ROLES.BUSINESS] },
    { path: "ai-agent/create", component: <CreateAiAgent />, allowedRoles: [ROLES.BUSINESS] },
    { path: "ai-agent/:id", component: <SingleAiAgent />, allowedRoles: [ROLES.BUSINESS] },
    { path: "workflows", component: <WorkflowPage />, allowedRoles: [ROLES.BUSINESS] },
    { path: "billing", component: <BillingManagement />, allowedRoles: [ROLES.BUSINESS] },
    { path: "help", component: <ComingSoon />, allowedRoles: [ROLES.BUSINESS, ROLES.AGENT] },
];