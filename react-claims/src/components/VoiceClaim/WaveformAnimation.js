/**
 * WaveformAnimation Component
 * 
 * Displays a real-time waveform visualization during audio capture.
 * Uses Canvas API and AudioContext AnalyserNode for visualization.
 * 
 * Requirements: 2.4, 9.2
 */

import React, { useEffect, useRef, useCallback } from 'react';

/**
 * WaveformAnimation component displays a real-time audio waveform
 * during active audio capture using Canvas API.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isCapturing - Whether audio is currently being captured
 * @param {MediaStream} [props.audioStream] - Audio stream to visualize (optional, for connecting to AnalyserNode)
 */
export const WaveformAnimation = ({ isCapturing, audioStream }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef();
  const analyserRef = useRef();
  const audioContextRef = useRef();

  /**
   * Draw waveform on canvas at 60fps
   */
  const drawWaveform = useCallback(() => {
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
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Continue animation at 60fps
    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  useEffect(() => {
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
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
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
      } catch (error) {
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
  }, [isCapturing, audioStream, drawWaveform]);

  // Don't render if not capturing
  if (!isCapturing) {
    return null;
  }

  return (
    <div className="waveform-animation">
      <canvas
        ref={canvasRef}
        width={600}
        height={100}
        className="waveform-canvas"
        aria-label="Audio waveform visualization"
      />
    </div>
  );
};
