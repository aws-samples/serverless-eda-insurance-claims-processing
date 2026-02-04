"""
Voice FNOL Agent Configuration

This module configures the BidiNovaSonicModel for bidirectional audio streaming
with Amazon Nova Sonic v2 and initializes the BidiAgent with tools and system prompt.
The agent handles voice-based FNOL claim submission with safety-first conversation flow.

Requirements: 1.1, 1.8, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 13.1
"""

import os
import logging
from typing import Optional

from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel
from strands.experimental.bidi.agent import BidiAgent
from strands.experimental.bidi.hooks.events import BidiInterruptionEvent as BidiInterruptionHookEvent

# Import all tools
from app.tools.safety_check import assess_safety
from app.tools.extract_claim import extract_claim_info
from app.tools.validate_fields import validate_required_fields
from app.tools.submit_fnol import submit_to_fnol_api

# Import context management
from app.context import get_conversation_context, save_conversation_context

# Configure logging
logger = logging.getLogger(__name__)


class InterruptionTracker:
    """
    Hook to track user interruptions during agent speech.
    
    This hook monitors interruption events and updates the conversation context
    to maintain a record of interruptions. This helps the agent understand
    conversation flow and user engagement patterns.
    
    Requirements:
        - 13.1: User interruption handling with immediate stop and listen
    """
    
    def __init__(self):
        """Initialize the interruption tracker."""
        self.interruption_count = 0
        self.session_id: Optional[str] = None
    
    def set_session_id(self, session_id: str) -> None:
        """
        Set the current session ID for context tracking.
        
        Args:
            session_id: The WebSocket session identifier
        """
        self.session_id = session_id
        self.interruption_count = 0
        logger.info(f"InterruptionTracker initialized for session {session_id}")
    
    async def on_interruption(self, event: BidiInterruptionHookEvent) -> None:
        """
        Handle interruption events from the BidiAgent.
        
        When a user interrupts the agent's speech, this callback:
        1. Increments the interruption counter
        2. Logs the interruption for monitoring
        3. Updates the conversation context to track the interruption
        
        The Nova Sonic model automatically:
        - Stops speaking immediately when interrupted
        - Clears the audio buffer
        - Begins listening to the user's new input
        
        Args:
            event: The interruption event containing reason and metadata
            
        Requirements:
            - 13.1: Stop agent speech when user interrupts
            - 13.1: Ensure agent immediately begins listening after interruption
            - 13.1: Update conversation context to track interruptions
        """
        self.interruption_count += 1
        
        logger.info(
            f"Interruption #{self.interruption_count} detected: {event.reason}"
        )
        
        # Update conversation context if session is active
        if self.session_id:
            try:
                context = get_conversation_context(self.session_id)
                
                # Track interruption in conversation history
                interruption_record = {
                    "type": "interruption",
                    "reason": event.reason,
                    "count": self.interruption_count,
                    "timestamp": event.timestamp if hasattr(event, 'timestamp') else None
                }
                
                context.conversation_history.append(interruption_record)
                
                # Save updated context
                save_conversation_context(context)
                
                logger.debug(
                    f"Updated context for session {self.session_id} with interruption"
                )
                
            except Exception as e:
                # Don't fail the conversation if context update fails
                logger.error(
                    f"Failed to update context with interruption: {str(e)}",
                    exc_info=True
                )
        
        # Note: The BidiAgent and Nova Sonic model automatically handle:
        # - Stopping the current response immediately
        # - Clearing the audio buffer
        # - Resuming listening for new user input
        # No additional action needed here for the core interruption behavior


