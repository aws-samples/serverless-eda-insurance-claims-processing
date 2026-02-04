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
