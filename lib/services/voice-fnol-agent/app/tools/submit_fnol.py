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
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import json

# Configure logging
logger = logging.getLogger(__name__)


def get_sigv4_headers(url: str, method: str, body: str, region: str) -> dict:
    """
    Generate AWS SigV4 signed headers for API Gateway requests.
    
    This function uses the Lambda execution role's credentials to sign requests
    with AWS Signature Version 4, enabling service-to-service authentication
    with IAM-protected API Gateway endpoints.
    
    The signing process:
    1. Gets credentials from the Lambda execution role (via boto3 session)
    2. Creates an AWSRequest with the HTTP method, URL, headers, and body
    3. Signs the request using SigV4Auth with 'execute-api' service
    4. Returns the signed headers including Authorization and X-Amz-* headers
    
    This matches how AWS Amplify API.post() works in the React frontend,
    but uses the Lambda's IAM role instead of Cognito user credentials.
    
    Args:
        url: Full API endpoint URL (e.g., https://api.example.com/fnol)
        method: HTTP method (e.g., 'POST')
        body: Request body as JSON string
        region: AWS region (e.g., 'us-east-1')
    
    Returns:
        Dictionary of signed headers to include in the HTTP request
        
    Raises:
        Exception: If credentials cannot be obtained or signing fails
    """
    logger.info(f"Generating SigV4 headers for {method} {url}")
    
    # Get credentials from the Lambda execution role
    # boto3 automatically uses the Lambda's IAM role credentials
    session = boto3.Session()
    credentials = session.get_credentials()
    
    if not credentials:
        logger.error("Unable to get AWS credentials for SigV4 signing")
        raise Exception("Unable to get AWS credentials for SigV4 signing")
    
    # Create AWS request object
    request = AWSRequest(
        method=method,
        url=url,
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Host': url.split('/')[2]  # Extract host from URL
        }
    )
    
    # Sign the request with SigV4
    # Use 'execute-api' as the service name for API Gateway
    SigV4Auth(credentials, 'execute-api', region).add_auth(request)
    
    logger.debug("SigV4 headers generated successfully")
    
    # Return the signed headers
    return dict(request.headers)


@tool(
    inputSchema={
        "type": "object",
        "properties": {
            "incident": {
                "type": "object",
                "description": "Incident details including when, where, and what happened",
                "properties": {
                    "occurrenceDateTime": {
                        "type": "string",
                        "description": "Date and time of accident in YYYY-MM-DD format"
                    },
                    "fnolDateTime": {
                        "type": "string",
                        "description": "Date and time of FNOL submission in YYYY-MM-DD format"
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
        "required": ["incident", "policy", "personalInformation", "policeReport", "otherParty"]
    }
)
async def submit_to_fnol_api(
    incident: dict,
    policy: dict,
    personalInformation: dict,
    policeReport: dict,
    otherParty: dict
) -> dict:
    """
    Submit claim to existing FNOL API endpoint.
    
    This tool accepts a complete FNOL payload in the exact format expected by the API.
    Nova Sonic will construct the payload based on the conversation, and this tool
    will submit it directly to the FNOL API with AWS SigV4 authentication.
    
    Args:
        incident: Incident details (occurrenceDateTime, fnolDateTime, location, description)
        policy: Policy information (id)
        personalInformation: Personal info (customerId, driversLicenseNumber, isInsurerDriver, licensePlateNumber, numberOfPassengers)
        policeReport: Police report info (isFiled, reportOrReceiptAvailable)
        otherParty: Other party info (insuranceId, insuranceCompany, firstName, lastName)
    
    Returns:
        Dictionary containing:
        - success (bool): Whether submission was successful
        - claimNumber (str): Claim reference number (if successful)
        - payload (dict): The submitted payload for user review
        - message (str): User-friendly confirmation or error message
        - error (str): Error details (if failed)
    """
    logger.info("Submitting FNOL claim with provided payload")
    
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
    
    # Get AWS region from environment
    region = os.getenv("AWS_REGION", "us-east-1")
    
    # Prepare request body
    request_body = json.dumps(fnol_payload)
    
    # Generate SigV4 signed headers
    # This matches how AWS Amplify API.post() works in the React frontend
    try:
        signed_headers = get_sigv4_headers(
            url=fnol_endpoint,
            method="POST",
            body=request_body,
            region=region
        )
    except Exception as e:
        logger.error(f"Failed to generate SigV4 headers: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Failed to generate authentication headers: {str(e)}",
            "message": "Authentication error. Please contact support."
        }
    
    # Make async HTTP POST request to FNOL API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                fnol_endpoint,
                content=request_body,
                headers=signed_headers
            )
            
            logger.info(f"FNOL API response status: {response.status_code}")
            
            # Handle successful response (200)
            if response.status_code == 200:
                # Try to extract claim reference from response
                response_data = response.json()
                
                logger.info(f"FNOL API success response: {response_data}")
                
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
                
                logger.info(f"Claim submitted successfully with reference: {reference_number}")
                
                return {
                    "success": True,
                    "claimNumber": reference_number,
                    "payload": fnol_payload,
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
