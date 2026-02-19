import React, { useState } from 'react';
import './EventDisplay.css';

/**
 * EventDisplay - Visual debugging UI for WebSocket events
 * Shows incoming/outgoing events with timestamps and detailed JSON
 */
export const EventDisplay = ({ events, onEventClick }) => {
  const [showUsageEvents, setShowUsageEvents] = useState(false);

  const getEventClass = (event) => {
    if (event.name === 'tool_use_stream') return 'event-tool-use';
    if (event.name === 'tool_result') return 'event-tool-result';
    if (event.name === 'usage_event') return 'event-usage';
    if (event.interrupted) return 'event-interrupted';
    return event.type === 'in' ? 'event-in' : 'event-out';
  };

  const getEventIcon = (event) => {
    if (event.type === 'in') return '⬇️';
    if (event.type === 'out') return '⬆️';
    return '🔄';
  };

  const filteredEvents = showUsageEvents 
    ? events 
    : events.filter(e => e.name !== 'usage_event');

  return (
    <div className="event-display-container">
      <div className="event-display-header">
        <h3>Events</h3>
        <label className="toggle-usage">
          <input
            type="checkbox"
            checked={showUsageEvents}
            onChange={(e) => setShowUsageEvents(e.target.checked)}
          />
          Show Usage Events
        </label>
      </div>
      <div className="events-list">
        {filteredEvents.map((event, index) => (
          <div
            key={`${event.key}-${index}`}
            className={`event-item ${getEventClass(event)}`}
            onClick={() => onEventClick && onEventClick(event)}
            title="Click to view details"
          >
            <span className="event-icon">{getEventIcon(event)}</span>
            <span className="event-name">{event.name}</span>
            {event.count > 1 && (
              <span className="event-count">({event.count})</span>
            )}
            <span className="event-timestamp">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * EventDetailModal - Modal for viewing detailed event JSON
 */
export const EventDetailModal = ({ event, onClose }) => {
  if (!event) return null;

  const formatEventData = (evt) => {
    // Truncate audio data for display
    if (evt.type === 'bidi_audio_input' || evt.type === 'bidi_audio_stream') {
      const copy = { ...evt };
      if (copy.audio) {
        copy.audio = copy.audio.substring(0, 50) + '... [truncated]';
      }
      return copy;
    }
    return evt;
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <h2>Event Details: {event.name}</h2>
          <button className="event-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="event-modal-body">
          <div className="event-meta">
            <span className="event-meta-item">
              <strong>Type:</strong> {event.type === 'in' ? 'Incoming' : 'Outgoing'}
            </span>
            <span className="event-meta-item">
              <strong>Count:</strong> {event.count || 1}
            </span>
            <span className="event-meta-item">
              <strong>Timestamp:</strong> {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="event-json-container">
            {event.events && event.events.map((evt, idx) => (
              <div key={idx} className="event-json-item">
                <div className="event-json-timestamp">
                  {new Date(evt.timestamp || event.timestamp).toLocaleTimeString()}
                </div>
                <pre className="event-json">
                  {JSON.stringify(formatEventData(evt), null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
        <div className="event-modal-footer">
          <button 
            className="btn-copy-json"
            onClick={() => {
              const data = event.events || [event];
              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            }}
          >
            📋 Copy JSON
          </button>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
