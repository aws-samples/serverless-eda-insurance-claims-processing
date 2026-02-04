"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioCapture = void 0;
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
class AudioCapture {
    constructor() {
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.isCapturing = false;
        this.audioChunkCallback = null;
    }
    /**
     * Start capturing audio from the microphone
     * @returns Promise that resolves with the MediaStream
     */
    async startCapture() {
        if (this.isCapturing) {
            console.warn('Audio capture is already active');
            return this.mediaStream;
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
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            // Set up MediaRecorder
            await this.setupMediaRecorder(this.mediaStream);
            this.isCapturing = true;
            console.log('Audio capture started');
            return this.mediaStream;
        }
        catch (error) {
            console.error('Failed to start audio capture:', error);
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    throw new Error('Microphone permission denied. Please allow microphone access to use voice claims.');
                }
                else if (error.name === 'NotFoundError') {
                    throw new Error('No microphone found. Please connect a microphone to use voice claims.');
                }
            }
            throw error;
        }
    }
    /**
     * Set up MediaRecorder with appropriate codec and handlers
     */
    async setupMediaRecorder(stream) {
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
        const options = mimeType ? { mimeType } : {};
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
                }
                catch (error) {
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
    async convertToPCM(blob) {
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
        }
        catch (error) {
            console.error('Failed to convert audio to PCM:', error);
            return null;
        }
    }
    /**
     * Register callback for audio chunks
     * @param callback Function to call when audio chunk is ready
     */
    onAudioChunk(callback) {
        this.audioChunkCallback = callback;
    }
    /**
     * Stop capturing audio and release resources
     */
    stopCapture() {
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
    isCaptureActive() {
        return this.isCapturing;
    }
    /**
     * Check if browser supports required audio APIs
     */
    static isSupported() {
        return !!(navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.MediaRecorder &&
            (window.AudioContext || window.webkitAudioContext));
    }
}
exports.AudioCapture = AudioCapture;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXVkaW9DYXB0dXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXVkaW9DYXB0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFhLFlBQVk7SUFBekI7UUFDVSxnQkFBVyxHQUF1QixJQUFJLENBQUM7UUFDdkMsa0JBQWEsR0FBeUIsSUFBSSxDQUFDO1FBQzNDLGlCQUFZLEdBQXdCLElBQUksQ0FBQztRQUN6QyxnQkFBVyxHQUFZLEtBQUssQ0FBQztRQUM3Qix1QkFBa0IsR0FBMEMsSUFBSSxDQUFDO0lBMkwzRSxDQUFDO0lBekxDOzs7T0FHRztJQUNILEtBQUssQ0FBQyxZQUFZO1FBQ2hCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztZQUNoRCxPQUFPLElBQUksQ0FBQyxXQUFZLENBQUM7UUFDM0IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNILHdCQUF3QjtZQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3BFLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztZQUNuRSxDQUFDO1lBRUQsc0RBQXNEO1lBQ3RELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztnQkFDM0QsS0FBSyxFQUFFO29CQUNMLFVBQVUsRUFBRSxLQUFLO29CQUNqQixZQUFZLEVBQUUsQ0FBQztvQkFDZixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixlQUFlLEVBQUUsSUFBSTtpQkFDdEI7YUFDRixDQUFDLENBQUM7WUFFSCxxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVks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Q0FBQyxZQUFZO1lBQ25DLE1BQU0sQ0FBQyxhQUFhO1lBQ3BCLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FDNUQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWhNRCxvQ0FnTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEF1ZGlvQ2FwdHVyZSAtIEhhbmRsZXMgYXVkaW8gY2FwdHVyZSB1c2luZyBXZWIgQXVkaW8gQVBJXG4gKiBcbiAqIFRoaXMgY2xhc3MgbWFuYWdlczpcbiAqIC0gTWljcm9waG9uZSBhY2Nlc3MgdmlhIGdldFVzZXJNZWRpYVxuICogLSBBdWRpbyByZWNvcmRpbmcgd2l0aCBNZWRpYVJlY29yZGVyXG4gKiAtIENvbnZlcnNpb24gdG8gUENNIGZvcm1hdCBhdCAxNmtIelxuICogLSBTdHJlYW1pbmcgYXVkaW8gY2h1bmtzIHRvIFdlYlNvY2tldFxuICogXG4gKiBSZXF1aXJlbWVudHM6IDIuMywgOS4xLCA5LjJcbiAqL1xuZXhwb3J0IGNsYXNzIEF1ZGlvQ2FwdHVyZSB7XG4gIHByaXZhdGUgbWVkaWFTdHJlYW06IE1lZGlhU3RyZWFtIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbWVkaWFSZWNvcmRlcjogTWVkaWFSZWNvcmRlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGF1ZGlvQ29udGV4dDogQXVkaW9Db250ZXh0IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaXNDYXB0dXJpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBhdWRpb0NodW5rQ2FsbGJhY2s6ICgoY2h1bms6IEFycmF5QnVmZmVyKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBTdGFydCBjYXB0dXJpbmcgYXVkaW8gZnJvbSB0aGUgbWljcm9waG9uZVxuICAgKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgTWVkaWFTdHJlYW1cbiAgICovXG4gIGFzeW5jIHN0YXJ0Q2FwdHVyZSgpOiBQcm9taXNlPE1lZGlhU3RyZWFtPiB7XG4gICAgaWYgKHRoaXMuaXNDYXB0dXJpbmcpIHtcbiAgICAgIGNvbnNvbGUud2FybignQXVkaW8gY2FwdHVyZSBpcyBhbHJlYWR5IGFjdGl2ZScpO1xuICAgICAgcmV0dXJuIHRoaXMubWVkaWFTdHJlYW0hO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBDaGVjayBicm93c2VyIHN1cHBvcnRcbiAgICAgIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyB8fCAhbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdnZXRVc2VyTWVkaWEgaXMgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVxdWVzdCBtaWNyb3Bob25lIGFjY2VzcyB3aXRoIHNwZWNpZmljIGNvbnN0cmFpbnRzXG4gICAgICB0aGlzLm1lZGlhU3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xuICAgICAgICBhdWRpbzoge1xuICAgICAgICAgIHNhbXBsZVJhdGU6IDE2MDAwLFxuICAgICAgICAgIGNoYW5uZWxDb3VudDogMSxcbiAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uOiB0cnVlLFxuICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb246IHRydWUsXG4gICAgICAgICAgYXV0b0dhaW5Db250cm9sOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBDcmVhdGUgQXVkaW9Db250ZXh0IGZvciBwcm9jZXNzaW5nXG4gICAgICB0aGlzLmF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSh7XG4gICAgICAgIHNhbXBsZVJhdGU6IDE2MDAwXG4gICAgICB9KTtcblxuICAgICAgLy8gU2V0IHVwIE1lZGlhUmVjb3JkZXJcbiAgICAgIGF3YWl0IHRoaXMuc2V0dXBNZWRpYVJlY29yZGVyKHRoaXMubWVkaWFTdHJlYW0pO1xuXG4gICAgICB0aGlzLmlzQ2FwdHVyaW5nID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUubG9nKCdBdWRpbyBjYXB0dXJlIHN0YXJ0ZWQnKTtcblxuICAgICAgcmV0dXJuIHRoaXMubWVkaWFTdHJlYW07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzdGFydCBhdWRpbyBjYXB0dXJlOicsIGVycm9yKTtcbiAgICAgIFxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBbGxvd2VkRXJyb3InIHx8IGVycm9yLm5hbWUgPT09ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaWNyb3Bob25lIHBlcm1pc3Npb24gZGVuaWVkLiBQbGVhc2UgYWxsb3cgbWljcm9waG9uZSBhY2Nlc3MgdG8gdXNlIHZvaWNlIGNsYWltcy4nKTtcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvci5uYW1lID09PSAnTm90Rm91bmRFcnJvcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1pY3JvcGhvbmUgZm91bmQuIFBsZWFzZSBjb25uZWN0IGEgbWljcm9waG9uZSB0byB1c2Ugdm9pY2UgY2xhaW1zLicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgTWVkaWFSZWNvcmRlciB3aXRoIGFwcHJvcHJpYXRlIGNvZGVjIGFuZCBoYW5kbGVyc1xuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBzZXR1cE1lZGlhUmVjb3JkZXIoc3RyZWFtOiBNZWRpYVN0cmVhbSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIFRyeSB0byB1c2UgUENNIGNvZGVjIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGZhbGwgYmFjayB0byBzdXBwb3J0ZWQgZm9ybWF0XG4gICAgbGV0IG1pbWVUeXBlID0gJ2F1ZGlvL3dlYm07Y29kZWNzPXBjbSc7XG4gICAgXG4gICAgaWYgKCFNZWRpYVJlY29yZGVyLmlzVHlwZVN1cHBvcnRlZChtaW1lVHlwZSkpIHtcbiAgICAgIC8vIFRyeSBvcHVzIGNvZGVjIGFzIGZhbGxiYWNrXG4gICAgICBtaW1lVHlwZSA9ICdhdWRpby93ZWJtO2NvZGVjcz1vcHVzJztcbiAgICAgIFxuICAgICAgaWYgKCFNZWRpYVJlY29yZGVyLmlzVHlwZVN1cHBvcnRlZChtaW1lVHlwZSkpIHtcbiAgICAgICAgLy8gVXNlIGRlZmF1bHQgc3VwcG9ydGVkIGZvcm1hdFxuICAgICAgICBtaW1lVHlwZSA9ICcnO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG9wdGlvbnM6IE1lZGlhUmVjb3JkZXJPcHRpb25zID0gbWltZVR5cGUgPyB7IG1pbWVUeXBlIH0gOiB7fTtcbiAgICB0aGlzLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihzdHJlYW0sIG9wdGlvbnMpO1xuXG4gICAgLy8gSGFuZGxlIGRhdGEgYXZhaWxhYmxlIGV2ZW50XG4gICAgdGhpcy5tZWRpYVJlY29yZGVyLm9uZGF0YWF2YWlsYWJsZSA9IGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmRhdGEuc2l6ZSA+IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBDb252ZXJ0IHRvIFBDTSBmb3JtYXRcbiAgICAgICAgICBjb25zdCBwY21EYXRhID0gYXdhaXQgdGhpcy5jb252ZXJ0VG9QQ00oZXZlbnQuZGF0YSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHRoaXMuYXVkaW9DaHVua0NhbGxiYWNrICYmIHBjbURhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9DaHVua0NhbGxiYWNrKHBjbURhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcHJvY2VzcyBhdWRpbyBjaHVuazonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5tZWRpYVJlY29yZGVyLm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ01lZGlhUmVjb3JkZXIgZXJyb3I6JywgZXZlbnQpO1xuICAgIH07XG5cbiAgICAvLyBTdGFydCByZWNvcmRpbmcgd2l0aCAxMDBtcyBjaHVua3MgKDEwIGNodW5rcyBwZXIgc2Vjb25kKVxuICAgIHRoaXMubWVkaWFSZWNvcmRlci5zdGFydCgxMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXVkaW8gYmxvYiB0byBQQ00gZm9ybWF0XG4gICAqIEBwYXJhbSBibG9iIEF1ZGlvIGJsb2IgZnJvbSBNZWRpYVJlY29yZGVyXG4gICAqIEByZXR1cm5zIFBDTSBhdWRpbyBkYXRhIGFzIEFycmF5QnVmZmVyXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNvbnZlcnRUb1BDTShibG9iOiBCbG9iKTogUHJvbWlzZTxBcnJheUJ1ZmZlciB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLmF1ZGlvQ29udGV4dCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdBdWRpb0NvbnRleHQgbm90IGluaXRpYWxpemVkJyk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWFkIGJsb2IgYXMgQXJyYXlCdWZmZXJcbiAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gYXdhaXQgYmxvYi5hcnJheUJ1ZmZlcigpO1xuXG4gICAgICAvLyBEZWNvZGUgYXVkaW8gZGF0YVxuICAgICAgY29uc3QgYXVkaW9CdWZmZXIgPSBhd2FpdCB0aGlzLmF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIpO1xuXG4gICAgICAvLyBHZXQgYXVkaW8gZGF0YSBmcm9tIGZpcnN0IGNoYW5uZWwgKG1vbm8pXG4gICAgICBjb25zdCBjaGFubmVsRGF0YSA9IGF1ZGlvQnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuXG4gICAgICAvLyBDb252ZXJ0IEZsb2F0MzJBcnJheSB0byBJbnQxNkFycmF5IChQQ00gMTYtYml0KVxuICAgICAgY29uc3QgcGNtRGF0YSA9IG5ldyBJbnQxNkFycmF5KGNoYW5uZWxEYXRhLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5uZWxEYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIENvbnZlcnQgZnJvbSBbLTEsIDFdIHRvIFstMzI3NjgsIDMyNzY3XVxuICAgICAgICBjb25zdCBzYW1wbGUgPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgY2hhbm5lbERhdGFbaV0pKTtcbiAgICAgICAgcGNtRGF0YVtpXSA9IHNhbXBsZSA8IDAgPyBzYW1wbGUgKiAweDgwMDAgOiBzYW1wbGUgKiAweDdGRkY7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwY21EYXRhLmJ1ZmZlcjtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvbnZlcnQgYXVkaW8gdG8gUENNOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBjYWxsYmFjayBmb3IgYXVkaW8gY2h1bmtzXG4gICAqIEBwYXJhbSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYXVkaW8gY2h1bmsgaXMgcmVhZHlcbiAgICovXG4gIG9uQXVkaW9DaHVuayhjYWxsYmFjazogKGNodW5rOiBBcnJheUJ1ZmZlcikgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuYXVkaW9DaHVua0NhbGxiYWNrID0gY2FsbGJhY2s7XG4gIH1cblxuICAvKipcbiAgICogU3RvcCBjYXB0dXJpbmcgYXVkaW8gYW5kIHJlbGVhc2UgcmVzb3VyY2VzXG4gICAqL1xuICBzdG9wQ2FwdHVyZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5tZWRpYVJlY29yZGVyICYmIHRoaXMubWVkaWFSZWNvcmRlci5zdGF0ZSAhPT0gJ2luYWN0aXZlJykge1xuICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLnN0b3AoKTtcbiAgICAgIHRoaXMubWVkaWFSZWNvcmRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubWVkaWFTdHJlYW0pIHtcbiAgICAgIHRoaXMubWVkaWFTdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaCh0cmFjayA9PiB0cmFjay5zdG9wKCkpO1xuICAgICAgdGhpcy5tZWRpYVN0cmVhbSA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYXVkaW9Db250ZXh0KSB7XG4gICAgICB0aGlzLmF1ZGlvQ29udGV4dC5jbG9zZSgpO1xuICAgICAgdGhpcy5hdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuaXNDYXB0dXJpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmF1ZGlvQ2h1bmtDYWxsYmFjayA9IG51bGw7XG4gICAgXG4gICAgY29uc29sZS5sb2coJ0F1ZGlvIGNhcHR1cmUgc3RvcHBlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGF1ZGlvIGNhcHR1cmUgaXMgY3VycmVudGx5IGFjdGl2ZVxuICAgKi9cbiAgaXNDYXB0dXJlQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzQ2FwdHVyaW5nO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgcmVxdWlyZWQgYXVkaW8gQVBJc1xuICAgKi9cbiAgc3RhdGljIGlzU3VwcG9ydGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShcbiAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMgJiZcbiAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhICYmXG4gICAgICB3aW5kb3cuTWVkaWFSZWNvcmRlciAmJlxuICAgICAgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dClcbiAgICApO1xuICB9XG59XG4iXX0=