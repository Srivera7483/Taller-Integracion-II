import React from 'react';
import { useToast } from '../context/ToastContext';

const Toast = () => {
  const { isVisible, message, type } = useToast();

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const currentStyle = typeStyles[type] || typeStyles.info;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg transition-all duration-300 ${currentStyle}`}>
      <p className="font-medium">{message}</p>
    </div>
  );
};

export default Toast;
