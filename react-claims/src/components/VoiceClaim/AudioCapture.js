/**
 * AudioCapture - Handles audio capture using AudioWorklet (modern Web Audio API)
 * Replaces deprecated ScriptProcessor with AudioWorklet for better performance
 * 
 * Requirements: 2.3, 9.1, 9.2
 */
export class AudioCapture {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.isCapturing = false;
    this.audioChunkCallback = null;
  }

  /**
   * Start capturing audio from the microphone
   * @returns {Promise<MediaStream>}
   */
  async startCapture() {
    if (this.isCapturing) {
      console.warn('Audio capture is already active');
      return this.mediaStream;
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive'
      });

      // Load the audio worklet processor
      await this.audioContext.audioWorklet.addModule('/audioCaptureProcessor.worklet.js');

      // Create worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');

      // Handle messages from worklet (raw ArrayBuffer)
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && this.audioChunkCallback) {
          // Receive raw ArrayBuffer from worklet
          // Pass it directly to callback (WebSocketAudioClient will handle base64 encoding)
          this.audioChunkCallback(event.data.data);
        }
      };

      // Create source from microphone stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Connect: microphone -> worklet
      this.sourceNode.connect(this.workletNode);

      this.isCapturing = true;
      console.log('Audio capture started with AudioWorklet at', this.audioContext.sampleRate, 'Hz -> 16kHz');

      return this.mediaStream;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow microphone access to use voice claims.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to use voice claims.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Register callback for audio chunks
   * @param {Function} callback - Function to call when audio chunk is ready (receives ArrayBuffer)
   */
  onAudioChunk(callback) {
    this.audioChunkCallback = callback;
  }

  /**
   * Stop capturing audio and release resources
   */
  stopCapture() {
    this.isCapturing = false;

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioChunkCallback = null;
    
    console.log('Audio capture stopped');
  }

  /**
   * Check if audio capture is currently active
   * @returns {boolean}
   */
  isCaptureActive() {
    return this.isCapturing;
  }

  /**
   * Check if browser supports required audio APIs
   * @returns {boolean}
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext) &&
      window.AudioWorklet
    );
  }
}
