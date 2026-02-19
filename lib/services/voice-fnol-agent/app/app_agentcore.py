"""
Voice FNOL Agent - Minimal WebSocket Implementation

Minimal AgentCore WebSocket handler for bidirectional audio streaming with Nova Sonic.
AgentCore handles authentication, session management, and observability automatically.

Requirements: 2.1, 7.1, 7.5, 10.1, 10.2, 10.3
"""

import os
import logging
import json
from typing import AsyncGenerator

from fastapi import WebSocket, WebSocketDisconnect

from bedrock_agentcore import BedrockAgentCoreApp, RequestContext
from app.agent import get_agent
from app.context import get_conversation_context, save_conversation_context

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
    
    AgentCore handles: authentication, session routing, lifecycle, observability.
    """
    session_id = getattr(context, 'session_id', None)
    
    # Extract custom header with Cognito Identity ID
    # AgentCore passes custom headers in lowercase via request_headers
    request_headers = context.request_headers
    cognito_identity_id = request_headers.get('x-amzn-bedrock-agentcore-runtime-custom-cognitoidentityid')
    
    logger.info(f"WebSocket connected - Session: {session_id}, Identity: {cognito_identity_id}")
    
    if not cognito_identity_id:
        logger.error("No Cognito Identity ID provided in custom header")
        logger.error("Available headers: %s", list(request_headers.keys()))
        await websocket.close(code=1008)  # Policy violation
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
            invocation_state={'cognito_identity_id': cognito_identity_id}
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
