# Voice-Enabled FNOL Agent Service Dockerfile
# Base image: Python 3.13 slim for smaller image size and latest features
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# All environment variables in one layer
ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_NO_PROGRESS=1 \
    PYTHONUNBUFFERED=1 \
    DOCKER_CONTAINER=1

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

# Signal that this is running in Docker for host binding logic
ENV DOCKER_CONTAINER=1

# Create non-root user
RUN useradd -m -u 1000 bedrock_agentcore
USER bedrock_agentcore

EXPOSE 8080

# Copy application code
COPY app/ ./app/

# Run the application with OpenTelemetry instrumentation
CMD ["opentelemetry-instrument", "python", "-m", "app.app_agentcore"]