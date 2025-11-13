// ========================================================================
// START: FULL COPY-PASTE CODE FOR trainModelSlice.ts
// ========================================================================

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

// --- [UPDATE] Interfaces to match the new backend model ---

export interface TrainedFile {
  name: string;
  url: string;
}

// This interface now represents the structure of the `fields` object in dataSchema
export interface DataSchemaField {
  type: 'string' | 'number' | 'boolean' | 'date';
  description: string;
  semanticRole?: 'primary_datetime' | 'primary_date_part' | 'primary_time_part';
}

// This interface represents the new, rich dataSchema object
export interface DataSchema {
  description: string;
  fields: Record<string, DataSchemaField>; // Using Record for the Map-like structure
}

export interface AIModel {
  _id: string;
  name: string;
  business: string;
  modelType: 'GPT-3.5' | 'GPT-4' | 'gpt-4o';
  trainedFiles?: TrainedFile[]; // Made optional to handle cases where it might be undefined
  status: 'training' | 'deployed' | 'failed';
  fileIndexingStatus?: {
    fileName: string;
    status: string; // Using string for flexibility with backend enums
    errorMessage?: string;
  }[];
  dataSchema?: DataSchema; // Replaced entitySchemas with the new dataSchema
  sourceDataTimezone?: string; // Added the timezone field
  parameters?: Record<string, any>;
  chunkingStrategy?: {
    size: number;
    overlap: number;
    method: 'recursive' | 'semantic';
  };
  createdAt: string;
  updatedAt: string;
}

export interface TrainModelState {
  status: 'idle' | 'loading' | 'updating' | 'deleting' | 'succeeded' | 'failed';
  error: string | null;
  aiModels: AIModel[];
}

// --- [UPDATE] Payloads to include the new timezone field ---

interface TrainModelPayload {
  name: string;
  modelType: string;
  sourceDataTimezone: string; // Added timezone for creation
  files?: File[];
}

export interface UpdateAIModelPayload {
  id: string;
  name?: string;
  sourceDataTimezone?: string; // Added timezone for updates
  files?: File[];
  filesToDelete?: string[];
}

const initialState: TrainModelState = {
  status: 'idle',
  aiModels: [],
  error: null,
};

// --- [UPDATE] Async Thunks to send the new timezone field ---

export const trainModel = createAsyncThunk<AIModel, TrainModelPayload, { rejectValue: string }>(
  'trainModel/trainModel',
  async (payload, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('modelType', payload.modelType);
      formData.append('sourceDataTimezone', payload.sourceDataTimezone); // Append timezone

      if (payload.files?.length) {
        payload.files.forEach((file) => formData.append('files', file));
      }

      const res = await api.post('/api/v1/ai-model/create-and-train', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Training failed');
    }
  }
);

export const fetchAiModelsByBusinessId = createAsyncThunk<AIModel[], void, { rejectValue: string }>(
  'trainModel/fetchAiModelsByBusinessId',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/api/v1/ai-model/by-business');
      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch AI models');
    }
  }
);

export const updateAIModel = createAsyncThunk<AIModel, UpdateAIModelPayload, { rejectValue: string }>(
  'trainModel/updateAIModel',
  async (payload, thunkAPI) => {
    try {
      const { id, ...updateData } = payload;
      const formData = new FormData();

      if (updateData.name) {
        formData.append('name', updateData.name);
      }
      if (updateData.sourceDataTimezone) {
        formData.append('sourceDataTimezone', updateData.sourceDataTimezone); // Append timezone on update
      }
      if (updateData.files?.length) {
        updateData.files.forEach((file) => formData.append('files', file));
      }
      if (updateData.filesToDelete?.length) {
        formData.append('filesToDelete', JSON.stringify(updateData.filesToDelete));
      }

      const res = await api.put(`/api/v1/ai-model/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Model update failed');
    }
  }
);

export const deleteAIModel = createAsyncThunk<string, string, { rejectValue: string }>(
  'trainModel/deleteAIModel',
  async (modelId, thunkAPI) => {
    try {
      const response = await api.delete(`/api/v1/ai-model/delete/${modelId}`);
      // Backend returns { status: 'success', message: '...', data: null }
      // Check if the response indicates success
      if (response.data?.status === 'success' || response.status === 200) {
        return modelId;
      } else {
        return thunkAPI.rejectWithValue(response.data?.message || 'Model deletion failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Model deletion failed';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// --- [UNCHANGED] Slice and Reducers ---
const trainModelSlice = createSlice({
  name: 'trainModel',
  initialState,
  reducers: {
    resetTrainModelState(state) {
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(trainModel.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(trainModel.fulfilled, (state, action: PayloadAction<AIModel>) => { state.status = 'succeeded'; state.aiModels.push(action.payload); })
      .addCase(trainModel.rejected, (state, action: PayloadAction<any>) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(fetchAiModelsByBusinessId.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchAiModelsByBusinessId.fulfilled, (state, action) => { state.status = 'succeeded'; state.aiModels = action.payload; })
      .addCase(fetchAiModelsByBusinessId.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to load models'; })
      .addCase(updateAIModel.pending, (state) => { state.status = 'updating'; state.error = null; })
      .addCase(updateAIModel.fulfilled, (state, action: PayloadAction<AIModel>) => {
        state.status = 'succeeded';
        const index = state.aiModels.findIndex((model) => model._id === action.payload._id);
        if (index !== -1) { state.aiModels[index] = action.payload; }
      })
      .addCase(updateAIModel.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
      .addCase(deleteAIModel.pending, (state) => { state.status = 'deleting'; state.error = null; })
      .addCase(deleteAIModel.fulfilled, (state, action: PayloadAction<string>) => { state.status = 'succeeded'; state.aiModels = state.aiModels.filter((model) => model._id !== action.payload); })
      .addCase(deleteAIModel.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; });
  },
});

export const { resetTrainModelState } = trainModelSlice.actions;
export default trainModelSlice.reducer;

