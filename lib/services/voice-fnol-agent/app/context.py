"""
Conversation context management for voice FNOL sessions.

This module provides in-memory storage and retrieval of conversation context
for voice-based claim submissions. Each session maintains state throughout
the conversation lifecycle.
"""

import time
from typing import Dict, Optional
from datetime import datetime, timedelta
from app.models.claim_schema import ConversationContext


# In-memory context storage: session_id -> (context, last_accessed_timestamp)
_context_store: Dict[str, tuple[ConversationContext, float]] = {}

# Session TTL: 30 minutes
SESSION_TTL_SECONDS = 30 * 60


def get_conversation_context(session_id: str) -> ConversationContext:
    """
    Retrieve conversation context for a given session ID.
    
    If the session doesn't exist, creates a new context with default values.
    Updates the last accessed timestamp for session cleanup.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        ConversationContext for the session
    """
    current_time = time.time()
    
    # Check if context exists
    if session_id in _context_store:
        context, _ = _context_store[session_id]
        # Update last accessed timestamp
        _context_store[session_id] = (context, current_time)
        return context
    
    # Create new context with default values
    context = ConversationContext(
        session_id=session_id,
        safety_confirmed=False,
        current_phase="safety_check",
        missing_fields=[],
        conversation_history=[]
    )
    
    _context_store[session_id] = (context, current_time)
    return context


def save_conversation_context(context: ConversationContext) -> None:
    """
    Save or update conversation context for a session.
    
    Updates the context in storage and refreshes the last accessed timestamp.
    
    Args:
        context: ConversationContext to save
    """
    current_time = time.time()
    _context_store[context.session_id] = (context, current_time)


def append_to_conversation_history(
    session_id: str,
    role: str,
    message: str
) -> None:
    """
    Append a message to the conversation history.
    
    Args:
        session_id: Unique session identifier
        role: Message role ('user' or 'agent')
        message: Message content
    """
    context = get_conversation_context(session_id)
    
    context.conversation_history.append({
        "role": role,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    save_conversation_context(context)


def cleanup_expired_sessions() -> int:
    """
    Remove expired sessions from context storage.
    
    Sessions are considered expired if they haven't been accessed
    for more than SESSION_TTL_SECONDS (30 minutes).
    
    Returns:
        Number of sessions cleaned up
    """
    current_time = time.time()
    expired_sessions = []
    
    # Identify expired sessions
    for session_id, (_, last_accessed) in _context_store.items():
        if current_time - last_accessed > SESSION_TTL_SECONDS:
            expired_sessions.append(session_id)
    
    # Remove expired sessions
    for session_id in expired_sessions:
        del _context_store[session_id]
    
    return len(expired_sessions)


def get_active_session_count() -> int:
    """
    Get the number of active sessions in storage.
    
    Returns:
        Number of active sessions
    """
    return len(_context_store)


def clear_all_sessions() -> None:
    """
    Clear all sessions from storage.
    
    This is primarily useful for testing purposes.
    """
    _context_store.clear()
