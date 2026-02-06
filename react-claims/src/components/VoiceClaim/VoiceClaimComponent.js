import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketAudioClient } from './WebSocketAudioClient';
import { AudioCapture } from './AudioCapture';
import { AudioPlayback } from './AudioPlayback';
import { WaveformAnimation } from './WaveformAnimation';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { ClaimFieldsDisplay } from './ClaimFieldsDisplay';
import { ConfirmationUI } from './ConfirmationUI';
import { ErrorDisplay } from './ErrorDisplay';
import { EventDisplay, EventDetailModal } from './EventDisplay';
import './styles.css';

/**
 * VoiceClaimComponent - Main component for voice-enabled FNOL claim submission
 * 
 * Enhanced with:
 * - AudioWorklet for input/output (modern, non-deprecated)
 * - Event debugging UI for development
 * - localStorage state persistence
 * - Barge-in support for interruptions
 * 
 * Requirements: 2.1, 9.1
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClaimSubmitted - Callback when claim is successfully submitted (receives claimNumber)
 * @param {Function} props.onFallbackToForm - Callback when user wants to use form instead
 * @param {string} props.webSocketUrl - WebSocket URL for AgentCore connection
 * @param {string} props.authToken - Authentication token
 * @param {string} props.customerId - Customer ID
 * @param {string} [props.policyId] - Policy ID (optional)
 * @param {boolean} [props.showEventDebugger] - Show event debugging UI (default: false)
 */
