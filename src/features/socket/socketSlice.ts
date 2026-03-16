import { createSlice } from '@reduxjs/toolkit';

export interface SocketState {
  /** Incremented each time the socket reconnects; used to trigger refetch (e.g. chat list) after reconnect */
  reconnectCount: number;
}

const initialState: SocketState = {
  reconnectCount: 0,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    socketReconnected: (state) => {
      state.reconnectCount += 1;
    },
  },
});

export const { socketReconnected } = socketSlice.actions;
export default socketSlice.reducer;
