#!/bin/bash
#
# Local Stack Startup Script
#
# Starts the Docker Compose stack and verifies all services are healthy.
#
# Usage:
#   ./scripts/deploy/local_up.sh              # Start with default profile
#   ./scripts/deploy/local_up.sh --full       # Start all services including Grafana
#   ./scripts/deploy/local_up.sh --minimal    # Start only API and Redis
#   ./scripts/deploy/local_up.sh --stop       # Stop all services
#   ./scripts/deploy/local_up.sh --logs       # View logs
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - .env file with required variables (copy from env.sample)
#

set -e

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_SAMPLE="$PROJECT_ROOT/env.sample"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "All requirements met"
}

check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_warn ".env file not found"
        
        if [ -f "$ENV_SAMPLE" ]; then
            log_info "Creating .env from env.sample..."
            cp "$ENV_SAMPLE" "$ENV_FILE"
            log_warn "Please edit .env and add your API keys"
        else
            log_info "Creating minimal .env file..."
            cat > "$ENV_FILE" << 'EOF'
# Flashcard Orchestrator Environment Variables
# Copy this to .env and fill in values

NODE_ENV=development
API_PORT=5000

# LLM API (at least one required for real mode)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Signing key for JWT tokens (generate a random string)
SIGNING_KEY=dev-signing-key-change-me-in-production

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/flashcards

# Vector DB
VECTOR_DB_PROVIDER=qdrant
QDRANT_URL=http://localhost:6333

# Embeddings
EMBEDDING_PROVIDER=gemini

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
EOF
            log_warn "Please edit .env and add your API keys"
        fi
    fi
    
    # Check for required keys
    source "$ENV_FILE" 2>/dev/null || true
    
    if [ -z "$SIGNING_KEY" ] || [ "$SIGNING_KEY" = "dev-signing-key-change-me-in-production" ]; then
        log_warn "SIGNING_KEY is using default value. Generate a secure key for production!"
    fi
    
    if [ -z "$GEMINI_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
        log_warn "No LLM API key configured. Real mode will not work."
    fi
}

wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=0
    
    log_info "Waiting for $service..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_error "$service failed to become healthy"
    return 1
}

# =============================================================================
# Commands
# =============================================================================

start_stack() {
    local profile="${1:-}"
    
    log_info "Starting Flashcard Orchestrator stack..."
    
    cd "$PROJECT_ROOT"
    
    # Build command based on profile
    local compose_cmd="docker compose -f $COMPOSE_FILE"
    
    case "$profile" in
        --full)
            log_info "Starting full stack (all services)..."
            compose_cmd="$compose_cmd --profile full"
            ;;
        --monitoring)
            log_info "Starting with monitoring (Prometheus + Grafana)..."
            compose_cmd="$compose_cmd --profile monitoring"
            ;;
        --minimal)
            log_info "Starting minimal stack (API + Redis only)..."
            # Just start core services without profiles
            ;;
        *)
            log_info "Starting default stack (API + Workers + Redis + Qdrant)..."
            compose_cmd="$compose_cmd --profile with-qdrant"
            ;;
    esac
    
    # Pull latest images
    log_info "Pulling images..."
    $compose_cmd pull 2>/dev/null || true
    
    # Start services
    log_info "Starting services..."
    $compose_cmd up -d
    
    # Wait for services to be healthy
    echo ""
    log_info "Verifying services..."
    
    wait_for_service "Redis" "http://localhost:6379" 15 || true
    
    if [ "$profile" != "--minimal" ]; then
        wait_for_service "Qdrant" "http://localhost:6333/health" 30 || true
    fi
    
    wait_for_service "API" "http://localhost:5000/health" 60 || {
        log_warn "API health check failed, but service may still be starting..."
    }
    
    echo ""
    log_success "Stack started!"
    echo ""
    show_status
}

stop_stack() {
    log_info "Stopping Flashcard Orchestrator stack..."
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" --profile full down
    
    log_success "Stack stopped"
}

show_status() {
    echo "=========================================="
    echo "Service Status"
    echo "=========================================="
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo "=========================================="
    echo "Endpoints"
    echo "=========================================="
    echo "  API:        http://localhost:5000"
    echo "  API Health: http://localhost:5000/health"
    echo "  Qdrant:     http://localhost:6333"
    echo "  Redis:      localhost:6379"
    echo "  Prometheus: http://localhost:9090 (if started)"
    echo "  Grafana:    http://localhost:3001 (if started)"
    echo ""
    echo "=========================================="
    echo "Commands"
    echo "=========================================="
    echo "  View logs:  docker compose -f docker-compose.prod.yml logs -f"
    echo "  Stop:       ./scripts/deploy/local_up.sh --stop"
    echo "  Full stack: ./scripts/deploy/local_up.sh --full"
    echo ""
}

show_logs() {
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
}

run_tests() {
    log_info "Running connectivity tests..."
    
    # Test Redis
    if redis-cli -h localhost ping 2>/dev/null | grep -q PONG; then
        log_success "Redis: OK"
    else
        log_warn "Redis: Connection failed (is redis-cli installed?)"
    fi
    
    # Test Qdrant
    if curl -s http://localhost:6333/health | grep -q "ok"; then
        log_success "Qdrant: OK"
    else
        log_warn "Qdrant: Health check failed"
    fi
    
    # Test API
    if curl -s http://localhost:5000/health | grep -q "ok\|healthy"; then
        log_success "API: OK"
    else
        log_warn "API: Health check failed"
    fi
    
    echo ""
    
    # Test job queue
    log_info "Testing job enqueue..."
    RESPONSE=$(curl -s -X POST http://localhost:5000/api/flashcards/orchestrator/generate \
        -H "Content-Type: application/json" \
        -d '{"mode":"single_module","target":{"module_id":"test-module"}}' 2>&1)
    
    if echo "$RESPONSE" | grep -q "jobId"; then
        log_success "Job enqueue: OK"
        echo "Response: $RESPONSE"
    else
        log_warn "Job enqueue: Failed"
        echo "Response: $RESPONSE"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=========================================="
    echo "Flashcard Orchestrator Local Stack"
    echo "=========================================="
    echo ""
    
    case "${1:-}" in
        --stop)
            stop_stack
            ;;
        --logs)
            shift
            show_logs "$@"
            ;;
        --status)
            show_status
            ;;
        --test)
            run_tests
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  (none)      Start default stack"
            echo "  --full      Start full stack with monitoring"
            echo "  --monitoring Start with Prometheus + Grafana"
            echo "  --minimal   Start minimal stack (API + Redis)"
            echo "  --stop      Stop all services"
            echo "  --logs      View service logs"
            echo "  --status    Show service status"
            echo "  --test      Run connectivity tests"
            echo "  --help      Show this help"
            ;;
        *)
            check_requirements
            check_env_file
            start_stack "${1:-}"
            ;;
    esac
}

main "$@"
