
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div
        className={`animate-spin rounded-full border-t-4 border-b-4 border-emerald ${sizeClasses[size]}`}
      ></div>
      {message && <p className="text-charcoal-light dark:text-charcoal-light text-sm">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;