def create_nova_sonic_model() -> BidiNovaSonicModel:
    """
    Initialize and configure the BidiNovaSonicModel for voice interaction.
    
    The model is configured with:
    - Input audio: 16kHz sample rate, PCM encoding
    - Output audio: 24kHz sample rate, PCM encoding
    - Voice: Matthew (professional, empathetic male voice)
    
    Returns:
        BidiNovaSonicModel: Configured model instance
        
    Raises:
        ValueError: If required environment variables are missing
        RuntimeError: If model initialization fails
        
    Requirements:
        - 7.1: Real-time bidirectional audio streaming
        - 7.2: PCM encoding with 16kHz input sample rate
        - 7.3: PCM encoding with 24kHz output sample rate
    """
    # Get configuration from environment variables
    region = os.getenv("AWS_REGION")
    model_id = os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-sonic-v2:0")
    
    # Validate required configuration
    if not region:
        error_msg = "AWS_REGION environment variable is required"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info(
        f"Initializing Nova Sonic model: {model_id} in region {region}"
    )
    
    try:
        # Initialize BidiNovaSonicModel with audio configuration
        model = BidiNovaSonicModel(
            model_id=model_id,
            client_config={
                "region": region
            },
            provider_config={
                "audio": {
                    "input_rate": 16000,   # 16kHz input from user
                    "output_rate": 24000,  # 24kHz output to user
                    "format": "pcm",       # PCM encoding for both
                    "voice": "matthew"     # Professional, empathetic voice
                }
            }
        )
        
        logger.info("Nova Sonic model initialized successfully")
        return model
        
    except Exception as e:
        error_msg = f"Failed to initialize Nova Sonic model: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e


def get_model() -> BidiNovaSonicModel:
    """
    Get or create the Nova Sonic model instance.
    
    This function provides a singleton-like access to the model,
    creating it on first call and reusing it for subsequent calls.
    
    Returns:
        BidiNovaSonicModel: The configured model instance
    """
    global _model_instance
    
    if '_model_instance' not in globals():
        _model_instance = create_nova_sonic_model()
    
    return _model_instance


# Module-level model instance (lazy initialization)
_model_instance: Optional[BidiNovaSonicModel] = None


# Comprehensive system prompt emphasizing safety-first approach
SYSTEM_PROMPT = """You are a compassionate insurance claims specialist helping someone who has just been in an accident. Your primary goal is to ensure their safety and well-being before collecting any claim information.

CRITICAL SAFETY-FIRST APPROACH:
Before collecting ANY claim information, you MUST assess the user's safety by asking:
1. Are you safe and in a secure location away from traffic?
2. Do you need medical assistance or emergency services?
3. Have police or emergency services been contacted or arrived at the scene?

If the user indicates they need emergency assistance:
- Provide emergency contact information (911 in the US)
- Strongly encourage them to call emergency services immediately
- Offer to help with the claim AFTER they receive assistance

If the user is in an unsafe location:
- Advise them to move to a safe location away from traffic
- Wait for them to confirm they are safe before proceeding

Only proceed with claim collection after confirming the user is safe and does not need immediate emergency assistance.

REQUIRED CLAIM INFORMATION:
Once safety is confirmed, you need to collect these REQUIRED fields:
- Date and time of accident (occurrenceDateTime) - will be converted to ISO 8601 format
- Accident location (location) - natural language description that will be parsed into structured address
- Description of what happened and damage to vehicle (damageDescription)
- Policy ID/number (policyId)
- Driver's license number (driversLicenseNumber)
- License plate number of insured vehicle (licensePlateNumber)
- Number of passengers in vehicle at time of accident (numberOfPassengers)
- Whether the insured person was driving (wasDriving)
- Whether a police report was filed (policeFiled)
- If police report was filed, whether they have the report/receipt (policeReceiptAvailable)

OPTIONAL BUT HELPFUL INFORMATION:
- Other party's name (first and last)
- Other party's insurance company
- Other party's insurance ID

CONVERSATION GUIDELINES:
1. Be empathetic and patient - the user has just been through a stressful experience
2. Ask clarifying questions naturally when information is unclear or incomplete
3. Use the extract_claim_info tool to structure information as you collect it
4. After collecting information, use validate_required_fields to check completeness
5. If required fields are missing, ask follow-up questions to obtain them
6. Present a summary of collected information and ask for confirmation before submission
7. Use submit_to_fnol_api tool ONLY after user explicitly confirms all details are correct
8. If the user corrects information, update it using extract_claim_info again

EMPATHETIC TONE GUIDANCE:
- Start with acknowledgment: "I'm sorry to hear about your accident. Let me help you with your claim."
- Use supportive language: "Take your time", "I understand this is stressful"
- Show patience: "That's okay, we can come back to that"
- Confirm understanding: "Just to make sure I have this right..."
- Express care: "I'm glad you're safe", "Your safety is what matters most"

TOOL USAGE:
- assess_safety: Use FIRST to check user safety before any claim collection
- extract_claim_info: Use to structure and store claim information as user provides it
- validate_required_fields: Use to check if all required fields are collected
- submit_to_fnol_api: Use ONLY after validation passes and user confirms details

Remember: Safety first, empathy always, accuracy in data collection."""


