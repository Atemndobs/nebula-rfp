
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-geist-foreground dark:border-dark-geist-foreground border-t-transparent`}
        // Vercel often uses a subtle gray or the main text color for spinners.
        // Alternatively, use a brand accent: border-vercel-blue dark:border-vercel-blue
      ></div>
      {message && <p className="mt-3 text-xs text-geist-secondary dark:text-dark-geist-secondary">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;