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
from strands_tools import current_time

# Import all tools
from app.tools.safety_check import assess_safety
from app.tools.get_customer_info import get_customer_info
from app.tools.extract_claim import extract_claim_info
from app.tools.validate_fields import validate_required_fields
from app.tools.submit_fnol import submit_to_fnol_api

# Import context management
from app.context import get_conversation_context, save_conversation_context

# Configure logging
logger = logging.getLogger(__name__)


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
    model_id = os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0")
    
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
                    "voice": "tiffany"     # Professional, empathetic voice
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
    
    if _model_instance is None:
        _model_instance = create_nova_sonic_model()
    
    return _model_instance


# Module-level model instance (lazy initialization)
_model_instance: Optional[BidiNovaSonicModel] = None


# Comprehensive system prompt emphasizing safety-first approach
SYSTEM_PROMPT = """You are a compassionate insurance claims specialist helping someone who has just been in an accident. Your primary goal is to ensure their safety and well-being before collecting any claim information.

CRITICAL SAFETY-FIRST APPROACH:
Before collecting ANY claim information, you assess the user's safety by asking these questions one at a time. Wait for the reply for each question before moving ahead:
- Are you safe and in a secure location away from traffic?
- Do you need medical assistance or emergency services?

If the user indicates they need emergency assistance:
- Provide emergency contact information (911 in the US)
- Strongly encourage them to call emergency services immediately
- Offer to help with the claim AFTER they receive assistance

If the user insists on filing the claim directly, politely proceed to gathering claim information.

GATHERING CUSTOMER INFORMATION:
After confirming safety, retrieve the customer's information from our system. This includes:
- Customer name and address
- Policy details and vehicle information (make, model, color, year, VIN)
- Driver's license number

DO NOT ask the customer for information that is already available in our system. The customer is in distress and should not have to repeat information they've already provided during signup. Only ask for details about the incident itself.

REQUIRED INCIDENT-SPECIFIC INFORMATION:
Focus your questions on the incident details that only the customer can provide:
- Date and time of accident
- Location where the accident occurred
- What happened and description of damage to the vehicle
- Number of passengers in the vehicle
- Whether the insured person was driving
- Whether a police report was filed
- If police report filed, whether they have the report or receipt

OPTIONAL HELPFUL DETAILS:
- Other party's name and insurance information (if applicable)

CONVERSATION EXAMPLES:

User: I just had an accident!
Assistant: I'm sorry to hear that. First, are you safe right now and away from any traffic?

User: Yes, I'm safe. I pulled over to the side.
Assistant: Good, I'm glad you're safe. Let me pull up your information... I have your information on file. You're John Doe and you're calling about your 2020 green Honda Accord. Can you tell me what happened and where the accident occurred?

User: Someone hit me at Main and 5th Street about 20 minutes ago.
Assistant: Okay, Main and 5th Street about 20 minutes ago. Can you describe the damage to your vehicle?

User: The front bumper is damaged and the headlight is broken.
Assistant: I understand. Were you driving the vehicle at the time of the accident?

User: Yes, I was.
Assistant: How many passengers were in the vehicle?

CONVERSATION GUIDELINES:
1. Be empathetic and patient - the user has just been through a stressful experience
2. Retrieve customer information from the system to avoid asking for details they've already provided
3. Focus your questions on incident-specific details only
4. Ask clarifying questions naturally when information is unclear or incomplete
5. Structure the information as you collect it
6. After collecting information, verify completeness
7. Present a summary of just the incident information and ask for confirmation before submission. 
8. DO NOT provide a summary of the insurer's account or policy information.
9. Submit the claim ONLY after the user explicitly confirms all details are correct
10. If the user corrects information, update it accordingly
11. Ask one question at a time. Wait for the reply to move ahead. 
12. DO NOT overwhelm the user with all the questions at once.

EMPATHETIC TONE GUIDANCE:
- Start with acknowledgment: "I'm sorry to hear about your accident. Let me help you with your claim."
- Use supportive language: "Take your time", "I understand this is stressful"
- Show patience: "That's okay, we can come back to that"
- Confirm understanding: "Just to make sure I have this right..."
- Express care: "I'm glad you're safe", "Your safety is what matters most"

Be patient and empathetic. If they're unsure about something, that's okay. Let them know we can come back to it."""

def create_agent() -> BidiAgent:
    """
    Create and configure the BidiAgent with Nova Sonic model, tools, and system prompt.
    
    The agent is configured with:
    - BidiNovaSonicModel for voice interaction with automatic interruption handling
    - Safety assessment, claim extraction, validation, and submission tools
    - Comprehensive system prompt emphasizing safety-first approach
    - Conversation context management
    
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
        - 8.3: submit_to_fnol_api tool for calling FNOL endpoint
        - 8.4: Tools invoked with appropriate parameters from conversation
        - 8.5: Tool results incorporated into ongoing conversation
        - 13.1: User interruption handling with immediate stop and listen
    """
    logger.info("Creating BidiAgent with tools and system prompt")
    
    try:
        # Get the configured Nova Sonic model
        model = get_model()
        
        # Initialize BidiAgent with model, tools, and system prompt
        agent = BidiAgent(
            model=model,
            tools=[
                current_time,
                assess_safety,
                get_customer_info,
                extract_claim_info,
                # validate_required_fields,
                submit_to_fnol_api
            ],
            system_prompt=SYSTEM_PROMPT
        )
        
        logger.info("BidiAgent created successfully with 6 tools")
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
    
    if _agent_instance is None:
        _agent_instance = create_agent()
    
    return _agent_instance


# Module-level agent instance (lazy initialization)
_agent_instance: Optional[BidiAgent] = None
