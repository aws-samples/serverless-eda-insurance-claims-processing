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

from bedrock_agentcore import BedrockAgentCoreApp
from app.agent import get_agent, get_interruption_tracker
from app.context import get_conversation_context, save_conversation_context

from strands_tools import calculator
from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel
from strands.experimental.bidi.agent import BidiAgent
from strands.experimental.bidi.types.events import BidiInterruptionEvent as BidiInterruptionHookEvent

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

# @app.websocket
# async def websocket_handler(websocket: WebSocket, context):
#     await websocket.accept()

#     voice_id = websocket.query_params.get("voice_id", "matthew")
#     logger.info(f"Connection from {websocket.client}, voice: {voice_id}")

#     try:
#         model = BidiNovaSonicModel(
#             region="us-east-1",
#             model_id="amazon.nova-sonic-v1:0",
#             provider_config={
#                 "audio": {
#                     "input_sample_rate": 16000,
#                     "output_sample_rate": 16000,
#                     "voice": voice_id,
#                 }
#             },
#             tools=[calculator],
#         )

#         agent = BidiAgent(
#             model=model,
#             tools=[calculator],
#             system_prompt="You are a helpful assistant with access to a calculator tool.",
#         )

#         await agent.run(inputs=[websocket.receive_json], outputs=[websocket.send_json])

#     except WebSocketDisconnect:
#         logger.info("Client disconnected")
#     except Exception as e:
#         logger.error(f"Error: {e}")
#         try:
#             await websocket.send_json({"type": "error", "message": str(e)})
#         except Exception:
#             pass
#     finally:
#         logger.info("Connection closed")

@app.websocket
async def websocket_handler(websocket, context):
    """
    WebSocket handler for bidirectional audio streaming.
    
    AgentCore handles: authentication, session routing, lifecycle, observability.
    """
    session_id = getattr(context, 'session_id', None)
    logger.info(f"WebSocket connected - Session: {session_id}")
    
    await websocket.accept()
    
    try:
        # # Initialize conversation context
        # conversation_context = get_conversation_context(session_id)
        
        # # Extract metadata from custom headers or first message
        # customer_id = None
        # policy_id = None
        
        # if hasattr(context, 'headers'):
        #     customer_id = context.headers.get('x-amzn-bedrock-agentcore-runtime-custom-customerid')
        #     policy_id = context.headers.get('x-amzn-bedrock-agentcore-runtime-custom-policyid')
        
        # if not customer_id or not policy_id:
        #     try:
        #         first_message = await websocket.receive_text()
        #         metadata = json.loads(first_message)
        #         if metadata.get('type') == 'metadata':
        #             customer_id = customer_id or metadata.get('data', {}).get('customerId')
        #             policy_id = policy_id or metadata.get('data', {}).get('policyId')
        #     except Exception as e:
        #         logger.warning(f"No metadata received: {e}")
        
        # if customer_id:
        #     conversation_context.customer_id = customer_id
        # if policy_id:
        #     conversation_context.policy_id = policy_id
        
        # save_conversation_context(conversation_context)
        
        # # Configure interruption tracker
        # interruption_tracker = get_interruption_tracker()
        # if interruption_tracker:
        #     interruption_tracker.set_session_id(session_id)
        
        # Get agent
        agent = get_agent()
        
        # Run agent with bidirectional audio
        logger.info(f"Starting agent - Session: {session_id}")
        await agent.run(
            inputs=[websocket.receive_json],
            outputs=[websocket.send_json]
        )
        
        logger.info(f"Agent completed - Session: {session_id}")
        
    except Exception as e:
        logger.error(f"Error - Session: {session_id}: {e}", exc_info=True)
        try:
            await websocket.close(code=1011)  # Internal error
        except Exception:
            pass
    
    finally:
        # save_conversation_context(conversation_context)
        logger.info(f"Session closed - Session: {session_id}")


if __name__ == "__main__":
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    logger.info("Starting Voice FNOL Agent")
    app.run(log_level=log_level)
