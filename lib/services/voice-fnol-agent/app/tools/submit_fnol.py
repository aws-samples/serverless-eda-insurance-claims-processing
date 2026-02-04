"""
FNOL API submission tool for voice FNOL agent.

This tool submits complete claim data to the existing FNOL API endpoint,
handling location parsing, payload construction, and API communication.
"""

import os
import re
from typing import Optional
from datetime import datetime
import httpx
from strands.tools import tool

from app.models.claim_schema import (
    FNOLPayload,
    Incident,
    Location,
    Policy,
    PersonalInformation,
    PoliceReport,
    OtherParty
)
from app.context import get_conversation_context


def parse_location(location_description: str) -> dict:
    """
    Parse natural language location into structured address components.
    
    This is a simplified implementation that extracts basic components using
    regex patterns. In production, this would integrate with a geocoding service
    like Google Maps API or AWS Location Service for more accurate parsing.
    
    Extraction strategy:
    - ZIP code: 5-digit pattern
    - State: 2-letter uppercase abbreviation
    - Road: Full description used as road field
    
    Args:
        location_description: Natural language location description
        
    Returns:
        Dictionary with location components: country, state, city, zip, road
    """
    location = {
        "country": "USA",  # Default to USA
        "state": "",
        "city": "",
        "zip": "",
        "road": location_description  # Use full description as road
    }
    
    # Extract ZIP code if present (5-digit pattern)
    zip_match = re.search(r'\b\d{5}\b', location_description)
    if zip_match:
        location["zip"] = zip_match.group()
    
    # Extract state abbreviation (2 uppercase letters)
    # Look for patterns like "CA", "NY", "TX" that are likely state codes
    state_match = re.search(r'\b([A-Z]{2})\b', location_description)
    if state_match:
        location["state"] = state_match.group(1)
    
    # Try to extract city name (word before state or before zip)
    # This is a simple heuristic - production would use geocoding
    if location["state"]:
        city_match = re.search(
            rf'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*{location["state"]}',
            location_description
        )
        if city_match:
            location["city"] = city_match.group(1)
    
    return location


def get_service_token() -> str:
    """
    Get service authentication token for FNOL API calls.
    
    In production, this would:
    - Use AWS SigV4 signing for service-to-service auth
    - Retrieve credentials from AWS Secrets Manager
    - Use IAM role-based authentication
    
    For now, returns a placeholder that would be replaced with actual auth.
    
    Returns:
        Service authentication token
    """
    # TODO: Implement proper service authentication
    # This would use boto3 to get SigV4 signed headers or retrieve OAuth token
    return os.getenv("SERVICE_AUTH_TOKEN", "service-token-placeholder")


