
import React from 'react';
import type { ToastMessage } from '../types';

// Simple SVG Icons for Toasts
const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ExclamationCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const InformationCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

interface ToastProps extends ToastMessage {
  onDismiss: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const baseStyle = "max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden";
  
  const typeSpecificStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-800',
      text: 'text-green-700 dark:text-green-200',
      border: 'border-green-400 dark:border-green-600',
      iconColor: 'text-green-500 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-700',
      focusRing: 'focus:ring-green-600 dark:focus:ring-green-500 focus:ring-offset-green-50 dark:focus:ring-offset-green-800'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-800',
      text: 'text-red-700 dark:text-red-200',
      border: 'border-red-400 dark:border-red-600',
      iconColor: 'text-red-500 dark:text-red-400',
      hoverBg: 'hover:bg-red-100 dark:hover:bg-red-700',
      focusRing: 'focus:ring-red-600 dark:focus:ring-red-500 focus:ring-offset-red-50 dark:focus:ring-offset-red-800'
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-800',
      text: 'text-sky-700 dark:text-sky-200',
      border: 'border-sky-400 dark:border-sky-600',
      iconColor: 'text-sky-500 dark:text-sky-400',
      hoverBg: 'hover:bg-sky-100 dark:hover:bg-sky-700',
      focusRing: 'focus:ring-sky-600 dark:focus:ring-sky-500 focus:ring-offset-sky-50 dark:focus:ring-offset-sky-800'
    },
  };

  const styles = typeSpecificStyles[type];

  return (
    <div className={`${baseStyle} ${styles.bg} ${styles.border} border-l-4`} role="alert">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {type === 'success' && <CheckCircleIcon className={`h-6 w-6 ${styles.iconColor}`} />}
            {type === 'error' && <ExclamationCircleIcon className={`h-6 w-6 ${styles.iconColor}`} />}
            {type === 'info' && <InformationCircleIcon className={`h-6 w-6 ${styles.iconColor}`} />}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${styles.text}`}>{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className={`inline-flex rounded-md p-1.5 ${styles.text} ${styles.hoverBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.focusRing}`}
              aria-label="Close toast"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
