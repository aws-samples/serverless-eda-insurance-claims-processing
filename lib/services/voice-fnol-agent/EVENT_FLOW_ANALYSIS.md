# Voice Agent Event Flow Analysis

## Overview
This document explains how the voice FNOL agent integrates with the event-driven architecture, how it comprehends API responses, and how the system delivers real-time updates to the frontend via AWS IoT Core MQTT.

---

## Voice Agent Integration with Next Steps Flow

### Current Implementation (Updated - January 2026)

The voice agent seamlessly integrates with the event-driven architecture:

1. **Voice Claim Submission**: User completes voice conversation → Agent calls `submit_to_fnol_api` tool
2. **Immediate Response**: Agent says "Your claim has been submitted and a decision will be taken soon"
3. **Waiting State**: VoiceClaimComponent enters waiting state with spinner UI
4. **Session End**: Voice session automatically ends when claim is accepted
5. **Async Processing**: Backend processes claim (1-3 seconds)
6. **IoT Event**: `Claim.Accepted` or `Claim.Rejected` arrives via IoT Core MQTT
7. **Auto-Advance**: Updates.js receives event → dispatches `claimAccepted` custom event → VoiceClaimComponent ends session → App.js advances wizard
8. **Next Step**: User automatically proceeds to step 5 (Upload Damaged Car)

### Component Flow

```
App.js (StepWizard)
  ├─ updateState() function
  │
  ├─ ClaimWithVoice (Step 4)
  │   ├─ Receives updateState prop
  │   ├─ Passes to VoiceClaimComponent as onNextStep
  │   └─ No longer shows success screen
  │
  ├─ VoiceClaimComponent
  │   ├─ Submits claim via WebSocket
  │   ├─ Shows "Processing..." waiting state
  │   ├─ Displays claim data as JSON (real-time updates)
  │   ├─ Listens for claimAccepted custom event
  │   ├─ Automatically ends voice session on acceptance
  │   └─ Timeout after 30 seconds if no response
  │
  └─ Updates.js (IoT Subscription)
      ├─ Subscribes to IoT Core MQTT
      ├─ Receives Claim.Accepted event
      ├─ Dispatches claimAccepted custom event
      └─ Calls updateState("nextStep", true)
```

### User Experience Flow

**Happy Path (Claim Accepted)**:
1. User: Provides claim details via voice conversation
2. UI: Shows collected claim data as JSON (updates in real-time)
3. User: "Yes, submit my claim"
4. Agent: "Your claim has been submitted and a decision will be taken soon"
5. UI: Shows spinner with "Processing Your Claim... Please wait"
6. Backend: Validates claim (1-3 seconds)
7. IoT Event: `Claim.Accepted` arrives
8. Voice Session: Automatically ends after 2-second delay
9. UI: Automatically advances to "Upload Damaged Car" step
10. User: Continues with vehicle damage photos

**Rejection Path (Claim Rejected)**:
1. User: "Yes, submit my claim"
2. Agent: "Your claim has been submitted and a decision will be taken soon"
3. UI: Shows spinner with "Processing Your Claim..."
4. Backend: Rejects claim (invalid policy, etc.)
5. IoT Event: `Claim.Rejected` arrives
6. Updates.js: Does NOT call updateState("nextStep", true)
7. Voice Session: Remains active
8. User: Remains on claim step, can see rejection in timeline

**Timeout Path (No Response)**:
1. User: "Yes, submit my claim"
2. Agent: "Your claim has been submitted and a decision will be taken soon"
3. UI: Shows spinner with "Processing Your Claim..."
4. 30 seconds pass with no IoT event
5. UI: Shows timeout error with support message
6. User: Can check email or contact support

### Key Implementation Details

**VoiceClaimComponent.js**:
- Added `submissionStatus` state: 'idle', 'submitting', 'waiting', 'accepted', 'rejected'
- Added `waitingTimeout` to handle 30-second timeout
- After submission, enters 'waiting' state and shows spinner UI
- Listens for `claimAccepted` custom event from window
- Automatically calls `handleStopVoiceClaim()` 2 seconds after claim acceptance
- Displays claim data as formatted JSON that updates in real-time
- Cleanup timeout on unmount to prevent memory leaks

