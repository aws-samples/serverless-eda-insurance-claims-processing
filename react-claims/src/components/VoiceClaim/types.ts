/**
 * TypeScript type definitions for Voice Claim components
 * 
 * Requirements: 2.1, 9.1
 */

/**
 * Props for VoiceClaimComponent
 */
export interface VoiceClaimProps {
  /** Callback when claim is successfully submitted */
  onClaimSubmitted: (claimNumber: string) => void;
  
  /** Callback when user chooses to fall back to form-based input */
  onFallbackToForm: () => void;
  
  /** WebSocket endpoint URL for voice agent */
  webSocketUrl: string;
  
  /** Authentication token for WebSocket connection */
  authToken: string;
  
  /** Customer ID from authenticated session */
  customerId: string;
  
  /** Policy ID from customer's active policy (optional - can be provided by user during conversation) */
  policyId?: string;
}

/**
 * Connection status for WebSocket
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Conversation phase
 */
export type ConversationPhase = 'safety_check' | 'collection' | 'validation' | 'confirmation';

/**
 * Location information for accident
 */
export interface Location {
  country: string;
  state: string;
  city: string;
  zip: string;
  road: string;
}

/**
 * Incident details
 */
export interface Incident {
  occurrenceDateTime: string; // ISO 8601 format
  fnolDateTime: string; // ISO 8601 format
  location: Location;
  description: string;
}

/**
 * Policy information
 */
export interface Policy {
  id: string;
}

/**
 * Personal information of insured
 */
export interface PersonalInformation {
  customerId: string;
  driversLicenseNumber: string;
  isInsurerDriver: boolean;
  licensePlateNumber: string;
  numberOfPassengers: number;
}

/**
 * Police report information
 */
export interface PoliceReport {
  isFiled: boolean;
  reportOrReceiptAvailable: boolean;
}

/**
 * Other party involved in accident
 */
export interface OtherParty {
  insuranceId?: string;
  insuranceCompany?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Complete claim data structure matching FNOL API schema
 */
export interface ClaimData {
  incident: Incident;
  policy: Policy;
  personalInformation: PersonalInformation;
  policeReport: PoliceReport;
  otherParty: OtherParty;
}

/**
 * Audio stream configuration
 */
export interface AudioStreamConfig {
  /** Sample rate in Hz */
  sampleRate: number;
  
  /** Number of audio channels (1 for mono, 2 for stereo) */
  channelCount: number;
  
  /** Audio encoding format */
  encoding: 'pcm';
}

/**
 * Input audio configuration (user to backend)
 */
export const INPUT_AUDIO_CONFIG: AudioStreamConfig = {
  sampleRate: 16000,
  channelCount: 1,
  encoding: 'pcm'
};

/**
 * Output audio configuration (backend to user)
 */
export const OUTPUT_AUDIO_CONFIG: AudioStreamConfig = {
  sampleRate: 24000,
  channelCount: 1,
  encoding: 'pcm'
};

/**
 * Error types for voice claim
 */
export type ErrorType = 'connection' | 'audio' | 'submission' | 'network' | 'permission';

/**
 * Error information
 */
export interface VoiceClaimError {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'audio'
  | 'claim_data_update'
  | 'transcription'
  | 'phase_change'
  | 'claim_submitted'
  | 'error';

/**
 * WebSocket message structure for metadata
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: any;
  text?: string;
  phase?: ConversationPhase;
  claimNumber?: string;
  error?: string;
}
