/**
 * Audio helper functions for converting between formats
 */

/**
 * Convert base64-encoded Int16 PCM to Float32Array for playback
 * @param {string} base64String - Base64-encoded audio data
 * @returns {Float32Array} - Float32 audio samples
 */
export function base64ToFloat32Array(base64String) {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  return float32Array;
}

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer - Audio data buffer
 * @returns {string} - Base64-encoded string
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32Array to Int16 PCM ArrayBuffer
 * @param {Float32Array} samples - Float32 audio samples
 * @returns {ArrayBuffer} - Int16 PCM buffer
 */
export function float32ToInt16PCM(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(i * 2, val, true); // true = little endian
  }

  return buffer;
}
