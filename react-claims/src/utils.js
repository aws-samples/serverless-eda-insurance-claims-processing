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
 * Generate WebSocket connection parameters for AgentCore Runtime with JWT authentication.
 *
 * Browser WebSocket API cannot set custom headers, so AgentCore accepts the bearer token
 * via the Sec-WebSocket-Protocol header using base64url encoding.
 * See: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-websocket.html
 *
 * @param {string} url - Base WebSocket URL
 * @returns {Promise<{url: string, protocols: string[]}>} URL and subprotocols for WebSocket constructor
 */
export async function generatePresignedWebSocketUrl(url) {
  const { Auth } = await import('aws-amplify');

  const session = await Auth.currentSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const token = session.getAccessToken().getJwtToken();

  // Base64url-encode the JWT token for Sec-WebSocket-Protocol header
  const base64url = btoa(token)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Generate session ID and pass as query parameter
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const wsUrl = `${url}?X-Amzn-Bedrock-AgentCore-Runtime-Session-Id=${encodeURIComponent(sessionId)}`;

  return {
    url: wsUrl,
    protocols: [`base64UrlBearerAuthorization.${base64url}`, 'base64UrlBearerAuthorization'],
  };
}
