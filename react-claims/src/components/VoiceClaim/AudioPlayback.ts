/**
 * AudioPlayback - Handles audio playback using Web Audio API
 * 
 * This class manages:
 * - Decoding PCM audio data at 24kHz
 * - Playing audio through speakers
 * - Queueing audio chunks for sequential playback
 * 
 * Requirements: 9.5
 */
export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private playbackQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    // Initialize AudioContext
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000 // Output sample rate for Nova Sonic
    });
  }

  /**
   * Play audio chunk
   * @param audioChunk PCM audio data at 24kHz as ArrayBuffer
   */
  async playAudio(audioChunk: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      console.error('AudioContext not initialized');
      return;
    }

    // Add to queue
    this.playbackQueue.push(audioChunk);

    // Start playback if not already playing
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  /**
   * Process the playback queue
   */
  private async processQueue(): Promise<void> {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    try {
      const audioChunk = this.playbackQueue.shift();
      if (!audioChunk || !this.audioContext) {
        this.isPlaying = false;
        return;
      }

      // Decode PCM audio data
      const audioBuffer = await this.decodePCM(audioChunk);
      
      if (!audioBuffer) {
        // Continue with next chunk if decoding failed
        await this.processQueue();
        return;
      }

      // Create audio source
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      // Set up callback for when playback ends
      this.currentSource.onended = () => {
        this.currentSource = null;
        // Process next chunk in queue
        this.processQueue();
      };

      // Start playback
      this.currentSource.start(0);
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.isPlaying = false;
      // Try to continue with next chunk
      await this.processQueue();
    }
  }

  /**
   * Decode PCM audio data to AudioBuffer
   * @param pcmData PCM audio data as ArrayBuffer (16-bit signed integers)
   * @returns AudioBuffer ready for playback
   */
  private async decodePCM(pcmData: ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      if (!this.audioContext) {
        return null;
      }

      // Convert Int16Array to Float32Array
      const int16Array = new Int16Array(pcmData);
      const float32Array = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        // Convert from [-32768, 32767] to [-1, 1]
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono channel
        float32Array.length,
        24000 // 24kHz sample rate
      );

      // Copy data to AudioBuffer
      audioBuffer.getChannelData(0).set(float32Array);

      return audioBuffer;
    } catch (error) {
      console.error('Failed to decode PCM audio:', error);
      return null;
    }
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    // Stop current playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }

    // Clear queue
    this.playbackQueue = [];
    this.isPlaying = false;
  }

  /**
   * Get the number of chunks in the playback queue
   */
  getQueueLength(): number {
    return this.playbackQueue.length;
  }

  /**
   * Check if audio is currently playing
   */
  isPlaybackActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
