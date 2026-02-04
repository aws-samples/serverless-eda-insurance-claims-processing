import React, { useState, useEffect, useRef } from 'react';
import { WebSocketAudioClient } from './WebSocketAudioClient';
import { AudioCapture } from './AudioCapture';
import { AudioPlayback } from './AudioPlayback';
import { WaveformAnimation } from './WaveformAnimation';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { ClaimFieldsDisplay } from './ClaimFieldsDisplay';
import { ConfirmationUI } from './ConfirmationUI';
import { ErrorDisplay } from './ErrorDisplay';
import { VoiceClaimProps, ClaimData, ConnectionStatus, ErrorType } from './types';
import './styles.css';

/**
 * VoiceClaimComponent - Main component for voice-enabled FNOL claim submission
 * 
 * This component manages the voice interaction flow for submitting insurance claims,
 * including safety assessment, claim information collection, and submission.
 * 
 * Requirements: 2.1, 9.1
 */
export const VoiceClaimComponent: React.FC<VoiceClaimProps> = ({
  onClaimSubmitted,
  onFallbackToForm,
  webSocketUrl,
  authToken,
  customerId,
  policyId
}) => {
  // Component state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [claimData, setClaimData] = useState<Partial<ClaimData>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>('connection');
  const [currentPhase, setCurrentPhase] = useState<'safety_check' | 'collection' | 'validation' | 'confirmation'>('safety_check');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  // Refs for managing audio and WebSocket clients
  const wsClientRef = useRef<WebSocketAudioClient | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);

  /**
   * Initialize audio clients on component mount
   */
  useEffect(() => {
    wsClientRef.current = new WebSocketAudioClient();
    audioCaptureRef.current = new AudioCapture();
    audioPlaybackRef.current = new AudioPlayback();

    return () => {
      // Cleanup on unmount
      handleStopVoiceClaim();
    };
  }, []);

  /**
   * Start voice claim interaction
   * Establishes WebSocket connection and begins audio capture
   */
  const handleStartVoiceClaim = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      // Initialize WebSocket connection
      if (wsClientRef.current) {
        // Prepare metadata to send to backend
        const metadata: Record<string, any> = {
          customerId: customerId
        };
        
        // Include policy ID if available
        if (policyId) {
          metadata.policyId = policyId;
        }
        
        await wsClientRef.current.connect(webSocketUrl, authToken, metadata);
        
        // Set up callbacks for audio and data updates
        wsClientRef.current.onAudioReceived((audioChunk) => {
          if (audioPlaybackRef.current) {
            audioPlaybackRef.current.playAudio(audioChunk);
          }
        });

        wsClientRef.current.onClaimDataUpdate((data) => {
          setClaimData(prevData => ({ ...prevData, ...data }));
        });

        wsClientRef.current.onTranscriptionUpdate((text) => {
          setTranscription(text);
        });

        wsClientRef.current.onPhaseChange((phase) => {
          setCurrentPhase(phase);
          // Show confirmation UI when phase changes to confirmation
          if (phase === 'confirmation') {
            setShowConfirmation(true);
          }
        });

        // Set up handler for claim submission success
        wsClientRef.current.onClaimSubmitted((claimNumber) => {
          // Call parent callback with claim number
          onClaimSubmitted(claimNumber);
        });

        // Set up error handler for WebSocket
        wsClientRef.current.onError((errorMessage) => {
          handleError('network', errorMessage);
        });
      }

      // Start audio capture
      if (audioCaptureRef.current) {
        await audioCaptureRef.current.startCapture();
        
        audioCaptureRef.current.onAudioChunk((chunk) => {
          if (wsClientRef.current) {
            wsClientRef.current.sendAudio(chunk);
          }
        });

        setIsCapturing(true);
      }

      setConnectionStatus('connected');
      setReconnectAttempts(0); // Reset reconnect attempts on successful connection
    } catch (err: any) {
      console.error('Failed to start voice claim:', err);
      
      // Determine error type based on error message
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        handleError('permission', 'Microphone access is required to use voice claim submission. Please grant permission and try again.');
      } else if (err.message?.includes('WebSocket') || err.message?.includes('connection')) {
        handleError('connection', 'Failed to connect to the voice service. Please check your internet connection and try again.');
      } else if (err.message?.includes('audio') || err.message?.includes('microphone')) {
        handleError('audio', 'Unable to access your microphone. Please check your device settings and try again.');
      } else {
        handleError('connection', 'Failed to start voice claim. Please try again or use the form instead.');
      }
    }
  };

  /**
   * Handle errors with appropriate error type and message
   */
  const handleError = (type: ErrorType, message: string) => {
    setErrorType(type);
    setError(message);
    setConnectionStatus('error');
  };

  /**
   * Retry connection with exponential backoff
   */
  const handleRetry = async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      handleError('network', 'Unable to connect after multiple attempts. Please check your internet connection or use the form instead.');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, reconnectAttempts) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await handleStartVoiceClaim();
  };

  /**
   * Handle network disconnection
   */
  useEffect(() => {
    const handleOnline = () => {
      if (connectionStatus === 'error' && errorType === 'network') {
        // Attempt to reconnect when network comes back online
        handleRetry();
      }
    };

    const handleOffline = () => {
      if (connectionStatus === 'connected') {
        handleError('network', 'Network connection lost. Attempting to reconnect...');
        handleRetry();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, errorType, reconnectAttempts]);

  /**
   * Stop voice claim interaction
   * Disconnects WebSocket and stops audio capture
   */
  const handleStopVoiceClaim = () => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stopCapture();
    }
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.stop();
    }
    setIsCapturing(false);
    setConnectionStatus('disconnected');
  };

  /**
   * Handle claim confirmation
   * Triggers submission of the claim
   */
  const handleConfirmClaim = async () => {
    try {
      setError(null);
      
      // Send confirmation message to backend via WebSocket
      // The backend agent will call submit_fnol tool and return the claim number
      if (wsClientRef.current && wsClientRef.current.isConnected()) {
        // Send a text message to trigger submission
        const confirmMessage = JSON.stringify({
          type: 'confirm_submission',
          data: { confirmed: true }
        });
        
        // Note: WebSocket send expects binary for audio, but we need to send text for commands
        // The backend will need to handle both binary (audio) and text (commands) messages
        // For now, log that submission is triggered - actual implementation will be completed
        // when backend submission flow is fully integrated
        console.log('Confirming claim submission:', claimData);
        
        // In the actual implementation, the backend will:
        // 1. Receive the confirmation message
        // 2. Call submit_fnol tool with complete claim data
        // 3. Return claim number via WebSocket message
        // 4. Frontend will receive claim number and call onClaimSubmitted callback
      }
      
    } catch (err: any) {
      console.error('Failed to submit claim:', err);
      handleError('submission', 'Failed to submit your claim. Please try again or use the form instead.');
    }
  };

  /**
   * Handle edit request from confirmation screen
   * Returns user to conversation to make changes
   */
  const handleEditClaim = () => {
    setShowConfirmation(false);
    setCurrentPhase('collection');
  };

  /**
   * Handle fallback to form-based input
   */
  const handleFallback = () => {
    handleStopVoiceClaim();
    onFallbackToForm();
  };

  return (
    <div className="voice-claim-container">
      <div className="voice-claim-header">
        <h2>Voice Claim Submission</h2>
        <p className="voice-claim-subtitle">
          Tell us about your accident in your own words
        </p>
      </div>

      <div className="voice-claim-content">
        {connectionStatus === 'disconnected' && (
          <div className="voice-claim-start">
            <button 
              className="btn-start-voice-claim"
              onClick={handleStartVoiceClaim}
            >
              <span className="microphone-icon">🎤</span>
              Start Voice Claim
            </button>
            <p className="voice-claim-help-text">
              Click to begin. We'll first check that you're safe, then help you submit your claim.
            </p>
          </div>
        )}

        {connectionStatus === 'connecting' && (
          <div className="voice-claim-connecting">
            <div className="spinner"></div>
            <p>Connecting...</p>
          </div>
        )}

        {connectionStatus === 'connected' && !showConfirmation && (
          <div className="voice-claim-active">
            {/* Waveform animation */}
            {isCapturing && (
              <WaveformAnimation isActive={isCapturing} />
            )}

            {/* Transcription display */}
            {transcription && (
              <TranscriptionDisplay transcription={transcription} />
            )}

            {/* Claim fields display */}
            {Object.keys(claimData).length > 0 && (
              <ClaimFieldsDisplay claimData={claimData} />
            )}

            {/* Phase indicator */}
            <div className="phase-indicator">
              <p className="phase-text">
                {currentPhase === 'safety_check' && 'Safety Check'}
                {currentPhase === 'collection' && 'Collecting Information'}
                {currentPhase === 'validation' && 'Validating Details'}
                {currentPhase === 'confirmation' && 'Ready for Confirmation'}
              </p>
            </div>

            <button 
              className="btn-stop-voice-claim"
              onClick={handleStopVoiceClaim}
            >
              Stop
            </button>
          </div>
        )}

        {connectionStatus === 'connected' && showConfirmation && (
          <ConfirmationUI
            claimData={claimData as ClaimData}
            onConfirm={handleConfirmClaim}
            onEdit={handleEditClaim}
          />
        )}

        {connectionStatus === 'error' && error && (
          <ErrorDisplay
            error={error}
            errorType={errorType}
            onRetry={errorType !== 'permission' ? handleRetry : undefined}
            onFallback={handleFallback}
          />
        )}
      </div>
    </div>
  );
};
