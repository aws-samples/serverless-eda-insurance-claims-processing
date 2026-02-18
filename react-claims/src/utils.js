var cdk_outputs_file = require("./cdk-outputs.json");

export function getEndpointUrl(searchBy) {
  const stackOutput = cdk_outputs_file[Object.keys(cdk_outputs_file)[0]];
  const result = Object.keys(stackOutput).filter((key) =>
    key.toLowerCase().includes(searchBy.toLowerCase())
  );

  return result && Array.isArray(result) && result.length > 0
    ? stackOutput[result[0]]
    : "";
}

/**
 * Get the WebSocket endpoint URL from VoiceFnolStack outputs
 * @returns {string} WebSocket endpoint ARN or empty string if not found
 */
export function getWebSocketEndpoint() {
  const voiceFnolStack = cdk_outputs_file["VoiceFnolStack"];
  return voiceFnolStack?.WebSocketEndpoint || "";
}

/**
 * Get the Agent Runtime ID from VoiceFnolStack outputs
 * @returns {string} Agent Runtime ID or empty string if not found
 */
export function getAgentRuntimeId() {
  const voiceFnolStack = cdk_outputs_file["VoiceFnolStack"];
  return voiceFnolStack?.AgentRuntimeId || "";
}

/**
 * Generate a presigned WebSocket URL for AgentCore Runtime
 * @param {string} url - Base WebSocket URL
 * @returns {Promise<string>} Presigned WebSocket URL with SigV4 authentication
 */
export async function generatePresignedWebSocketUrl(url) {
  const { SignatureV4 } = await import('@aws-sdk/signature-v4');
  const { Sha256 } = await import('@aws-crypto/sha256-js');
  const { HttpRequest } = await import('@aws-sdk/protocol-http');
  const { Auth } = await import('aws-amplify');
  
  // Get credentials
  const credentials = await Auth.currentCredentials();
  if (!credentials?.authenticated) {
    throw new Error('Not authenticated');
  }
  
  // Parse URL and encode path
  const urlObj = new URL(url);
  const encodedPath = urlObj.pathname.split('/').map(segment => {
    if (segment === '' || segment === 'runtimes' || segment === 'ws') return segment;
    return encodeURIComponent(segment);
  }).join('/');
  
  // Generate session ID
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  
  // Get Cognito Identity ID for custom header
  const cognitoIdentityId = credentials.identityId;
  
  // Create request with session ID and custom header (as query parameter)
  const request = new HttpRequest({
    method: 'GET',
    protocol: 'https:',
    hostname: urlObj.hostname,
    path: encodedPath,
    query: {
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
      'X-Amzn-Bedrock-AgentCore-Runtime-Custom-CognitoIdentityId': cognitoIdentityId
    },
    headers: { host: urlObj.hostname }
  });
  
  // Sign request
  const signer = new SignatureV4({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    },
    region: credentials.region || 'us-east-1',
    service: 'bedrock-agentcore',
    sha256: Sha256,
    applyChecksum: false,
    uriEscapePath: true
  });
  
  const signedRequest = await signer.presign(request, { expiresIn: 300 });
  
  // Build full URL with query parameters
  const queryParams = new URLSearchParams(signedRequest.query || {});
  const signedUrl = `wss://${signedRequest.hostname}${signedRequest.path}?${queryParams.toString()}`;
  
  return signedUrl;
}
