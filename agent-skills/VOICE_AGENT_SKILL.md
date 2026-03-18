# Voice AI Agent Skill Guide

This document teaches any AI coding assistant how to build a voice-enabled agent using Amazon Nova 2 Sonic, Strands Agents SDK, and Amazon Bedrock AgentCore Runtime. It is distilled from the insurance claims FNOL agent in this repository but applies to any domain where a voice interface submits data through an existing API.

The guide is tool-agnostic — it works with Claude Code, Cursor, Kiro, Cline, Windsurf, or any assistant that can read a markdown file.

---

## Quick Start

### Prerequisites

- AWS account with Bedrock model access for `amazon.nova-2-sonic-v1:0`
- Node.js 22.x, AWS CDK 2.235+, Python 3.12+, Docker Desktop
- AWS CLI configured with credentials

### Deploy and Verify

```bash
git clone https://github.com/aws-samples/serverless-eda-insurance-claims-processing.git
cd serverless-eda-insurance-claims-processing
npm install
npm run deploy           # Deploys all stacks including VoiceFnolStack
```

After deployment, the CDK output includes the AgentCore WebSocket endpoint ARN. The React frontend connects to this endpoint with SigV4-signed WebSocket URLs.

To verify the agent is running, check the AgentCore Runtime status in the AWS console under Amazon Bedrock > AgentCore > Runtimes.

---

## Architecture at a Glance

```
Browser (React)
  |  SigV4-signed WebSocket
  v
AgentCore Runtime (managed container hosting)
  |  Docker container (Python 3.13, ARM64)
  v
Strands BidiAgent + Nova 2 Sonic
  |  Tool calls
  v
Customer API (GET)  +  FNOL API (POST)
  |                      |
  v                      v
DynamoDB             EventBridge --> SQS --> Lambda --> IoT Core MQTT
(read policy)        (Claim.Requested)                  (Claim.Accepted/Rejected)
```

The voice agent is a new entry point into an existing event-driven backend. Everything downstream of the FNOL API — fraud detection, settlement, notification — runs unchanged. The agent integrates at the API boundary, not the event bus.

