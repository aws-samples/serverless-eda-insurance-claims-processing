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
  constructor() {
    this.ws = null;
    this.url = '';
    this.metadata = null; // Store metadata for reconnection
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    
    // Callbacks
    this.audioReceivedCallback = null;
    this.claimDataUpdateCallback = null;
    this.transcriptionUpdateCallback = null;
    this.phaseChangeCallback = null;
    this.connectionStatusCallback = null;
    this.errorCallback = null;
    this.claimSubmittedCallback = null;
  }

  /**
   * Connect to WebSocket endpoint with authentication
   * @param {string} url - WebSocket URL (wss://bedrock-agentcore.{region}.amazonaws.com/runtimes/{arn}/ws)
   * @param {Object} [metadata] - Optional metadata to send on connection
   * @returns {Promise<void>}
   */
  async connect(url, metadata) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket is already connected or connecting');
      return;
    }

    this.url = url;
    this.metadata = metadata; // Store for reconnection
    this.isConnecting = true;

    return new Promise(async (resolve, reject) => {
      try {
        const { generatePresignedWebSocketUrl } = await import('../../utils');
        
        // Generate presigned URL with SigV4 authentication
        const authenticatedUrl = await generatePresignedWebSocketUrl(url);
        
        console.log('Connecting to WebSocket...', authenticatedUrl.substring(0, 100) + '...');
        
        this.ws = new WebSocket(authenticatedUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Send initial metadata if provided
          if (metadata && Object.keys(metadata).length > 0) {
            const metadataMessage = JSON.stringify({
              type: 'metadata',
              data: metadata
            });
            console.log('Sending initial metadata:', metadataMessage);
            this.ws.send(metadataMessage);
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
          } else if (event.code !== 1000) {
            console.error('Max reconnection attempts reached');
            if (this.errorCallback) {
              this.errorCallback('Connection lost - maximum reconnection attempts reached');
            }
          }
        };
      } catch (error) {
        console.error('Error during connection setup:', error);
        this.isConnecting = false;
        
        if (this.errorCallback) {
          this.errorCallback(`Failed to establish connection: ${error.message}`);
        }
        
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    if (this.connectionStatusCallback) {
      this.connectionStatusCallback('reconnecting');
    }

    setTimeout(() => {
      this.connect(this.url, this.metadata).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);

    // Exponential backoff: 1s, 2s, 4s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000); // Cap at 8 seconds
  }

  /**
   * Handle incoming WebSocket messages
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    if (event.data instanceof ArrayBuffer) {
      // Binary frame - audio data
      console.log('Received audio chunk:', event.data.byteLength, 'bytes');
      if (this.audioReceivedCallback) {
        this.audioReceivedCallback(event.data);
      }
    } else if (typeof event.data === 'string') {
      // JSON frame - metadata
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        
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
        } else if (message.type === 'error') {
          console.error('Server error:', message.error || message.message);
          if (this.errorCallback) {
            this.errorCallback(message.error || message.message || 'Unknown server error');
          }
        } else {
          console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse JSON message:', error, event.data);
        if (this.errorCallback) {
          this.errorCallback('Failed to parse server message');
        }
      }
    }
  }

  /**
   * Send audio chunk to backend
   * @param {ArrayBuffer} audioChunk - PCM audio data
   */
  sendAudio(audioChunk) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioChunk);
    } else {
      console.warn('WebSocket is not connected, cannot send audio. State:', this.ws?.readyState);
      if (this.errorCallback) {
        this.errorCallback('Cannot send audio - not connected');
      }
    }
  }

  /**
   * Send a JSON message to the backend
   * @param {Object} message - Message object to send
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const jsonMessage = JSON.stringify(message);
      console.log('Sending message:', message.type);
      this.ws.send(jsonMessage);
    } else {
      console.warn('WebSocket is not connected, cannot send message');
      if (this.errorCallback) {
        this.errorCallback('Cannot send message - not connected');
      }
    }
  }

  /**
   * Register callback for received audio chunks
   * @param {Function} callback - Function to call when audio is received
   */
  onAudioReceived(callback) {
    this.audioReceivedCallback = callback;
  }

  /**
   * Register callback for claim data updates
   * @param {Function} callback - Function to call when claim data is updated
   */
  onClaimDataUpdate(callback) {
    this.claimDataUpdateCallback = callback;
  }

  /**
   * Register callback for transcription updates
   * @param {Function} callback - Function to call when transcription is updated
   */
  onTranscriptionUpdate(callback) {
    this.transcriptionUpdateCallback = callback;
  }

  /**
   * Register callback for conversation phase changes
   * @param {Function} callback - Function to call when phase changes
   */
  onPhaseChange(callback) {
    this.phaseChangeCallback = callback;
  }

  /**
   * Register callback for connection status changes
   * @param {Function} callback - Function to call when connection status changes
   */
  onConnectionStatus(callback) {
    this.connectionStatusCallback = callback;
  }

  /**
   * Register callback for errors
   * @param {Function} callback - Function to call when an error occurs
   */
  onError(callback) {
    this.errorCallback = callback;
  }

  /**
   * Register callback for claim submission success
   * @param {Function} callback - Function to call when claim is successfully submitted
   */
  onClaimSubmitted(callback) {
    this.claimSubmittedCallback = callback;
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect() {
    console.log('Disconnecting WebSocket...');
    
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
    this.isConnecting = false;
  }

  /**
   * Check if WebSocket is currently connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get current connection state
   * @returns {string} Connection state: 'connecting', 'open', 'closing', 'closed', or 'disconnected'
   */
  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    const states = ['connecting', 'open', 'closing', 'closed'];
    return states[this.ws.readyState] || 'unknown';
  }
}