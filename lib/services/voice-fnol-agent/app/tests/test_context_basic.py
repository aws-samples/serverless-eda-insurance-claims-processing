"""
Basic tests for conversation context management.

This is a simple verification test to ensure the context module works correctly.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from app.models.claim_schema import ConversationContext
from app.context import (
    get_conversation_context,
    save_conversation_context,
    append_to_conversation_history,
    cleanup_expired_sessions,
    get_active_session_count,
    clear_all_sessions
)


def test_get_new_context():
    """Test creating a new conversation context."""
    clear_all_sessions()
    
    context = get_conversation_context("test-session-1")
    
    assert context.session_id == "test-session-1"
    assert context.safety_confirmed == False
    assert context.current_phase == "safety_check"
    assert context.missing_fields == []
    assert context.conversation_history == []
    print("✓ test_get_new_context passed")


def test_get_existing_context():
    """Test retrieving an existing conversation context."""
    clear_all_sessions()
    
    # Create initial context
    context1 = get_conversation_context("test-session-2")
    context1.safety_confirmed = True
    save_conversation_context(context1)
    
    # Retrieve same context
    context2 = get_conversation_context("test-session-2")
    
    assert context2.session_id == "test-session-2"
    assert context2.safety_confirmed == True
    print("✓ test_get_existing_context passed")


def test_save_context():
    """Test saving conversation context."""
    clear_all_sessions()
    
    context = get_conversation_context("test-session-3")
    context.policy_id = "POL-12345"
    context.damage_description = "Front bumper damage"
    save_conversation_context(context)
    
    # Retrieve and verify
    retrieved = get_conversation_context("test-session-3")
    assert retrieved.policy_id == "POL-12345"
    assert retrieved.damage_description == "Front bumper damage"
    print("✓ test_save_context passed")


def test_append_conversation_history():
    """Test appending messages to conversation history."""
    clear_all_sessions()
    
    append_to_conversation_history("test-session-4", "user", "I had an accident")
    append_to_conversation_history("test-session-4", "agent", "I'm sorry to hear that. Are you safe?")
    
    context = get_conversation_context("test-session-4")
    
    assert len(context.conversation_history) == 2
    assert context.conversation_history[0]["role"] == "user"
    assert context.conversation_history[0]["message"] == "I had an accident"
    assert context.conversation_history[1]["role"] == "agent"
    assert "safe" in context.conversation_history[1]["message"]
    print("✓ test_append_conversation_history passed")


def test_active_session_count():
    """Test getting active session count."""
    clear_all_sessions()
    
    assert get_active_session_count() == 0
    
    get_conversation_context("session-1")
    assert get_active_session_count() == 1
    
    get_conversation_context("session-2")
    assert get_active_session_count() == 2
    
    get_conversation_context("session-1")  # Should not increase count
    assert get_active_session_count() == 2
    print("✓ test_active_session_count passed")


def test_cleanup_expired_sessions():
    """Test cleanup of expired sessions."""
    clear_all_sessions()
    
    # Create some sessions
    get_conversation_context("session-1")
    get_conversation_context("session-2")
    
    assert get_active_session_count() == 2
    
    # Cleanup (no sessions should be expired yet)
    cleaned = cleanup_expired_sessions()
    assert cleaned == 0
    assert get_active_session_count() == 2
    print("✓ test_cleanup_expired_sessions passed")


def test_clear_all_sessions():
    """Test clearing all sessions."""
    clear_all_sessions()
    
    get_conversation_context("session-1")
    get_conversation_context("session-2")
    assert get_active_session_count() == 2
    
    clear_all_sessions()
    assert get_active_session_count() == 0
    print("✓ test_clear_all_sessions passed")


if __name__ == "__main__":
    print("Running basic context management tests...\n")
    
    try:
        test_get_new_context()
        test_get_existing_context()
        test_save_context()
        test_append_conversation_history()
        test_active_session_count()
        test_cleanup_expired_sessions()
        test_clear_all_sessions()
        
        print("\n✅ All tests passed!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
