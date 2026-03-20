"""
Voice FNOL Agent - Minimal WebSocket Implementation

Minimal AgentCore WebSocket handler for bidirectional audio streaming with Nova Sonic.
AgentCore handles authentication, session management, and observability automatically.

Requirements: 2.1, 7.1, 7.5, 10.1, 10.2, 10.3
"""

import os
import logging
import json
import base64

from fastapi import WebSocketDisconnect

from bedrock_agentcore import BedrockAgentCoreApp, RequestContext
from app.agent import get_agent

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

@app.websocket
async def websocket_handler(websocket, context: RequestContext):
    """
    WebSocket handler for bidirectional audio streaming.

    AgentCore handles: authentication (JWT validation via customJwtAuthorizer),
    session routing, lifecycle, observability.
    """
    session_id = getattr(context, 'session_id', None)

    # Extract JWT from Authorization header (forwarded by AgentCore via requestHeaderAllowlist)
    request_headers = context.request_headers or {}
    auth_header = request_headers.get('Authorization', '') or request_headers.get('authorization', '')
    jwt_token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header

    if not jwt_token:
        logger.error("No JWT token found in Authorization header")
        await websocket.close(code=1008)  # Policy violation
        return

    # Decode sub from JWT payload (no verification needed — AgentCore already validated)
    try:
        payload_part = jwt_token.split('.')[1]
        # Add padding if needed
        padded = payload_part + '=' * (4 - len(payload_part) % 4)
        jwt_payload = json.loads(base64.urlsafe_b64decode(padded))
        user_sub = jwt_payload.get('sub')
    except Exception as e:
        logger.error(f"Failed to decode JWT payload: {e}")
        await websocket.close(code=1008)
        return

    logger.info(f"WebSocket connected - Session: {session_id}, Sub: {user_sub}")

    if not user_sub:
        logger.error("No sub claim found in JWT")
        await websocket.close(code=1008)
        return

    await websocket.accept()

    try:
        # Get agent (singleton)
        agent = get_agent()

        # Run agent with bidirectional audio
        logger.info(f"Starting agent - Session: {session_id}")
        await agent.run(
            inputs=[websocket.receive_json],
            outputs=[websocket.send_json],
            invocation_state={
                'user_sub': user_sub,
                'access_token': jwt_token,
            }
        )

        logger.info(f"Agent completed - Session: {session_id}")

    except WebSocketDisconnect as e:
        # Normal disconnect (code 1000) is not an error
        if hasattr(e, 'code') and e.code == 1000:
            logger.info(f"Client disconnected normally - Session: {session_id}")
        else:
            logger.warning(f"Client disconnected - Session: {session_id}, code: {getattr(e, 'code', 'unknown')}")
    except Exception as e:
        logger.error(f"Error - Session: {session_id}: {e}", exc_info=True)
        try:
            await websocket.close(code=1011)  # Internal error
        except Exception:
            pass
    finally:
        # Stop agent to clean up
        await agent.stop()
        logger.info(f"Session closed - Session: {session_id}")


if __name__ == "__main__":
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    logger.info("Starting Voice FNOL Agent")
    app.run(log_level=log_level)
