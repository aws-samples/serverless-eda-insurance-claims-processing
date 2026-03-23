"""
FNOL API submission tool for voice FNOL agent.

This tool submits complete claim data to the existing FNOL API endpoint,
handling location parsing, payload construction, and API communication.
"""

import os
import logging
from datetime import datetime
import httpx
from strands.tools import tool
from strands import ToolContext
import json

# Configure logging
logger = logging.getLogger(__name__)


@tool(
    context=True,
    inputSchema={
        "type": "object",
        "properties": {
            "incident": {
                "type": "object",
                "description": "Incident details including when, where, and what happened",
                "properties": {
                    "occurrenceDateTime": {
                        "type": "string",
                        "description": "Date and time of accident in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)"
                    },
                    "fnolDateTime": {
                        "type": "string",
                        "description": "Today's date and time of first notice of loss (FNOL) submission in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)."
                    },
                    "location": {
                        "type": "object",
                        "description": "Location where accident occurred",
                        "properties": {
                            "country": {"type": "string", "description": "Country (e.g., US)"},
                            "state": {"type": "string", "description": "State abbreviation (e.g., AZ, CA)"},
                            "city": {"type": "string", "description": "City name"},
                            "zip": {"type": "string", "description": "ZIP code"},
                            "road": {"type": "string", "description": "Street address or road name"}
                        },
                        "required": ["country", "state", "city", "zip", "road"]
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of what happened and damage to vehicle"
                    }
                },
                "required": ["occurrenceDateTime", "fnolDateTime", "location", "description"]
            },
            "policy": {
                "type": "object",
                "description": "Policy information",
                "properties": {
                    "id": {"type": "string", "description": "Policy ID"}
                },
                "required": ["id"]
            },
            "personalInformation": {
                "type": "object",
                "description": "Personal information of the insured",
                "properties": {
                    "customerId": {"type": "string", "description": "Customer ID"},
                    "driversLicenseNumber": {"type": "string", "description": "Driver's license number"},
                    "isInsurerDriver": {"type": "boolean", "description": "Whether the insured was driving"},
                    "licensePlateNumber": {"type": "string", "description": "License plate number"},
                    "numberOfPassengers": {"type": "integer", "description": "Number of passengers in vehicle"}
                },
                "required": ["customerId", "driversLicenseNumber", "isInsurerDriver", "licensePlateNumber", "numberOfPassengers"]
            },
            "policeReport": {
                "type": "object",
                "description": "Police report information",
                "properties": {
                    "isFiled": {"type": "boolean", "description": "Whether police report was filed"},
                    "reportOrReceiptAvailable": {"type": "boolean", "description": "Whether report or receipt is available"}
                },
                "required": ["isFiled", "reportOrReceiptAvailable"]
            },
            "otherParty": {
                "type": "object",
                "description": "Information about the other party involved",
                "properties": {
                    "insuranceId": {"type": "string", "description": "Other party's insurance ID"},
                    "insuranceCompany": {"type": "string", "description": "Other party's insurance company"},
                    "firstName": {"type": "string", "description": "Other party's first name"},
                    "lastName": {"type": "string", "description": "Other party's last name"}
                }
            }
        },
        "required": ["incident", "policy", "personalInformation", "policeReport"]
    }
)
async def submit_to_fnol_api(
    tool_context: ToolContext,
    incident: dict,
    policy: dict,
    personalInformation: dict,
    policeReport: dict,
    otherParty: dict = {}
) -> dict:
    """
    Submit claim to existing FNOL API endpoint.

    This tool accepts a complete FNOL payload in the exact format expected by the API.
    Nova Sonic will construct the payload based on the conversation, and this tool
    will submit it directly to the FNOL API with JWT authentication.

    Args:
        tool_context: Tool context with invocation state containing access_token
        incident: Incident details (occurrenceDateTime, fnolDateTime, location, description)
        policy: Policy information (id)
        personalInformation: Personal info (customerId, driversLicenseNumber, isInsurerDriver, licensePlateNumber, numberOfPassengers)
        policeReport: Police report info (isFiled, reportOrReceiptAvailable)
        otherParty (optional): Other party info (insuranceId, insuranceCompany, firstName, lastName)

    Returns:
        Dictionary containing:
        - success (bool): Whether submission was successful
        - claimNumber (str): Claim reference number (if successful)
        - payload (dict): The submitted payload for user review
        - message (str): User-friendly confirmation or error message
        - error (str): Error details (if failed)
    """
    logger.info("Submitting FNOL claim with provided payload")

    # Get JWT access token from invocation state
    access_token = tool_context.invocation_state.get('access_token')
    if not access_token:
        logger.error("No access token in invocation state")
        return {
            "success": False,
            "error": "Authentication context not available",
            "message": "Authentication error. Please contact support."
        }

    # Construct the complete payload
    fnol_payload = {
        "incident": incident,
        "policy": policy,
        "personalInformation": personalInformation,
        "policeReport": policeReport,
        "otherParty": otherParty
    }

    logger.info(f"FNOL Payload: {json.dumps(fnol_payload, indent=2)}")

    # Get FNOL API endpoint from environment
    fnol_endpoint = os.getenv("FNOL_API_ENDPOINT")
    if not fnol_endpoint:
        logger.error("FNOL_API_ENDPOINT environment variable not set")
        return {
            "success": False,
            "error": "FNOL API endpoint not configured",
            "message": "System configuration error. Please contact support."
        }

    logger.info(f"Submitting claim to FNOL API: {fnol_endpoint}")

    # Prepare request body
    request_body = json.dumps(fnol_payload)

    # Use JWT Bearer token for authentication (Cognito User Pool authorizer)
    headers = {
        'Content-Type': 'application/json',
        'Authorization': access_token,
    }

    # Make async HTTP POST request to FNOL API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                fnol_endpoint,
                content=request_body,
                headers=headers
            )

            logger.info(f"FNOL API response status: {response.status_code}")

            # Handle successful response (200)
            if response.status_code == 200:
                # Try to extract claim reference from response
                response_data = response.text
                logger.info(f"FNOL API success response: {response_data}")

                return {
                    "success": True,
                    "claimStatus": response_data,
                    "message": f"Your claim has been submitted and a decision will be taken soon. Provide additional evidence of the damage for a smooth and expedited claims process. Once evidences are received, please wait while we process your claim."
                }

            # Handle error responses
            else:
                error_detail = "Unknown error"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message") or error_data.get("error") or str(error_data)
                except:
                    error_detail = response.text or f"HTTP {response.status_code}"

                logger.error(f"FNOL API error response: {error_detail}")

                return {
                    "success": False,
                    "error": f"FNOL API returned error: {error_detail}",
                    "message": "Failed to submit claim. Please try again or use the form-based submission."
                }

    except httpx.TimeoutException:
        logger.error("FNOL API request timeout")
        return {
            "success": False,
            "error": "Request timeout",
            "message": "The claim submission timed out. Please try again."
        }

    except httpx.RequestError as e:
        logger.error(f"FNOL API network error: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Network error: {str(e)}",
            "message": "Unable to connect to the claims service. Please check your connection and try again."
        }

    except Exception as e:
        logger.error(f"Unexpected error during FNOL submission: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "message": "An unexpected error occurred. Please try again or contact support."
        }
