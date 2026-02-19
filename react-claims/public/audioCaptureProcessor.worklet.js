/**
 * AudioWorklet Processor for capturing and processing microphone input
 * Handles resampling to 16kHz and conversion to Int16 PCM format
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.buffer = [];
    this.bufferSize = 512; // Process in chunks
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || !input[0]) {
      return true;
    }

    const inputData = input[0]; // Mono channel
    
    // Add to buffer
    for (let i = 0; i < inputData.length; i++) {
      this.buffer.push(inputData[i]);
    }

    // Process when we have enough samples
    if (this.buffer.length >= this.bufferSize) {
      const chunk = this.buffer.splice(0, this.bufferSize);
      
      // Resample to 16kHz (assuming input is 48kHz or 44.1kHz)
      const resampled = this.resample(chunk, sampleRate, this.targetSampleRate);
      
      // Convert to Int16 PCM
      const pcm = this.floatToPCM(resampled);
      
      // Send raw ArrayBuffer to main thread (no base64 encoding here)
      this.port.postMessage({
        type: 'audio',
        data: pcm.buffer
      }, [pcm.buffer]); // Transfer ownership for better performance
    }

    return true;
  }

  /**
   * Resample audio from source sample rate to target sample rate
   */
  resample(samples, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) {
      return samples;
    }

    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
      const t = srcIndex - srcIndexFloor;

      // Linear interpolation
      result[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t;
    }

    return result;
  }

  /**
   * Convert Float32 samples to Int16 PCM
   */
  floatToPCM(samples) {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(i * 2, val, true); // true = little endian
    }

    return new Uint8Array(buffer);
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
