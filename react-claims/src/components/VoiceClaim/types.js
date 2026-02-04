/**
 * Type definitions and constants for Voice Claim components
 * 
 * Requirements: 2.1, 9.1
 */

/**
 * Input audio configuration (user to backend)
 * - Sample rate: 16kHz
 * - Channels: Mono (1)
 * - Encoding: PCM
 */
export const INPUT_AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  encoding: 'pcm'
};

/**
 * Output audio configuration (backend to user)
 * - Sample rate: 24kHz
 * - Channels: Mono (1)
 * - Encoding: PCM
 */
export const OUTPUT_AUDIO_CONFIG = {
  sampleRate: 24000,
  channelCount: 1,
  encoding: 'pcm'
};

/**
 * Connection status values:
 * - 'disconnected': Not connected to WebSocket
 * - 'connecting': Attempting to establish connection
 * - 'connected': Successfully connected
 * - 'error': Connection error occurred
 */
export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

/**
 * Conversation phase values:
 * - 'safety_check': Assessing user safety
 * - 'collection': Collecting claim information
 * - 'validation': Validating collected data
 * - 'confirmation': Confirming before submission
 */
export const ConversationPhase = {
  SAFETY_CHECK: 'safety_check',
  COLLECTION: 'collection',
  VALIDATION: 'validation',
  CONFIRMATION: 'confirmation'
};

/**
 * Error type values:
 * - 'connection': WebSocket connection error
 * - 'audio': Audio capture/playback error
 * - 'submission': Claim submission error
 * - 'network': Network connectivity error
 * - 'permission': Browser permission error
 */
export const ErrorType = {
  CONNECTION: 'connection',
  AUDIO: 'audio',
  SUBMISSION: 'submission',
  NETWORK: 'network',
  PERMISSION: 'permission'
};

/**
 * WebSocket message type values:
 * - 'audio': Audio data
 * - 'claim_data_update': Claim data update from agent
 * - 'transcription': Speech transcription
 * - 'phase_change': Conversation phase changed
 * - 'claim_submitted': Claim successfully submitted
 * - 'error': Error occurred
 */
export const WebSocketMessageType = {
  AUDIO: 'audio',
  CLAIM_DATA_UPDATE: 'claim_data_update',
  TRANSCRIPTION: 'transcription',
  PHASE_CHANGE: 'phase_change',
  CLAIM_SUBMITTED: 'claim_submitted',
  ERROR: 'error'
};
