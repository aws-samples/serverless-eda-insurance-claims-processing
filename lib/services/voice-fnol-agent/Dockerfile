# Voice-Enabled FNOL Agent Service Dockerfile
# Base image: Python 3.13 slim for smaller image size and latest features
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
# - ffmpeg: Audio format conversion and processing
# - libsndfile1: Audio file I/O library
# - portaudio19-dev: Audio I/O library for real-time audio
# - build-essential: Compilation tools for Python packages with C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    portaudio19-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
# Use --no-cache-dir to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 8080 for WebSocket endpoint
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/ping')" || exit 1

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Run the application with OpenTelemetry instrumentation
# BedrockAgentCoreApp automatically:
# - Exposes /ping endpoint for health checks
# - Exposes /invocations endpoint for HTTP invocations  
# - Exposes /ws endpoint for WebSocket connections
# - Handles authentication (SigV4 or OAuth 2.0)
# - Manages session lifecycle
# - Provides observability integration
#
# opentelemetry-instrument command:
# - Loads OTEL configuration from environment variables (set by AgentCore Runtime)
# - Automatically instruments Strands Agent, Bedrock calls, and HTTP requests
# - Sends traces, metrics, and logs to CloudWatch
# - Enables GenAI Observability dashboard visualization
CMD ["python", "-m", "app/app_agentcore.py"]
