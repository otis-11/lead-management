import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Toast({ message, type = 'success' }) {
  const isError = type === 'error';
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
        isError
          ? 'bg-red-600 text-white'
          : 'bg-gray-900 text-white'
      }`}
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </div>
  );
}
