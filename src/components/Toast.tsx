import React from 'react';

interface ToastProps {
  message: string;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  return (
    <div
      style={{
        position: 'relative',
        padding: '8px 12px',
        background: '#111',
        color: '#fff',
        borderRadius: 4,
        marginBottom: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ marginLeft: 12, background: 'transparent', color: '#fff', border: 'none' }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Toast;
