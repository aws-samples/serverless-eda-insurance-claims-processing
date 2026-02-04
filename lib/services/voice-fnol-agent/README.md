# Voice-Enabled FNOL Agent Service

## Overview

The Voice-Enabled FNOL (First Notice of Loss) Agent Service enables insurance customers to submit accident claims through natural voice conversation. The service uses Amazon Nova 2 Sonic for speech-to-speech interaction and is deployed on Amazon Bedrock AgentCore Runtime for serverless agent hosting.

### Key Features

- **Safety-First Approach**: Prioritizes user safety and well-being before collecting claim information
- **Natural Language Processing**: Extracts structured claim data from conversational speech
- **Real-Time Bidirectional Audio**: WebSocket-based streaming with low latency (<2 seconds)
- **Seamless Integration**: Integrates with existing Claims Service infrastructure without modification
- **Graceful Fallback**: Provides form-based input option when voice fails

## Architecture

```
┌─────────────────┐         WSS          ┌──────────────────────┐
│                 │◄────────────────────►│                      │
│  React Frontend │                      │  AgentCore Runtime   │
│  (Web Audio)    │                      │  (BidiAgent)         │
│                 │                      │                      │
└─────────────────┘                      └──────────┬───────────┘
                                                    │
                                                    │ HTTPS
                                                    │
                                         ┌──────────▼───────────┐
                                         │                      │
                                         │   Claims Service     │
                                         │   (FNOL API)         │
                                         │                      │
                                         └──────────────────────┘
```

### Technology Stack

- **Speech Model**: Amazon Nova 2 Sonic (bidirectional streaming)
- **Agent Runtime**: Amazon Bedrock AgentCore Runtime (serverless)
- **Agent Framework**: Strands BidiAgent (WebSocket abstraction)
- **Language**: Python 3.13
- **Web Framework**: FastAPI with WebSocket support
- **Audio Format**: PCM encoding (16kHz input, 24kHz output)
- **Authentication**: AWS SigV4 or OAuth 2.0
- **Infrastructure**: AWS CDK for deployment automation

## Directory Structure

```
lib/services/voice-fnol-agent/
├── app/                        # Application code
│   ├── app.py                  # Main FastAPI application with WebSocket endpoint
│   ├── agent.py                # BidiAgent configuration with Nova Sonic model
│   ├── context.py              # Conversation context management
│   ├── tools/                  # Agent tools for claim processing
│   │   ├── safety_check.py     # Safety assessment tool
│   │   ├── extract_claim.py    # Claim information extraction tool
│   │   ├── validate_fields.py  # Required field validation tool
│   │   └── submit_fnol.py      # FNOL API submission tool
│   ├── models/                 # Data models
│   │   └── claim_schema.py     # Pydantic models for FNOL data
│   └── tests/                  # Unit and property-based tests
│       ├── test_safety_check.py
│       ├── test_extract_claim.py
│       ├── test_validate_fields.py
│       ├── test_submit_fnol.py
│       ├── test_models.py
│       ├── test_context.py
│       ├── test_agent.py
│       └── test_websocket.py
├── infra/                      # Infrastructure as Code
│   ├── voice-fnol-service.ts   # CDK stack definition
│   └── tests/                  # Infrastructure tests
│       └── voice-fnol-service.test.ts
├── README.md                   # This file
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container image definition
└── .dockerignore              # Files to exclude from container
```

## Setup Instructions

### Prerequisites

- Python 3.13 or higher
- Docker (for containerization)
- AWS CLI configured with appropriate credentials
- Node.js 18+ and npm (for CDK deployment)
- Access to Amazon Bedrock with Nova Sonic model enabled

### Local Development Setup

