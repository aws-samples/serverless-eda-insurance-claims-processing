#!/bin/bash
# Build and Test Script for Voice FNOL Agent Docker Container
# This script builds the Docker container and runs basic verification tests

set -e  # Exit on error

echo "========================================="
echo "Voice FNOL Agent - Build and Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="voice-fnol-agent"
IMAGE_TAG="latest"
CONTAINER_NAME="voice-fnol-agent-test"
PORT=8080

echo "Step 1: Building Docker image..."
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f Dockerfile .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

echo ""
echo "Step 2: Verifying image details..."
docker images ${IMAGE_NAME}:${IMAGE_TAG}
echo ""

echo "Step 3: Starting container for testing..."
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:${PORT} \
    -e AWS_REGION=us-east-1 \
    -e FNOL_API_ENDPOINT=http://localhost:3000/fnol \
    -e NOVA_SONIC_MODEL_ID=amazon.nova-sonic-v2:0 \
    -e LOG_LEVEL=INFO \
    ${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi

echo ""
echo "Step 4: Waiting for container to be ready (10 seconds)..."
sleep 10

echo ""
echo "Step 5: Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/ping)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP ${HEALTH_RESPONSE})${NC}"
    curl -s http://localhost:${PORT}/ping | jq .
else
    echo -e "${RED}✗ Health check failed (HTTP ${HEALTH_RESPONSE})${NC}"
    echo "Container logs:"
    docker logs ${CONTAINER_NAME}
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
    exit 1
fi

echo ""
echo "Step 6: Testing root endpoint..."
ROOT_RESPONSE=$(curl -s http://localhost:${PORT}/)
echo "$ROOT_RESPONSE" | jq .

echo ""
echo "Step 7: Checking container logs..."
echo "Last 20 lines of logs:"
docker logs --tail 20 ${CONTAINER_NAME}

echo ""
echo "Step 8: Verifying container resource usage..."
docker stats ${CONTAINER_NAME} --no-stream

echo ""
echo "Step 9: Cleaning up test container..."
docker stop ${CONTAINER_NAME}
docker rm ${CONTAINER_NAME}

echo ""
echo "========================================="
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "========================================="
echo ""
echo "Docker image ${IMAGE_NAME}:${IMAGE_TAG} is ready for deployment."
echo ""
echo "Next steps:"
echo "1. Push to ECR: docker tag ${IMAGE_NAME}:${IMAGE_TAG} <ecr-repo-url>:${IMAGE_TAG}"
echo "2. Push to ECR: docker push <ecr-repo-url>:${IMAGE_TAG}"
echo "3. Deploy with CDK: cdk deploy"
echo ""