def create_agent() -> BidiAgent:
    """
    Create and configure the BidiAgent with Nova Sonic model, tools, and system prompt.
    
    The agent is configured with:
    - BidiNovaSonicModel for voice interaction with automatic interruption handling
    - Safety assessment, claim extraction, validation, and submission tools
    - Comprehensive system prompt emphasizing safety-first approach
    - Conversation context management
    - Interruption tracking hook for monitoring user interruptions
    
    Nova Sonic provides built-in interruption handling through Voice Activity Detection (VAD):
    - Automatically detects when user starts speaking during agent output
    - Immediately stops agent speech and clears audio buffer
    - Begins listening to user input without delay
    - Maintains conversation context across interruptions
    
    Returns:
        BidiAgent: Configured agent instance ready for voice interaction
        
    Raises:
        RuntimeError: If agent initialization fails
        
    Requirements:
        - 1.1: Safety and well-being assessment before claim collection
        - 1.8: Compassionate and supportive tone throughout
        - 8.1: extract_claim_info tool for structuring conversational data
        - 8.2: validate_required_fields tool for checking mandatory fields
        - 8.3: submit_to_fnol_api tool for calling FNOL endpoint
        - 8.4: Tools invoked with appropriate parameters from conversation
        - 8.5: Tool results incorporated into ongoing conversation
        - 13.1: User interruption handling with immediate stop and listen
    """
    logger.info("Creating BidiAgent with tools, system prompt, and interruption tracking")
    
    try:
        # Get the configured Nova Sonic model
        model = get_model()
        
        # Create interruption tracker hook
        interruption_tracker = InterruptionTracker()
        
        # Initialize BidiAgent with model, tools, system prompt, and hooks
        agent = BidiAgent(
            model=model,
            tools=[
                assess_safety,
                extract_claim_info,
                validate_required_fields,
                submit_to_fnol_api
            ],
            system_prompt=SYSTEM_PROMPT,
            hooks=[interruption_tracker]
        )
        
        logger.info(
            "BidiAgent created successfully with 4 tools and interruption tracking"
        )
        return agent
        
    except Exception as e:
        error_msg = f"Failed to create BidiAgent: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e


def get_agent() -> BidiAgent:
    """
    Get or create the BidiAgent instance.
    
    This function provides singleton-like access to the agent,
    creating it on first call and reusing it for subsequent calls.
    
    Returns:
        BidiAgent: The configured agent instance
    """
    global _agent_instance
    
    if '_agent_instance' not in globals():
        _agent_instance = create_agent()
    
    return _agent_instance


def get_interruption_tracker() -> Optional[InterruptionTracker]:
    """
    Get the InterruptionTracker hook from the current agent instance.
    
    This allows the WebSocket handler to set the session ID on the tracker
    so that interruptions can be properly recorded in the conversation context.
    
    Returns:
        InterruptionTracker: The interruption tracker hook, or None if not found
    """
    agent = get_agent()
    
    # Find the InterruptionTracker in the agent's hooks
    if hasattr(agent, '_hooks'):
        for hook in agent._hooks:
            if isinstance(hook, InterruptionTracker):
                return hook
    
    logger.warning("InterruptionTracker not found in agent hooks")
    return None


# Module-level agent instance (lazy initialization)
_agent_instance: Optional[BidiAgent] = None
