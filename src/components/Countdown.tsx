import React, { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const Countdown: React.FC = () => {
  const targetDate = new Date('2026-09-19T08:00:00').getTime();

  const calculateTimeLeft = (): TimeLeft => {
    const difference = targetDate - new Date().getTime();
    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4 select-none">
      {Object.entries(timeLeft).map(([label, value]) => (
        <div key={label} className="flex flex-col items-center">
          <div className="glass-panel px-4 py-2 sm:px-6 sm:py-3 rounded-lg border border-white/5 relative min-w-[70px] sm:min-w-[90px] flex items-center justify-center shadow-lg">
            {/* Top Gloss Flare */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Monospace Digits */}
            <span className="font-mono text-xl sm:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              {formatNumber(value)}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.2em] text-violet-400/70 mt-2">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};