export const VoiceClaimComponent = ({
  onClaimSubmitted,
  onFallbackToForm,
  webSocketUrl,
  customerId,
  policyId,
  showEventDebugger = false
}) => {
  // Component state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [claimData, setClaimData] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('connection');
  const [currentPhase, setCurrentPhase] = useState('safety_check');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const maxReconnectAttempts = 3;

  // Refs for managing audio and WebSocket clients
  const wsClientRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioPlaybackRef = useRef(null);

  /**
   * Save state to localStorage before page reload
   */
  const saveStateToStorage = useCallback(() => {
    try {
      const stateToSave = {
        claimData,
        currentPhase,
        transcription
      };
      localStorage.setItem('voice_claim_state', JSON.stringify(stateToSave));
      console.log('State saved to localStorage');
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, [claimData, currentPhase, transcription]);

  /**
   * Restore state from localStorage on mount
   */
  const restoreStateFromStorage = useCallback(() => {
    try {
      const savedState = localStorage.getItem('voice_claim_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setClaimData(parsedState.claimData || {});
        setCurrentPhase(parsedState.currentPhase || 'safety_check');
        setTranscription(parsedState.transcription || '');
        console.log('State restored from localStorage');
        
        // Clear saved state after restoring
        localStorage.removeItem('voice_claim_state');
      }
    } catch (error) {
      console.error('Failed to restore state from localStorage:', error);
    }
  }, []);

  /**
   * Initialize audio clients on component mount
   */
  useEffect(() => {
    wsClientRef.current = new WebSocketAudioClient();
    audioCaptureRef.current = new AudioCapture();
    audioPlaybackRef.current = new AudioPlayback();

    // Restore state if available
    restoreStateFromStorage();

    // Initialize audio playback early
    audioPlaybackRef.current.initialize().catch(err => {
      console.error('Failed to initialize audio playback:', err);
    });

    return () => {
      // Cleanup on unmount
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
      if (audioCaptureRef.current) {
        audioCaptureRef.current.stopCapture();
      }
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  /**
   * Save state periodically
   */
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(saveStateToStorage, 5000); // Save every 5 seconds
      return () => clearInterval(interval);
    }
  }, [connectionStatus, saveStateToStorage]);

  /**
   * Handle errors with appropriate error type and message
   * @param {string} type - Error type
   * @param {string} message - Error message
   */
  const handleError = useCallback((type, message) => {
    setErrorType(type);
    setError(message);
    setConnectionStatus('error');
  }, []);

  /**
   * Handle barge-in (user interrupts agent)
   */
  const handleBargeIn = useCallback(() => {
    console.log('User barge-in detected');
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.bargeIn();
    }
  }, []);

  /**
   * Start voice claim interaction
   * Establishes WebSocket connection and begins audio capture
   */
  const handleStartVoiceClaim = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      // Initialize WebSocket connection
      if (wsClientRef.current) {
        // Prepare metadata to send to backend
        const metadata = {
          customerId: customerId
        };
        
        // Include policy ID if available
        if (policyId) {
          metadata.policyId = policyId;
        }
        
        // Set up callbacks BEFORE connecting
        wsClientRef.current.onConnectionStatus((status) => {
          setConnectionStatus(status);
        });
        
        wsClientRef.current.onAudioReceived((audioChunk, sampleRate) => {
          if (audioPlaybackRef.current) {
            audioPlaybackRef.current.playAudio(audioChunk, sampleRate);
          }
        });

        wsClientRef.current.onTranscriptionUpdate((text, role, isFinal) => {
          setTranscription(text);
          
          // Detect user speech (potential barge-in)
          if (role === 'user' && audioPlaybackRef.current?.isPlaying()) {
            handleBargeIn();
          }
        });

        wsClientRef.current.onPhaseChange((phase, data) => {
          setCurrentPhase(phase);
          // Show confirmation UI when phase changes to confirmation
          if (phase === 'confirmation') {
            setShowConfirmation(true);
          }
          // Handle interruption
          if (phase === 'interrupted') {
            handleBargeIn();
          }
        });
        
        wsClientRef.current.onToolUse((toolUse) => {
          // Handle tool usage - extract claim data from tool inputs
          console.log('Tool being used:', toolUse.name);
          
          // If extract_claim_info tool is being used, update claim data
          if (toolUse.name === 'extract_claim_info' && toolUse.input) {
            setClaimData(prevData => ({ ...prevData, ...toolUse.input }));
          }
        });

        wsClientRef.current.onClaimSubmitted((claimNumber) => {
          // Call parent callback with claim number
          onClaimSubmitted(claimNumber);
        });

        wsClientRef.current.onError((errorMessage) => {
          handleError('network', errorMessage);
        });

        // Event tracking for debugging UI
        if (showEventDebugger) {
          wsClientRef.current.onEvent((eventList) => {
            setEvents(eventList);
          });
        }
        
        // Now connect (callbacks are registered)
        await wsClientRef.current.connect(webSocketUrl, metadata);
        
        // Wait a moment for WebSocket to be fully established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify connection is open before starting audio
        if (!wsClientRef.current.isConnected()) {
          throw new Error('WebSocket connection failed to establish');
        }
      }

      // Start audio capture AFTER WebSocket is fully connected
      if (audioCaptureRef.current) {
        await audioCaptureRef.current.startCapture();
        
        audioCaptureRef.current.onAudioChunk((chunk) => {
          if (wsClientRef.current && wsClientRef.current.isConnected()) {
            wsClientRef.current.sendAudio(chunk);
          }
        });

        setIsCapturing(true);
      }

      setConnectionStatus('connected');
      setReconnectAttempts(0); // Reset reconnect attempts on successful connection
    } catch (err) {
      console.error('Failed to start voice claim:', err);
      
      // Determine error type based on error message
      if (err.name === 'NotAllowedError' || (err.message && err.message.includes('permission'))) {
        handleError('permission', 'Microphone access is required to use voice claim submission. Please grant permission and try again.');
      } else if (err.message && (err.message.includes('WebSocket') || err.message.includes('connection'))) {
        handleError('connection', 'Failed to connect to the voice service. Please check your internet connection and try again.');
      } else if (err.message && (err.message.includes('audio') || err.message.includes('microphone'))) {
        handleError('audio', 'Unable to access your microphone. Please check your device settings and try again.');
      } else {
        handleError('connection', 'Failed to start voice claim. Please try again or use the form instead.');
      }
    }
  }, [webSocketUrl, customerId, policyId, handleError, onClaimSubmitted, handleBargeIn, showEventDebugger]);

  /**
   * Retry connection with exponential backoff
   */
  const handleRetry = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      handleError('network', 'Unable to connect after multiple attempts. Please check your internet connection or use the form instead.');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, reconnectAttempts) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await handleStartVoiceClaim();
  }, [reconnectAttempts, maxReconnectAttempts, handleError, handleStartVoiceClaim]);

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
  }, [connectionStatus, errorType, handleError, handleRetry]);

  /**
   * Stop voice claim interaction
   * Disconnects WebSocket and stops audio capture
   */
  const handleStopVoiceClaim = () => {
    // Save state before stopping
    saveStateToStorage();

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
        wsClientRef.current.sendText('Yes, please submit my claim');
        console.log('Confirming claim submission:', claimData);
      }
      
    } catch (err) {
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

  /**
   * Handle event click for debugging
   */
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  /**
   * Clear all events
   */
  const handleClearEvents = () => {
    if (wsClientRef.current) {
      wsClientRef.current.clearEvents();
    }
    setEvents([]);
  };

  return (
    <div className="voice-claim-container">
      <div className="voice-claim-header">
        <h2>Voice Claim Submission</h2>
        <p className="voice-claim-subtitle">
          Tell us about your accident in your own words
        </p>
      </div>

      <div className={`voice-claim-content ${showEventDebugger ? 'with-debugger' : ''}`}>
        <div className="voice-claim-main">
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
                  {currentPhase === 'responding' && 'Agent Speaking...'}
                  {currentPhase === 'listening' && 'Listening...'}
                  {currentPhase === 'interrupted' && 'Interrupted'}
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
              claimData={claimData}
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

        {/* Event Debugger Panel */}
        {showEventDebugger && (
          <div className="voice-claim-debugger">
            <div className="debugger-header">
              <button 
                className="btn-clear-events"
                onClick={handleClearEvents}
                title="Clear all events"
              >
                🗑️ Clear
              </button>
            </div>
            <EventDisplay 
              events={events}
              onEventClick={handleEventClick}
            />
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {showEventModal && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
        />
      )}
    </div>
  );
};
