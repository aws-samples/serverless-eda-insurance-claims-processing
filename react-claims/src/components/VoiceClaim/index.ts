/**
 * Voice Claim Component - Entry point
 * 
 * Exports all public components and types for the Voice Claim feature
 * 
 * Requirements: 2.1, 9.1
 */

export { VoiceClaimComponent } from './VoiceClaimComponent';
export { WebSocketAudioClient } from './WebSocketAudioClient';
export { AudioCapture } from './AudioCapture';
export { AudioPlayback } from './AudioPlayback';
export { WaveformAnimation } from './WaveformAnimation';
export { TranscriptionDisplay } from './TranscriptionDisplay';
export { ClaimFieldsDisplay } from './ClaimFieldsDisplay';
export { ConfirmationUI } from './ConfirmationUI';
export { ErrorDisplay } from './ErrorDisplay';

export type {
  VoiceClaimProps,
  ConnectionStatus,
  ConversationPhase,
  Location,
  Incident,
  Policy,
  PersonalInformation,
  PoliceReport,
  OtherParty,
  ClaimData,
  AudioStreamConfig,
  ErrorType,
  VoiceClaimError,
  WebSocketMessageType,
  WebSocketMessage
} from './types';

export {
  INPUT_AUDIO_CONFIG,
  OUTPUT_AUDIO_CONFIG
} from './types';
