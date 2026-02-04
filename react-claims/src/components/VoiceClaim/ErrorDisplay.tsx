import React from 'react';
import { ErrorType } from './types';
import './styles.css';

/**
 * Props for ErrorDisplay component
 */
interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  
  /** Type of error for appropriate icon and styling */
  errorType: ErrorType;
  
  /** Callback when user clicks "Try Again" */
  onRetry?: () => void;
  
  /** Callback when user clicks "Use Form Instead" */
  onFallback: () => void;
}

/**
 * ErrorDisplay - Component for displaying error messages with appropriate actions
 * 
 * This component shows error messages with context-appropriate icons and actions,
 * allowing users to retry or fall back to form-based input.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorType,
  onRetry,
  onFallback
}) => {
  /**
   * Get icon based on error type
   */
  const getErrorIcon = (): string => {
    switch (errorType) {
      case 'connection':
        return '🔌';
      case 'audio':
        return '🎤';
      case 'permission':
        return '🔒';
      case 'network':
        return '📡';
      case 'submission':
        return '📤';
      default:
        return '⚠️';
    }
  };

  /**
   * Get error title based on error type
   */
  const getErrorTitle = (): string => {
    switch (errorType) {
      case 'connection':
        return 'Connection Error';
      case 'audio':
        return 'Audio Error';
      case 'permission':
        return 'Permission Required';
      case 'network':
        return 'Network Error';
      case 'submission':
        return 'Submission Error';
      default:
        return 'Error';
    }
  };

  /**
   * Determine if error is retryable
   */
  const isRetryable = (): boolean => {
    return errorType !== 'permission' && onRetry !== undefined;
  };

  return (
    <div className="error-display">
      <div className="error-display-icon" role="img" aria-label={getErrorTitle()}>
        {getErrorIcon()}
      </div>
      
      <div className="error-display-content">
        <h3 className="error-display-title">{getErrorTitle()}</h3>
        <p className="error-display-message">{error}</p>
        
        {errorType === 'permission' && (
          <div className="error-display-help">
            <p>To use voice claim submission, please:</p>
            <ol>
              <li>Click the microphone icon in your browser's address bar</li>
              <li>Select "Allow" to grant microphone access</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>
        )}
      </div>

      <div className="error-display-actions">
        {isRetryable() && (
          <button 
            className="btn-error-retry"
            onClick={onRetry}
            aria-label="Try again"
          >
            🔄 Try Again
          </button>
        )}
        <button 
          className="btn-error-fallback"
          onClick={onFallback}
          aria-label="Use form-based input instead"
        >
          📝 Use Form Instead
        </button>
      </div>
    </div>
  );
};