**ClaimWithVoice.js**:
- Receives `updateState` prop from App.js
- Passes it to VoiceClaimComponent as `onNextStep`
- Removed 'success' mode - wizard handles progression
- `handleVoiceClaimSubmitted` no longer changes mode

**App.js**:
- Passes `updateState` to ClaimWithVoice
- No changes to existing logic
- `updateState("nextStep", true)` still triggers `wizard.nextStep()`

**Updates.js**:
- Dispatches `claimAccepted` custom event when `Claim.Accepted` is received
- Already handles IoT subscription
- Already calls `updateState("nextStep", true)` on `Claim.Accepted`

**submit_fnol.py**:
- Updated message: "Your claim has been submitted and a decision will be taken soon"
- Sets proper expectations about async processing
- No longer mentions reference number (comes via email)

**WebSocketAudioClient.js**:
- Extracts claim data from `submit_to_fnol_api` tool invocation
- Updates UI with complete payload structure for real-time display

### Edge Cases Handled

1. **Network Disconnection**: Existing retry logic handles reconnection
2. **Timeout**: 30-second timeout shows error and suggests checking email
3. **Claim Rejection**: IoT event prevents auto-advance, user sees rejection in timeline
4. **Browser Refresh**: localStorage preserves state (existing feature)
5. **Multiple Submissions**: Waiting state prevents duplicate submissions
6. **Session Cleanup**: Voice session automatically ends on claim acceptance

---

## 1. Voice Agent Response Comprehension

### Current Implementation

The `submit_to_fnol_api` tool in `lib/services/voice-fnol-agent/app/tools/submit_fnol.py` returns a structured response that Nova Sonic can understand:

```python
return {
    "success": True,
    "claimNumber": reference_number,
    "payload": fnol_payload,
    "message": "Your claim has been submitted and a decision will be taken soon. Please wait while we process your claim."
}
```

### How Nova Sonic Comprehends the Response

1. **Tool Result Processing**: When the tool returns, Strands BidiAgent sends a `tool_result` event to Nova Sonic
2. **Natural Language Generation**: Nova Sonic reads the structured response and converts it to natural speech
3. **Key Fields Used**:
   - `success`: Determines if submission succeeded
   - `claimNumber`: The claim reference number (temporary, for tracking)
   - `message`: User-friendly message that Nova Sonic speaks directly
   - `payload`: Full payload for debugging (shown in UI modal)

### FNOL API Response

The FNOL Lambda (`lib/services/claims/app/handlers/fnol.js`) returns a simple response:

```javascript
return {
  statusCode: 200,
  body: "Claim Requested",
  headers: {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  isBase64Encoded: false
};
```

**Note**: The FNOL API does NOT return a claim number immediately. It only acknowledges receipt with "Claim Requested".

---

## 2. Event-Driven Architecture Flow

### Complete Event Flow

```
┌─────────────────┐
│  Voice Agent    │
│  submit_fnol    │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  FNOL Lambda    │
│  (fnol.js)      │
└────────┬────────┘
         │ Publishes Event
         ▼
┌─────────────────────────┐
│  EventBridge            │
│  Event: Claim.Requested │
└────────┬────────────────┘
         │ Routes to SQS
         ▼
┌─────────────────────────┐
│  Claims Queue (SQS)     │
└────────┬────────────────┘
         │ Polls
         ▼
┌──────────────────────────┐
│  Claims Processing       │
│  (claimsProcessing.js)   │
│  - Validates policy      │
│  - Validates personal    │
│    information           │
│  - Stores in DynamoDB    │
│  - Generates claim ID    │
│  - Creates presigned URL │
└────────┬─────────────────┘
         │ Publishes Event
         ▼
┌─────────────────────────────┐
│  EventBridge                │
│  Event: Claim.Accepted OR   │
│         Claim.Rejected      │
└────────┬────────────────────┘
         │ Routes to Lambda
         ▼
┌──────────────────────────────┐
│  Notifications Lambda        │
│  (notifications.js)          │
│  - Gets Cognito Identity ID  │
│  - Publishes to IoT Core     │
└────────┬─────────────────────┘
         │ MQTT Publish
         ▼
┌──────────────────────────────┐
│  AWS IoT Core                │
│  Topic: {cognitoIdentityId}  │
└────────┬─────────────────────┘
         │ MQTT Subscribe
         ▼
┌──────────────────────────────┐
│  React Frontend              │
│  (Updates.js)                │
│  - Displays event timeline   │
│  - Updates UI state          │
└──────────────────────────────┘
```

