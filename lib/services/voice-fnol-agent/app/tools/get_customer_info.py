"""
Customer information retrieval tool for voice FNOL agent.

This tool calls the Customer API to retrieve customer, policy, and driver's license
information, eliminating the need for the user to repeat information already on file.

Requirements: 8.6
"""

import os
import logging
import httpx
import json
from strands.tools import tool
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configure logging
logger = logging.getLogger(__name__)


def get_sigv4_headers(url: str, method: str, region: str) -> dict:
    """
    Generate AWS SigV4 signed headers for API Gateway requests.
    
    Uses Lambda execution role credentials to sign requests with AWS Signature Version 4,
    enabling service-to-service authentication with IAM-protected API Gateway endpoints.
    
    Args:
        url: Full API endpoint URL
        method: HTTP method (e.g., 'GET')
        region: AWS region (e.g., 'us-east-1')
    
    Returns:
        Dictionary of signed headers to include in the HTTP request
        
    Raises:
        Exception: If credentials cannot be obtained or signing fails
    """
    logger.info(f"Generating SigV4 headers for {method} {url}")
    
    # Get credentials from the Lambda execution role
    session = boto3.Session()
    credentials = session.get_credentials()
    
    if not credentials:
        logger.error("Unable to get AWS credentials for SigV4 signing")
        raise Exception("Unable to get AWS credentials for SigV4 signing")
    
    # Create AWS request object
    request = AWSRequest(
        method=method,
        url=url,
        headers={
            'Content-Type': 'application/json',
            'Host': url.split('/')[2]
        }
    )
    
    # Sign the request with SigV4
    SigV4Auth(credentials, 'execute-api', region).add_auth(request)
    
    logger.debug("SigV4 headers generated successfully")
    
    return dict(request.headers)


