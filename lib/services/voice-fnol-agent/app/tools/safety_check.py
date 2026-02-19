"""
Safety assessment tool for voice-enabled FNOL.

This tool assesses user safety and well-being before proceeding with claim collection.
It prioritizes emergency assistance and ensures users are in a safe location.
"""

from strands.tools import tool


@tool
def assess_safety(
    is_safe: bool,
    needs_medical: bool,
    police_contacted: bool,
    in_safe_location: bool
) -> dict:
    """
    Assess user safety status before proceeding with claim collection.
    
    This tool implements the safety-first approach by checking multiple safety
    indicators and providing appropriate guidance based on the user's situation.
    
    Args:
        is_safe: Whether user confirms they are safe overall
        needs_medical: Whether user needs medical assistance
        police_contacted: Whether police/emergency services have been contacted
        in_safe_location: Whether user is in a safe location away from traffic
    
    Returns:
        dict with the following keys:
            - safety_confirmed (bool): Whether it's safe to proceed with claim collection
            - guidance (str): Compassionate guidance message for the user
    """
    # Priority 1: Medical emergency - highest priority
    if needs_medical:
        return {
            "safety_confirmed": False,
            "guidance": "Please call 911 or your local emergency number immediately if you need medical assistance. Your safety is the priority. We can help with your claim once you've received medical attention."
        }
    
    # Priority 2: Unsafe location - user needs to move to safety
    if not in_safe_location:
        return {
            "safety_confirmed": False,
            "guidance": "Please move to a safe location away from traffic before we continue. Your safety is most important."
        }
    
    # Priority 3: Police report recommendation
    # Note: We recommend police contact but don't block claim collection
    if not police_contacted:
        return {
            "safety_confirmed": True,
            "guidance": "I recommend contacting the police to file an accident report. This will help with your claim. Would you like to do that now, or shall we proceed with collecting your claim information?"
        }
    
    # All safety checks passed
    return {
        "safety_confirmed": True,
        "guidance": "I'm glad you're safe. Let's proceed with collecting your claim information."
    }
