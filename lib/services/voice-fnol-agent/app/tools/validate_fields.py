"""
Required field validation tool for voice FNOL agent.

This tool validates that all required fields are present in the claim data
before allowing submission to the FNOL API.
"""

from typing import Any, Dict
from strands.tools import tool


@tool
def validate_required_fields(claim_data: Dict[str, Any]) -> dict:
    """
    Validate that all required fields are present in claim data.
    
    This tool checks for the presence of all mandatory fields needed for
    successful FNOL submission. It also performs conditional validation
    (e.g., police receipt required if police report was filed).
    
    Required fields:
    - location: Accident location description
    - dateTime: Date and time of accident
    - damageDescription: Description of damage and incident
    - policyNumber: Insurance policy ID
    - driversLicense: Driver's license number
    - numberOfPassengers: Number of passengers in vehicle
    - wasDriving: Whether the insured was driving
    - policeFiled: Whether police report was filed
    - policeReceipt: Whether police receipt is available (required if policeFiled is true)
    
    Args:
        claim_data: Current claim data structure (conversation context)
    
    Returns:
        Dictionary containing:
        - is_valid (bool): Whether all required fields are present
        - missing_fields (list): List of missing required field names
        - ready_for_submission (bool): Whether claim is ready to submit to FNOL API
    """
    missing_fields = []
    
    # Check core required fields
    if not claim_data.get("location"):
        missing_fields.append("location")
    
    if not claim_data.get("dateTime"):
        missing_fields.append("dateTime")
    
    if not claim_data.get("damageDescription"):
        missing_fields.append("damageDescription")
    
    if not claim_data.get("policyNumber"):
        missing_fields.append("policyNumber")
    
    if not claim_data.get("driversLicense"):
        missing_fields.append("driversLicense")
    
    if claim_data.get("numberOfPassengers") is None:
        missing_fields.append("numberOfPassengers")
    
    if claim_data.get("wasDriving") is None:
        missing_fields.append("wasDriving")
    
    if claim_data.get("policeFiled") is None:
        missing_fields.append("policeFiled")
    
    # Conditional validation: if police report was filed, receipt is required
    if claim_data.get("policeFiled") is True:
        if claim_data.get("policeReceipt") is None:
            missing_fields.append("policeReceipt")
    
    # Check for at least basic involved party information
    # This is optional but recommended - we check if any party info exists
    involved_parties = claim_data.get("involvedParties", [])
    if not involved_parties or len(involved_parties) == 0:
        # Check if there's at least some other party information in the context
        has_party_info = (
            claim_data.get("otherPartyName") or
            claim_data.get("otherPartyInsurance")
        )
        if not has_party_info:
            missing_fields.append("involvedParties")
    
    # Determine if claim is valid and ready for submission
    is_valid = len(missing_fields) == 0
    ready_for_submission = is_valid
    
    return {
        "is_valid": is_valid,
        "missing_fields": missing_fields,
        "ready_for_submission": ready_for_submission
    }
