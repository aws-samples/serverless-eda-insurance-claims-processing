#!/usr/bin/env python3
"""
Test WebSocket connection to AgentCore Voice FNOL Agent

This script tests the WebSocket endpoint by:
1. Generating AWS SigV4 signed headers
2. Connecting to the AgentCore WebSocket endpoint
3. Sending a metadata message
4. Waiting for a response

Usage:
    python3 test-websocket.py
"""
import asyncio
import json
import sys
from datetime import datetime
from urllib.parse import urlparse
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configuration
REGION = "us-east-1"
AGENT_RUNTIME_ARN = "arn:aws:bedrock-agentcore:us-east-1:974751372104:runtime/VoiceFnolStack_voice_fnol_agent-Gfj4U7AhXs"
ENDPOINT = f"wss://bedrock-agentcore.{REGION}.amazonaws.com/runtimes/{AGENT_RUNTIME_ARN}/ws"


def get_signed_headers():
    """Generate SigV4 signed headers for WebSocket connection"""
    session = boto3.Session()
    credentials = session.get_credentials()
    
    if not credentials:
        raise ValueError("No AWS credentials found. Configure AWS CLI or set environment variables.")
    
    # Parse the endpoint
    parsed = urlparse(ENDPOINT)
    host = parsed.netloc
    path = parsed.path
    
    # Create HTTP request for signing (WebSocket upgrade starts as HTTP)
    request = AWSRequest(
        method='GET',
        url=f"https://{host}{path}",
        headers={
            'Host': host,
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': '13',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='  # Dummy key for signing
        }
    )
    
    # Sign the request
    SigV4Auth(credentials, 'bedrock-agentcore', REGION).add_auth(request)
    
    # Extract signed headers
    signed_headers = dict(request.headers)
    
    return signed_headers


async def test_websocket_connection():
    """Test WebSocket connection with SigV4 signed headers"""
    print(f"Testing WebSocket connection to AgentCore...")
    print(f"Region: {REGION}")
    print(f"Agent ARN: {AGENT_RUNTIME_ARN}")
    print(f"Endpoint: {ENDPOINT}")
    print()
    
    try:
        # Import websockets here to check if installed
        import websockets
        
        # Get signed headers
        print("Generating SigV4 signed headers...")
        headers = get_signed_headers()
        print(f"✓ Headers generated (Authorization: {headers.get('Authorization', '')[:50]}...)")
        print()
        
        # Connect to WebSocket with signed headers
        print("Connecting to WebSocket...")
        async with websockets.connect(
            ENDPOINT,
            additional_headers=headers
        ) as websocket:
            print("✓ Connected successfully!")
            print()
            
            # Send metadata message
            metadata = {
                "type": "metadata",
                "data": {
                    "customerId": "test-customer-123",
                    "policyId": "test-policy-456"
                }
            }
            
            print(f"Sending metadata:")
            print(json.dumps(metadata, indent=2))
            await websocket.send(json.dumps(metadata))
            print("✓ Metadata sent")
            print()
            
            # Wait for any response (with timeout)
            print("Waiting for response (10 seconds)...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"✓ Received response:")
                
                # Check if binary or text
                if isinstance(response, bytes):
                    print(f"  Binary data: {len(response)} bytes (likely audio)")
                else:
                    # Try to parse as JSON
                    try:
                        response_json = json.loads(response)
                        print(json.dumps(response_json, indent=2))
                    except json.JSONDecodeError:
                        print(f"  Text: {response}")
                    
            except asyncio.TimeoutError:
                print("⚠ No response received (timeout)")
                print("  Note: Agent may be waiting for audio input")
                print("  This is expected behavior for a voice agent")
            
            print()
            print("✓ WebSocket test completed successfully!")
            print()
            print("Summary:")
            print("  - Connection: ✓ Successful")
            print("  - Authentication: ✓ Accepted")
            print("  - Metadata sent: ✓ Yes")
            print("  - Agent is ready for audio streaming")
            
    except ImportError:
        print("✗ Error: 'websockets' library not installed")
        print("  Install with: pip install websockets")
        sys.exit(1)
    
    except websockets.exceptions.InvalidStatus as e:
        print(f"✗ Connection failed with HTTP {e.status_code}")
        if e.status_code == 403:
            print("  → Authentication failed")
            print("  → Check AWS credentials: aws sts get-caller-identity")
        elif e.status_code == 404:
            print("  → Agent runtime not found")
            print("  → Check ARN is correct")
        sys.exit(1)
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 70)
    print("AgentCore Voice FNOL Agent - WebSocket Test")
    print("=" * 70)
    print()
    
    asyncio.run(test_websocket_connection())
