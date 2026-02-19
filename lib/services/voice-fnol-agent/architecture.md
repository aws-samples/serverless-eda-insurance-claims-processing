# Voice AI Agent Architecture Diagram

```
                              ┌──────────────────┐
                              │  React Frontend  │
                              │  (Browser)       │
                              └────────┬─────────┘
                                       │
                                       │ 1. WebSocket + SigV4 Auth
                                       │    + Cognito Identity ID
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      Amazon Bedrock AgentCore Runtime                      │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Voice FNOL Agent (Docker Container - ARM64)                       │    │
│  │                                                                    │    │
│  │  ┌────────────────────────────────────────────────────────────┐    │    │
│  │  │  Strands BidiAgent + Amazon Nova 2 Sonic                   │    │    │
│  │  │  - Speech-to-Speech Conversation                           │    │    │
│  │  │  - Real-time Audio Streaming (PCM 16kHz/24kHz)             │    │    │
│  │  │  - Barge-in Support (VAD-based interruption)               │    │    │
│  │  └────────────────────────────────────────────────────────────┘    │    │
│  │                                                                    │    │
│  │  Tools (6):                                                        │    │
│  │  ┌────────────────────────────────────────────────────────────┐    │    │
│  │  │ 1. get_customer_info                                       │    │    │
│  │  │    └─> GET Customer API (SigV4)                            │    │    │
│  │  │        └─> Returns: customer, policy, driver's license     │    │    │
│  │  │                                                            │    │    │
│  │  │ 2. submit_to_fnol_api                                      │    │    │
│  │  │    └─> POST FNOL API (SigV4)                               │    │    │
│  │  │        └─> Publishes: Claim.Requested event                │    │    │
│  │  │                                                            │    │    │
│  │  │ 3-6. Other tools (safety check, validation, etc.)          │    │    │
│  │  └────────────────────────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Environment:                                                              │
│  - Network: PUBLIC (no VPC required)                                       │
│  - Lifecycle: 5min idle timeout, 1hr max lifetime                          │
│  - Observability: CloudWatch Logs + X-Ray + Transaction Search             │
└───────────────────────┬───────────────────────┬────────────────────────────┘
                        │                       │
                        │ 2. GET /customer      │ 3. POST /fnol
                        │    (SigV4 + Cognito)  │    (SigV4)
                        │                       │
                        ▼                       ▼
              ┌──────────────────┐    ┌──────────────────────┐
              │  Customer API    │    │  FNOL API            │
              │  (API Gateway)   │    │  (API Gateway)       │
              └────────┬─────────┘    └──────────┬───────────┘
                       │                         │
                       │ 4. Query DynamoDB       │ 5. Publish Event
                       │                         │
                       ▼                         ▼
              ┌──────────────────┐    ┌──────────────────────────────────────┐
              │  Customer Table  │    │  Amazon EventBridge                  │
              │  - Customer Info │    │  Event: Claim.Requested              │
              │  - Policy Data   │    └──────────┬───────────────────────────┘
              │  - DL Info       │               │
              └──────────────────┘               │ 6. Route to SQS
                                                 │
                                                 ▼
                                       ┌──────────────────────┐
                                       │  Claims Queue (SQS)  │
                                       └──────────┬───────────┘
                                                  │
                                                  │ 7. Poll
                                                  │
                                                  ▼
                                       ┌─────────────────────────────────────┐
                                       │  Claims Processing Lambda           │
                                       │  - Validate policy                  │
                                       │  - Validate personal info           │
                                       │  - Store in DynamoDB                │
                                       │  - Generate presigned URL           │
                                       └──────────┬──────────────────────────┘
                                                  │
                                                  │ 8. Publish Event
                                                  │
                                                  ▼
                                       ┌─────────────────────────────────────┐
                                       │  Amazon EventBridge                 │
                                       │  Event: Claim.Accepted/Rejected     │
                                       └──────────┬──────────────────────────┘
                                                  │
                                                  │ 9. Route to Lambda
                                                  │
                                                  ▼
                                       ┌─────────────────────────────────────┐
                                       │  Notifications Lambda               │
                                       │  - Get Cognito Identity ID          │
                                       │  - Publish to IoT Core              │
                                       └──────────┬──────────────────────────┘
                                                  │
                                                  │ 10. MQTT Publish
                                                  │
                                                  ▼
                                       ┌─────────────────────────────────────┐
                                       │  AWS IoT Core                       │
                                       │  Topic: {cognitoIdentityId}         │
                                       └──────────┬──────────────────────────┘
                                                  │
                                                  │ 11. MQTT Subscribe
                                                  │
                                                  ▼
                                       ┌─────────────────────────────────────┐
                                       │  React Frontend (Updates.js)        │
                                       │  - Display event timeline           │
                                       │  - Dispatch claimAccepted event     │
                                       │  - Trigger wizard.nextStep()        │
                                       │  - End voice session                │
                                       └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Key Features                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ Speech-to-Speech: Natural voice conversation with Nova 2 Sonic           │
│  ✓ Real-time Audio: Bidirectional streaming with barge-in support           │
│  ✓ Customer Data Retrieval: Eliminates redundant questions                  │
│  ✓ Event-Driven: Async processing with IoT Core real-time updates           │
│  ✓ Auto-Progression: Seamless wizard advancement on claim acceptance        │
│  ✓ Session Management: Automatic cleanup on completion                      │
│  ✓ Security: SigV4 authentication, IAM policies, per-user MQTT topics       │
│  ✓ Observability: CloudWatch Logs, X-Ray tracing, Transaction Search        │
└─────────────────────────────────────────────────────────────────────────────┘
```
