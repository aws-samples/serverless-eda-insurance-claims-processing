"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketAudioClient = void 0;
/**
 * WebSocketAudioClient - Manages WebSocket connection for bidirectional audio streaming
 *
 * This class handles:
 * - WebSocket connection establishment with authentication
 * - Sending audio chunks to the backend
 * - Receiving audio chunks from the backend
 * - Receiving claim data updates
 * - Automatic reconnection with exponential backoff
 *
 * Requirements: 2.1, 10.2, 11.1, 11.4
 */
class WebSocketAudioClient {
    constructor() {
        this.ws = null;
        this.url = '';
        this.authToken = '';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000; // Start with 1 second
        this.isConnecting = false;
        // Callbacks
        this.audioReceivedCallback = null;
        this.claimDataUpdateCallback = null;
        this.transcriptionUpdateCallback = null;
        this.phaseChangeCallback = null;
        this.connectionStatusCallback = null;
        this.errorCallback = null;
        this.claimSubmittedCallback = null;
    }
    /**
     * Connect to WebSocket endpoint with authentication
     * @param url WebSocket URL (wss://...)
     * @param authToken Authentication token for SigV4 or OAuth 2.0
     * @param metadata Optional metadata to send on connection (e.g., customerId, policyId)
     */
    async connect(url, authToken, metadata) {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.warn('WebSocket is already connected or connecting');
            return;
        }
        this.url = url;
        this.authToken = authToken;
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket connection with authentication
                // Note: WebSocket doesn't support custom headers directly
                // Authentication will be handled via query parameter or subprotocol
                const authenticatedUrl = `${url}?auth=${encodeURIComponent(authToken)}`;
                this.ws = new WebSocket(authenticatedUrl);
                this.ws.binaryType = 'arraybuffer';
                this.ws.onopen = () => {
                    var _a;
                    console.log('WebSocket connected');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    // Send initial metadata if provided (customer ID, policy ID, etc.)
                    if (metadata && Object.keys(metadata).length > 0) {
                        const metadataMessage = JSON.stringify({
                            type: 'metadata',
                            data: metadata
                        });
                        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(metadataMessage);
                    }
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
                    // Attempt reconnection if not a normal closure
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    }
                };
            }
            catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }
    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        setTimeout(() => {
            this.connect(this.url, this.authToken).catch((error) => {
                console.error('Reconnection failed:', error);
            });
        }, this.reconnectDelay);
        // Exponential backoff: 1s, 2s, 4s
        this.reconnectDelay *= 2;
    }
    /**
     * Handle incoming WebSocket messages
     * Distinguishes between binary (audio) and JSON (metadata) frames
     */
    handleMessage(event) {
        if (event.data instanceof ArrayBuffer) {
            // Binary frame - audio data
            if (this.audioReceivedCallback) {
                this.audioReceivedCallback(event.data);
            }
        }
        else if (typeof event.data === 'string') {
            // JSON frame - metadata (claim data updates, transcription, etc.)
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'claim_data_update' && message.data) {
                    if (this.claimDataUpdateCallback) {
                        this.claimDataUpdateCallback(message.data);
                    }
                }
                else if (message.type === 'transcription' && message.text) {
                    if (this.transcriptionUpdateCallback) {
                        this.transcriptionUpdateCallback(message.text);
                    }
                }
                else if (message.type === 'phase_change' && message.phase) {
                    if (this.phaseChangeCallback) {
                        this.phaseChangeCallback(message.phase);
                    }
                }
                else if (message.type === 'claim_submitted' && message.claimNumber) {
                    if (this.claimSubmittedCallback) {
                        this.claimSubmittedCallback(message.claimNumber);
                    }
                }
            }
            catch (error) {
                console.error('Failed to parse JSON message:', error);
            }
        }
    }
    /**
     * Send audio chunk to backend
     * @param audioChunk PCM audio data as ArrayBuffer
     */
    sendAudio(audioChunk) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(audioChunk);
        }
        else {
            console.warn('WebSocket is not connected, cannot send audio');
        }
    }
    /**
     * Register callback for received audio chunks
     * @param callback Function to call when audio is received
     */
    onAudioReceived(callback) {
        this.audioReceivedCallback = callback;
    }
    /**
     * Register callback for claim data updates
     * @param callback Function to call when claim data is updated
     */
    onClaimDataUpdate(callback) {
        this.claimDataUpdateCallback = callback;
    }
    /**
     * Register callback for transcription updates
     * @param callback Function to call when transcription is updated
     */
    onTranscriptionUpdate(callback) {
        this.transcriptionUpdateCallback = callback;
    }
    /**
     * Register callback for conversation phase changes
     * @param callback Function to call when phase changes
     */
    onPhaseChange(callback) {
        this.phaseChangeCallback = callback;
    }
    /**
     * Register callback for connection status changes
     * @param callback Function to call when connection status changes
     */
    onConnectionStatus(callback) {
        this.connectionStatusCallback = callback;
    }
    /**
     * Register callback for errors
     * @param callback Function to call when an error occurs
     */
    onError(callback) {
        this.errorCallback = callback;
    }
    /**
     * Register callback for claim submission success
     * @param callback Function to call when claim is successfully submitted
     */
    onClaimSubmitted(callback) {
        this.claimSubmittedCallback = callback;
    }
    /**
     * Disconnect WebSocket and cleanup
     */
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
        }
        // Clear callbacks
        this.audioReceivedCallback = null;
        this.claimDataUpdateCallback = null;
        this.transcriptionUpdateCallback = null;
        this.phaseChangeCallback = null;
        this.connectionStatusCallback = null;
        this.errorCallback = null;
        this.claimSubmittedCallback = null;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
    }
    /**
     * Check if WebSocket is currently connected
     */
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
exports.WebSocketAudioClient = WebSocketAudioClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU29ja2V0QXVkaW9DbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJXZWJTb2NrZXRBdWRpb0NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQTs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQWEsb0JBQW9CO0lBQWpDO1FBQ1UsT0FBRSxHQUFxQixJQUFJLENBQUM7UUFDNUIsUUFBRyxHQUFXLEVBQUUsQ0FBQztRQUNqQixjQUFTLEdBQVcsRUFBRSxDQUFDO1FBQ3ZCLHNCQUFpQixHQUFXLENBQUMsQ0FBQztRQUM5Qix5QkFBb0IsR0FBVyxDQUFDLENBQUM7UUFDakMsbUJBQWMsR0FBVyxJQUFJLENBQUMsQ0FBQyxzQkFBc0I7UUFDckQsaUJBQVksR0FBWSxLQUFLLENBQUM7UUFFdEMsWUFBWTtRQUNKLDBCQUFxQixHQUEwQyxJQUFJLENBQUM7UUFDcEUsNEJBQXVCLEdBQWdELElBQUksQ0FBQztRQUM1RSxnQ0FBMkIsR0FBb0MsSUFBSSxDQUFDO1FBQ3BFLHdCQUFtQixHQUFxQyxJQUFJLENBQUM7UUFDN0QsNkJBQXdCLEdBQXNFLElBQUksQ0FBQztRQUNuRyxrQkFBYSxHQUFxQyxJQUFJLENBQUM7UUFDdkQsMkJBQXNCLEdBQTJDLElBQUksQ0FBQztJQWdQaEYsQ0FBQztJQTlPQzs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBVyxFQUFFLFNBQWlCLEVBQUUsUUFBOEI7UUFDMUUsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1RSxPQUFPLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxDQUFDLENBQUM7WUFDN0QsT0FBTztRQUNULENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcs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LFFBQXVDO1FBQ3RELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxRQUFRLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsVUFBVTtRQUNSLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDakIsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUM7UUFDcEMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQztRQUN4QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUVuQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVc7UUFDVCxPQUFPLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBaFFELG9EQWdRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsYWltRGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIFdlYlNvY2tldEF1ZGlvQ2xpZW50IC0gTWFuYWdlcyBXZWJTb2NrZXQgY29ubmVjdGlvbiBmb3IgYmlkaXJlY3Rpb25hbCBhdWRpbyBzdHJlYW1pbmdcbiAqIFxuICogVGhpcyBjbGFzcyBoYW5kbGVzOlxuICogLSBXZWJTb2NrZXQgY29ubmVjdGlvbiBlc3RhYmxpc2htZW50IHdpdGggYXV0aGVudGljYXRpb25cbiAqIC0gU2VuZGluZyBhdWRpbyBjaHVua3MgdG8gdGhlIGJhY2tlbmRcbiAqIC0gUmVjZWl2aW5nIGF1ZGlvIGNodW5rcyBmcm9tIHRoZSBiYWNrZW5kXG4gKiAtIFJlY2VpdmluZyBjbGFpbSBkYXRhIHVwZGF0ZXNcbiAqIC0gQXV0b21hdGljIHJlY29ubmVjdGlvbiB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcbiAqIFxuICogUmVxdWlyZW1lbnRzOiAyLjEsIDEwLjIsIDExLjEsIDExLjRcbiAqL1xuZXhwb3J0IGNsYXNzIFdlYlNvY2tldEF1ZGlvQ2xpZW50IHtcbiAgcHJpdmF0ZSB3czogV2ViU29ja2V0IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgdXJsOiBzdHJpbmcgPSAnJztcbiAgcHJpdmF0ZSBhdXRoVG9rZW46IHN0cmluZyA9ICcnO1xuICBwcml2YXRlIHJlY29ubmVjdEF0dGVtcHRzOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIG1heFJlY29ubmVjdEF0dGVtcHRzOiBudW1iZXIgPSAzO1xuICBwcml2YXRlIHJlY29ubmVjdERlbGF5OiBudW1iZXIgPSAxMDAwOyAvLyBTdGFydCB3aXRoIDEgc2Vjb25kXG4gIHByaXZhdGUgaXNDb25uZWN0aW5nOiBib29sZWFuID0gZmFsc2U7XG4gIFxuICAvLyBDYWxsYmFja3NcbiAgcHJpdmF0ZSBhdWRpb1JlY2VpdmVkQ2FsbGJhY2s6ICgoYXVkaW86IEFycmF5QnVmZmVyKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNsYWltRGF0YVVwZGF0ZUNhbGxiYWNrOiAoKGRhdGE6IFBhcnRpYWw8Q2xhaW1EYXRhPikgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB0cmFuc2NyaXB0aW9uVXBkYXRlQ2FsbGJhY2s6ICgodGV4dDogc3RyaW5nKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBoYXNlQ2hhbmdlQ2FsbGJhY2s6ICgocGhhc2U6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2s6ICgoc3RhdHVzOiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnIHwgJ2Vycm9yJykgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBlcnJvckNhbGxiYWNrOiAoKGVycm9yOiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY2xhaW1TdWJtaXR0ZWRDYWxsYmFjazogKChjbGFpbU51bWJlcjogc3RyaW5nKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIFdlYlNvY2tldCBlbmRwb2ludCB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAqIEBwYXJhbSB1cmwgV2ViU29ja2V0IFVSTCAod3NzOi8vLi4uKVxuICAgKiBAcGFyYW0gYXV0aFRva2VuIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBTaWdWNCBvciBPQXV0aCAyLjBcbiAgICogQHBhcmFtIG1ldGFkYXRhIE9wdGlvbmFsIG1ldGFkYXRhIHRvIHNlbmQgb24gY29ubmVjdGlvbiAoZS5nLiwgY3VzdG9tZXJJZCwgcG9saWN5SWQpXG4gICAqL1xuICBhc3luYyBjb25uZWN0KHVybDogc3RyaW5nLCBhdXRoVG9rZW46IHN0cmluZywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuaXNDb25uZWN0aW5nIHx8ICh0aGlzLndzICYmIHRoaXMud3MucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1dlYlNvY2tldCBpcyBhbHJlYWR5IGNvbm5lY3RlZCBvciBjb25uZWN0aW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy5hdXRoVG9rZW4gPSBhdXRoVG9rZW47XG4gICAgdGhpcy5pc0Nvbm5lY3RpbmcgPSB0cnVlO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENyZWF0ZSBXZWJTb2NrZXQgY29ubmVjdGlvbiB3aXRoIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIC8vIE5vdGU6IFdlYlNvY2tldCBkb2Vzbid0IHN1cHBvcnQgY3VzdG9tIGhlYWRlcnMgZGlyZWN0bHlcbiAgICAgICAgLy8gQXV0aGVudGljYXRpb24gd2lsbCBiZSBoYW5kbGVkIHZpYSBxdWVyeSBwYXJhbWV0ZXIgb3Igc3VicHJvdG9jb2xcbiAgICAgICAgY29uc3QgYXV0aGVudGljYXRlZFVybCA9IGAke3VybH0/YXV0aD0ke2VuY29kZVVSSUNvbXBvbmVudChhdXRoVG9rZW4pfWA7XG4gICAgICAgIHRoaXMud3MgPSBuZXcgV2ViU29ja2V0KGF1dGhlbnRpY2F0ZWRVcmwpO1xuICAgICAgICB0aGlzLndzLmJpbmFyeVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG4gICAgICAgIHRoaXMud3Mub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdXZWJTb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgICAgdGhpcy5pc0Nvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICAgICAgICB0aGlzLnJlY29ubmVjdERlbGF5ID0gMTAwMDtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBTZW5kIGluaXRpYWwgbWV0YWRhdGEgaWYgcHJvdmlkZWQgKGN1c3RvbWVyIElELCBwb2xpY3kgSUQsIGV0Yy4pXG4gICAgICAgICAgaWYgKG1ldGFkYXRhICYmIE9iamVjdC5rZXlzKG1ldGFkYXRhKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YU1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIHR5cGU6ICdtZXRhZGF0YScsXG4gICAgICAgICAgICAgIGRhdGE6IG1ldGFkYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMud3M/LnNlbmQobWV0YWRhdGFNZXNzYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb25TdGF0dXNDYWxsYmFjaygnY29ubmVjdGVkJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLndzLm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xuICAgICAgICAgIHRoaXMuaGFuZGxlTWVzc2FnZShldmVudCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy53cy5vbmVycm9yID0gKGVycm9yKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignV2ViU29ja2V0IGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICB0aGlzLmlzQ29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb25TdGF0dXNDYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soJ2Vycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmICh0aGlzLmVycm9yQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuZXJyb3JDYWxsYmFjaygnV2ViU29ja2V0IGNvbm5lY3Rpb24gZXJyb3Igb2NjdXJyZWQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignV2ViU29ja2V0IGNvbm5lY3Rpb24gZmFpbGVkJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMud3Mub25jbG9zZSA9IChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdXZWJTb2NrZXQgY2xvc2VkOicsIGV2ZW50LmNvZGUsIGV2ZW50LnJlYXNvbik7XG4gICAgICAgICAgdGhpcy5pc0Nvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLndzID0gbnVsbDtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKCdkaXNjb25uZWN0ZWQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBBdHRlbXB0IHJlY29ubmVjdGlvbiBpZiBub3QgYSBub3JtYWwgY2xvc3VyZVxuICAgICAgICAgIGlmIChldmVudC5jb2RlICE9PSAxMDAwICYmIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPCB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XG4gICAgICAgICAgICB0aGlzLmF0dGVtcHRSZWNvbm5lY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmlzQ29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gcmVjb25uZWN0IHdpdGggZXhwb25lbnRpYWwgYmFja29mZlxuICAgKi9cbiAgcHJpdmF0ZSBhdHRlbXB0UmVjb25uZWN0KCk6IHZvaWQge1xuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMrKztcbiAgICBjb25zb2xlLmxvZyhgQXR0ZW1wdGluZyByZWNvbm5lY3Rpb24gJHt0aGlzLnJlY29ubmVjdEF0dGVtcHRzfS8ke3RoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHN9YCk7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuY29ubmVjdCh0aGlzLnVybCwgdGhpcy5hdXRoVG9rZW4pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdSZWNvbm5lY3Rpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH0sIHRoaXMucmVjb25uZWN0RGVsYXkpO1xuXG4gICAgLy8gRXhwb25lbnRpYWwgYmFja29mZjogMXMsIDJzLCA0c1xuICAgIHRoaXMucmVjb25uZWN0RGVsYXkgKj0gMjtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgaW5jb21pbmcgV2ViU29ja2V0IG1lc3NhZ2VzXG4gICAqIERpc3Rpbmd1aXNoZXMgYmV0d2VlbiBiaW5hcnkgKGF1ZGlvKSBhbmQgSlNPTiAobWV0YWRhdGEpIGZyYW1lc1xuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVNZXNzYWdlKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoZXZlbnQuZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAvLyBCaW5hcnkgZnJhbWUgLSBhdWRpbyBkYXRhXG4gICAgICBpZiAodGhpcy5hdWRpb1JlY2VpdmVkQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5hdWRpb1JlY2VpdmVkQ2FsbGJhY2soZXZlbnQuZGF0YSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXZlbnQuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIEpTT04gZnJhbWUgLSBtZXRhZGF0YSAoY2xhaW0gZGF0YSB1cGRhdGVzLCB0cmFuc2NyaXB0aW9uLCBldGMuKVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnY2xhaW1fZGF0YV91cGRhdGUnICYmIG1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgIGlmICh0aGlzLmNsYWltRGF0YVVwZGF0ZUNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmNsYWltRGF0YVVwZGF0ZUNhbGxiYWNrKG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3RyYW5zY3JpcHRpb24nICYmIG1lc3NhZ2UudGV4dCkge1xuICAgICAgICAgIGlmICh0aGlzLnRyYW5zY3JpcHRpb25VcGRhdGVDYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy50cmFuc2NyaXB0aW9uVXBkYXRlQ2FsbGJhY2sobWVzc2FnZS50ZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS50eXBlID09PSAncGhhc2VfY2hhbmdlJyAmJiBtZXNzYWdlLnBoYXNlKSB7XG4gICAgICAgICAgaWYgKHRoaXMucGhhc2VDaGFuZ2VDYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5waGFzZUNoYW5nZUNhbGxiYWNrKG1lc3NhZ2UucGhhc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjbGFpbV9zdWJtaXR0ZWQnICYmIG1lc3NhZ2UuY2xhaW1OdW1iZXIpIHtcbiAgICAgICAgICBpZiAodGhpcy5jbGFpbVN1Ym1pdHRlZENhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmNsYWltU3VibWl0dGVkQ2FsbGJhY2sobWVzc2FnZS5jbGFpbU51bWJlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgSlNPTiBtZXNzYWdlOicsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhdWRpbyBjaHVuayB0byBiYWNrZW5kXG4gICAqIEBwYXJhbSBhdWRpb0NodW5rIFBDTSBhdWRpbyBkYXRhIGFzIEFycmF5QnVmZmVyXG4gICAqL1xuICBzZW5kQXVkaW8oYXVkaW9DaHVuazogQXJyYXlCdWZmZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy53cyAmJiB0aGlzLndzLnJlYWR5U3RhdGUgPT09IFdlYlNvY2tldC5PUEVOKSB7XG4gICAgICB0aGlzLndzLnNlbmQoYXVkaW9DaHVuayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignV2ViU29ja2V0IGlzIG5vdCBjb25uZWN0ZWQsIGNhbm5vdCBzZW5kIGF1ZGlvJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrIGZvciByZWNlaXZlZCBhdWRpbyBjaHVua3NcbiAgICogQHBhcmFtIGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhdWRpbyBpcyByZWNlaXZlZFxuICAgKi9cbiAgb25BdWRpb1JlY2VpdmVkKGNhbGxiYWNrOiAoYXVkaW86IEFycmF5QnVmZmVyKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5hdWRpb1JlY2VpdmVkQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBjYWxsYmFjayBmb3IgY2xhaW0gZGF0YSB1cGRhdGVzXG4gICAqIEBwYXJhbSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsIHdoZW4gY2xhaW0gZGF0YSBpcyB1cGRhdGVkXG4gICAqL1xuICBvbkNsYWltRGF0YVVwZGF0ZShjYWxsYmFjazogKGRhdGE6IFBhcnRpYWw8Q2xhaW1EYXRhPikgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY2xhaW1EYXRhVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBjYWxsYmFjayBmb3IgdHJhbnNjcmlwdGlvbiB1cGRhdGVzXG4gICAqIEBwYXJhbSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsIHdoZW4gdHJhbnNjcmlwdGlvbiBpcyB1cGRhdGVkXG4gICAqL1xuICBvblRyYW5zY3JpcHRpb25VcGRhdGUoY2FsbGJhY2s6ICh0ZXh0OiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zY3JpcHRpb25VcGRhdGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrIGZvciBjb252ZXJzYXRpb24gcGhhc2UgY2hhbmdlc1xuICAgKiBAcGFyYW0gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbCB3aGVuIHBoYXNlIGNoYW5nZXNcbiAgICovXG4gIG9uUGhhc2VDaGFuZ2UoY2FsbGJhY2s6IChwaGFzZTogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5waGFzZUNoYW5nZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgY2FsbGJhY2sgZm9yIGNvbm5lY3Rpb24gc3RhdHVzIGNoYW5nZXNcbiAgICogQHBhcmFtIGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBjb25uZWN0aW9uIHN0YXR1cyBjaGFuZ2VzXG4gICAqL1xuICBvbkNvbm5lY3Rpb25TdGF0dXMoY2FsbGJhY2s6IChzdGF0dXM6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcgfCAnZXJyb3InKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBjYWxsYmFjayBmb3IgZXJyb3JzXG4gICAqIEBwYXJhbSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYW4gZXJyb3Igb2NjdXJzXG4gICAqL1xuICBvbkVycm9yKGNhbGxiYWNrOiAoZXJyb3I6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuZXJyb3JDYWxsYmFjayA9IGNhbGxiYWNrO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrIGZvciBjbGFpbSBzdWJtaXNzaW9uIHN1Y2Nlc3NcbiAgICogQHBhcmFtIGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBjbGFpbSBpcyBzdWNjZXNzZnVsbHkgc3VibWl0dGVkXG4gICAqL1xuICBvbkNsYWltU3VibWl0dGVkKGNhbGxiYWNrOiAoY2xhaW1OdW1iZXI6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY2xhaW1TdWJtaXR0ZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3QgV2ViU29ja2V0IGFuZCBjbGVhbnVwXG4gICAqL1xuICBkaXNjb25uZWN0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLndzKSB7XG4gICAgICB0aGlzLndzLmNsb3NlKDEwMDAsICdDbGllbnQgZGlzY29ubmVjdGluZycpO1xuICAgICAgdGhpcy53cyA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIC8vIENsZWFyIGNhbGxiYWNrc1xuICAgIHRoaXMuYXVkaW9SZWNlaXZlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLmNsYWltRGF0YVVwZGF0ZUNhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLnRyYW5zY3JpcHRpb25VcGRhdGVDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5waGFzZUNoYW5nZUNhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLmNvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5lcnJvckNhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLmNsYWltU3VibWl0dGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIFxuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgIHRoaXMucmVjb25uZWN0RGVsYXkgPSAxMDAwO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIFdlYlNvY2tldCBpcyBjdXJyZW50bHkgY29ubmVjdGVkXG4gICAqL1xuICBpc0Nvbm5lY3RlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy53cyAhPT0gbnVsbCAmJiB0aGlzLndzLnJlYWR5U3RhdGUgPT09IFdlYlNvY2tldC5PUEVOO1xuICB9XG59XG4iXX0=