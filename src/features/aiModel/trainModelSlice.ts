// src/features/trainModel/trainModelSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';


export interface AIModel {
    _id: string;
    name: string;
    modelType: string;
    trainedFiles: string[];
    status: string;
    
  }

export interface TrainModelState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  aiModels: AIModel[];
}

const initialState: TrainModelState = {
  status: 'idle',
  aiModels: [],
  error: null,
};

interface TrainModelPayload {
  name: string;
  modelType: string;
//   trainingData?: string;
  files?: File[];
}

// ✅ Thunk for training model
export const trainModel = createAsyncThunk(
  'trainModel/trainModel',
  async (payload: TrainModelPayload, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('modelType', payload.modelType);

    //   if (payload.trainingData) {
    //     formData.append('trainingData', payload.trainingData);
    //   }

      if (payload.files?.length) {
        payload.files.forEach((file) => formData.append('files', file));
      }

      const res = await api.post('/api/v1/ai-model/create-and-train', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data; // return model data if needed
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Training failed');
    }
  }
);

// src/features/trainModel/trainModelSlice.ts

export const fetchAiModelsByBusinessId = createAsyncThunk<
  AIModel[],
  void,
  { rejectValue: string }
>('trainModel/fetchAiModelsByBusinessId', async (_, thunkAPI) => {
  try {
    const res = await api.get('/api/v1/ai-model/by-business'); // protected route
    return res.data.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch AI models');
  }
});


// ✅ Slice
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

       // 🔄 Train model
      .addCase(trainModel.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(trainModel.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(trainModel.rejected, (state, action: PayloadAction<any>) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // 📥 Fetch models
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
      });

      
  },
});

export const { resetTrainModelState } = trainModelSlice.actions;
export default trainModelSlice.reducer;