1. **Create a virtual environment**:
   ```bash
   cd lib/services/voice-fnol-agent
   python3.13 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables**:
   ```bash
   export AWS_REGION=us-east-1
   export NOVA_SONIC_MODEL_ID=amazon.nova-sonic-v2:0
   export FNOL_API_ENDPOINT=https://your-claims-api-endpoint.com/fnol
   export LOG_LEVEL=INFO
   ```

4. **Run tests**:
   ```bash
   # Run all tests
   pytest app/tests/ -v
   
   # Run property-based tests with statistics
   pytest app/tests/ -v --hypothesis-show-statistics
   
   # Run specific test file
   pytest app/tests/test_safety_check.py -v
   ```

5. **Run the application locally**:
   ```bash
   uvicorn app.app:app --host 0.0.0.0 --port 8080 --reload
   ```

6. **Test the health check endpoint**:
   ```bash
   curl http://localhost:8080/ping
   # Expected response: {"status": "healthy"}
   ```

### Docker Build and Run

1. **Build the Docker image**:
   ```bash
   docker build -t voice-fnol-agent:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8080:8080 \
     -e AWS_REGION=us-east-1 \
     -e NOVA_SONIC_MODEL_ID=amazon.nova-sonic-v2:0 \
     -e FNOL_API_ENDPOINT=https://your-claims-api-endpoint.com/fnol \
     -e LOG_LEVEL=INFO \
     voice-fnol-agent:latest
   ```

### Deployment to AgentCore Runtime

1. **Navigate to the project root**:
   ```bash
   cd ../../..  # Back to project root
   ```

2. **Deploy the CDK stack**:
   ```bash
   npm run build
   cdk deploy ClaimsProcessingStack --require-approval never
   ```

3. **Get the WebSocket endpoint**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name ClaimsProcessingStack \
     --query 'Stacks[0].Outputs[?OutputKey==`WebSocketEndpoint`].OutputValue' \
     --output text
   ```

## Agent Tools

### 1. Safety Assessment Tool (`assess_safety`)

Evaluates user safety before proceeding with claim collection.

**Parameters**:
- `is_safe` (bool): Whether user confirms they are safe
- `needs_medical` (bool): Whether user needs medical assistance
- `police_contacted` (bool): Whether police/emergency services contacted
- `in_safe_location` (bool): Whether user is in safe location away from traffic

**Returns**: Safety confirmation status and guidance message

### 2. Claim Extraction Tool (`extract_claim_info`)

Extracts structured claim information from natural language conversation.

**Parameters**: All FNOL fields (all optional, updates context incrementally)
- `occurrence_date_time`: Date and time of accident
- `location_description`: Natural language location
- `damage_description`: Description of damage and incident
- `policy_id`: Insurance policy ID
- `drivers_license_number`: Driver's license number
- `license_plate_number`: License plate of insured vehicle
- `number_of_passengers`: Number of passengers in vehicle
- `was_driving`: Whether the insured was driving
- `police_filed`: Whether police report was filed
- `police_receipt_available`: Whether police report/receipt is available
- Other party information (first name, last name, insurance company, insurance ID)

**Returns**: Updated claim data with missing fields identified

### 3. Field Validation Tool (`validate_required_fields`)

Validates that all required fields are present before submission.

**Parameters**:
- `claim_data` (dict): Current claim data structure

**Returns**: Validation result with missing fields list

### 4. FNOL Submission Tool (`submit_to_fnol_api`)

Submits the complete claim to the existing FNOL API endpoint.

**Parameters**:
- `customer_id` (str): Customer ID from authenticated session

**Returns**: Submission result with claim reference number

## WebSocket API

### Connection

**Endpoint**: `wss://<agentcore-endpoint>/ws`

**Authentication**: Include `Authorization` header with SigV4 or OAuth 2.0 token

**Example**:
```javascript
const ws = new WebSocket('wss://your-endpoint.com/ws', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});
```

### Message Format

**Audio Chunks**: Binary frames containing PCM audio data
- Input: 16kHz sample rate, PCM encoding, mono channel
- Output: 24kHz sample rate, PCM encoding, mono channel
- Chunk size: 20ms audio frames (320 bytes for 16kHz input)

**Control Messages**: JSON frames for connection management and metadata

### Connection Lifecycle

1. **Connect**: Client establishes WSS connection with auth token
2. **Authenticate**: Server validates credentials
3. **Stream**: Bidirectional audio streaming begins
4. **Process**: Agent processes speech and invokes tools
5. **Respond**: Agent streams audio responses back to client
6. **Disconnect**: Clean connection closure

## Testing

### Unit Tests

Unit tests focus on specific examples and edge cases:

```bash
# Run all unit tests
pytest app/tests/ -v -m "not property_test"

# Run specific test file
pytest app/tests/test_safety_check.py -v
```

### Property-Based Tests

Property-based tests verify universal properties across randomized inputs:

```bash
# Run all property tests
pytest app/tests/ -v -m property_test --hypothesis-show-statistics

# Run with specific number of iterations
pytest app/tests/ -v -m property_test --hypothesis-seed=12345
```