@tool(
    inputSchema={
        "type": "object",
        "properties": {
            "customer_id": {
                "type": "string",
                "description": "The customer's unique identifier"
            }
        },
        "required": ["customer_id"]
    }
)
async def get_customer_info(customer_id: str) -> dict:
    """
    Retrieve customer, policy, and driver's license information from Customer API.
    
    This tool fetches the customer's profile, policy details, and driver's license
    information that are already on file, so the agent doesn't need to ask for this
    information during the conversation.
    
    The tool should be called immediately after the safety check to pre-populate
    known information before collecting incident details.
    
    Args:
        customer_id: The customer's unique identifier (passed via WebSocket metadata)
    
    Returns:
        Dictionary containing:
        - success (bool): Whether retrieval was successful
        - customer (dict): Customer details (id, name, address)
        - policy (dict): Policy details (id, vehicle make/model/color/year/VIN)
        - driversLicense (dict): Driver's license details (number, state, expiration)
        - message (str): Friendly summary message for the agent to speak
        - error (str): Error details if failed
        
    Example successful response:
        {
            "success": True,
            "customer": {
                "id": "CUSTOMER#123",
                "name": "John Doe",
                "address": "123 Main St, Phoenix, AZ 85007"
            },
            "policy": {
                "id": "POLICY#456",
                "make": "Honda",
                "model": "Accord",
                "color": "Green",
                "year": "2020",
                "vin": "1HGCF86461A130849",
                "type": "Sedan"
            },
            "driversLicense": {
                "number": "D08954142",
                "state": "AZ",
                "expirationDate": "01/12/2025"
            },
            "message": "I have your information on file. You're John Doe and you're calling about your 2020 green Honda Accord. Now, can you tell me what happened?"
        }
    """
    logger.info(f"Retrieving customer info for customer_id: {customer_id}")
    
    # Get Customer API endpoint from environment
    customer_api_base = os.getenv("CUSTOMER_API_ENDPOINT")
    if not customer_api_base:
        logger.error("CUSTOMER_API_ENDPOINT environment variable not set")
        return {
            "success": False,
            "error": "Customer API endpoint not configured",
            "message": "I'm having trouble retrieving your information. Let me ask you a few questions to get started."
        }
    
    # Append /customer path to base API URL
    customer_api_endpoint = f"{customer_api_base.rstrip('/')}/customer"
    
    # Get AWS region
    region = os.getenv("AWS_REGION", "us-east-1")
    
    logger.info(f"Calling Customer API: {customer_api_endpoint}")
    
    try:
        # Generate SigV4 signed headers
        signed_headers = get_sigv4_headers(
            url=customer_api_endpoint,
            method="GET",
            region=region
        )
        
        # Make async HTTP GET request to Customer API
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                customer_api_endpoint,
                headers=signed_headers
            )
            
            logger.info(f"Customer API response status: {response.status_code}")
            
            if response.status_code == 200:
                customer_data = response.json()
                logger.debug(f"Customer data retrieved: {json.dumps(customer_data, indent=2)}")
                
                # Extract customer details
                customer_name = f"{customer_data.get('firstname', '')} {customer_data.get('lastname', '')}".strip()
                customer_address = f"{customer_data.get('street', '')}, {customer_data.get('city', '')}, {customer_data.get('state', '')} {customer_data.get('zip', '')}".strip()
                
                # Extract driver's license info
                drivers_license = {}
                if customer_data.get('driversLicense'):
                    dl = customer_data['driversLicense']
                    drivers_license = {
                        'number': dl.get('documentNumber', ''),
                        'state': dl.get('state', ''),
                        'expirationDate': dl.get('expirationDate', ''),
                        'firstName': dl.get('firstName', ''),
                        'dateOfBirth': dl.get('dateOfBirth', '')
                    }
                    logger.info(f"Driver's license found: {drivers_license.get('number', 'N/A')}")
                else:
                    logger.warning("No driver's license information found in customer data")
                
                # Extract policy details (first policy)
                policy_info = {}
                if customer_data.get('policies') and len(customer_data['policies']) > 0:
                    policy = customer_data['policies'][0]
                    policy_info = {
                        'id': policy.get('PK', {}).get('S', ''),
                        'make': policy.get('make', {}).get('S', ''),
                        'model': policy.get('model', {}).get('S', ''),
                        'color': policy.get('color', {}).get('S', ''),
                        'vin': policy.get('vin', {}).get('S', ''),
                        'year': policy.get('year', {}).get('S', ''),
                        'type': policy.get('type', {}).get('S', ''),
                        'mileage': policy.get('mileage', {}).get('S', '')
                    }
                    logger.info(f"Policy found: {policy_info.get('id', 'N/A')}")
                else:
                    logger.warning("No policy information found in customer data")
                
                # Create friendly message for agent to speak
                vehicle_desc = f"{policy_info.get('year', '')} {policy_info.get('color', '')} {policy_info.get('make', '')} {policy_info.get('model', '')}".strip()
                
                if vehicle_desc:
                    message = f"I have your information on file. You're {customer_name} and you're calling about your {vehicle_desc}. Now, can you tell me what happened and where the accident occurred?"
                else:
                    message = f"I have your information on file. You're {customer_name}. Can you tell me what happened and where the accident occurred?"
                
                logger.info(f"Successfully retrieved customer info for: {customer_name}")
                
                return {
                    "success": True,
                    "customer": {
                        "id": customer_data.get('PK', ''),
                        "name": customer_name,
                        "address": customer_address
                    },
                    "policy": policy_info,
                    "driversLicense": drivers_license,
                    "message": message
                }
            
            else:
                error_detail = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("message") or str(error_data)
                except:
                    error_detail = response.text or error_detail
                
                logger.error(f"Customer API returned error: {error_detail}")
                
                return {
                    "success": False,
                    "error": f"Customer API returned status {response.status_code}: {error_detail}",
                    "message": "I'm having trouble retrieving your information. Let me ask you a few questions to get started."
                }
    
    except httpx.TimeoutException:
        logger.error("Customer API request timeout")
        return {
            "success": False,
            "error": "Request timeout",
            "message": "I'm having trouble retrieving your information. Let me ask you a few questions to get started."
        }
    
    except httpx.RequestError as e:
        logger.error(f"Customer API network error: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Network error: {str(e)}",
            "message": "I'm having trouble retrieving your information. Let me ask you a few questions to get started."
        }
    
    except Exception as e:
        logger.error(f"Unexpected error retrieving customer info: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "message": "I'm having trouble retrieving your information. Let me ask you a few questions to get started."
        }
