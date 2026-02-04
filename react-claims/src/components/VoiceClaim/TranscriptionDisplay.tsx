/**
 * TranscriptionDisplay Component
 * 
 * Displays live transcription text from the voice conversation.
 * Auto-scrolls to show the latest transcription.
 * 
 * Requirements: 9.3
 */

import React, { useEffect, useRef } from 'react';

interface TranscriptionDisplayProps {
  /** Current transcription text */
  transcription: string;
}

/**
 * TranscriptionDisplay component shows live transcription text
 * in a scrollable container with auto-scroll to latest content.
 */
export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcription
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcription updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcription]);

  // Don't render if no transcription
  if (!transcription || transcription.trim() === '') {
    return null;
  }

  return (
    <div className="transcription-display">
      <h3>Live Transcription</h3>
      <div 
        ref={containerRef}
        className="transcription-content"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        <p>{transcription}</p>
      </div>
    </div>
  );
};
