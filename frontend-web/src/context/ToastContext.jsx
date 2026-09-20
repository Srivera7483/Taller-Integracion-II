import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // 'success', 'error', 'info'
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((newMessage, newType = 'info') => {
    setMessage(newMessage);
    setType(newType);
    setIsVisible(true);

    setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ message, type, isVisible, showToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};
