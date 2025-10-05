// contexts/TimerContext.jsx
import React, { createContext, useContext } from 'react';
import { useGlobalTimer } from '../hooks/useGlobalTimer';

const TimerContext = createContext(null);

export const TimerProvider = ({ children }) => {
  const timer = useGlobalTimer();
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};