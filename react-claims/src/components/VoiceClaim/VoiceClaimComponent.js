"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceClaimComponent = void 0;
const react_1 = require("react");
const WebSocketAudioClient_1 = require("./WebSocketAudioClient");
const AudioCapture_1 = require("./AudioCapture");
const AudioPlayback_1 = require("./AudioPlayback");
const WaveformAnimation_1 = require("./WaveformAnimation");
const TranscriptionDisplay_1 = require("./TranscriptionDisplay");
const ClaimFieldsDisplay_1 = require("./ClaimFieldsDisplay");
const ConfirmationUI_1 = require("./ConfirmationUI");
const ErrorDisplay_1 = require("./ErrorDisplay");
require("./styles.css");
/**
 * VoiceClaimComponent - Main component for voice-enabled FNOL claim submission
 *
 * This component manages the voice interaction flow for submitting insurance claims,
 * including safety assessment, claim information collection, and submission.
 *
 * Requirements: 2.1, 9.1
 */
const VoiceClaimComponent = ({ onClaimSubmitted, onFallbackToForm, webSocketUrl, authToken, customerId, policyId }) => {
    // Component state
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('disconnected');
    const [isCapturing, setIsCapturing] = (0, react_1.useState)(false);
    const [transcription, setTranscription] = (0, react_1.useState)('');
    const [claimData, setClaimData] = (0, react_1.useState)({});
    const [showConfirmation, setShowConfirmation] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [errorType, setErrorType] = (0, react_1.useState)('connection');
    const [currentPhase, setCurrentPhase] = (0, react_1.useState)('safety_check');
    const [reconnectAttempts, setReconnectAttempts] = (0, react_1.useState)(0);
    const maxReconnectAttempts = 3;
    // Refs for managing audio and WebSocket clients
    const wsClientRef = (0, react_1.useRef)(null);
    const audioCaptureRef = (0, react_1.useRef)(null);
    const audioPlaybackRef = (0, react_1.useRef)(null);
    /**
     * Initialize audio clients on component mount
     */
    (0, react_1.useEffect)(() => {
        wsClientRef.current = new WebSocketAudioClient_1.WebSocketAudioClient();
        audioCaptureRef.current = new AudioCapture_1.AudioCapture();
        audioPlaybackRef.current = new AudioPlayback_1.AudioPlayback();
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
        var _a, _b, _c, _d, _e;
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
        }
        catch (err) {
            console.error('Failed to start voice claim:', err);
            // Determine error type based on error message
            if (err.name === 'NotAllowedError' || ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('permission'))) {
                handleError('permission', 'Microphone access is required to use voice claim submission. Please grant permission and try again.');
            }
            else if (((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('WebSocket')) || ((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes('connection'))) {
                handleError('connection', 'Failed to connect to the voice service. Please check your internet connection and try again.');
            }
            else if (((_d = err.message) === null || _d === void 0 ? void 0 : _d.includes('audio')) || ((_e = err.message) === null || _e === void 0 ? void 0 : _e.includes('microphone'))) {
                handleError('audio', 'Unable to access your microphone. Please check your device settings and try again.');
            }
            else {
                handleError('connection', 'Failed to start voice claim. Please try again or use the form instead.');
            }
        }
    };
    /**
     * Handle errors with appropriate error type and message
     */
    const handleError = (type, message) => {
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
    (0, react_1.useEffect)(() => {
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
        }
        catch (err) {
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
    return (<div className="voice-claim-container">
      <div className="voice-claim-header">
        <h2>Voice Claim Submission</h2>
        <p className="voice-claim-subtitle">
          Tell us about your accident in your own words
        </p>
      </div>

      <div className="voice-claim-content">
        {connectionStatus === 'disconnected' && (<div className="voice-claim-start">
            <button className="btn-start-voice-claim" onClick={handleStartVoiceClaim}>
              <span className="microphone-icon">🎤</span>
              Start Voice Claim
            </button>
            <p className="voice-claim-help-text">
              Click to begin. We'll first check that you're safe, then help you submit your claim.
            </p>
          </div>)}

        {connectionStatus === 'connecting' && (<div className="voice-claim-connecting">
            <div className="spinner"></div>
            <p>Connecting...</p>
          </div>)}

        {connectionStatus === 'connected' && !showConfirmation && (<div className="voice-claim-active">
            {/* Waveform animation */}
            {isCapturing && (<WaveformAnimation_1.WaveformAnimation isActive={isCapturing}/>)}

            {/* Transcription display */}
            {transcription && (<TranscriptionDisplay_1.TranscriptionDisplay transcription={transcription}/>)}

            {/* Claim fields display */}
            {Object.keys(claimData).length > 0 && (<ClaimFieldsDisplay_1.ClaimFieldsDisplay claimData={claimData}/>)}

            {/* Phase indicator */}
            <div className="phase-indicator">
              <p className="phase-text">
                {currentPhase === 'safety_check' && 'Safety Check'}
                {currentPhase === 'collection' && 'Collecting Information'}
                {currentPhase === 'validation' && 'Validating Details'}
                {currentPhase === 'confirmation' && 'Ready for Confirmation'}
              </p>
            </div>

            <button className="btn-stop-voice-claim" onClick={handleStopVoiceClaim}>
              Stop
            </button>
          </div>)}

        {connectionStatus === 'connected' && showConfirmation && (<ConfirmationUI_1.ConfirmationUI claimData={claimData} onConfirm={handleConfirmClaim} onEdit={handleEditClaim}/>)}

        {connectionStatus === 'error' && error && (<ErrorDisplay_1.ErrorDisplay error={error} errorType={errorType} onRetry={errorType !== 'permission' ? handleRetry : undefined} onFallback={handleFallback}/>)}
      </div>
    </div>);
};
exports.VoiceClaimComponent = VoiceClaimComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVm9pY2VDbGFpbUNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlZvaWNlQ2xhaW1Db21wb25lbnQudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUEyRDtBQUMzRCxpRUFBOEQ7QUFDOUQsaURBQThDO0FBQzlDLG1EQUFnRDtBQUNoRCwyREFBd0Q7QUFDeEQsaUVBQThEO0FBQzlELDZEQUEwRDtBQUMxRCxxREFBa0Q7QUFDbEQsaURBQThDO0FBRTlDLHdCQUFzQjtBQUV0Qjs7Ozs7OztHQU9HO0FBQ0ksTUFBTSxtQkFBbUIsR0FBOEIsQ0FBQyxFQUM3RCxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixTQUFTLEVBQ1QsVUFBVSxFQUNWLFFBQVEsRUFDVCxFQUFFLEVBQUU7SUFDSCxrQkFBa0I7SUFDbEIsTUFBTSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFtQixjQUFjLENBQUMsQ0FBQztJQUMzRixNQUFNLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxLQUFLLENBQUMsQ0FBQztJQUN0RCxNQUFNLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELE1BQU0sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFxQixFQUFFLENBQUMsQ0FBQztJQUNuRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsR0FBRyxJQUFBLGdCQUFRLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxJQUFBLGdCQUFRLEVBQWdCLElBQUksQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFZLFlBQVks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QixDQUN0RDtnQkFBQSxDQUFDLFlBQVksS0FBSyxjQUFjLElBQUksd0JBQXdCLENBQzlEO2NBQUEsRUFBRSxDQUFDLENBQ0w7WUFBQSxFQUFFLEdBQUcsQ0FFTDs7WUFBQSxDQUFDLE1BQU0sQ0FDTCxTQUFTLENBQUMsc0JBQXNCLENBQ2hDLE9BQU8sQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBRTlCOztZQUNGLEVBQUUsTUFBTSxDQUNWO1VBQUEsRUFBRSxHQUFHLENBQUMsQ0FDUCxDQUVEOztRQUFBLENBQUMsZ0JBQWdCLEtBQUssV0FBVyxJQUFJLGdCQUFnQixJQUFJLENBQ3ZELENBQUMsK0JBQWMsQ0FDYixTQUFTLENBQUMsQ0FBQyxTQUFzQixDQUFDLENBQ2xDLFNBQVMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQzlCLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUN4QixDQUNILENBRUQ7O1FBQUEsQ0FBQyxnQkFBZ0IsS0FBSyxPQUFPLElBQUksS0FBSyxJQUFJLENBQ3hDLENBQUMsMkJBQVksQ0FDWCxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDYixTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDckIsT0FBTyxDQUFDLENBQUMsU0FBUyxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDOUQsVUFBVSxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQzNCLENBQ0gsQ0FDSDtNQUFBLEVBQUUsR0FBRyxDQUNQO0lBQUEsRUFBRSxHQUFHLENBQUMsQ0FDUCxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBcFZXLFFBQUEsbUJBQW1CLHVCQW9WOUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgdXNlU3RhdGUsIHVzZUVmZmVjdCwgdXNlUmVmIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgV2ViU29ja2V0QXVkaW9DbGllbnQgfSBmcm9tICcuL1dlYlNvY2tldEF1ZGlvQ2xpZW50JztcbmltcG9ydCB7IEF1ZGlvQ2FwdHVyZSB9IGZyb20gJy4vQXVkaW9DYXB0dXJlJztcbmltcG9ydCB7IEF1ZGlvUGxheWJhY2sgfSBmcm9tICcuL0F1ZGlvUGxheWJhY2snO1xuaW1wb3J0IHsgV2F2ZWZvcm1BbmltYXRpb24gfSBmcm9tICcuL1dhdmVmb3JtQW5pbWF0aW9uJztcbmltcG9ydCB7IFRyYW5zY3JpcHRpb25EaXNwbGF5IH0gZnJvbSAnLi9UcmFuc2NyaXB0aW9uRGlzcGxheSc7XG5pbXBvcnQgeyBDbGFpbUZpZWxkc0Rpc3BsYXkgfSBmcm9tICcuL0NsYWltRmllbGRzRGlzcGxheSc7XG5pbXBvcnQgeyBDb25maXJtYXRpb25VSSB9IGZyb20gJy4vQ29uZmlybWF0aW9uVUknO1xuaW1wb3J0IHsgRXJyb3JEaXNwbGF5IH0gZnJvbSAnLi9FcnJvckRpc3BsYXknO1xuaW1wb3J0IHsgVm9pY2VDbGFpbVByb3BzLCBDbGFpbURhdGEsIENvbm5lY3Rpb25TdGF0dXMsIEVycm9yVHlwZSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICcuL3N0eWxlcy5jc3MnO1xuXG4vKipcbiAqIFZvaWNlQ2xhaW1Db21wb25lbnQgLSBNYWluIGNvbXBvbmVudCBmb3Igdm9pY2UtZW5hYmxlZCBGTk9MIGNsYWltIHN1Ym1pc3Npb25cbiAqIFxuICogVGhpcyBjb21wb25lbnQgbWFuYWdlcyB0aGUgdm9pY2UgaW50ZXJhY3Rpb24gZmxvdyBmb3Igc3VibWl0dGluZyBpbnN1cmFuY2UgY2xhaW1zLFxuICogaW5jbHVkaW5nIHNhZmV0eSBhc3Nlc3NtZW50LCBjbGFpbSBpbmZvcm1hdGlvbiBjb2xsZWN0aW9uLCBhbmQgc3VibWlzc2lvbi5cbiAqIFxuICogUmVxdWlyZW1lbnRzOiAyLjEsIDkuMVxuICovXG5leHBvcnQgY29uc3QgVm9pY2VDbGFpbUNvbXBvbmVudDogUmVhY3QuRkM8Vm9pY2VDbGFpbVByb3BzPiA9ICh7XG4gIG9uQ2xhaW1TdWJtaXR0ZWQsXG4gIG9uRmFsbGJhY2tUb0Zvcm0sXG4gIHdlYlNvY2tldFVybCxcbiAgYXV0aFRva2VuLFxuICBjdXN0b21lcklkLFxuICBwb2xpY3lJZFxufSkgPT4ge1xuICAvLyBDb21wb25lbnQgc3RhdGVcbiAgY29uc3QgW2Nvbm5lY3Rpb25TdGF0dXMsIHNldENvbm5lY3Rpb25TdGF0dXNdID0gdXNlU3RhdGU8Q29ubmVjdGlvblN0YXR1cz4oJ2Rpc2Nvbm5lY3RlZCcpO1xuICBjb25zdCBbaXNDYXB0dXJpbmcsIHNldElzQ2FwdHVyaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3RyYW5zY3JpcHRpb24sIHNldFRyYW5zY3JpcHRpb25dID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbY2xhaW1EYXRhLCBzZXRDbGFpbURhdGFdID0gdXNlU3RhdGU8UGFydGlhbDxDbGFpbURhdGE+Pih7fSk7XG4gIGNvbnN0IFtzaG93Q29uZmlybWF0aW9uLCBzZXRTaG93Q29uZmlybWF0aW9uXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2Vycm9yVHlwZSwgc2V0RXJyb3JUeXBlXSA9IHVzZVN0YXRlPEVycm9yVHlwZT4oJ2Nvbm5lY3Rpb24nKTtcbiAgY29uc3QgW2N1cnJlbnRQaGFzZSwgc2V0Q3VycmVudFBoYXNlXSA9IHVzZVN0YXRlPCdzYWZldHlfY2hlY2snIHwgJ2NvbGxlY3Rpb24nIHwgJ3ZhbGlkYXRpb24nIHwgJ2NvbmZpcm1hdGlvbic+KCdzYWZldHlfY2hlY2snKTtcbiAgY29uc3QgW3JlY29ubmVjdEF0dGVtcHRzLCBzZXRSZWNvbm5lY3RBdHRlbXB0c10gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgbWF4UmVjb25uZWN0QXR0ZW1wdHMgPSAzO1xuXG4gIC8vIFJlZnMgZm9yIG1hbmFnaW5nIGF1ZGlvIGFuZCBXZWJTb2NrZXQgY2xpZW50c1xuICBjb25zdCB3c0NsaWVudFJlZiA9IHVzZVJlZjxXZWJTb2NrZXRBdWRpb0NsaWVudCB8IG51bGw+KG51bGwpO1xuICBjb25zdCBhdWRpb0NhcHR1cmVSZWYgPSB1c2VSZWY8QXVkaW9DYXB0dXJlIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IGF1ZGlvUGxheWJhY2tSZWYgPSB1c2VSZWY8QXVkaW9QbGF5YmFjayB8IG51bGw+KG51bGwpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGF1ZGlvIGNsaWVudHMgb24gY29tcG9uZW50IG1vdW50XG4gICAqL1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHdzQ2xpZW50UmVmLmN1cnJlbnQgPSBuZXcgV2ViU29ja2V0QXVkaW9DbGllbnQoKTtcbiAgICBhdWRpb0NhcHR1cmVSZWYuY3VycmVudCA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcbiAgICBhdWRpb1BsYXliYWNrUmVmLmN1cnJlbnQgPSBuZXcgQXVkaW9QbGF5YmFjaygpO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIC8vIENsZWFudXAgb24gdW5tb3VudFxuICAgICAgaGFuZGxlU3RvcFZvaWNlQ2xhaW0oKTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgLyoqXG4gICAqIFN0YXJ0IHZvaWNlIGNsYWltIGludGVyYWN0aW9uXG4gICAqIEVzdGFibGlzaGVzIFdlYlNvY2tldCBjb25uZWN0aW9uIGFuZCBiZWdpbnMgYXVkaW8gY2FwdHVyZVxuICAgKi9cbiAgY29uc3QgaGFuZGxlU3RhcnRWb2ljZUNsYWltID0gYXN5bmMgKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBzZXRFcnJvcihudWxsKTtcbiAgICAgIHNldENvbm5lY3Rpb25TdGF0dXMoJ2Nvbm5lY3RpbmcnKTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSBXZWJTb2NrZXQgY29ubmVjdGlvblxuICAgICAgaWYgKHdzQ2xpZW50UmVmLmN1cnJlbnQpIHtcbiAgICAgICAgLy8gUHJlcGFyZSBtZXRhZGF0YSB0byBzZW5kIHRvIGJhY2tlbmRcbiAgICAgICAgY29uc3QgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XG4gICAgICAgICAgY3VzdG9tZXJJZDogY3VzdG9tZXJJZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5jbHVkZSBwb2xpY3kgSUQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChwb2xpY3lJZCkge1xuICAgICAgICAgIG1ldGFkYXRhLnBvbGljeUlkID0gcG9saWN5SWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHdzQ2xpZW50UmVmLmN1cnJlbnQuY29ubmVjdCh3ZWJTb2NrZXRVcmwsIGF1dGhUb2tlbiwgbWV0YWRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGNhbGxiYWNrcyBmb3IgYXVkaW8gYW5kIGRhdGEgdXBkYXRlc1xuICAgICAgICB3c0NsaWVudFJlZi5jdXJyZW50Lm9uQXVkaW9SZWNlaXZlZCgoYXVkaW9DaHVuaykgPT4ge1xuICAgICAgICAgIGlmIChhdWRpb1BsYXliYWNrUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWJhY2tSZWYuY3VycmVudC5wbGF5QXVkaW8oYXVkaW9DaHVuayk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB3c0NsaWVudFJlZi5jdXJyZW50Lm9uQ2xhaW1EYXRhVXBkYXRlKChkYXRhKSA9PiB7XG4gICAgICAgICAgc2V0Q2xhaW1EYXRhKHByZXZEYXRhID0+ICh7IC4uLnByZXZEYXRhLCAuLi5kYXRhIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd3NDbGllbnRSZWYuY3VycmVudC5vblRyYW5zY3JpcHRpb25VcGRhdGUoKHRleHQpID0+IHtcbiAgICAgICAgICBzZXRUcmFuc2NyaXB0aW9uKHRleHQpO1xuICAgICAgICB9KTtcblxuICAgICAgICB3c0NsaWVudFJlZi5jdXJyZW50Lm9uUGhhc2VDaGFuZ2UoKHBoYXNlKSA9PiB7XG4gICAgICAgICAgc2V0Q3VycmVudFBoYXNlKHBoYXNlKTtcbiAgICAgICAgICAvLyBTaG93IGNvbmZpcm1hdGlvbiBVSSB3aGVuIHBoYXNlIGNoYW5nZXMgdG8gY29uZmlybWF0aW9uXG4gICAgICAgICAgaWYgKHBoYXNlID09PSAnY29uZmlybWF0aW9uJykge1xuICAgICAgICAgICAgc2V0U2hvd0NvbmZpcm1hdGlvbih0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBoYW5kbGVyIGZvciBjbGFpbSBzdWJtaXNzaW9uIHN1Y2Nlc3NcbiAgICAgICAgd3NDbGllbnRSZWYuY3VycmVudC5vbkNsYWltU3VibWl0dGVkKChjbGFpbU51bWJlcikgPT4ge1xuICAgICAgICAgIC8vIENhbGwgcGFyZW50IGNhbGxiYWNrIHdpdGggY2xhaW0gbnVtYmVyXG4gICAgICAgICAgb25DbGFpbVN1Ym1pdHRlZChjbGFpbU51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBlcnJvciBoYW5kbGVyIGZvciBXZWJTb2NrZXRcbiAgICAgICAgd3NDbGllbnRSZWYuY3VycmVudC5vbkVycm9yKChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICBoYW5kbGVFcnJvcignbmV0d29yaycsIGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCBhdWRpbyBjYXB0dXJlXG4gICAgICBpZiAoYXVkaW9DYXB0dXJlUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgYXdhaXQgYXVkaW9DYXB0dXJlUmVmLmN1cnJlbnQuc3RhcnRDYXB0dXJlKCk7XG4gICAgICAgIFxuICAgICAgICBhdWRpb0NhcHR1cmVSZWYuY3VycmVudC5vbkF1ZGlvQ2h1bmsoKGNodW5rKSA9PiB7XG4gICAgICAgICAgaWYgKHdzQ2xpZW50UmVmLmN1cnJlbnQpIHtcbiAgICAgICAgICAgIHdzQ2xpZW50UmVmLmN1cnJlbnQuc2VuZEF1ZGlvKGNodW5rKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNldElzQ2FwdHVyaW5nKHRydWUpO1xuICAgICAgfVxuXG4gICAgICBzZXRDb25uZWN0aW9uU3RhdHVzKCdjb25uZWN0ZWQnKTtcbiAgICAgIHNldFJlY29ubmVjdEF0dGVtcHRzKDApOyAvLyBSZXNldCByZWNvbm5lY3QgYXR0ZW1wdHMgb24gc3VjY2Vzc2Z1bCBjb25uZWN0aW9uXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzdGFydCB2b2ljZSBjbGFpbTonLCBlcnIpO1xuICAgICAgXG4gICAgICAvLyBEZXRlcm1pbmUgZXJyb3IgdHlwZSBiYXNlZCBvbiBlcnJvciBtZXNzYWdlXG4gICAgICBpZiAoZXJyLm5hbWUgPT09ICdOb3RBbGxvd2VkRXJyb3InIHx8IGVyci5tZXNzYWdlPy5pbmNsdWRlcygncGVybWlzc2lvbicpKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdwZXJtaXNzaW9uJywgJ01pY3JvcGhvbmUgYWNjZXNzIGlzIHJlcXVpcmVkIHRvIHVzZSB2b2ljZSBjbGFpbSBzdWJtaXNzaW9uLiBQbGVhc2UgZ3JhbnQgcGVybWlzc2lvbiBhbmQgdHJ5IGFnYWluLicpO1xuICAgICAgfSBlbHNlIGlmIChlcnIubWVzc2FnZT8uaW5jbHVkZXMoJ1dlYlNvY2tldCcpIHx8IGVyci5tZXNzYWdlPy5pbmNsdWRlcygnY29ubmVjdGlvbicpKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdjb25uZWN0aW9uJywgJ0ZhaWxlZCB0byBjb25uZWN0IHRvIHRoZSB2b2ljZSBzZXJ2aWNlLiBQbGVhc2UgY2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uIGFuZCB0cnkgYWdhaW4uJyk7XG4gICAgICB9IGVsc2UgaWYgKGVyci5tZXNzYWdlPy5pbmNsdWRlcygnYXVkaW8nKSB8fCBlcnIubWVzc2FnZT8uaW5jbHVkZXMoJ21pY3JvcGhvbmUnKSkge1xuICAgICAgICBoYW5kbGVFcnJvcignYXVkaW8nLCAnVW5hYmxlIHRvIGFjY2VzcyB5b3VyIG1pY3JvcGhvbmUuIFBsZWFzZSBjaGVjayB5b3VyIGRldmljZSBzZXR0aW5ncyBhbmQgdHJ5IGFnYWluLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ2Nvbm5lY3Rpb24nLCAnRmFpbGVkIHRvIHN0YXJ0IHZvaWNlIGNsYWltLiBQbGVhc2UgdHJ5IGFnYWluIG9yIHVzZSB0aGUgZm9ybSBpbnN0ZWFkLicpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlIGVycm9ycyB3aXRoIGFwcHJvcHJpYXRlIGVycm9yIHR5cGUgYW5kIG1lc3NhZ2VcbiAgICovXG4gIGNvbnN0IGhhbmRsZUVycm9yID0gKHR5cGU6IEVycm9yVHlwZSwgbWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgc2V0RXJyb3JUeXBlKHR5cGUpO1xuICAgIHNldEVycm9yKG1lc3NhZ2UpO1xuICAgIHNldENvbm5lY3Rpb25TdGF0dXMoJ2Vycm9yJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHJ5IGNvbm5lY3Rpb24gd2l0aCBleHBvbmVudGlhbCBiYWNrb2ZmXG4gICAqL1xuICBjb25zdCBoYW5kbGVSZXRyeSA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAocmVjb25uZWN0QXR0ZW1wdHMgPj0gbWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgIGhhbmRsZUVycm9yKCduZXR3b3JrJywgJ1VuYWJsZSB0byBjb25uZWN0IGFmdGVyIG11bHRpcGxlIGF0dGVtcHRzLiBQbGVhc2UgY2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uIG9yIHVzZSB0aGUgZm9ybSBpbnN0ZWFkLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldFJlY29ubmVjdEF0dGVtcHRzKHByZXYgPT4gcHJldiArIDEpO1xuICAgIFxuICAgIC8vIEV4cG9uZW50aWFsIGJhY2tvZmY6IDFzLCAycywgNHNcbiAgICBjb25zdCBkZWxheSA9IE1hdGgucG93KDIsIHJlY29ubmVjdEF0dGVtcHRzKSAqIDEwMDA7XG4gICAgXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGRlbGF5KSk7XG4gICAgYXdhaXQgaGFuZGxlU3RhcnRWb2ljZUNsYWltKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBuZXR3b3JrIGRpc2Nvbm5lY3Rpb25cbiAgICovXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlT25saW5lID0gKCkgPT4ge1xuICAgICAgaWYgKGNvbm5lY3Rpb25TdGF0dXMgPT09ICdlcnJvcicgJiYgZXJyb3JUeXBlID09PSAnbmV0d29yaycpIHtcbiAgICAgICAgLy8gQXR0ZW1wdCB0byByZWNvbm5lY3Qgd2hlbiBuZXR3b3JrIGNvbWVzIGJhY2sgb25saW5lXG4gICAgICAgIGhhbmRsZVJldHJ5KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGhhbmRsZU9mZmxpbmUgPSAoKSA9PiB7XG4gICAgICBpZiAoY29ubmVjdGlvblN0YXR1cyA9PT0gJ2Nvbm5lY3RlZCcpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ25ldHdvcmsnLCAnTmV0d29yayBjb25uZWN0aW9uIGxvc3QuIEF0dGVtcHRpbmcgdG8gcmVjb25uZWN0Li4uJyk7XG4gICAgICAgIGhhbmRsZVJldHJ5KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmxpbmUnLCBoYW5kbGVPbmxpbmUpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvZmZsaW5lJywgaGFuZGxlT2ZmbGluZSk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29ubGluZScsIGhhbmRsZU9ubGluZSk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignb2ZmbGluZScsIGhhbmRsZU9mZmxpbmUpO1xuICAgIH07XG4gIH0sIFtjb25uZWN0aW9uU3RhdHVzLCBlcnJvclR5cGUsIHJlY29ubmVjdEF0dGVtcHRzXSk7XG5cbiAgLyoqXG4gICAqIFN0b3Agdm9pY2UgY2xhaW0gaW50ZXJhY3Rpb25cbiAgICogRGlzY29ubmVjdHMgV2ViU29ja2V0IGFuZCBzdG9wcyBhdWRpbyBjYXB0dXJlXG4gICAqL1xuICBjb25zdCBoYW5kbGVTdG9wVm9pY2VDbGFpbSA9ICgpID0+IHtcbiAgICBpZiAod3NDbGllbnRSZWYuY3VycmVudCkge1xuICAgICAgd3NDbGllbnRSZWYuY3VycmVudC5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIGlmIChhdWRpb0NhcHR1cmVSZWYuY3VycmVudCkge1xuICAgICAgYXVkaW9DYXB0dXJlUmVmLmN1cnJlbnQuc3RvcENhcHR1cmUoKTtcbiAgICB9XG4gICAgaWYgKGF1ZGlvUGxheWJhY2tSZWYuY3VycmVudCkge1xuICAgICAgYXVkaW9QbGF5YmFja1JlZi5jdXJyZW50LnN0b3AoKTtcbiAgICB9XG4gICAgc2V0SXNDYXB0dXJpbmcoZmFsc2UpO1xuICAgIHNldENvbm5lY3Rpb25TdGF0dXMoJ2Rpc2Nvbm5lY3RlZCcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBIYW5kbGUgY2xhaW0gY29uZmlybWF0aW9uXG4gICAqIFRyaWdnZXJzIHN1Ym1pc3Npb24gb2YgdGhlIGNsYWltXG4gICAqL1xuICBjb25zdCBoYW5kbGVDb25maXJtQ2xhaW0gPSBhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHNldEVycm9yKG51bGwpO1xuICAgICAgXG4gICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiBtZXNzYWdlIHRvIGJhY2tlbmQgdmlhIFdlYlNvY2tldFxuICAgICAgLy8gVGhlIGJhY2tlbmQgYWdlbnQgd2lsbCBjYWxsIHN1Ym1pdF9mbm9sIHRvb2wgYW5kIHJldHVybiB0aGUgY2xhaW0gbnVtYmVyXG4gICAgICBpZiAod3NDbGllbnRSZWYuY3VycmVudCAmJiB3c0NsaWVudFJlZi5jdXJyZW50LmlzQ29ubmVjdGVkKCkpIHtcbiAgICAgICAgLy8gU2VuZCBhIHRleHQgbWVzc2FnZSB0byB0cmlnZ2VyIHN1Ym1pc3Npb25cbiAgICAgICAgY29uc3QgY29uZmlybU1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdHlwZTogJ2NvbmZpcm1fc3VibWlzc2lvbicsXG4gICAgICAgICAgZGF0YTogeyBjb25maXJtZWQ6IHRydWUgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IFdlYlNvY2tldCBzZW5kIGV4cGVjdHMgYmluYXJ5IGZvciBhdWRpbywgYnV0IHdlIG5lZWQgdG8gc2VuZCB0ZXh0IGZvciBjb21tYW5kc1xuICAgICAgICAvLyBUaGUgYmFja2VuZCB3aWxsIG5lZWQgdG8gaGFuZGxlIGJvdGggYmluYXJ5IChhdWRpbykgYW5kIHRleHQgKGNvbW1hbmRzKSBtZXNzYWdlc1xuICAgICAgICAvLyBGb3Igbm93LCBsb2cgdGhhdCBzdWJtaXNzaW9uIGlzIHRyaWdnZXJlZCAtIGFjdHVhbCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIGNvbXBsZXRlZFxuICAgICAgICAvLyB3aGVuIGJhY2tlbmQgc3VibWlzc2lvbiBmbG93IGlzIGZ1bGx5IGludGVncmF0ZWRcbiAgICAgICAgY29uc29sZS5sb2coJ0NvbmZpcm1pbmcgY2xhaW0gc3VibWlzc2lvbjonLCBjbGFpbURhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW4gdGhlIGFjdHVhbCBpbXBsZW1lbnRhdGlvbiwgdGhlIGJhY2tlbmQgd2lsbDpcbiAgICAgICAgLy8gMS4gUmVjZWl2ZSB0aGUgY29uZmlybWF0aW9uIG1lc3NhZ2VcbiAgICAgICAgLy8gMi4gQ2FsbCBzdWJtaXRfZm5vbCB0b29sIHdpdGggY29tcGxldGUgY2xhaW0gZGF0YVxuICAgICAgICAvLyAzLiBSZXR1cm4gY2xhaW0gbnVtYmVyIHZpYSBXZWJTb2NrZXQgbWVzc2FnZVxuICAgICAgICAvLyA0LiBGcm9udGVuZCB3aWxsIHJlY2VpdmUgY2xhaW0gbnVtYmVyIGFuZCBjYWxsIG9uQ2xhaW1TdWJtaXR0ZWQgY2FsbGJhY2tcbiAgICAgIH1cbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc3VibWl0IGNsYWltOicsIGVycik7XG4gICAgICBoYW5kbGVFcnJvcignc3VibWlzc2lvbicsICdGYWlsZWQgdG8gc3VibWl0IHlvdXIgY2xhaW0uIFBsZWFzZSB0cnkgYWdhaW4gb3IgdXNlIHRoZSBmb3JtIGluc3RlYWQuJyk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBIYW5kbGUgZWRpdCByZXF1ZXN0IGZyb20gY29uZmlybWF0aW9uIHNjcmVlblxuICAgKiBSZXR1cm5zIHVzZXIgdG8gY29udmVyc2F0aW9uIHRvIG1ha2UgY2hhbmdlc1xuICAgKi9cbiAgY29uc3QgaGFuZGxlRWRpdENsYWltID0gKCkgPT4ge1xuICAgIHNldFNob3dDb25maXJtYXRpb24oZmFsc2UpO1xuICAgIHNldEN1cnJlbnRQaGFzZSgnY29sbGVjdGlvbicpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBIYW5kbGUgZmFsbGJhY2sgdG8gZm9ybS1iYXNlZCBpbnB1dFxuICAgKi9cbiAgY29uc3QgaGFuZGxlRmFsbGJhY2sgPSAoKSA9PiB7XG4gICAgaGFuZGxlU3RvcFZvaWNlQ2xhaW0oKTtcbiAgICBvbkZhbGxiYWNrVG9Gb3JtKCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInZvaWNlLWNsYWltLWNvbnRhaW5lclwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1oZWFkZXJcIj5cbiAgICAgICAgPGgyPlZvaWNlIENsYWltIFN1Ym1pc3Npb248L2gyPlxuICAgICAgICA8cCBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1zdWJ0aXRsZVwiPlxuICAgICAgICAgIFRlbGwgdXMgYWJvdXQgeW91ciBhY2NpZGVudCBpbiB5b3VyIG93biB3b3Jkc1xuICAgICAgICA8L3A+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1jb250ZW50XCI+XG4gICAgICAgIHtjb25uZWN0aW9uU3RhdHVzID09PSAnZGlzY29ubmVjdGVkJyAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1zdGFydFwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnRuLXN0YXJ0LXZvaWNlLWNsYWltXCJcbiAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlU3RhcnRWb2ljZUNsYWltfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJtaWNyb3Bob25lLWljb25cIj7wn46kPC9zcGFuPlxuICAgICAgICAgICAgICBTdGFydCBWb2ljZSBDbGFpbVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1oZWxwLXRleHRcIj5cbiAgICAgICAgICAgICAgQ2xpY2sgdG8gYmVnaW4uIFdlJ2xsIGZpcnN0IGNoZWNrIHRoYXQgeW91J3JlIHNhZmUsIHRoZW4gaGVscCB5b3Ugc3VibWl0IHlvdXIgY2xhaW0uXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAge2Nvbm5lY3Rpb25TdGF0dXMgPT09ICdjb25uZWN0aW5nJyAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ2b2ljZS1jbGFpbS1jb25uZWN0aW5nXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwaW5uZXJcIj48L2Rpdj5cbiAgICAgICAgICAgIDxwPkNvbm5lY3RpbmcuLi48L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAge2Nvbm5lY3Rpb25TdGF0dXMgPT09ICdjb25uZWN0ZWQnICYmICFzaG93Q29uZmlybWF0aW9uICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInZvaWNlLWNsYWltLWFjdGl2ZVwiPlxuICAgICAgICAgICAgey8qIFdhdmVmb3JtIGFuaW1hdGlvbiAqL31cbiAgICAgICAgICAgIHtpc0NhcHR1cmluZyAmJiAoXG4gICAgICAgICAgICAgIDxXYXZlZm9ybUFuaW1hdGlvbiBpc0FjdGl2ZT17aXNDYXB0dXJpbmd9IC8+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICB7LyogVHJhbnNjcmlwdGlvbiBkaXNwbGF5ICovfVxuICAgICAgICAgICAge3RyYW5zY3JpcHRpb24gJiYgKFxuICAgICAgICAgICAgICA8VHJhbnNjcmlwdGlvbkRpc3BsYXkgdHJhbnNjcmlwdGlvbj17dHJhbnNjcmlwdGlvbn0gLz5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHsvKiBDbGFpbSBmaWVsZHMgZGlzcGxheSAqL31cbiAgICAgICAgICAgIHtPYmplY3Qua2V5cyhjbGFpbURhdGEpLmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICAgICAgICA8Q2xhaW1GaWVsZHNEaXNwbGF5IGNsYWltRGF0YT17Y2xhaW1EYXRhfSAvPlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgey8qIFBoYXNlIGluZGljYXRvciAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGhhc2UtaW5kaWNhdG9yXCI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInBoYXNlLXRleHRcIj5cbiAgICAgICAgICAgICAgICB7Y3VycmVudFBoYXNlID09PSAnc2FmZXR5X2NoZWNrJyAmJiAnU2FmZXR5IENoZWNrJ31cbiAgICAgICAgICAgICAgICB7Y3VycmVudFBoYXNlID09PSAnY29sbGVjdGlvbicgJiYgJ0NvbGxlY3RpbmcgSW5mb3JtYXRpb24nfVxuICAgICAgICAgICAgICAgIHtjdXJyZW50UGhhc2UgPT09ICd2YWxpZGF0aW9uJyAmJiAnVmFsaWRhdGluZyBEZXRhaWxzJ31cbiAgICAgICAgICAgICAgICB7Y3VycmVudFBoYXNlID09PSAnY29uZmlybWF0aW9uJyAmJiAnUmVhZHkgZm9yIENvbmZpcm1hdGlvbid9XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidG4tc3RvcC12b2ljZS1jbGFpbVwiXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVN0b3BWb2ljZUNsYWltfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBTdG9wXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cblxuICAgICAgICB7Y29ubmVjdGlvblN0YXR1cyA9PT0gJ2Nvbm5lY3RlZCcgJiYgc2hvd0NvbmZpcm1hdGlvbiAmJiAoXG4gICAgICAgICAgPENvbmZpcm1hdGlvblVJXG4gICAgICAgICAgICBjbGFpbURhdGE9e2NsYWltRGF0YSBhcyBDbGFpbURhdGF9XG4gICAgICAgICAgICBvbkNvbmZpcm09e2hhbmRsZUNvbmZpcm1DbGFpbX1cbiAgICAgICAgICAgIG9uRWRpdD17aGFuZGxlRWRpdENsYWltfVxuICAgICAgICAgIC8+XG4gICAgICAgICl9XG5cbiAgICAgICAge2Nvbm5lY3Rpb25TdGF0dXMgPT09ICdlcnJvcicgJiYgZXJyb3IgJiYgKFxuICAgICAgICAgIDxFcnJvckRpc3BsYXlcbiAgICAgICAgICAgIGVycm9yPXtlcnJvcn1cbiAgICAgICAgICAgIGVycm9yVHlwZT17ZXJyb3JUeXBlfVxuICAgICAgICAgICAgb25SZXRyeT17ZXJyb3JUeXBlICE9PSAncGVybWlzc2lvbicgPyBoYW5kbGVSZXRyeSA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgIG9uRmFsbGJhY2s9e2hhbmRsZUZhbGxiYWNrfVxuICAgICAgICAgIC8+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG4iXX0=