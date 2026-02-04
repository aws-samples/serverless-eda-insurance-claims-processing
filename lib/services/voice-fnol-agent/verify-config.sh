#!/bin/bash
# Configuration Verification Script for Voice FNOL Agent
# Verifies all required files and configurations are in place before building

set -e

echo "========================================="
echo "Voice FNOL Agent - Configuration Check"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check required files
echo "Checking required files..."
FILES=(
    "Dockerfile"
    ".dockerignore"
    "requirements.txt"
    "app/__init__.py"
    "app/app.py"
    "app/agent.py"
    "app/context.py"
    "app/models/claim_schema.py"
    "app/tools/safety_check.py"
    "app/tools/extract_claim.py"
    "app/tools/validate_fields.py"
    "app/tools/submit_fnol.py"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "Checking Python version in Dockerfile..."
PYTHON_VERSION=$(grep "FROM python:" Dockerfile | grep -o "python:[0-9.]*" | cut -d: -f2)
if [ "$PYTHON_VERSION" = "3.13-slim" ]; then
    echo -e "${GREEN}✓${NC} Python version: $PYTHON_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Python version: $PYTHON_VERSION (expected 3.13-slim)"
fi

echo ""
echo "Checking required dependencies in requirements.txt..."
DEPS=(
    "strands-agents"
    "fastapi"
    "uvicorn"
    "pydantic"
    "httpx"
    "boto3"
    "pytest"
    "hypothesis"
)

for dep in "${DEPS[@]}"; do
    if grep -q "$dep" requirements.txt; then
        echo -e "${GREEN}✓${NC} $dep"
    else
        echo -e "${RED}✗${NC} $dep (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "Checking Dockerfile configuration..."

# Check EXPOSE port
if grep -q "EXPOSE 8080" Dockerfile; then
    echo -e "${GREEN}✓${NC} Port 8080 exposed"
else
    echo -e "${RED}✗${NC} Port 8080 not exposed"
    ERRORS=$((ERRORS + 1))
fi

# Check HEALTHCHECK
if grep -q "HEALTHCHECK" Dockerfile; then
    echo -e "${GREEN}✓${NC} Health check configured"
else
    echo -e "${RED}✗${NC} Health check not configured"
    ERRORS=$((ERRORS + 1))
fi

# Check CMD
if grep -q "uvicorn" Dockerfile; then
    echo -e "${GREEN}✓${NC} Uvicorn command configured"
else
    echo -e "${RED}✗${NC} Uvicorn command not configured"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking .dockerignore configuration..."
if grep -q "tests/" .dockerignore; then
    echo -e "${GREEN}✓${NC} Tests excluded from image"
else
    echo -e "${YELLOW}⚠${NC} Tests not excluded (image will be larger)"
fi

if grep -q "*.md" .dockerignore; then
    echo -e "${GREEN}✓${NC} Documentation excluded from image"
else
    echo -e "${YELLOW}⚠${NC} Documentation not excluded (image will be larger)"
fi

echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Configuration check passed!${NC}"
    echo "========================================="
    echo ""
    echo "Ready to build Docker image:"
    echo "  docker build -t voice-fnol-agent:latest ."
    echo ""
    exit 0
else
    echo -e "${RED}✗ Configuration check failed with $ERRORS error(s)${NC}"
    echo "========================================="
    echo ""
    echo "Please fix the errors above before building."
    echo ""
    exit 1
fi
