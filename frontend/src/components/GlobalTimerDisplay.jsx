// components/GlobalTimerDisplay.jsx
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const GlobalTimerDisplay = ({ timeLeft, formatTime, phase }) => {
  if (!timeLeft || timeLeft <= 0 || phase === 'expired' || phase === 'stopped') return null;

  const getTimerState = () => {
    if (timeLeft <= 10) return 'critical';
    if (timeLeft <= 30) return 'warning';
    return 'normal';
  };

  const timerState = getTimerState();

  const stateStyles = {
    normal: {
      bg: 'bg-blue-50/90',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: Clock
    },
    warning: {
      bg: 'bg-amber-50/90',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: Clock
    },
    critical: {
      bg: 'bg-red-50/90',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: AlertTriangle,
      animate: 'animate-pulse'
    }
  };

  const style = stateStyles[timerState];
  const IconComponent = style.icon;

  return (
    <div className={`
      ${style.bg} ${style.border} ${style.text} ${style.animate || ''}
      backdrop-blur-sm rounded-xl border-2 px-5 py-3 
      flex items-center space-x-3 shadow-lg
    `}>
      <IconComponent className="w-5 h-5" />
      <span className="font-bold text-xl">
        {formatTime(timeLeft)}
      </span>
    </div>
  );
};

export default GlobalTimerDisplay;