For the full blog post, see: [Extending an event-driven insurance claims application with Voice AI](https://aws.amazon.com/blogs/industries/)

---

## Core Concepts

### BidiAgent and Bidirectional Streaming

Strands `BidiAgent` manages a bidirectional audio stream between the client and Nova 2 Sonic. It accepts async callables for input and output (`websocket.receive_json` / `websocket.send_json`), wires them into its internal event loop, and dispatches tool calls as they arise. The agent is initialized once and reused across sessions — model loading happens at startup, not per connection.

### Nova 2 Sonic: Speech-to-Speech in a Single Pass

Nova 2 Sonic is not a wrapper around separate ASR and TTS services. The model performs speech understanding, reasoning, tool calling, and speech generation in a single bidirectional stream — raw PCM audio in, raw PCM audio out. Tone, hesitation, and emphasis reach the model directly. Barge-in detection is built into the model server-side. Polyglot voices (e.g., "tiffany") support mid-sentence language switching.

### AgentCore Runtime: Serverless Container Hosting

AgentCore Runtime hosts the agent container behind a single WebSocket endpoint. It handles authentication (SigV4), session routing, lifecycle management (5-min idle timeout, 1-hour max), and observability (CloudWatch Logs, X-Ray). Pay-as-you-go pricing charges only for active processing — I/O wait (waiting for Nova 2 Sonic or API responses) incurs no compute charge.

### Tool-Based Design

Each agent capability maps to a `@tool`-decorated function with a bounded responsibility. Tools call existing APIs via SigV4-signed HTTP requests. The agent holds no direct knowledge of databases, event buses, or downstream processing. This makes each tool independently testable.

---

## Build Your Own Voice Agent

### Step 1: Define the Agent

Create the agent with a `BidiNovaSonicModel` and a set of tools. The agent is a singleton — initialize once, reuse across WebSocket sessions.

```python
from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel
from strands.experimental.bidi.agent import BidiAgent

def create_agent():
    model = BidiNovaSonicModel(
        model_id="amazon.nova-2-sonic-v1:0",
        client_config={"region": os.environ["AWS_REGION"]},
        provider_config={
            "audio": {
                "input_rate": 16000,   # 16kHz from browser microphone
                "output_rate": 24000,  # 24kHz Nova Sonic synthesis
                "format": "pcm",
                "voice": "tiffany"     # Polyglot voice with code-switching
            }
        }
    )
    return BidiAgent(
        model=model,
        tools=[your_tool_1, your_tool_2, stop_conversation],
        system_prompt=SYSTEM_PROMPT
    )
```

**System prompt rules:**
- Keep it conversational (3-5 sentences for the core persona)
- Use gender-appropriate pronouns for the selected voice
- Provide one-shot conversation examples for complex flows
- Do not use imperatives like "You must call tool X" — let the model decide tool timing
- Include safety-first guidance if the domain requires it (e.g., emergency assessment before data collection)

**Reference:** `lib/services/voice-fnol-agent/app/agent.py`

### Step 2: Build Tools

Tools are Python functions decorated with `@tool`. Each tool returns a dictionary.

**Basic tool:**

```python
from strands.tools import tool

@tool
async def your_lookup_tool(query: str) -> dict:
    """Retrieve data based on query."""
    # Call your API here
    return {"success": True, "data": result}
```

**Tool with context (for user identity):**

Use `@tool(context=True)` when the tool needs the caller's identity or session data. The `invocation_state` dictionary passed to `agent.run()` flows into every context-enabled tool.

```python
from strands import tool, ToolContext

@tool(context=True)
async def get_customer_info(tool_context: ToolContext) -> dict:
    """Retrieve customer information using authenticated identity."""
    cognito_id = tool_context.invocation_state['cognito_identity_id']
    # Use cognito_id to call your API
    return {"success": True, "customer": data}
```

**Tool with inputSchema (critical for Nova Sonic):**

Nova 2 Sonic constructs tool calls from audio, not text. It needs explicit field-level schemas with types and descriptions to map speech to structured parameters. Without `inputSchema`, the model cannot reliably map "it happened on Route 9 in Phoenix" to a nested location object.

```python
@tool(
    inputSchema={
        "type": "object",
        "properties": {
            "incident": {
                "type": "object",
                "description": "Incident details",
                "properties": {
                    "location": {
                        "type": "object",
                        "properties": {
                            "city": {"type": "string", "description": "City name"},
                            "state": {"type": "string", "description": "State abbreviation"},
                            "road": {"type": "string", "description": "Street or road name"}
                        },
                        "required": ["city", "state", "road"]
                    },
                    "description": {
                        "type": "string",
                        "description": "What happened and damage description"
                    }
                }
            }
        },
        "required": ["incident"]
    }
)
async def submit_data(incident: dict) -> dict:
    """Submit structured data to your API."""
    # POST to your endpoint
    return {"success": True}
```

**SigV4 helper for AWS API calls:**

```python
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

def get_sigv4_headers(url, method, region, body=""):
    session = boto3.Session()
    credentials = session.get_credentials()
    request = AWSRequest(method=method, url=url, data=body,
                         headers={"Content-Type": "application/json",
                                  "Host": url.split("/")[2]})
    SigV4Auth(credentials, "execute-api", region).add_auth(request)
    return dict(request.headers)
```

**Reference:** `lib/services/voice-fnol-agent/app/tools/`

### Step 3: Wire the WebSocket Handler

The `BedrockAgentCoreApp` class from the `bedrock_agentcore` package handles the WebSocket lifecycle. The handler wires the agent to the connection.

```python
from bedrock_agentcore import BedrockAgentCoreApp, RequestContext
from app.agent import get_agent

app = BedrockAgentCoreApp()

# Agent is a singleton — initialized once, reused across sessions
agent = get_agent()

@app.websocket
async def websocket_handler(websocket, context: RequestContext):
    # Extract custom headers (AgentCore lowercases them)
    cognito_identity_id = context.request_headers.get(
        'x-amzn-bedrock-agentcore-runtime-custom-cognitoidentityid')

    await websocket.accept()
    try:
        await agent.run(
            inputs=[websocket.receive_json],
            outputs=[websocket.send_json],
            invocation_state={'cognito_identity_id': cognito_identity_id}
        )
    except WebSocketDisconnect as e:
        if getattr(e, 'code', None) != 1000:
            logger.warning(f"Unexpected disconnect: {e}")
    finally:
        await agent.stop()
```

Key points:
- `inputs` and `outputs` accept any async callable — Strands wires them into bidirectional streaming
- `invocation_state` flows to every `@tool(context=True)` decorated tool
- Always call `agent.stop()` in `finally` to clean up resources

**Reference:** `lib/services/voice-fnol-agent/app/app_agentcore.py`

### Step 4: CDK Infrastructure

Two CDK resources define the agent deployment: `CfnRuntime` (the agent) and `CfnRuntimeEndpoint` (the WebSocket endpoint).

```typescript
import * as bedrockagentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";

// IAM role — trust principal MUST be bedrock-agentcore.amazonaws.com
const agentRole = new iam.Role(this, "AgentRole", {
  assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com", {
    conditions: {
      StringEquals: { "aws:SourceAccount": account },
      ArnLike: { "aws:SourceArn": `arn:aws:bedrock-agentcore:${region}:${account}:*` }
    }
  })
});

// Docker image — AgentCore REQUIRES ARM64
const dockerImage = new ecr_assets.DockerImageAsset(this, "AgentImage", {
  directory: path.join(__dirname, "../"),
  platform: ecr_assets.Platform.LINUX_ARM64,
});

// AgentCore Runtime
const agentRuntime = new bedrockagentcore.CfnRuntime(this, "AgentRuntime", {
  agentRuntimeName: "my_voice_agent",
  roleArn: agentRole.roleArn,
  networkConfiguration: { networkMode: "PUBLIC" },
  agentRuntimeArtifact: {
    containerConfiguration: { containerUri: dockerImage.imageUri }
  },
  lifecycleConfiguration: {
    idleRuntimeSessionTimeout: 300,  // 5 min idle timeout
    maxLifetime: 3600                // 1 hour max
  },
  requestHeaderConfiguration: {
    requestHeaderAllowlist: [
      "X-Amzn-Bedrock-AgentCore-Runtime-Custom-CognitoIdentityId"
    ]
  }
});

// AgentCore Runtime Endpoint
const agentEndpoint = new bedrockagentcore.CfnRuntimeEndpoint(this, "AgentEndpoint", {
  name: "my_voice_agent_endpoint",
  agentRuntimeId: agentRuntime.ref,
});
agentEndpoint.addDependency(agentRuntime);
```

Key CDK notes:
- Import is `aws-cdk-lib/aws-bedrockagentcore` (not `aws-cdk-lib/aws-bedrock`)
- Trust principal is `bedrock-agentcore.amazonaws.com` (not `bedrock.amazonaws.com`)
- `requestHeaderAllowlist` headers must be prefixed with `X-Amzn-Bedrock-AgentCore-Runtime-Custom-`
- Without `requestHeaderAllowlist`, custom headers are stripped silently at the AgentCore boundary
- Grant `ecr:GetAuthorizationToken` on `*` and `ecr:BatchGetImage` on the repository

**Reference:** `lib/services/voice-fnol-agent/infra/voice-fnol-service.ts`

### Step 5: Frontend Audio

The frontend opens a SigV4-presigned WebSocket connection and streams PCM audio bidirectionally.

**SigV4 presigned WebSocket URL:**

```javascript
const signer = new SignatureV4({
  credentials: {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken
  },
  region: "us-east-1",
  service: "bedrock-agentcore",   // NOT "bedrock"
  sha256: Sha256,
});
const signedRequest = await signer.presign(request, { expiresIn: 300 });
```

**Audio capture (16kHz PCM in):**
- Use `navigator.mediaDevices.getUserMedia()` with `sampleRate: 16000`, `channelCount: 1`
- Enable `echoCancellation` and `noiseSuppression`
- Convert Float32Array to Int16Array (PCM16) before sending

**Audio playback (24kHz PCM out):**
- Create `AudioContext` at 24kHz
- Schedule chunks at `nextPlayTime` to prevent gaps — do not call `source.start()` without a time parameter
- Track `activeSources` array for barge-in cancellation

**Barge-in handling:**
- Listen for `bidi_interruption` message type on the WebSocket
- On interruption: stop all active audio sources, clear the queue, reset `nextPlayTime` to `audioContext.currentTime`

**Reference:** `react-claims/src/utils.js` and `react-claims/src/components/`

---

## Common Pitfalls

### 1. Missing inputSchema on tools

**Symptom:** Nova Sonic fails to call the tool or sends malformed parameters.
**Cause:** Text-based LLMs infer parameter structure from docstrings; a speech model cannot.
**Fix:** Define explicit `inputSchema` with types and descriptions on every tool that accepts structured parameters.

### 2. Creating agent per WebSocket connection

**Symptom:** High latency on every new connection, excessive memory usage.
**Cause:** Model loading and tool registration happen inside the handler instead of at startup.
**Fix:** Initialize the agent once at module level (`agent = create_agent()`), reuse across sessions.

### 3. Audio playback gaps

**Symptom:** Choppy, stuttering audio output.
**Cause:** Calling `source.start()` without scheduling — each chunk plays immediately instead of after the previous one finishes.
**Fix:** Track `nextPlayTime` and schedule each chunk: `source.start(nextPlayTime); nextPlayTime += buffer.duration;`

### 4. Ignoring bidi_interruption events

**Symptom:** Agent audio continues playing after the customer starts speaking.
**Cause:** Frontend does not listen for `bidi_interruption` messages from Nova Sonic.
**Fix:** On interruption, stop all active audio sources, clear the queue, and reset `nextPlayTime`.

### 5. Wrong IAM trust principal

**Symptom:** AgentCore fails to assume the IAM role; Runtime creation fails.
**Cause:** Trust policy uses `bedrock.amazonaws.com` instead of `bedrock-agentcore.amazonaws.com`.
**Fix:** Set the service principal to `bedrock-agentcore.amazonaws.com` with `SourceAccount` and `SourceArn` conditions.

### 6. Custom headers stripped silently

**Symptom:** `tool_context.invocation_state` has no user identity; `get_customer_info` fails.
**Cause:** The header is not listed in `requestHeaderAllowlist` on the CfnRuntime resource.
**Fix:** Add the header name to `requestHeaderAllowlist`. Headers must be prefixed with `X-Amzn-Bedrock-AgentCore-Runtime-Custom-`.

### 7. Missing invocation_state in agent.run()

**Symptom:** `@tool(context=True)` tools receive empty context, cannot access user identity.
**Cause:** `agent.run()` is called without the `invocation_state` parameter.
**Fix:** Pass `invocation_state={"key": value}` to `agent.run()`.

---

## Adapting This Pattern

To build a voice agent for a different domain:

1. **Keep the skeleton.** The `BidiAgent` → `BedrockAgentCoreApp` → `CfnRuntime` → `CfnRuntimeEndpoint` pattern is domain-independent.

2. **Replace the tools.** Remove `get_customer_info`, `submit_to_fnol_api`, etc. Add tools for your domain — each should call one API endpoint and return a dictionary.

3. **Rewrite the system prompt.** Describe your agent's persona, conversation flow, and safety considerations. Keep it conversational (3-5 sentences for the core persona, then specific guidance).

4. **Define inputSchemas.** For every tool that accepts structured data, write an explicit JSON schema matching your API contract.

5. **Update CDK environment variables.** Replace `FNOL_API_ENDPOINT` and `CUSTOMER_API_ENDPOINT` with your API endpoints. Update IAM policies to grant `execute-api:Invoke` on your specific API Gateway resources.

6. **Adjust frontend.** Update the WebSocket connection URL and any custom headers. The audio capture/playback code is reusable as-is.

The voice infrastructure (AgentCore, Nova Sonic, SigV4 auth, audio streaming) stays identical. Only the tools, system prompt, and API endpoints change.

---

## Using This File With Your Coding Assistant

### Claude Code
Reference this file directly in your prompt, or add to your project's `.claude/` instructions:
```
# In your conversation
@agent-skills/VOICE_AGENT_SKILL.md build me a voice agent for appointment scheduling
```

### Cursor
Use `@agent-skills/VOICE_AGENT_SKILL.md` in chat, or copy the file into `.cursor/rules/` for automatic inclusion.

### Kiro
Copy to `.kiro/steering/voice-agent.md` and add frontmatter:
```yaml
---
inclusion: auto
description: Voice AI agent development guide
tags: [voice-ai, nova-sonic, strands, agentcore]
---
```

### Cline
Use `@file` reference in chat: `@agent-skills/VOICE_AGENT_SKILL.md`. Or add to `.clinerules` for automatic context.

### Windsurf
Open as a tab and `@`-reference in Cascade. Or add to Windsurf Rules for automatic inclusion.

### Generic / Manual
Paste the contents into your assistant's context window, or point it at the file path if it supports file reading.

---

## References

- [Amazon Bedrock AgentCore Runtime documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore.html)
- [Amazon Nova 2 Sonic model guide](https://docs.aws.amazon.com/nova/latest/userguide/nova-sonic.html)
- [Strands Agents SDK documentation](https://strandsagents.com/)
- [Strands BidiAgent (experimental)](https://strandsagents.com/latest/user-guide/concepts/model-providers/nova-sonic-bidi/)
- [Amazon Bedrock AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/)
- [Blog: Extending an event-driven insurance claims application with Voice AI](https://aws.amazon.com/blogs/industries/)
