// hooks/useGlobalTimer.js - Rebuilt for reliability and consistency
import { useState, useRef, useCallback, useEffect } from 'react';

export const useGlobalTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState('waiting');
  const [isActive, setIsActive] = useState(false);
  
  const timerRef = useRef(null);
  const configRef = useRef(null);
  const phaseRef = useRef('waiting');
  const isProcessingRef = useRef(false);

  // Keep phase ref in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Format time helper
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Clear any existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    isProcessingRef.current = false;
  }, []);

  // Handle phase transition
  const transitionPhase = useCallback((newPhase, newTime = 0) => {
    if (isProcessingRef.current) {
      console.log('Phase transition already in progress, skipping');
      return;
    }

    console.log(`Timer: transitioning from ${phaseRef.current} to ${newPhase}`);
    isProcessingRef.current = true;

    setPhase(newPhase);
    setTimeLeft(newTime);

    // Call phase change callback
    if (configRef.current?.onPhaseChange) {
      try {
        configRef.current.onPhaseChange(newPhase);
      } catch (error) {
        console.error('Error in phase change callback:', error);
      }
    }

    // Call specific callbacks based on phase
    if (newPhase === 'responding' && configRef.current?.onThinkingComplete) {
      try {
        configRef.current.onThinkingComplete();
      } catch (error) {
        console.error('Error in thinking complete callback:', error);
      }
    } else if (newPhase === 'expired' && configRef.current?.onTimeExpired) {
      try {
        configRef.current.onTimeExpired();
      } catch (error) {
        console.error('Error in time expired callback:', error);
      }
    }

    // Allow new phase transitions after a brief delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  }, []);

  // Start the timer with configuration
  const startTimer = useCallback((config) => {
    console.log('Starting timer with config:', config);
    
    // Validate config
    if (!config || ((!config.thinkTime || config.thinkTime <= 0) && (!config.responseTime || config.responseTime <= 0))) {
      console.error('Invalid timer configuration');
      return;
    }
    
    // Always clear existing timer first
    clearTimer();
    
    // Store configuration
    configRef.current = config;
    isProcessingRef.current = false;
    
    // Determine starting phase and time
    let startPhase, startTime;
    if (config.thinkTime && config.thinkTime > 0) {
      startPhase = 'thinking';
      startTime = config.thinkTime;
    } else {
      startPhase = 'responding';
      startTime = config.responseTime;
    }
    
    // Set initial state
    transitionPhase(startPhase, startTime);
    setIsActive(true);
    
    // Start the countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        
        if (newTime <= 0) {
          // Handle timer expiry based on current phase
          const currentPhase = phaseRef.current;
          console.log('Timer expired in phase:', currentPhase);
          
          if (currentPhase === 'thinking' && configRef.current?.responseTime > 0) {
            // Transition from thinking to responding
            console.log('Transitioning from thinking to responding');
            transitionPhase('responding', configRef.current.responseTime);
            return configRef.current.responseTime;
          } else if (currentPhase === 'responding') {
            // Timer expired in responding phase
            console.log('Timer expired in responding phase');
            clearInterval(timerRef.current);
            timerRef.current = null;
            setIsActive(false);
            transitionPhase('expired', 0);
            return 0;
          }
        }
        
        return newTime;
      });
    }, 1000);
  }, [clearTimer, transitionPhase]);

  // Skip thinking phase
  const skipThinking = useCallback(() => {
    console.log('Skipping thinking phase');
    if (phaseRef.current === 'thinking' && configRef.current?.responseTime > 0) {
      transitionPhase('responding', configRef.current.responseTime);
    }
  }, [transitionPhase]);

  // Stop timer (for manual submissions)
  const stopTimer = useCallback(() => {
    console.log('Stopping timer manually');
    clearTimer();
    if (phaseRef.current !== 'stopped' && phaseRef.current !== 'expired') {
      transitionPhase('stopped', 0);
    }
  }, [clearTimer, transitionPhase]);

  // Reset timer
  const resetTimer = useCallback(() => {
    console.log('Resetting timer');
    clearTimer();
    setPhase('waiting');
    setTimeLeft(0);
    configRef.current = null;
    phaseRef.current = 'waiting';
  }, [clearTimer]);

  // Backward compatibility functions
  const start = useCallback((thinkTime, responseTime, onThinkingComplete, onTimeExpired) => {
    startTimer({
      thinkTime,
      responseTime,
      onThinkingComplete,
      onTimeExpired
    });
  }, [startTimer]);

  const stop = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    // State
    timeLeft,
    phase,
    isActive,
    formatTime,
    
    // Actions
    startTimer,
    stopTimer,
    resetTimer,
    skipThinking,
    
    // Backward compatibility
    start,
    stop
  };
};

// For backward compatibility
export const useAudioRecordingTimer = useGlobalTimer;