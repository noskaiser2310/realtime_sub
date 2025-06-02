import React from 'react';
import type { ToastMessage } from '../types';

interface ToastProps extends ToastMessage {
  onDismiss: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 3000); // Auto-dismiss after 3 seconds

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`toast ${type}`} role="alert">
      {message}
      <button 
        onClick={() => onDismiss(id)} 
        className="ml-2 text-lg font-semibold leading-none opacity-70 hover:opacity-100 focus:outline-none"
        aria-label="Close toast"
      >
        &times;
      </button>
    </div>
  );
};