---

## 3. Detailed Component Analysis

### 3.1 FNOL Lambda (`lib/services/claims/app/handlers/fnol.js`)

**Purpose**: Entry point for claim submission

**Actions**:
1. Receives claim payload from API Gateway
2. Publishes `Claim.Requested` event to EventBridge
3. Returns immediate acknowledgment (does NOT wait for processing)

**Event Published**:
```javascript
{
  DetailType: "Claim.Requested",
  Source: "fnol.service",
  EventBusName: process.env.BUS_NAME,
  Detail: event.body  // Full claim payload
}
```

**Response**:
```javascript
{
  statusCode: 200,
  body: "Claim Requested"
}
```

---

### 3.2 Claims Processing Lambda (`lib/services/claims/app/handlers/claimsProcessing.js`)

**Purpose**: Validates and processes claims asynchronously

**Triggered By**: SQS queue receiving `Claim.Requested` events from EventBridge

**Processing Steps**:
1. **Policy Validation**: Checks if incident date falls within policy period
2. **Personal Information Validation**: Verifies driver's license matches customer record
3. **Claim Storage**: Stores claim in DynamoDB with generated UUID
4. **Presigned URL Generation**: Creates S3 presigned URL for car damage photo upload
5. **Event Publishing**: Publishes `Claim.Accepted` or `Claim.Rejected` event

**Event Published (Success)**:
```javascript
{
  DetailType: "Claim.Accepted",
  Source: "claims.service",
  EventBusName: process.env.BUS_NAME,
  Detail: {
    customerId: "...",
    claimId: "uuid-generated",
    uploadCarDamageUrl: "presigned-s3-url",
    message: "Claim Information has been accepted"
  }
}
```

**Event Published (Failure)**:
```javascript
{
  DetailType: "Claim.Rejected",
  Source: "claims.service",
  Detail: {
    customerId: "...",
    message: "Policy provided for customer does not match..."
  }
}
```

---

### 3.3 Notifications Lambda (`lib/services/notifications/app/handlers/notifications.js`)

**Purpose**: Delivers events to frontend via IoT Core MQTT

**Triggered By**: EventBridge rules for various event types (Claim.Accepted, Claim.Rejected, etc.)

**Processing Steps**:
1. Receives event from EventBridge
2. Extracts `customerId` from event detail
3. Looks up Cognito Identity ID from DynamoDB customer table
4. Publishes entire event to IoT Core MQTT topic

**IoT Core Publish**:
```javascript
{
  payload: JSON.stringify(event),  // Full EventBridge event
  topic: cognitoIdentityId         // User-specific topic
}
```

**Topic Structure**: Each user has a unique MQTT topic based on their Cognito Identity ID, ensuring they only receive their own events.

---

### 3.4 React Frontend (`react-claims/src/Updates.js`)

**Purpose**: Subscribes to IoT Core and displays real-time event updates

**Initialization Flow**:
1. Gets Cognito credentials via AWS Amplify Auth
2. Configures AWS IoT Provider with MQTT endpoint
3. Calls IoT API to attach IoT policy to user's identity
4. Subscribes to MQTT topic matching user's Cognito Identity ID

