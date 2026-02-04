"""
Claim information extraction tool for voice FNOL agent.

This tool extracts and structures claim information from natural language
conversation, maintaining conversation context and identifying missing fields.
"""

from typing import Optional
from datetime import datetime
from dateutil import parser as date_parser
from strands.tools import tool
from app.context import get_conversation_context, save_conversation_context


def parse_to_iso8601(date_time_str: str) -> str:
    """
    Parse natural language datetime to ISO 8601 format.
    
    Handles various formats like:
    - "yesterday at 3pm"
    - "May 15th 2024"
    - "last Tuesday"
    - "2024-05-15 15:30"
    
    Args:
        date_time_str: Natural language datetime string
        
    Returns:
        ISO 8601 formatted datetime string
    """
    try:
        # Use dateutil parser for flexible datetime parsing
        parsed_dt = date_parser.parse(date_time_str, fuzzy=True)
        return parsed_dt.isoformat() + "Z" if parsed_dt.tzinfo is None else parsed_dt.isoformat()
    except (ValueError, TypeError):
        # If parsing fails, return the original string
        # The validation layer will catch this
        return date_time_str


def identify_missing_required_fields(context) -> list[str]:
    """
    Identify which required fields are still missing from the claim.
    
    Required fields:
    - occurrence_date_time
    - location_description
    - damage_description
    - policy_id
    - drivers_license
    - license_plate
    - number_of_passengers
    - was_driving
    - police_filed
    - police_receipt (only if police_filed is True)
    
    Args:
        context: ConversationContext object
        
    Returns:
        List of missing field names in human-readable format
    """
    missing = []
    
    if not context.occurrence_date_time:
        missing.append("date and time of accident")
    if not context.location_description:
        missing.append("accident location")
    if not context.damage_description:
        missing.append("damage description")
    if not context.policy_id:
        missing.append("policy number")
    if not context.drivers_license:
        missing.append("driver's license number")
    if not context.license_plate:
        missing.append("license plate number")
    if context.number_of_passengers is None:
        missing.append("number of passengers")
    if context.was_driving is None:
        missing.append("whether you were driving")
    if context.police_filed is None:
        missing.append("whether police report was filed")
    if context.police_filed is True and context.police_receipt is None:
        missing.append("whether you have the police report receipt")
    
    return missing


@tool
def extract_claim_info(
    occurrence_date_time: Optional[str] = None,
    location_description: Optional[str] = None,
    damage_description: Optional[str] = None,
    policy_id: Optional[str] = None,
    drivers_license_number: Optional[str] = None,
    license_plate_number: Optional[str] = None,
    number_of_passengers: Optional[int] = None,
    was_driving: Optional[bool] = None,
    police_filed: Optional[bool] = None,
    police_receipt_available: Optional[bool] = None,
    other_party_first_name: Optional[str] = None,
    other_party_last_name: Optional[str] = None,
    other_party_insurance_company: Optional[str] = None,
    other_party_insurance_id: Optional[str] = None,
    session_id: str = "default"
) -> dict:
    """
    Extract and structure claim information from conversation.
    
    This tool updates the conversation context with any new information provided
    and identifies which required fields are still missing.
    
    Args:
        occurrence_date_time: Date and time of accident (will be converted to ISO 8601)
        location_description: Natural language location (will be parsed into structured address)
        damage_description: Description of damage and what happened
        policy_id: User's insurance policy ID
        drivers_license_number: Driver's license number
        license_plate_number: License plate of insured vehicle
        number_of_passengers: Number of passengers in vehicle
        was_driving: Whether the insured was driving
        police_filed: Whether police report was filed
        police_receipt_available: Whether police report/receipt is available
        other_party_first_name: Other party's first name
        other_party_last_name: Other party's last name
        other_party_insurance_company: Other party's insurance company
        other_party_insurance_id: Other party's insurance ID
        session_id: Session identifier for context management
    
    Returns:
        Dictionary containing:
        - status: "updated"
        - collected_fields: Dictionary of all collected field values
        - missing_fields: List of required fields still missing
    """
    # Get current conversation context
    context = get_conversation_context(session_id)
    
    # Update context with any non-None parameters provided
    if occurrence_date_time is not None:
        context.occurrence_date_time = parse_to_iso8601(occurrence_date_time)
    
    if location_description is not None:
        context.location_description = location_description
    
    if damage_description is not None:
        context.damage_description = damage_description
    
    if policy_id is not None:
        context.policy_id = policy_id
    
    if drivers_license_number is not None:
        context.drivers_license = drivers_license_number
    
    if license_plate_number is not None:
        context.license_plate = license_plate_number
    
    if number_of_passengers is not None:
        context.number_of_passengers = number_of_passengers
    
    if was_driving is not None:
        context.was_driving = was_driving
    
    if police_filed is not None:
        context.police_filed = police_filed
    
    if police_receipt_available is not None:
        context.police_receipt = police_receipt_available
    
    # Handle other party information
    if other_party_first_name is not None or other_party_last_name is not None:
        first = other_party_first_name or ""
        last = other_party_last_name or ""
        context.other_party_name = f"{first} {last}".strip()
    
    if other_party_insurance_company is not None:
        context.other_party_insurance = other_party_insurance_company
    
    # Identify missing required fields
    missing = identify_missing_required_fields(context)
    context.missing_fields = missing
    
    # Save updated context
    save_conversation_context(context)
    
    # Return structured response
    return {
        "status": "updated",
        "collected_fields": {
            "occurrence_date_time": context.occurrence_date_time,
            "location": context.location_description,
            "damage": context.damage_description,
            "policy_id": context.policy_id,
            "drivers_license": context.drivers_license,
            "license_plate": context.license_plate,
            "passengers": context.number_of_passengers,
            "was_driving": context.was_driving,
            "police_filed": context.police_filed,
            "police_receipt": context.police_receipt,
            "other_party": context.other_party_name,
            "other_party_insurance": context.other_party_insurance
        },
        "missing_fields": missing
    }
