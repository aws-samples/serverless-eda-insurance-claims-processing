/**
 * WebSocketAudioClient - Manages WebSocket connection for Strands BidiAgent
 * 
 * This class handles:
 * - WebSocket connection with SigV4 authentication
 * - Sending/receiving JSON events (Strands protocol)
 * - Audio encoding/decoding (base64 PCM)
 * - Event handling for all Strands event types
 * 
 * Requirements: 2.1, 10.2, 11.1, 11.4
 */
export class WebSocketAudioClient {
  constructor() {
    this.ws = null;
    this.url = '';
    this.isConnecting = false;
    
    // Callbacks
    this.audioReceivedCallback = null;
    this.transcriptionUpdateCallback = null;
    this.phaseChangeCallback = null;
    this.connectionStatusCallback = null;
    this.errorCallback = null;
    this.toolUseCallback = null;
    this.claimSubmittedCallback = null;
    this.eventCallback = null; // For event debugging UI
    
    // Event tracking
    this.events = [];
    this.maxEvents = 1000; // Limit to prevent memory issues
  }

  /**
   * Connect to WebSocket endpoint with SigV4 authentication
   * @param {string} url - WebSocket URL
   * @returns {Promise<void>}
   */
  async connect(url) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket is already connected or connecting');
      return;
    }

    this.url = url;
    this.isConnecting = true;

    return new Promise(async (resolve, reject) => {
      try {
        const { generatePresignedWebSocketUrl } = await import('../../utils');
        
        // Generate presigned URL with SigV4 authentication
        const authenticatedUrl = await generatePresignedWebSocketUrl(url);
        
        console.log('Connecting to Strands BidiAgent WebSocket...');
        
        this.ws = new WebSocket(authenticatedUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.isConnecting = false;
          
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
   * Handle incoming Strands BidiAgent events
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    if (typeof event.data === 'string') {
      try {
        const data = JSON.parse(event.data);
        console.log('Received Strands event:', data.type);
        
        // Track event for debugging UI
        this.trackEvent(data, 'in');
        
        switch (data.type) {
          case 'bidi_audio_stream':
            // Audio output from agent (base64-encoded PCM)
            if (data.audio && this.audioReceivedCallback) {
              // Pass base64 string directly - AudioPlayback will decode it
              this.audioReceivedCallback(data.audio, data.sample_rate || 24000);
            }
            break;
            
          case 'bidi_transcript_stream':
            // Transcription of speech (user or assistant)
            if (data.text && this.transcriptionUpdateCallback) {
              this.transcriptionUpdateCallback(data.text, data.role, data.is_final);
            }
            break;
            
          case 'bidi_interruption':
            // User interrupted agent's speech
            console.log('Interruption detected:', data.reason);
            if (this.phaseChangeCallback) {
              this.phaseChangeCallback('interrupted', data);
            }
            break;
            
          case 'tool_use_stream':
            // Agent is using a tool
            if (data.current_tool_use && this.toolUseCallback) {
              console.log('🔧 Tool:', data.current_tool_use.name);
              this.toolUseCallback(data.current_tool_use);
            }
            break;
            
          case 'tool_result':
            // Tool execution result
            if (data.tool_result) {
              const content = data.tool_result.content?.[0]?.text || 
                            JSON.stringify(data.tool_result.content);
              console.log('✅ Tool Result:', content);
              
              // Check if this is a claim submission result
              try {
                const result = JSON.parse(content);
                if (result.claimNumber && this.claimSubmittedCallback) {
                  this.claimSubmittedCallback(result.claimNumber);
                }
              } catch (e) {
                // Not JSON or no claimNumber, ignore
              }
            }
            break;
            
          case 'bidi_response_start':
            // Agent started generating response
            console.log('Agent started responding');
            if (this.phaseChangeCallback) {
              this.phaseChangeCallback('responding', data);
            }
            break;
            
          case 'bidi_response_complete':
            // Agent finished generating response
            console.log('Agent finished responding');
            if (this.phaseChangeCallback) {
              this.phaseChangeCallback('listening', data);
            }
            break;
            
          case 'bidi_connection_start':
            // Connection established
            console.log('Strands connection established');
            break;
            
          case 'bidi_connection_close':
            // Connection closed
            console.log('Strands connection closed:', data.reason);
            break;
            
          case 'bidi_error':
            // Error occurred
            console.error('Strands error:', data.error || data.message);
            if (this.errorCallback) {
              this.errorCallback(data.error || data.message || 'Unknown error');
            }
            break;
            
          default:
            console.warn('Unknown Strands event type:', data.type);
        }
      } catch (error) {
        console.error('Failed to parse Strands message:', error, event.data);
        if (this.errorCallback) {
          this.errorCallback('Failed to parse server message');
        }
      }
    } else {
      console.warn('Received non-JSON message (unexpected for Strands protocol)');
    }
  }

  /**
   * Send audio chunk using Strands protocol
   * @param {ArrayBuffer} audioChunk - PCM audio data (16kHz, mono, Int16)
   */
  sendAudio(audioChunk) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Convert ArrayBuffer to base64
      const base64Audio = this.arrayBufferToBase64(audioChunk);
      
      // Send as Strands bidi_audio_input event
      const payload = {
        type: 'bidi_audio_input',
        audio: base64Audio,
        format: 'pcm',
        sample_rate: 16000,
        channels: 1
      };
      
      this.ws.send(JSON.stringify(payload));
      
      // Track event for debugging UI (truncate audio for display)
      this.trackEvent({
        ...payload,
        audio: base64Audio.substring(0, 50) + '...[truncated]'
      }, 'out');
    } else {
      console.warn('WebSocket is not connected, cannot send audio. State:', this.ws?.readyState);
      if (this.errorCallback) {
        this.errorCallback('Cannot send audio - not connected');
      }
    }
  }

  /**
   * Send text input using Strands protocol
   * @param {string} text - Text message to send
   */
  sendText(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'bidi_text_input',
        text: text
      };
      
      this.ws.send(JSON.stringify(payload));
      console.log('Sent text input:', text);
    } else {
      console.warn('WebSocket is not connected, cannot send text');
      if (this.errorCallback) {
        this.errorCallback('Cannot send text - not connected');
      }
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   * @param {string} base64 - Base64-encoded string
   * @returns {ArrayBuffer} Decoded audio data
   */
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  /**
   * Convert ArrayBuffer to base64 string
   * @param {ArrayBuffer} buffer - Audio data
   * @returns {string} Base64-encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Register callback for received audio chunks
   * @param {Function} callback - Function(audioBuffer, sampleRate)
   */
  onAudioReceived(callback) {
    this.audioReceivedCallback = callback;
  }

  /**
   * Register callback for transcription updates
   * @param {Function} callback - Function(text, role, isFinal)
   */
  onTranscriptionUpdate(callback) {
    this.transcriptionUpdateCallback = callback;
  }

  /**
   * Register callback for conversation phase changes
   * @param {Function} callback - Function(phase, data)
   */
  onPhaseChange(callback) {
    this.phaseChangeCallback = callback;
  }

  /**
   * Register callback for connection status changes
   * @param {Function} callback - Function(status)
   */
  onConnectionStatus(callback) {
    this.connectionStatusCallback = callback;
  }

  /**
   * Register callback for errors
   * @param {Function} callback - Function(errorMessage)
   */
  onError(callback) {
    this.errorCallback = callback;
  }

  /**
   * Register callback for tool usage
   * @param {Function} callback - Function(toolUse)
   */
  onToolUse(callback) {
    this.toolUseCallback = callback;
  }

  /**
   * Register callback for claim submission success
   * @param {Function} callback - Function(claimNumber)
   */
  onClaimSubmitted(callback) {
    this.claimSubmittedCallback = callback;
  }

  /**
   * Register callback for event tracking (debugging UI)
   * @param {Function} callback - Function(events)
   */
  onEvent(callback) {
    this.eventCallback = callback;
  }

  /**
   * Track event for debugging UI
   * @param {Object} eventData - Event data
   * @param {string} type - 'in' or 'out'
   */
  trackEvent(eventData, type) {
    const event = {
      ...eventData,
      timestamp: Date.now(),
      direction: type
    };

    // Find existing event with same type or create new
    const existingIndex = this.events.findIndex(
      e => e.name === eventData.type && e.type === type
    );

    if (existingIndex >= 0) {
      // Update existing event
      this.events[existingIndex].count = (this.events[existingIndex].count || 1) + 1;
      this.events[existingIndex].events = this.events[existingIndex].events || [];
      this.events[existingIndex].events.push(event);
      this.events[existingIndex].timestamp = Date.now();
    } else {
      // Add new event
      this.events.unshift({
        key: `${eventData.type}-${Date.now()}`,
        name: eventData.type,
        type: type,
        count: 1,
        timestamp: Date.now(),
        events: [event]
      });
    }

    // Limit events to prevent memory issues
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Notify callback
    if (this.eventCallback) {
      this.eventCallback([...this.events]);
    }
  }

  /**
   * Get all tracked events
   * @returns {Array} Array of events
   */
  getEvents() {
    return [...this.events];
  }

  /**
   * Clear all tracked events
   */
  clearEvents() {
    this.events = [];
    if (this.eventCallback) {
      this.eventCallback([]);
    }
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
    this.transcriptionUpdateCallback = null;
    this.phaseChangeCallback = null;
    this.connectionStatusCallback = null;
    this.errorCallback = null;
    this.toolUseCallback = null;
    this.claimSubmittedCallback = null;
    
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
   * @returns {string} Connection state
   */
  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    const states = ['connecting', 'open', 'closing', 'closed'];
    return states[this.ws.readyState] || 'unknown';
  }
}