**Subscription Code**:
```javascript
Auth.currentCredentials().then(async (res) => {
  PubSub.removePluggable("AWSIoTProvider");
  Amplify.addPluggable(
    new AWSIoTProvider({
      aws_pubsub_region: awsmobile.aws_project_region,
      aws_pubsub_endpoint: `wss://${pubSubEndpoint}/mqtt`,
    })
  );

  await updateCustomer();  // Attaches IoT policy

  PubSub.subscribe(res.identityId).subscribe({
    next: async (data) => {
      await nextFunc(data);  // Process received event
    },
    error: async (error) => {
      // Handle errors and retry
    }
  });
});
```

**Event Processing**:
- Displays events in vertical timeline
- Updates UI state based on event type
- Shows success (blue) or error (red) indicators
- Extracts relevant information for display

**Event Types Handled**:
- `Claim.Accepted`: Shows success, enables next step
- `Claim.Rejected`: Shows error message
- `Customer.Accepted`: Updates with presigned URLs
- `Document.Processed`: Shows document analysis results
- `Fraud.Detected`: Shows fraud reason
- `Settlement.Finalized`: Shows settlement message
- `Vendor.Finalized`: Shows vendor message

---

## 4. Key Insights

### 4.1 Asynchronous Processing

The architecture is fully asynchronous:
- FNOL API returns immediately (doesn't wait for validation)
- Claims processing happens in background via SQS
- Frontend receives updates via IoT Core push notifications
- User sees real-time progress without polling

### 4.2 Voice Agent Limitations

**Current State**:
- Voice agent receives only "Claim Requested" acknowledgment
- Does NOT receive the actual claim ID from processing
- Cannot inform user about validation failures in real-time
- User must check UI for final claim status

**Why This Happens**:
1. FNOL Lambda returns immediately (synchronous response)
2. Claims Processing Lambda runs asynchronously (could take seconds)
3. Voice agent conversation ends before processing completes
4. Final status delivered via IoT Core to web UI only

### 4.3 Security Model

**IoT Core Security**:
- Each user has unique MQTT topic (Cognito Identity ID)
- IoT policy attached per-user via API call
- Policy allows subscribe/publish only to user's own topic
- Prevents users from seeing other users' events

**Policy Structure** (`lib/services/notifications/infra/notifications-service.js`):
```javascript
{
  Effect: "Allow",
  Action: "iot:Subscribe",
  Resource: "arn:aws:iot:region:account:topicfilter/${cognito-identity.amazonaws.com:sub}"
}
```

---

## 5. Potential Enhancements for Voice Agent

### Option 1: Wait for Processing (Synchronous)
- Make FNOL Lambda wait for Claims Processing to complete
- Return actual claim ID to voice agent
- **Pros**: Voice agent can speak final claim number
- **Cons**: Longer wait time, potential timeouts, breaks async pattern

### Option 2: Callback via WebSocket
- Keep async processing
- Have Notifications Lambda also publish to voice agent's WebSocket session
- Voice agent speaks final claim number when received
- **Pros**: Maintains async pattern, real-time updates
- **Cons**: Requires session management, WebSocket might be closed

### Option 3: Hybrid Approach
- Voice agent speaks temporary reference number immediately
- Tells user to check email/UI for final claim number
- **Pros**: Fast response, maintains async pattern
- **Cons**: User doesn't get final number in voice conversation (current state)

---

## 6. Event Catalog Documentation

The system uses EventCatalog to document all events:

**Location**: `event-catalog/events/`

**Key Events**:
- `ClaimRequested`: Published by FNOL API
- `ClaimAccepted`: Published by Claims Service
- `ClaimRejected`: Published by Claims Service
- `CustomerAccepted`: Published by Customer Service
- `CustomerRejected`: Published by Customer Service
- `DocumentProcessed`: Published by Documents Service
- `FraudDetected`: Published by Fraud Service
- `FraudNotDetected`: Published by Fraud Service
- `SettlementFinalized`: Published by Settlement Service
- `VendorFinalized`: Published by Vendor Service

Each event has:
- Schema definition (JSON Schema)
- Producer/Consumer documentation
- Version information
- Ownership details

---

## 7. Summary

The voice FNOL agent successfully submits claims but receives only an acknowledgment, not the final claim ID. The actual claim processing happens asynchronously through EventBridge → SQS → Claims Processing Lambda, with results delivered to the frontend via AWS IoT Core MQTT. This event-driven architecture provides real-time updates to the web UI but creates a gap in the voice conversation where the user doesn't receive the final claim number verbally.

The current implementation prioritizes system scalability and responsiveness over end-to-end voice conversation completeness.
