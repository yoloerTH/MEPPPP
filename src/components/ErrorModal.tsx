import React, { useRef } from 'react';
import { X, AlertCircle, RefreshCw, Mail, CheckCircle } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onRetry?: () => void;
  type?: 'error' | 'timeout' | 'network';
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onRetry, 
  type = 'error' 
}: ErrorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'timeout':
        return <RefreshCw className="w-8 h-8 text-orange-500" />;
      case 'network':
        return <Mail className="w-8 h-8 text-blue-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-red-500" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'timeout':
        return 'border-orange-200 bg-orange-50';
      case 'network':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'timeout':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'network':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-red-600 hover:bg-red-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className={`rounded-lg p-4 border-2 ${getColor()} mb-6`}>
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-gray-600 mt-1" />
              <div>
                <p className="text-gray-800 font-semibold mb-2">What happened?</p>
                <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
              </div>
            </div>
          </div>

          {type === 'network' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium text-sm">Network Issue Detected</p>
                  <p className="text-blue-800 text-sm">
                    This is usually temporary. Check your internet connection and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {type === 'timeout' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div>
                  <p className="text-blue-900 font-medium text-sm">Don't worry!</p>
                  <p className="text-blue-800 text-sm">
                    Processing continues in the background. You can check the status later or try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
            >
              Dismiss
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className={`px-6 py-3 text-white rounded-xl transition-colors flex items-center font-medium ${getButtonColor()}`}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}