/**
 * AudioPlayback - Handles audio playback using Web Audio API
 * 
 * This class manages:
 * - Simple AudioBufferSourceNode playback (proven to work)
 * - Scheduled playback to avoid gaps
 * - Dynamic sample rate handling
 * 
 * Requirements: 11.2, 11.3, 13.1
 */
export class AudioPlayback {
  constructor() {
    this.initialized = false;
    this.audioContext = null;
    this.nextPlayTime = 0;
    this.activeSources = [];  // Track active audio sources for interruption
  }

  /**
   * Initialize audio playback
   * @param {number} sampleRate - Sample rate (default: 24000 for Nova Sonic output)
   */
  async initialize(sampleRate = 24000) {
    if (this.initialized) {
      console.log('AudioPlayback already initialized');
      return;
    }

    try {
      console.log(`Initializing AudioPlayback with sample rate: ${sampleRate}Hz`);
      
      // Create AudioContext with specified sample rate
      this.audioContext = new AudioContext({ sampleRate });
      this.nextPlayTime = this.audioContext.currentTime;

      this.initialized = true;

      // Ensure AudioContext is running
      if (this.audioContext.state !== 'running') {
        console.log('Resuming AudioContext...');
        await this.audioContext.resume();
      }

      console.log('AudioPlayback initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioPlayback:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Play audio chunk
   * @param {string} base64Audio - Base64-encoded PCM audio data
   * @param {number} sampleRate - Sample rate of the audio (default: 24000)
   */
  async playAudio(base64Audio, sampleRate = 24000) {
    if (!this.initialized) {
      console.log('AudioPlayback not initialized, initializing now...');
      await this.initialize(sampleRate);
    }

    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Validate audio data
    if (!base64Audio) {
      console.warn('Received empty audio chunk');
      return;
    }

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;  // Convert to -1.0 to 1.0 range
      }
      
      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1,  // mono
        float32.length,
        sampleRate
      );
      audioBuffer.getChannelData(0).set(float32);
      
      // Schedule playback
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Track this source for potential interruption
      this.activeSources.push(source);
      
      // Remove from active sources when it ends
      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
      };
      
      // Schedule at the next available time with small buffer to prevent gaps
      const currentTime = this.audioContext.currentTime;
      
      // If nextPlayTime is in the past, add a small buffer to current time
      // This prevents choppy audio when chunks arrive with slight delays
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.05; // 50ms buffer
      }
      
      source.start(this.nextPlayTime);
      
      // Update next play time
      this.nextPlayTime += audioBuffer.duration;
      
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  /**
   * Barge-in: Clear scheduled audio on interruption
   * This is called when the user interrupts the agent
   */
  bargeIn() {
    if (!this.initialized) {
      return;
    }

    console.log('Barge-in: Stopping all active audio sources');
    
    // Stop all currently playing/scheduled audio sources
    const stoppedCount = this.activeSources.length;
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might have already ended, ignore
      }
    });
    this.activeSources = [];
    
    // Reset next play time to current time to clear any scheduled audio
    this.nextPlayTime = this.audioContext.currentTime;
    
    console.log(`Barge-in complete: ${stoppedCount} sources stopped`);
  }

  /**
   * Stop and cleanup audio playback
   */
  cleanup() {
    if (!this.initialized) {
      return;
    }

    console.log('Cleaning up AudioPlayback');

    // Stop all active sources before closing context
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might have already ended
      }
    });
    this.activeSources = [];

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.initialized = false;
    this.audioContext = null;
    this.nextPlayTime = 0;
  }

  /**
   * Alias for cleanup() - for compatibility
   */
  stop() {
    this.cleanup();
  }

  /**
   * Check if audio is currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.initialized && this.audioContext && this.audioContext.state === 'running';
  }
}
