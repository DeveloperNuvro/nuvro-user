// utils/setStore.ts
import { AppDispatch, RootState } from '@/app/store';

let dispatch: AppDispatch;
let getStateFn: () => RootState;

export const setDispatch = (d: AppDispatch, getState: () => RootState) => {
  dispatch = d;
  getStateFn = getState;
};

export const getDispatch = () => dispatch;
export const getState = () => getStateFn();
