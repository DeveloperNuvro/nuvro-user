import { api } from './axios';

export type WorkflowTrigger = 'conversation_opened' | 'first_message';
export type WorkflowStepType =
  | 'send_message'
  | 'ask_question'
  | 'branch'
  | 'assign_to'
  | 'update_tag'
  | 'close_conversation'
  | 'open_conversation'
  | 'end';

export interface WorkflowBranch {
  value: string;
  nextStepId: string;
  labelKey?: string;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  nextStepId?: string;
  branches?: WorkflowBranch[];
  defaultNextStepId?: string;
  config?: { channelId?: string; channelName?: string; tags?: string[]; [key: string]: unknown };
}

export interface WorkflowStepTranslation {
  message?: string;
  options?: { value: string; label: string }[];
}

export interface WorkflowLanguageContent {
  steps: Record<string, WorkflowStepTranslation>;
}

export interface WorkflowBusinessHoursSchedule {
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface WorkflowBusinessHours {
  timezone: string;
  enabled: boolean;
  schedule: WorkflowBusinessHoursSchedule[];
}

export interface ConversationWorkflow {
  _id: string;
  businessId: string;
  agentId?: string;
  name: string;
  trigger: WorkflowTrigger;
  active: boolean;
  defaultLanguage: string;
  businessHours?: WorkflowBusinessHours;
  steps: WorkflowStep[];
  translations: Record<string, WorkflowLanguageContent>;
  createdAt?: string;
  updatedAt?: string;
}

export const listWorkflows = async (businessId: string, agentId?: string) => {
  const params = agentId ? { agentId } : {};
  const response = await api.get(`/api/v1/workflows/${businessId}`, { params });
  return response.data.data as ConversationWorkflow[];
};

export const getWorkflow = async (businessId: string, workflowId: string) => {
  const response = await api.get(`/api/v1/workflows/${businessId}/${workflowId}`);
  return response.data.data as ConversationWorkflow;
};

export const createWorkflow = async (
  businessId: string,
  data: {
    agentId: string;
    name: string;
    trigger: WorkflowTrigger;
    active?: boolean;
    defaultLanguage?: string;
    businessHours?: WorkflowBusinessHours;
    steps: WorkflowStep[];
    translations: Record<string, WorkflowLanguageContent>;
  }
) => {
  const response = await api.post(`/api/v1/workflows/${businessId}`, data);
  return response.data.data as ConversationWorkflow;
};

export const updateWorkflow = async (
  businessId: string,
  workflowId: string,
  data: Partial<{
    name: string;
    trigger: WorkflowTrigger;
    active: boolean;
    defaultLanguage: string;
    businessHours: WorkflowBusinessHours | null;
    steps: WorkflowStep[];
    translations: Record<string, WorkflowLanguageContent>;
  }>
) => {
  const response = await api.put(`/api/v1/workflows/${businessId}/${workflowId}`, data);
  return response.data.data as ConversationWorkflow;
};

export const updateWorkflowTranslations = async (
  businessId: string,
  workflowId: string,
  translations: Record<string, WorkflowLanguageContent>
) => {
  const response = await api.patch(
    `/api/v1/workflows/${businessId}/${workflowId}/translations`,
    { translations }
  );
  return response.data.data as ConversationWorkflow;
};

export const deleteWorkflow = async (businessId: string, workflowId: string) => {
  const response = await api.delete(`/api/v1/workflows/${businessId}/${workflowId}`);
  return response.data.data as { deleted: boolean };
};

/** Seed demo workflow for an agent. Body: { agentId }. Creates or updates. */
export const seedDemoWorkflow = async (businessId: string, agentId: string) => {
  const response = await api.post(`/api/v1/workflows/${businessId}/seed-demo`, { agentId });
  return response.data.data as { created?: boolean; updated?: boolean; workflowId: string };
};
