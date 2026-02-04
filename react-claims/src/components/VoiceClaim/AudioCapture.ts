/**
 * AudioCapture - Handles audio capture using Web Audio API
 * 
 * This class manages:
 * - Microphone access via getUserMedia
 * - Audio recording with MediaRecorder
 * - Conversion to PCM format at 16kHz
 * - Streaming audio chunks to WebSocket
 * 
 * Requirements: 2.3, 9.1, 9.2
 */
export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isCapturing: boolean = false;
  private audioChunkCallback: ((chunk: ArrayBuffer) => void) | null = null;

  /**
   * Start capturing audio from the microphone
   * @returns Promise that resolves with the MediaStream
   */
  async startCapture(): Promise<MediaStream> {
    if (this.isCapturing) {
      console.warn('Audio capture is already active');
      return this.mediaStream!;
    }

    try {
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request microphone access with specific constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create AudioContext for processing
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });

      // Set up MediaRecorder
      await this.setupMediaRecorder(this.mediaStream);

      this.isCapturing = true;
      console.log('Audio capture started');

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
   * Set up MediaRecorder with appropriate codec and handlers
   */
  private async setupMediaRecorder(stream: MediaStream): Promise<void> {
    // Try to use PCM codec if available, otherwise fall back to supported format
    let mimeType = 'audio/webm;codecs=pcm';
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // Try opus codec as fallback
      mimeType = 'audio/webm;codecs=opus';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Use default supported format
        mimeType = '';
      }
    }

    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(stream, options);

    // Handle data available event
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        try {
          // Convert to PCM format
          const pcmData = await this.convertToPCM(event.data);
          
          if (this.audioChunkCallback && pcmData) {
            this.audioChunkCallback(pcmData);
          }
        } catch (error) {
          console.error('Failed to process audio chunk:', error);
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    // Start recording with 100ms chunks (10 chunks per second)
    this.mediaRecorder.start(100);
  }

  /**
   * Convert audio blob to PCM format
   * @param blob Audio blob from MediaRecorder
   * @returns PCM audio data as ArrayBuffer
   */
  private async convertToPCM(blob: Blob): Promise<ArrayBuffer | null> {
    try {
      if (!this.audioContext) {
        console.error('AudioContext not initialized');
        return null;
      }

      // Read blob as ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Get audio data from first channel (mono)
      const channelData = audioBuffer.getChannelData(0);

      // Convert Float32Array to Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        // Convert from [-1, 1] to [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      return pcmData.buffer;
    } catch (error) {
      console.error('Failed to convert audio to PCM:', error);
      return null;
    }
  }

  /**
   * Register callback for audio chunks
   * @param callback Function to call when audio chunk is ready
   */
  onAudioChunk(callback: (chunk: ArrayBuffer) => void): void {
    this.audioChunkCallback = callback;
  }

  /**
   * Stop capturing audio and release resources
   */
  stopCapture(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isCapturing = false;
    this.audioChunkCallback = null;
    
    console.log('Audio capture stopped');
  }

  /**
   * Check if audio capture is currently active
   */
  isCaptureActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Check if browser supports required audio APIs
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      (window.AudioContext || (window as any).webkitAudioContext)
    );
  }
}
