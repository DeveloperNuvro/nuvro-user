// Quick responses (snippets) API – slash commands in chat
import { api } from './axios';

export type QuickResponseSnippet = {
  _id: string;
  businessId: string | null;
  command: string;
  name: string;
  message: string;
  topics?: string[];
  files?: string[];
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SuggestItem = {
  id: string;
  scope: 'global' | 'business';
  command: string;
  name: string;
  message: string;
  topics: string[];
  priority: number;
  updatedAt?: string;
};

export const listQuickResponses = async (params?: {
  includeGlobal?: boolean;
  topic?: string;
}): Promise<QuickResponseSnippet[]> => {
  const response = await api.get('/api/v1/quick-responses', { params });
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

export const suggestQuickResponses = async (
  q: string,
  limit?: number
): Promise<SuggestItem[]> => {
  const response = await api.get('/api/v1/quick-responses/suggest', {
    params: { q: q || undefined, limit: limit ?? 15 },
  });
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

export const resolveQuickResponse = async (
  command: string
): Promise<QuickResponseSnippet | null> => {
  const response = await api.get(
    `/api/v1/quick-responses/resolve/${encodeURIComponent(command)}`
  );
  return response.data?.data ?? null;
};

export const createQuickResponse = async (body: {
  command: string;
  name: string;
  message: string;
  topics?: string[];
  files?: string[];
  priority?: number;
}): Promise<QuickResponseSnippet> => {
  const response = await api.post('/api/v1/quick-responses', body);
  return response.data?.data;
};

export const updateQuickResponse = async (
  id: string,
  body: Partial<{
    command: string;
    name: string;
    message: string;
    topics: string[];
    files: string[];
    priority: number;
  }>
): Promise<QuickResponseSnippet> => {
  const response = await api.patch(`/api/v1/quick-responses/${id}`, body);
  return response.data?.data;
};

export const deleteQuickResponse = async (
  id: string
): Promise<QuickResponseSnippet> => {
  const response = await api.delete(`/api/v1/quick-responses/${id}`);
  return response.data?.data;
};
