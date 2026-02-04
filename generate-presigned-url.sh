#!/bin/bash
# Generate a pre-signed WebSocket URL for AgentCore

REGION="us-east-1"
AGENT_ARN="arn:aws:bedrock-agentcore:us-east-1:974751372104:runtime/VoiceFnolStack_voice_fnol_agent-Gfj4U7AhXs"
ENDPOINT="wss://bedrock-agentcore.${REGION}.amazonaws.com/runtimes/${AGENT_ARN}/ws"

echo "Generating pre-signed WebSocket URL..."
echo ""
echo "Note: This URL will be valid for 15 minutes"
echo ""

# Use AWS CLI to generate pre-signed URL
# For WebSocket, we need to use the bedrock-agentcore-runtime service
aws bedrock-agentcore-runtime presign-url \
    --runtime-arn "${AGENT_ARN}" \
    --region "${REGION}" \
    2>/dev/null || {
    echo "Error: AWS CLI command failed"
    echo ""
    echo "Alternative: Use the test script with proper SigV4 signing"
    echo "Or connect from your React app which has proper authentication"
    exit 1
}
