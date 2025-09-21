// components/TimerDisplay.jsx - Fixed to hide when expired
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const TimerDisplay = ({ 
  timeLeft, 
  formatTime, 
  phase = 'active', 
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const getTimerState = () => {
    if (phase === 'expired' || timeLeft <= 0) return 'expired';
    if (timeLeft <= 10) return 'critical';
    if (timeLeft <= 30) return 'warning';
    return 'normal';
  };

  const timerState = getTimerState();

  // Don't render anything when expired
  if (timerState === 'expired') {
    return null;
  }

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'px-3 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    normal: {
      container: 'px-4 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    large: {
      container: 'px-6 py-3',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  // Color configurations - simplified, consistent palette
  const stateColors = {
    normal: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    critical: 'bg-red-50 border-red-200 text-red-700'
  };

  const config = sizeConfig[size];

  return (
    <div className="flex justify-center">
      <div className={`
        flex items-center space-x-2 rounded-lg border-2 font-medium
        ${config.container} ${stateColors[timerState]} ${config.text}
      `}>
        {timerState === 'critical' ? (
          <AlertTriangle className={config.icon} />
        ) : (
          <Clock className={config.icon} />
        )}
        <span>
          {`${formatTime(timeLeft)} remaining`}
        </span>
      </div>
    </div>
  );
};

export default TimerDisplay;