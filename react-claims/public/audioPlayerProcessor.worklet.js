/**
 * AudioWorklet Processor for low-latency audio playback
 * 
 * This worklet handles audio playback with barge-in support for interruptions.
 * It runs on a separate thread for better performance than ScriptProcessor.
 */
class AudioPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.isPlaying = false;
    
    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        // Add audio data to buffer
        this.buffer.push(...event.data.audioData);
        this.isPlaying = true;
      } else if (event.data.type === 'barge-in') {
        // Clear buffer on interruption
        this.buffer = [];
        this.isPlaying = false;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    if (this.buffer.length === 0) {
      this.isPlaying = false;
      return true;
    }

    // Fill output buffer with audio data
    for (let i = 0; i < channel.length; i++) {
      if (this.buffer.length > 0) {
        channel[i] = this.buffer.shift();
      } else {
        channel[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-player-processor', AudioPlayerProcessor);
