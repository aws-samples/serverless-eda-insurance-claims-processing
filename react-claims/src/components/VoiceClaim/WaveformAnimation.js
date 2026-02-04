"use strict";
/**
 * WaveformAnimation Component
 *
 * Displays a real-time waveform visualization during audio capture.
 * Uses Canvas API and AudioContext AnalyserNode for visualization.
 *
 * Requirements: 2.4, 9.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaveformAnimation = void 0;
const react_1 = require("react");
/**
 * WaveformAnimation component displays a real-time audio waveform
 * during active audio capture using Canvas API.
 */
const WaveformAnimation = ({ isCapturing, audioStream }) => {
    const canvasRef = (0, react_1.useRef)(null);
    const animationFrameRef = (0, react_1.useRef)();
    const analyserRef = (0, react_1.useRef)();
    const audioContextRef = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        if (!isCapturing || !audioStream) {
            // Stop animation when not capturing
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
            // Clear canvas
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            // Cleanup audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = undefined;
                analyserRef.current = undefined;
            }
            return;
        }
        // Set up audio analysis
        const setupAudioAnalysis = async () => {
            try {
                // Create audio context
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioContext;
                // Create analyser node
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;
                // Connect audio stream to analyser
                const source = audioContext.createMediaStreamSource(audioStream);
                source.connect(analyser);
                // Start animation
                drawWaveform();
            }
            catch (error) {
                console.error('Error setting up audio analysis:', error);
            }
        };
        setupAudioAnalysis();
        // Cleanup on unmount or when capturing stops
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [isCapturing, audioStream]);
    /**
     * Draw waveform on canvas at 60fps
     */
    const drawWaveform = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        // Get audio data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        // Clear canvas
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0066cc';
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // Normalize to 0-2 range
            const y = (v * canvas.height) / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        // Continue animation at 60fps
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };
    // Don't render if not capturing
    if (!isCapturing) {
        return null;
    }
    return (<div className="waveform-animation">
      <canvas ref={canvasRef} width={600} height={100} className="waveform-canvas" aria-label="Audio waveform visualization"/>
    </div>);
};
exports.WaveformAnimation = WaveformAnimation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2F2ZWZvcm1BbmltYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJXYXZlZm9ybUFuaW1hdGlvbi50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQUVILGlDQUFpRDtBQVVqRDs7O0dBR0c7QUFDSSxNQUFNLGlCQUFpQixHQUFxQyxDQUFDLEVBQ2xFLFdBQVcsRUFDWCxXQUFXLEVBQ1osRUFBRSxFQUFFO0lBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBQSxjQUFNLEVBQW9CLElBQUksQ0FBQyxDQUFDO0lBQ2xELE1BQU0saUJBQWlCLEdBQUcsSUFBQSxjQUFNLEdBQVUsQ0FBQztJQUMzQyxNQUFNLFdBQVcsR0FBRyxJQUFBLGNBQU0sR0FBZ0IsQ0FBQztJQUMzQyxNQUFNLGVBQWUsR0FBRyxJQUFBLGNBQU0sR0FBZ0IsQ0FBQztJQUUvQyxJQUFBLGlCQUFTLEVBQUMsR0FBRyxFQUFFO1FBQ2IsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLG9DQUFvQztZQUNwQyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEQsaUJBQWlCLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsZUFBZTtZQUNmLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDakMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUNSLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkQsQ0FBQztZQUNILENBQUM7WUFFRCx3QkFBd0I7WUFDeEIsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzVCLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hDLGVBQWUsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO2dCQUNwQyxXQUFXLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUNsQyxDQUFDO1lBRUQsT0FBTztRQUNULENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLElBQUksRUFBRTtZQUNwQyxJQUFJLENBQUM7Z0JBQ0gsdUJBQXVCO2dCQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUN2RixlQUFlLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQztnQkFFdkMsdUJBQXVCO2dCQUN2QixNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQy9DLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixRQUFRLENBQUMscUJBQXFCLEdBQUcsR0FBRyxDQUFDO2dCQUNyQyxXQUFXLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztnQkFFL0IsbUNBQW1DO2dCQUNuQyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRXpCLGtCQUFrQjtnQkFDbEIsWUFBWSxFQUFFLENBQUM7WUFDakIsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsa0JBQWtCLEVBQUUsQ0FBQztRQUVyQiw2Q0FBNkM7UUFDN0MsT0FBTyxHQUFHLEVBQUU7WUFDVixJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBQ0QsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzVCLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsQ0FBQztRQUNILENBQUMsQ0FBQztJQUNKLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBRS9COztPQUVHO0lBQ0gsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7UUFDakMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUVyQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNULENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU87UUFDVCxDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxRQUFRLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFMUMsZUFBZTtRQUNmLEdBQUcsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRCxnQkFBZ0I7UUFDaEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsR0FBRyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDNUIsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWhCLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO1FBQy9DLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVWLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMseUJBQXlCO1lBQ3pELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ1osR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25CLENBQUM7WUFFRCxDQUFDLElBQUksVUFBVSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFYiw4QkFBOEI7UUFDOUIsaUJBQWlCLENBQUMsT0FBTyxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQztJQUVGLGdDQUFnQztJQUNoQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxDQUNMLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FDakM7TUFBQSxDQUFDLE1BQU0sQ0FDTCxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FDZixLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDWCxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDWixTQUFTLENBQUMsaUJBQWlCLENBQzNCLFVBQVUsQ0FBQyw4QkFBOEIsRUFFN0M7SUFBQSxFQUFFLEdBQUcsQ0FBQyxDQUNQLENBQUM7QUFDSixDQUFDLENBQUM7QUE5SVcsUUFBQSxpQkFBaUIscUJBOEk1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogV2F2ZWZvcm1BbmltYXRpb24gQ29tcG9uZW50XG4gKiBcbiAqIERpc3BsYXlzIGEgcmVhbC10aW1lIHdhdmVmb3JtIHZpc3VhbGl6YXRpb24gZHVyaW5nIGF1ZGlvIGNhcHR1cmUuXG4gKiBVc2VzIENhbnZhcyBBUEkgYW5kIEF1ZGlvQ29udGV4dCBBbmFseXNlck5vZGUgZm9yIHZpc3VhbGl6YXRpb24uXG4gKiBcbiAqIFJlcXVpcmVtZW50czogMi40LCA5LjJcbiAqL1xuXG5pbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0LCB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XG5cbmludGVyZmFjZSBXYXZlZm9ybUFuaW1hdGlvblByb3BzIHtcbiAgLyoqIFdoZXRoZXIgYXVkaW8gaXMgY3VycmVudGx5IGJlaW5nIGNhcHR1cmVkICovXG4gIGlzQ2FwdHVyaW5nOiBib29sZWFuO1xuICBcbiAgLyoqIEF1ZGlvIHN0cmVhbSB0byB2aXN1YWxpemUgKG9wdGlvbmFsLCBmb3IgY29ubmVjdGluZyB0byBBbmFseXNlck5vZGUpICovXG4gIGF1ZGlvU3RyZWFtPzogTWVkaWFTdHJlYW07XG59XG5cbi8qKlxuICogV2F2ZWZvcm1BbmltYXRpb24gY29tcG9uZW50IGRpc3BsYXlzIGEgcmVhbC10aW1lIGF1ZGlvIHdhdmVmb3JtXG4gKiBkdXJpbmcgYWN0aXZlIGF1ZGlvIGNhcHR1cmUgdXNpbmcgQ2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGNvbnN0IFdhdmVmb3JtQW5pbWF0aW9uOiBSZWFjdC5GQzxXYXZlZm9ybUFuaW1hdGlvblByb3BzPiA9ICh7XG4gIGlzQ2FwdHVyaW5nLFxuICBhdWRpb1N0cmVhbVxufSkgPT4ge1xuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWY8SFRNTENhbnZhc0VsZW1lbnQ+KG51bGwpO1xuICBjb25zdCBhbmltYXRpb25GcmFtZVJlZiA9IHVzZVJlZjxudW1iZXI+KCk7XG4gIGNvbnN0IGFuYWx5c2VyUmVmID0gdXNlUmVmPEFuYWx5c2VyTm9kZT4oKTtcbiAgY29uc3QgYXVkaW9Db250ZXh0UmVmID0gdXNlUmVmPEF1ZGlvQ29udGV4dD4oKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghaXNDYXB0dXJpbmcgfHwgIWF1ZGlvU3RyZWFtKSB7XG4gICAgICAvLyBTdG9wIGFuaW1hdGlvbiB3aGVuIG5vdCBjYXB0dXJpbmdcbiAgICAgIGlmIChhbmltYXRpb25GcmFtZVJlZi5jdXJyZW50KSB7XG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lUmVmLmN1cnJlbnQpO1xuICAgICAgICBhbmltYXRpb25GcmFtZVJlZi5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDbGVhciBjYW52YXNcbiAgICAgIGNvbnN0IGNhbnZhcyA9IGNhbnZhc1JlZi5jdXJyZW50O1xuICAgICAgaWYgKGNhbnZhcykge1xuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgaWYgKGN0eCkge1xuICAgICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDbGVhbnVwIGF1ZGlvIGNvbnRleHRcbiAgICAgIGlmIChhdWRpb0NvbnRleHRSZWYuY3VycmVudCkge1xuICAgICAgICBhdWRpb0NvbnRleHRSZWYuY3VycmVudC5jbG9zZSgpO1xuICAgICAgICBhdWRpb0NvbnRleHRSZWYuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgYW5hbHlzZXJSZWYuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBhdWRpbyBhbmFseXNpc1xuICAgIGNvbnN0IHNldHVwQXVkaW9BbmFseXNpcyA9IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENyZWF0ZSBhdWRpbyBjb250ZXh0XG4gICAgICAgIGNvbnN0IGF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICBhdWRpb0NvbnRleHRSZWYuY3VycmVudCA9IGF1ZGlvQ29udGV4dDtcblxuICAgICAgICAvLyBDcmVhdGUgYW5hbHlzZXIgbm9kZVxuICAgICAgICBjb25zdCBhbmFseXNlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICBhbmFseXNlci5mZnRTaXplID0gMjA0ODtcbiAgICAgICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMC44O1xuICAgICAgICBhbmFseXNlclJlZi5jdXJyZW50ID0gYW5hbHlzZXI7XG5cbiAgICAgICAgLy8gQ29ubmVjdCBhdWRpbyBzdHJlYW0gdG8gYW5hbHlzZXJcbiAgICAgICAgY29uc3Qgc291cmNlID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKGF1ZGlvU3RyZWFtKTtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoYW5hbHlzZXIpO1xuXG4gICAgICAgIC8vIFN0YXJ0IGFuaW1hdGlvblxuICAgICAgICBkcmF3V2F2ZWZvcm0oKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNldHRpbmcgdXAgYXVkaW8gYW5hbHlzaXM6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXR1cEF1ZGlvQW5hbHlzaXMoKTtcblxuICAgIC8vIENsZWFudXAgb24gdW5tb3VudCBvciB3aGVuIGNhcHR1cmluZyBzdG9wc1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBpZiAoYW5pbWF0aW9uRnJhbWVSZWYuY3VycmVudCkge1xuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZShhbmltYXRpb25GcmFtZVJlZi5jdXJyZW50KTtcbiAgICAgIH1cbiAgICAgIGlmIChhdWRpb0NvbnRleHRSZWYuY3VycmVudCkge1xuICAgICAgICBhdWRpb0NvbnRleHRSZWYuY3VycmVudC5jbG9zZSgpO1xuICAgICAgfVxuICAgIH07XG4gIH0sIFtpc0NhcHR1cmluZywgYXVkaW9TdHJlYW1dKTtcblxuICAvKipcbiAgICogRHJhdyB3YXZlZm9ybSBvbiBjYW52YXMgYXQgNjBmcHNcbiAgICovXG4gIGNvbnN0IGRyYXdXYXZlZm9ybSA9ICgpID0+IHtcbiAgICBjb25zdCBjYW52YXMgPSBjYW52YXNSZWYuY3VycmVudDtcbiAgICBjb25zdCBhbmFseXNlciA9IGFuYWx5c2VyUmVmLmN1cnJlbnQ7XG5cbiAgICBpZiAoIWNhbnZhcyB8fCAhYW5hbHlzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBpZiAoIWN0eCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEdldCBhdWRpbyBkYXRhXG4gICAgY29uc3QgYnVmZmVyTGVuZ3RoID0gYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQ7XG4gICAgY29uc3QgZGF0YUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyTGVuZ3RoKTtcbiAgICBhbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoZGF0YUFycmF5KTtcblxuICAgIC8vIENsZWFyIGNhbnZhc1xuICAgIGN0eC5maWxsU3R5bGUgPSAnI2Y4ZjlmYSc7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyBEcmF3IHdhdmVmb3JtXG4gICAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJyMwMDY2Y2MnO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcblxuICAgIGNvbnN0IHNsaWNlV2lkdGggPSBjYW52YXMud2lkdGggLyBidWZmZXJMZW5ndGg7XG4gICAgbGV0IHggPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IGRhdGFBcnJheVtpXSAvIDEyOC4wOyAvLyBOb3JtYWxpemUgdG8gMC0yIHJhbmdlXG4gICAgICBjb25zdCB5ID0gKHYgKiBjYW52YXMuaGVpZ2h0KSAvIDI7XG5cbiAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIGN0eC5tb3ZlVG8oeCwgeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xuICAgICAgfVxuXG4gICAgICB4ICs9IHNsaWNlV2lkdGg7XG4gICAgfVxuXG4gICAgY3R4LmxpbmVUbyhjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgLyAyKTtcbiAgICBjdHguc3Ryb2tlKCk7XG5cbiAgICAvLyBDb250aW51ZSBhbmltYXRpb24gYXQgNjBmcHNcbiAgICBhbmltYXRpb25GcmFtZVJlZi5jdXJyZW50ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXdXYXZlZm9ybSk7XG4gIH07XG5cbiAgLy8gRG9uJ3QgcmVuZGVyIGlmIG5vdCBjYXB0dXJpbmdcbiAgaWYgKCFpc0NhcHR1cmluZykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIndhdmVmb3JtLWFuaW1hdGlvblwiPlxuICAgICAgPGNhbnZhc1xuICAgICAgICByZWY9e2NhbnZhc1JlZn1cbiAgICAgICAgd2lkdGg9ezYwMH1cbiAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgIGNsYXNzTmFtZT1cIndhdmVmb3JtLWNhbnZhc1wiXG4gICAgICAgIGFyaWEtbGFiZWw9XCJBdWRpbyB3YXZlZm9ybSB2aXN1YWxpemF0aW9uXCJcbiAgICAgIC8+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuIl19