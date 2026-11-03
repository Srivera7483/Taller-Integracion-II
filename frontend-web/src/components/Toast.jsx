import React from 'react';
import { useToast } from '../context/ToastContext';

const Toast = () => {
  const { isVisible, message, type } = useToast();

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-emerald-700 text-white',
    error: 'bg-red-700 text-white',
    info: 'bg-primary text-white',
  };

  const currentStyle = typeStyles[type] || typeStyles.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${currentStyle}`}
    >
      <p className="font-medium">{message}</p>
    </div>
  );
};

export default Toast;
