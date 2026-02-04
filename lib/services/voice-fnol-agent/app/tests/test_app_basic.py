"""
Basic tests for app.py to verify structure and imports.

This test file verifies that the app.py module can be imported
and that basic endpoints are defined correctly.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock


def test_app_module_imports():
    """Test that app module can be imported without errors."""
    try:
        from app import app as app_module
        assert app_module is not None
    except ImportError as e:
        pytest.fail(f"Failed to import app module: {e}")


def test_authenticate_function_exists():
    """Test that authenticate function is defined."""
    from app.app import authenticate
    assert callable(authenticate)


def test_authenticate_with_no_header():
    """Test authentication fails with no header."""
    from app.app import authenticate
    result = authenticate(None)
    assert result is False


def test_authenticate_with_bearer_token():
    """Test authentication succeeds with Bearer token."""
    from app.app import authenticate
    result = authenticate("Bearer test-token-123")
    assert result is True


def test_authenticate_with_sigv4():
    """Test authentication succeeds with SigV4 signature."""
    from app.app import authenticate
    result = authenticate("AWS4-HMAC-SHA256 Credential=...")
    assert result is True


def test_authenticate_with_invalid_format():
    """Test authentication fails with invalid format."""
    from app.app import authenticate
    result = authenticate("InvalidFormat token")
    assert result is False


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Test health check endpoint returns healthy status."""
    from app.app import health_check
    
    response = await health_check()
    assert response == {"status": "healthy"}


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint returns API information."""
    from app.app import root
    
    response = await root()
    assert "service" in response
    assert "version" in response
    assert "endpoints" in response
    assert response["endpoints"]["health"] == "/ping"
    assert response["endpoints"]["websocket"] == "/ws"


def test_app_instance_exists():
    """Test that FastAPI app instance is created."""
    from app.app import app
    assert app is not None
    assert hasattr(app, 'websocket')
    assert hasattr(app, 'get')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
