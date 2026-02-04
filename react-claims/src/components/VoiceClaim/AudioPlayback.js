"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioPlayback = void 0;
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
class AudioPlayback {
    constructor() {
        this.audioContext = null;
        this.playbackQueue = [];
        this.isPlaying = false;
        this.currentSource = null;
        // Initialize AudioContext
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 24000 // Output sample rate for Nova Sonic
        });
    }
    /**
     * Play audio chunk
     * @param audioChunk PCM audio data at 24kHz as ArrayBuffer
     */
    async playAudio(audioChunk) {
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
    async processQueue() {
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
        }
        catch (error) {
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
    async decodePCM(pcmData) {
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
            const audioBuffer = this.audioContext.createBuffer(1, // mono channel
            float32Array.length, 24000 // 24kHz sample rate
            );
            // Copy data to AudioBuffer
            audioBuffer.getChannelData(0).set(float32Array);
            return audioBuffer;
        }
        catch (error) {
            console.error('Failed to decode PCM audio:', error);
            return null;
        }
    }
    /**
     * Stop playback and clear queue
     */
    stop() {
        // Stop current playback
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            }
            catch (error) {
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
    getQueueLength() {
        return this.playbackQueue.length;
    }
    /**
     * Check if audio is currently playing
     */
    isPlaybackActive() {
        return this.isPlaying;
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
exports.AudioPlayback = AudioPlayback;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXVkaW9QbGF5YmFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkF1ZGlvUGxheWJhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxhQUFhO0lBTXhCO1FBTFEsaUJBQVksR0FBd0IsSUFBSSxDQUFDO1FBQ3pDLGtCQUFhLEdBQWtCLEVBQUUsQ0FBQztRQUNsQyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLGtCQUFhLEdBQWlDLElBQUksQ0FBQztRQUd6RCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNsRixVQUFVLEVBQUUsS0FBSyxDQUFDLG9DQUFvQztTQUN2RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUF1QjtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUM5QyxPQUFPO1FBQ1QsQ0FBQztRQUVELGVBQWU7UUFDZixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVwQyx3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM1QixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLFlBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUN2QixPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBRXRCLElBQUksQ0FBQztZQUNILE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU87WUFDVCxDQUFDO1lBRUQsd0JBQXdCO1lBQ3hCLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVyRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLDhDQUE4QztnQkFDOUMsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzFCLE9BQU87WUFDVCxDQUFDO1lBRUQsc0JBQXNCO1lBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztZQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTFELHlDQUF5QztZQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUMxQiw4QkFBOEI7Z0JBQzlCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN0QixDQUFDLENBQUM7WUFFRixpQkFBaUI7WUFDakIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLGtDQUFrQztZQUNsQyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM1QixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQW9CO1FBQzFDLElBQUksQ0FBQztZQUNILElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFekQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsMENBQTBDO2dCQUMxQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRSxDQUFDO1lBRUQscUJBQXFCO1lBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUNoRCxDQUFDLEVBQUUsZUFBZTtZQUNsQixZQUFZLENBQUMsTUFBTSxFQUNuQixLQUFLLENBQUMsb0JBQW9CO2FBQzNCLENBQUM7WUFFRiwyQkFBMkI7WUFDM0IsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFaEQsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILElBQUk7UUFDRix3QkFBd0I7UUFDeEIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDO2dCQUNILElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUIsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsbUNBQW1DO1lBQ3JDLENBQUM7WUFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUM1QixDQUFDO1FBRUQsY0FBYztRQUNkLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNILGdCQUFnQjtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ0wsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVosSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBbEtELHNDQWtLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQXVkaW9QbGF5YmFjayAtIEhhbmRsZXMgYXVkaW8gcGxheWJhY2sgdXNpbmcgV2ViIEF1ZGlvIEFQSVxuICogXG4gKiBUaGlzIGNsYXNzIG1hbmFnZXM6XG4gKiAtIERlY29kaW5nIFBDTSBhdWRpbyBkYXRhIGF0IDI0a0h6XG4gKiAtIFBsYXlpbmcgYXVkaW8gdGhyb3VnaCBzcGVha2Vyc1xuICogLSBRdWV1ZWluZyBhdWRpbyBjaHVua3MgZm9yIHNlcXVlbnRpYWwgcGxheWJhY2tcbiAqIFxuICogUmVxdWlyZW1lbnRzOiA5LjVcbiAqL1xuZXhwb3J0IGNsYXNzIEF1ZGlvUGxheWJhY2sge1xuICBwcml2YXRlIGF1ZGlvQ29udGV4dDogQXVkaW9Db250ZXh0IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGxheWJhY2tRdWV1ZTogQXJyYXlCdWZmZXJbXSA9IFtdO1xuICBwcml2YXRlIGlzUGxheWluZzogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGN1cnJlbnRTb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZSB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIEluaXRpYWxpemUgQXVkaW9Db250ZXh0XG4gICAgdGhpcy5hdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoe1xuICAgICAgc2FtcGxlUmF0ZTogMjQwMDAgLy8gT3V0cHV0IHNhbXBsZSByYXRlIGZvciBOb3ZhIFNvbmljXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGxheSBhdWRpbyBjaHVua1xuICAgKiBAcGFyYW0gYXVkaW9DaHVuayBQQ00gYXVkaW8gZGF0YSBhdCAyNGtIeiBhcyBBcnJheUJ1ZmZlclxuICAgKi9cbiAgYXN5bmMgcGxheUF1ZGlvKGF1ZGlvQ2h1bms6IEFycmF5QnVmZmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmF1ZGlvQ29udGV4dCkge1xuICAgICAgY29uc29sZS5lcnJvcignQXVkaW9Db250ZXh0IG5vdCBpbml0aWFsaXplZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFkZCB0byBxdWV1ZVxuICAgIHRoaXMucGxheWJhY2tRdWV1ZS5wdXNoKGF1ZGlvQ2h1bmspO1xuXG4gICAgLy8gU3RhcnQgcGxheWJhY2sgaWYgbm90IGFscmVhZHkgcGxheWluZ1xuICAgIGlmICghdGhpcy5pc1BsYXlpbmcpIHtcbiAgICAgIGF3YWl0IHRoaXMucHJvY2Vzc1F1ZXVlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdGhlIHBsYXliYWNrIHF1ZXVlXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NRdWV1ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5wbGF5YmFja1F1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5pc1BsYXlpbmcgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmlzUGxheWluZyA9IHRydWU7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYXVkaW9DaHVuayA9IHRoaXMucGxheWJhY2tRdWV1ZS5zaGlmdCgpO1xuICAgICAgaWYgKCFhdWRpb0NodW5rIHx8ICF0aGlzLmF1ZGlvQ29udGV4dCkge1xuICAgICAgICB0aGlzLmlzUGxheWluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIERlY29kZSBQQ00gYXVkaW8gZGF0YVxuICAgICAgY29uc3QgYXVkaW9CdWZmZXIgPSBhd2FpdCB0aGlzLmRlY29kZVBDTShhdWRpb0NodW5rKTtcbiAgICAgIFxuICAgICAgaWYgKCFhdWRpb0J1ZmZlcikge1xuICAgICAgICAvLyBDb250aW51ZSB3aXRoIG5leHQgY2h1bmsgaWYgZGVjb2RpbmcgZmFpbGVkXG4gICAgICAgIGF3YWl0IHRoaXMucHJvY2Vzc1F1ZXVlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3JlYXRlIGF1ZGlvIHNvdXJjZVxuICAgICAgdGhpcy5jdXJyZW50U291cmNlID0gdGhpcy5hdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICB0aGlzLmN1cnJlbnRTb3VyY2UuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG4gICAgICB0aGlzLmN1cnJlbnRTb3VyY2UuY29ubmVjdCh0aGlzLmF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgIC8vIFNldCB1cCBjYWxsYmFjayBmb3Igd2hlbiBwbGF5YmFjayBlbmRzXG4gICAgICB0aGlzLmN1cnJlbnRTb3VyY2Uub25lbmRlZCA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5jdXJyZW50U291cmNlID0gbnVsbDtcbiAgICAgICAgLy8gUHJvY2VzcyBuZXh0IGNodW5rIGluIHF1ZXVlXG4gICAgICAgIHRoaXMucHJvY2Vzc1F1ZXVlKCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBTdGFydCBwbGF5YmFja1xuICAgICAgdGhpcy5jdXJyZW50U291cmNlLnN0YXJ0KDApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGxheSBhdWRpbzonLCBlcnJvcik7XG4gICAgICB0aGlzLmlzUGxheWluZyA9IGZhbHNlO1xuICAgICAgLy8gVHJ5IHRvIGNvbnRpbnVlIHdpdGggbmV4dCBjaHVua1xuICAgICAgYXdhaXQgdGhpcy5wcm9jZXNzUXVldWUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVjb2RlIFBDTSBhdWRpbyBkYXRhIHRvIEF1ZGlvQnVmZmVyXG4gICAqIEBwYXJhbSBwY21EYXRhIFBDTSBhdWRpbyBkYXRhIGFzIEFycmF5QnVmZmVyICgxNi1iaXQgc2lnbmVkIGludGVnZXJzKVxuICAgKiBAcmV0dXJucyBBdWRpb0J1ZmZlciByZWFkeSBmb3IgcGxheWJhY2tcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZGVjb2RlUENNKHBjbURhdGE6IEFycmF5QnVmZmVyKTogUHJvbWlzZTxBdWRpb0J1ZmZlciB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLmF1ZGlvQ29udGV4dCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gQ29udmVydCBJbnQxNkFycmF5IHRvIEZsb2F0MzJBcnJheVxuICAgICAgY29uc3QgaW50MTZBcnJheSA9IG5ldyBJbnQxNkFycmF5KHBjbURhdGEpO1xuICAgICAgY29uc3QgZmxvYXQzMkFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShpbnQxNkFycmF5Lmxlbmd0aCk7XG4gICAgICBcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW50MTZBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBDb252ZXJ0IGZyb20gWy0zMjc2OCwgMzI3NjddIHRvIFstMSwgMV1cbiAgICAgICAgZmxvYXQzMkFycmF5W2ldID0gaW50MTZBcnJheVtpXSAvIChpbnQxNkFycmF5W2ldIDwgMCA/IDB4ODAwMCA6IDB4N0ZGRik7XG4gICAgICB9XG5cbiAgICAgIC8vIENyZWF0ZSBBdWRpb0J1ZmZlclxuICAgICAgY29uc3QgYXVkaW9CdWZmZXIgPSB0aGlzLmF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXIoXG4gICAgICAgIDEsIC8vIG1vbm8gY2hhbm5lbFxuICAgICAgICBmbG9hdDMyQXJyYXkubGVuZ3RoLFxuICAgICAgICAyNDAwMCAvLyAyNGtIeiBzYW1wbGUgcmF0ZVxuICAgICAgKTtcblxuICAgICAgLy8gQ29weSBkYXRhIHRvIEF1ZGlvQnVmZmVyXG4gICAgICBhdWRpb0J1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoZmxvYXQzMkFycmF5KTtcblxuICAgICAgcmV0dXJuIGF1ZGlvQnVmZmVyO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVjb2RlIFBDTSBhdWRpbzonLCBlcnJvcik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcCBwbGF5YmFjayBhbmQgY2xlYXIgcXVldWVcbiAgICovXG4gIHN0b3AoKTogdm9pZCB7XG4gICAgLy8gU3RvcCBjdXJyZW50IHBsYXliYWNrXG4gICAgaWYgKHRoaXMuY3VycmVudFNvdXJjZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5jdXJyZW50U291cmNlLnN0b3AoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgaWYgYWxyZWFkeSBzdG9wcGVkXG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJlbnRTb3VyY2UgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIENsZWFyIHF1ZXVlXG4gICAgdGhpcy5wbGF5YmFja1F1ZXVlID0gW107XG4gICAgdGhpcy5pc1BsYXlpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBjaHVua3MgaW4gdGhlIHBsYXliYWNrIHF1ZXVlXG4gICAqL1xuICBnZXRRdWV1ZUxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnBsYXliYWNrUXVldWUubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGF1ZGlvIGlzIGN1cnJlbnRseSBwbGF5aW5nXG4gICAqL1xuICBpc1BsYXliYWNrQWN0aXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzUGxheWluZztcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnVwIHJlc291cmNlc1xuICAgKi9cbiAgY2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICBcbiAgICBpZiAodGhpcy5hdWRpb0NvbnRleHQpIHtcbiAgICAgIHRoaXMuYXVkaW9Db250ZXh0LmNsb3NlKCk7XG4gICAgICB0aGlzLmF1ZGlvQ29udGV4dCA9IG51bGw7XG4gICAgfVxuICB9XG59XG4iXX0=