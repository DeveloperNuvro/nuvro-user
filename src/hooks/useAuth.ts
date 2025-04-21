import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  return { ...auth, dispatch };
};
