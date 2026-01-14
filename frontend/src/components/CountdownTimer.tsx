import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiryTimestamp: number; // Unix timestamp in seconds
}

export function CountdownTimer({ expiryTimestamp }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, expiryTimestamp - now);
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiryTimestamp]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = (): string => {
    if (timeRemaining === 0) return 'text-red-600';
    if (timeRemaining <= 30) return 'text-orange-600';
    return 'text-teal-700';
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600 mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Remaining
        </p>
        <p className={`text-4xl font-bold tabular-nums ${getColorClass()} transition-colors duration-300`}>
          {formatTime(timeRemaining)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {timeRemaining === 0 ? 'Expired' : `${timeRemaining} seconds`}
        </p>
      </div>
    </div>
  );
}
