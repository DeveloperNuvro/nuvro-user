import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import onboardingReducer from '../features/onboarding/onboardingSlice';
import trainModelReducer from '../features/aiModel/trainModelSlice';
import aiAgentReducer from '../features/aiAgent/aiAgentSlice';
import chatInboxReducer from '../features/chatInbox/chatInboxSlice';
import supportTicket from '../features/SupportTicket/supportTicketSlice';
import subscriptionReducer from '../features/subscription/subscriptionSlice';
import businessSlice from '../features/business/businessSlice';
import whatsappIntregation from '../features/whatsappIntregation/integrationsSlice';
import  AnalysisReport  from '../features/analysisReport/analysisReportSlice';
import overView from '../features/overview/overviewSlice';
import profileSlice from '../features/profile/profileSlice';
import humanAgent from '../features/humanAgent/humanAgentSlice';
import channel from '../features/channel/channelSlice';
import humanAgentInbox from '../features/humanAgent/humanAgentInboxSlice';
import agentTicket from '../features/SupportTicket/agentTicketSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    trainModel: trainModelReducer,
    aiAgent: aiAgentReducer,
    chatInbox: chatInboxReducer,
    tickets: supportTicket,
    subscription: subscriptionReducer,
    business: businessSlice,
    integrations: whatsappIntregation,
    analysisReport: AnalysisReport,
    overview: overView,
    profile: profileSlice,
    humanAgent: humanAgent,
    channel: channel,
    agentInbox: humanAgentInbox,
    agentTickets: agentTicket,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