### Test Coverage

```bash
# Generate coverage report
pytest app/tests/ --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_REGION` | AWS region for Bedrock | `us-east-1` | Yes |
| `NOVA_SONIC_MODEL_ID` | Nova Sonic model identifier | `amazon.nova-sonic-v2:0` | Yes |
| `FNOL_API_ENDPOINT` | Claims Service FNOL API URL | - | Yes |
| `LOG_LEVEL` | Logging level | `INFO` | No |
| `SESSION_TTL_MINUTES` | Context session timeout | `30` | No |

### Audio Configuration

- **Input Sample Rate**: 16kHz
- **Output Sample Rate**: 24kHz
- **Encoding**: PCM
- **Channels**: Mono (1)
- **Chunk Duration**: 20ms

## Monitoring and Observability

### Health Check

**Endpoint**: `GET /ping`

**Response**: `{"status": "healthy"}`

### Metrics

The service emits CloudWatch metrics for:
- WebSocket connection count
- Audio streaming latency
- Agent response time
- Tool invocation success/failure rates
- FNOL API submission success/failure rates

### Logging

Structured JSON logs include:
- Session ID for conversation tracking
- Tool invocations and results
- Error details with stack traces
- Performance metrics

### Tracing

AWS X-Ray tracing enabled for:
- WebSocket connection lifecycle
- Agent tool invocations
- FNOL API calls
- Bedrock model invocations

## Error Handling

### Connection Errors

- **WebSocket Connection Failure**: Display error, offer retry and fallback to form
- **Authentication Failure**: Redirect to login or refresh token
- **Network Disconnection**: Attempt auto-reconnect (3 attempts), then offer fallback

### Audio Processing Errors

- **Microphone Access Denied**: Display permission instructions, offer form fallback
- **Audio Encoding Failure**: Log error, switch to form input
- **Unsupported Browser**: Display browser requirements, show form only

### Agent Processing Errors

- **Comprehension Failure**: After 3 attempts, suggest form-based input
- **Tool Execution Failure**: Retry up to 2 times, then suggest fallback
- **FNOL API Failure**: Store claim data locally, offer retry or form submission

## Security

### Authentication

- WebSocket connections require valid SigV4 or OAuth 2.0 tokens
- Tokens validated before accepting connections
- Invalid credentials result in connection rejection (code 1008)

### Authorization

- IAM roles follow least-privilege principle
- Bedrock model access limited to Nova Sonic
- Claims Service API access scoped to FNOL endpoint only

### Data Protection

- All WebSocket connections use WSS (encrypted)
- Audio data not persisted (streaming only)
- Claim data encrypted at rest in DynamoDB
- PII handling follows compliance requirements

## Troubleshooting

### Common Issues

**Issue**: WebSocket connection fails with 1008 error
- **Cause**: Invalid or expired authentication token
- **Solution**: Refresh the page to get a new token

**Issue**: Agent doesn't respond to speech
- **Cause**: Microphone not capturing audio or audio format mismatch
- **Solution**: Check browser permissions and audio settings

**Issue**: Claim submission fails
- **Cause**: FNOL API endpoint unreachable or invalid data
- **Solution**: Check network connectivity and validate claim data format

**Issue**: High latency in responses
- **Cause**: Network issues or Bedrock throttling
- **Solution**: Check CloudWatch metrics for bottlenecks

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
```

View detailed logs:
```bash
# Local development
tail -f logs/voice-fnol-agent.log

# AgentCore Runtime
aws logs tail /aws/agentcore/voice-fnol-agent --follow
```

## Contributing

### Code Style

- Follow PEP 8 for Python code
- Use type hints for all function signatures
- Write docstrings for all public functions
- Keep functions focused and under 50 lines

### Testing Requirements

- All new features must include unit tests
- Property-based tests required for core logic
- Minimum 80% code coverage
- All tests must pass before merging

### Pull Request Process

1. Create a feature branch from `main`
2. Implement changes with tests
3. Run full test suite: `pytest app/tests/ -v`
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback

## License

This project is licensed under the MIT-0 License. See the LICENSE file for details.

## Support

For issues or questions:
- Create an issue in the GitHub repository
- Contact the Claims Processing team
- Refer to the design document: `.kiro/specs/voice-fnol/design.md`
