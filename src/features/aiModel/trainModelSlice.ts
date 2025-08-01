import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export interface TrainedFile {
  name: string;
  url: string;
}

export interface AttributeSchema {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
}

export interface EntitySchemaDefinition {
  description: string;
  attributes: AttributeSchema[];
}


export interface AIModel {
  _id: string;
  name: string;
  business: string;
  modelType: 'GPT-3.5' | 'GPT-4';
  trainedFiles: TrainedFile[];
  status: 'training' | 'deployed' | 'failed';
  fileIndexingStatus: {
    fileName: string;
    status: 'pending' | 'processing' | 'indexed' | 'failed';
    errorMessage?: string;
  }[];
  entitySchemas: Record<string, EntitySchemaDefinition>;
  parameters: Record<string, any>;
  chunkingStrategy: {
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

// Payload for creating a model
interface TrainModelPayload {
  name: string;
  modelType: string;
  files?: File[];
  entitySchemas?: Record<string, EntitySchemaDefinition>;
}


export interface UpdateAIModelPayload {
  id: string;
  name?: string;
  files?: File[];
  filesToDelete?: string[];
}




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
    
    console.log(payload)

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
});

export const fetchAiModelsByBusinessId = createAsyncThunk<
  AIModel[], 
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


export const updateAIModel = createAsyncThunk<
  AIModel, 
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

    
    if (updateData.filesToDelete?.length) {
      formData.append('filesToDelete', JSON.stringify(updateData.filesToDelete));
    }

    
    if (!formData.has('name') && !formData.has('files') && !formData.has('filesToDelete')) {
      return thunkAPI.rejectWithValue('No changes to submit.');
    }

    const res = await api.put(`/api/v1/ai-model/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.data; 
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Model update failed');
  }
});


export const deleteAIModel = createAsyncThunk<
  string, 
  string, 
  { rejectValue: string }
>('trainModel/deleteAIModel', async (modelId, thunkAPI) => {
  try {
    await api.delete(`/api/v1/ai-model/delete/${modelId}`);
    return modelId; 
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Model deletion failed');
  }
});


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
      
      .addCase(trainModel.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(trainModel.fulfilled, (state, action: PayloadAction<AIModel>) => {
        state.status = 'succeeded';
        state.aiModels.push(action.payload); 
      })
      .addCase(trainModel.rejected, (state, action: PayloadAction<any>) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      
      .addCase(fetchAiModelsByBusinessId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAiModelsByBusinessId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.aiModels = action.payload; 
      })
      .addCase(fetchAiModelsByBusinessId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load models';
      })

      
      .addCase(updateAIModel.pending, (state) => {
      
        state.status = 'updating';
        state.error = null;
      })
      .addCase(updateAIModel.fulfilled, (state, action: PayloadAction<AIModel>) => {
        state.status = 'succeeded';
        const index = state.aiModels.findIndex((model) => model._id === action.payload._id);
        if (index !== -1) {
          state.aiModels[index] = action.payload; 
        }
      })
      .addCase(updateAIModel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

    
      .addCase(deleteAIModel.pending, (state) => {
     
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