@tool
async def submit_to_fnol_api(
    customer_id: str,
    session_id: str = "default"
) -> dict:
    """
    Submit claim to existing FNOL API endpoint.
    
    This tool retrieves the complete claim data from the conversation context,
    constructs a properly formatted FNOL payload matching the existing API schema,
    and submits it via HTTP POST request.
    
    The tool handles:
    - Location parsing from natural language to structured address
    - Payload construction with all required fields
    - ISO 8601 datetime formatting
    - HTTP request with authentication
    - Success and error response handling
    
    Args:
        customer_id: Customer ID from authenticated session
        session_id: Session identifier for context retrieval
    
    Returns:
        Dictionary containing:
        - success (bool): Whether submission was successful
        - reference_number (str): Claim reference number (if successful)
        - message (str): User-friendly confirmation or error message
        - error (str): Error details (if failed)
    """
    # Retrieve complete claim data from conversation context
    context = get_conversation_context(session_id)
    
    # Validate that we have all required data
    if not all([
        context.occurrence_date_time,
        context.location_description,
        context.damage_description,
        context.policy_id,
        context.drivers_license,
        context.license_plate,
        context.number_of_passengers is not None,
        context.was_driving is not None,
        context.police_filed is not None
    ]):
        return {
            "success": False,
            "error": "Missing required claim information. Please ensure all required fields are collected before submission.",
            "message": "Unable to submit claim due to missing information."
        }
    
    # Parse location description into structured address
    location = parse_location(context.location_description)
    
    # Build Location object
    location_obj = Location(
        country=location.get("country", "USA"),
        state=location.get("state", ""),
        city=location.get("city", ""),
        zip=location.get("zip", ""),
        road=location.get("road", context.location_description)
    )
    
    # Build Incident object
    incident = Incident(
        occurrenceDateTime=context.occurrence_date_time,
        fnolDateTime=datetime.utcnow().isoformat() + "Z",
        location=location_obj,
        description=context.damage_description
    )
    
    # Build Policy object
    policy = Policy(id=context.policy_id)
    
    # Build PersonalInformation object
    personal_info = PersonalInformation(
        customerId=customer_id,
        driversLicenseNumber=context.drivers_license,
        isInsurerDriver=context.was_driving,
        licensePlateNumber=context.license_plate,
        numberOfPassengers=context.number_of_passengers
    )
    
    # Build PoliceReport object
    police_report = PoliceReport(
        isFiled=context.police_filed,
        reportOrReceiptAvailable=context.police_receipt or False
    )
    
    # Build OtherParty object
    # Parse name into first and last if available
    other_party_first = None
    other_party_last = None
    if context.other_party_name:
        name_parts = context.other_party_name.split()
        if len(name_parts) > 0:
            other_party_first = name_parts[0]
        if len(name_parts) > 1:
            other_party_last = " ".join(name_parts[1:])
    
    other_party = OtherParty(
        insuranceId=None,  # Not collected in current flow
        insuranceCompany=context.other_party_insurance,
        firstName=other_party_first,
        lastName=other_party_last
    )
    
    # Build complete FNOL payload
    fnol_payload = FNOLPayload(
        incident=incident,
        policy=policy,
        personalInformation=personal_info,
        policeReport=police_report,
        otherParty=other_party
    )
    
    # Get FNOL API endpoint from environment
    fnol_endpoint = os.getenv("FNOL_API_ENDPOINT")
    if not fnol_endpoint:
        return {
            "success": False,
            "error": "FNOL API endpoint not configured",
            "message": "System configuration error. Please contact support."
        }
    
    # Get service authentication token
    auth_token = get_service_token()
    
    # Make async HTTP POST request to FNOL API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                fnol_endpoint,
                json=fnol_payload.model_dump(by_alias=True),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {auth_token}"
                }
            )
            
            # Handle successful response (200)
            if response.status_code == 200:
                # Try to extract claim reference from response
                response_data = response.json()
                
                # The FNOL API may return a claim ID or reference number
                # Check common field names
                reference_number = (
                    response_data.get("claimId") or
                    response_data.get("claimNumber") or
                    response_data.get("referenceNumber") or
                    response_data.get("id")
                )
                
                # If no reference in response, generate a temporary one
                if not reference_number:
                    reference_number = f"FNOL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                
                return {
                    "success": True,
                    "reference_number": reference_number,
                    "message": f"Your claim has been submitted successfully. Your reference number is {reference_number}. You'll receive a confirmation email with your official claim number shortly."
                }
            
            # Handle error responses
            else:
                error_detail = "Unknown error"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message") or error_data.get("error") or str(error_data)
                except:
                    error_detail = response.text or f"HTTP {response.status_code}"
                
                return {
                    "success": False,
                    "error": f"FNOL API returned error: {error_detail}",
                    "message": "Failed to submit claim. Please try again or use the form-based submission."
                }
    
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "Request timeout",
            "message": "The claim submission timed out. Please try again."
        }
    
    except httpx.RequestError as e:
        return {
            "success": False,
            "error": f"Network error: {str(e)}",
            "message": "Unable to connect to the claims service. Please check your connection and try again."
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "message": "An unexpected error occurred. Please try again or contact support."
        }
