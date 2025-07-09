import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

// --- INTERFACES (UPDATED) ---

// A specific interface for a single trained file object
export interface TrainedFile {
  name: string;
  url: string;
}

// The main AIModel interface, now matching the backend schema
export interface AIModel {
  _id: string;
  name:string;
  business: string; // Typically the business ID
  modelType: 'GPT-3.5' | 'GPT-4';
  trainedFiles: TrainedFile[]; // <-- THIS IS THE KEY CHANGE
  status: 'training' | 'deployed' | 'failed';
  fileIndexingStatus: {
    fileName: string;
    status: 'pending' | 'processing' | 'indexed' | 'failed';
    errorMessage?: string;
  }[];
  parameters: Record<string, any>;
  chunkingStrategy: {
    size: number;
    overlap: number;
    method: 'recursive' | 'semantic';
  };
  createdAt: string; // Dates are typically strings after JSON serialization
  updatedAt: string;
}

export interface TrainModelState {
  // Added more specific statuses for better UI feedback
  status: 'idle' | 'loading' | 'updating' | 'deleting' | 'succeeded' | 'failed';
  error: string | null;
  aiModels: AIModel[];
}

// Payload for creating a model
interface TrainModelPayload {
  name: string;
  modelType: string;
  files?: File[];
}

// Payload for updating a model (this remains correct)
export interface UpdateAIModelPayload {
  id: string;
  name?: string;
  files?: File[];
  filesToDelete?: string[];
}


// --- INITIAL STATE ---

const initialState: TrainModelState = {
  status: 'idle',
  aiModels: [],
  error: null,
};


// --- ASYNC THUNKS ---

// Thunk for CREATING a model
export const trainModel = createAsyncThunk<
  AIModel, 
  TrainModelPayload,
  { rejectValue: string }
>('trainModel/trainModel', async (payload, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('modelType', payload.modelType);

    if (payload.files?.length) {
      payload.files.forEach((file) => formData.append('files', file));
    }

    const res = await api.post('/api/v1/ai-model/create-and-train', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.data; // Return the model from the `data` property
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Training failed');
  }
});

// Thunk for FETCHING all models
export const fetchAiModelsByBusinessId = createAsyncThunk<
  AIModel[], // Expects an array of the updated AIModel interface
  void,
  { rejectValue: string }
>('trainModel/fetchAiModelsByBusinessId', async (_, thunkAPI) => {
  try {
    const res = await api.get('/api/v1/ai-model/by-business');
    return res.data.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch AI models');
  }
});

// Thunk for UPDATING a model
export const updateAIModel = createAsyncThunk<
  AIModel, // Expects the updated AIModel object on success
  UpdateAIModelPayload,
  { rejectValue: string }
>('trainModel/updateAIModel', async (payload, thunkAPI) => {
  try {
    const { id, ...updateData } = payload;
    const formData = new FormData();

    if (updateData.name) {
      formData.append('name', updateData.name);
    }
  
    if (updateData.files?.length) {
      updateData.files.forEach((file) => formData.append('files', file));
    }

    // This part is critical and remains correct
    if (updateData.filesToDelete?.length) {
      formData.append('filesToDelete', JSON.stringify(updateData.filesToDelete));
    }
    
    // Safeguard in the UI is better, but this check doesn't hurt.
    if (!formData.has('name') && !formData.has('files') && !formData.has('filesToDelete')) {
      return thunkAPI.rejectWithValue('No changes to submit.');
    }

    const res = await api.put(`/api/v1/ai-model/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return res.data.data; // The backend returns the full, updated model object
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Model update failed');
  }
});

// Thunk for DELETING a model
export const deleteAIModel = createAsyncThunk<
  string, // Returns the ID of the deleted model on success
  string, // Takes the model ID (string) as input
  { rejectValue: string }
>('trainModel/deleteAIModel', async (modelId, thunkAPI) => {
  try {
    await api.delete(`/api/v1/ai-model/delete/${modelId}`);
    return modelId; // Return the ID for easy removal from state
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Model deletion failed');
  }
});


// --- SLICE DEFINITION ---

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
      // Case: Create Model
      .addCase(trainModel.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(trainModel.fulfilled, (state, action: PayloadAction<AIModel>) => {
        state.status = 'succeeded';
        state.aiModels.push(action.payload); // Add the new model object
      })
      .addCase(trainModel.rejected, (state, action: PayloadAction<any>) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Case: Fetch Models
      .addCase(fetchAiModelsByBusinessId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAiModelsByBusinessId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.aiModels = action.payload; // Replace with the fetched list
      })
      .addCase(fetchAiModelsByBusinessId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load models';
      })

      // Case: Update Model
      .addCase(updateAIModel.pending, (state) => {
        // Use a more specific status for better UI feedback
        state.status = 'updating';
        state.error = null;
      })
      .addCase(updateAIModel.fulfilled, (state, action: PayloadAction<AIModel>) => {
        state.status = 'succeeded';
        const index = state.aiModels.findIndex((model) => model._id === action.payload._id);
        if (index !== -1) {
          state.aiModels[index] = action.payload; // Replace the old model with the updated one
        }
      })
      .addCase(updateAIModel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Case: Delete Model
      .addCase(deleteAIModel.pending, (state) => {
        // Use a more specific status
        state.status = 'deleting';
        state.error = null;
      })
      .addCase(deleteAIModel.fulfilled, (state, action: PayloadAction<string>) => {
        state.status = 'succeeded';
        state.aiModels = state.aiModels.filter((model) => model._id !== action.payload);
      })
      .addCase(deleteAIModel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetTrainModelState } = trainModelSlice.actions;
export default trainModelSlice.reducer;