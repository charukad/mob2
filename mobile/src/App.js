import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeAuth } from './store/slices/authSlice';

const App = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Initialize auth state from AsyncStorage
    dispatch(initializeAuth());
  }, [dispatch]);
  
  // ... rest of your App component ...
}; 