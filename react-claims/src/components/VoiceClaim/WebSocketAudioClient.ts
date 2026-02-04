import { ClaimData } from './types';

/**
 * WebSocketAudioClient - Manages WebSocket connection for bidirectional audio streaming
 * 
 * This class handles:
 * - WebSocket connection establishment with authentication
 * - Sending audio chunks to the backend
 * - Receiving audio chunks from the backend
 * - Receiving claim data updates
 * - Automatic reconnection with exponential backoff
 * 
 * Requirements: 2.1, 10.2, 11.1, 11.4
 */
export class WebSocketAudioClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private authToken: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000; // Start with 1 second
  private isConnecting: boolean = false;
  
  // Callbacks
  private audioReceivedCallback: ((audio: ArrayBuffer) => void) | null = null;
  private claimDataUpdateCallback: ((data: Partial<ClaimData>) => void) | null = null;
  private transcriptionUpdateCallback: ((text: string) => void) | null = null;
  private phaseChangeCallback: ((phase: string) => void) | null = null;
  private connectionStatusCallback: ((status: 'connected' | 'disconnected' | 'error') => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private claimSubmittedCallback: ((claimNumber: string) => void) | null = null;

  /**
   * Connect to WebSocket endpoint with authentication
   * @param url WebSocket URL (wss://...)
   * @param authToken Authentication token for SigV4 or OAuth 2.0
   * @param metadata Optional metadata to send on connection (e.g., customerId, policyId)
   */
  async connect(url: string, authToken: string, metadata?: Record<string, any>): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket is already connected or connecting');
      return;
    }

    this.url = url;
    this.authToken = authToken;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection with authentication
        // Note: WebSocket doesn't support custom headers directly
        // Authentication will be handled via query parameter or subprotocol
        const authenticatedUrl = `${url}?auth=${encodeURIComponent(authToken)}`;
        this.ws = new WebSocket(authenticatedUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Send initial metadata if provided (customer ID, policy ID, etc.)
          if (metadata && Object.keys(metadata).length > 0) {
            const metadataMessage = JSON.stringify({
              type: 'metadata',
              data: metadata
            });
            this.ws?.send(metadataMessage);
          }
          
          if (this.connectionStatusCallback) {
            this.connectionStatusCallback('connected');
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          if (this.connectionStatusCallback) {
            this.connectionStatusCallback('error');
          }
          
          if (this.errorCallback) {
            this.errorCallback('WebSocket connection error occurred');
          }
          
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          
          if (this.connectionStatusCallback) {
            this.connectionStatusCallback('disconnected');
          }

          // Attempt reconnection if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect(this.url, this.authToken).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);

    // Exponential backoff: 1s, 2s, 4s
    this.reconnectDelay *= 2;
  }

  /**
   * Handle incoming WebSocket messages
   * Distinguishes between binary (audio) and JSON (metadata) frames
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      // Binary frame - audio data
      if (this.audioReceivedCallback) {
        this.audioReceivedCallback(event.data);
      }
    } else if (typeof event.data === 'string') {
      // JSON frame - metadata (claim data updates, transcription, etc.)
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'claim_data_update' && message.data) {
          if (this.claimDataUpdateCallback) {
            this.claimDataUpdateCallback(message.data);
          }
        } else if (message.type === 'transcription' && message.text) {
          if (this.transcriptionUpdateCallback) {
            this.transcriptionUpdateCallback(message.text);
          }
        } else if (message.type === 'phase_change' && message.phase) {
          if (this.phaseChangeCallback) {
            this.phaseChangeCallback(message.phase);
          }
        } else if (message.type === 'claim_submitted' && message.claimNumber) {
          if (this.claimSubmittedCallback) {
            this.claimSubmittedCallback(message.claimNumber);
          }
        }
      } catch (error) {
        console.error('Failed to parse JSON message:', error);
      }
    }
  }

  /**
   * Send audio chunk to backend
   * @param audioChunk PCM audio data as ArrayBuffer
   */
  sendAudio(audioChunk: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioChunk);
    } else {
      console.warn('WebSocket is not connected, cannot send audio');
    }
  }

  /**
   * Register callback for received audio chunks
   * @param callback Function to call when audio is received
   */
  onAudioReceived(callback: (audio: ArrayBuffer) => void): void {
    this.audioReceivedCallback = callback;
  }

  /**
   * Register callback for claim data updates
   * @param callback Function to call when claim data is updated
   */
  onClaimDataUpdate(callback: (data: Partial<ClaimData>) => void): void {
    this.claimDataUpdateCallback = callback;
  }

  /**
   * Register callback for transcription updates
   * @param callback Function to call when transcription is updated
   */
  onTranscriptionUpdate(callback: (text: string) => void): void {
    this.transcriptionUpdateCallback = callback;
  }

  /**
   * Register callback for conversation phase changes
   * @param callback Function to call when phase changes
   */
  onPhaseChange(callback: (phase: string) => void): void {
    this.phaseChangeCallback = callback;
  }

  /**
   * Register callback for connection status changes
   * @param callback Function to call when connection status changes
   */
  onConnectionStatus(callback: (status: 'connected' | 'disconnected' | 'error') => void): void {
    this.connectionStatusCallback = callback;
  }

  /**
   * Register callback for errors
   * @param callback Function to call when an error occurs
   */
  onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Register callback for claim submission success
   * @param callback Function to call when claim is successfully submitted
   */
  onClaimSubmitted(callback: (claimNumber: string) => void): void {
    this.claimSubmittedCallback = callback;
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    // Clear callbacks
    this.audioReceivedCallback = null;
    this.claimDataUpdateCallback = null;
    this.transcriptionUpdateCallback = null;
    this.phaseChangeCallback = null;
    this.connectionStatusCallback = null;
    this.errorCallback = null;
    this.claimSubmittedCallback = null;
    
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
