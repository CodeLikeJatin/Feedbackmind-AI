#!/usr/bin/env bash
# ==============================================================================
# FeedbackMind AI — Unified Development Startup Script
# ==============================================================================
# Starts backend and frontend services with graceful signal handling and dependency
# pre-flight validation. Compatible with macOS and Linux.
# ==============================================================================

set -e

# Terminal colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${CYAN}  🚀 FeedbackMind AI — Starting Development Environment${NC}"
echo -e "${CYAN}==============================================================================${NC}"

# 1. Check Node.js installation
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Node.js is not installed or not in PATH.${NC}"
  echo "Please install Node.js v22.5.0 or higher: https://nodejs.org/"
  exit 1
fi

# 2. Check Node.js version (Requires >= 22.5.0 for native node:sqlite DatabaseSync)
NODE_CHECK=$(node -e "
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 5)) {
  process.stdout.write('OK');
} else {
  process.stdout.write('FAIL');
}
")

if [ "$NODE_CHECK" != "OK" ]; then
  CURRENT_NODE=$(node -v)
  echo -e "${RED}[ERROR] Incompatible Node.js version: ${CURRENT_NODE}${NC}"
  echo -e "${RED}FeedbackMind AI requires Node.js >= 22.5.0 for native 'node:sqlite' DatabaseSync support.${NC}"
  echo "Please upgrade your Node.js runtime (e.g. using nvm or fnm: nvm install 22)."
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js runtime verified:${NC} ${NODE_VER} (meets >= 22.5.0 requirement)"

# 3. Check npm installation
if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] npm is not installed or not in PATH.${NC}"
  exit 1
fi
NPM_VER=$(npm -v)
echo -e "${GREEN}✓ npm package manager verified:${NC} v${NPM_VER}"

# 4. Verify environment configuration
if [ ! -f "backend/.env" ]; then
  if [ -f "backend/.env.example" ]; then
    echo -e "${YELLOW}[WARNING] backend/.env not found.${NC}"
    echo -e "${YELLOW}Creating backend/.env from backend/.env.example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}Please configure your GROQ_API_KEY and HINDSIGHT_API_KEY in backend/.env for live AI.${NC}"
  else
    echo -e "${YELLOW}[WARNING] backend/.env file not found. Ensure backend environment variables are set.${NC}"
  fi
else
  echo -e "${GREEN}✓ backend/.env configuration detected.${NC}"
fi

# 5. Verify dependencies
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
  echo -e "${YELLOW}Installing project dependencies across root, backend, and frontend...${NC}"
  npm run install:all
  echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"
else
  echo -e "${GREEN}✓ Dependencies verified in backend and frontend.${NC}"
fi

# 6. Process lifecycle management & cleanup trap
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down FeedbackMind AI services cleanly...${NC}"
  
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  # Wait briefly for graceful shutdown
  sleep 1
  echo -e "${GREEN}✓ All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 7. Start Backend service
echo -e "${CYAN}Starting Backend API server on http://localhost:5001 ...${NC}"
npm run dev --prefix backend &
BACKEND_PID=$!

# Brief pause to allow backend to initialize SQLite and port binding
sleep 2

# 8. Start Frontend service
echo -e "${CYAN}Starting Frontend development server on http://localhost:5173 ...${NC}"
npm run dev --prefix frontend &
FRONTEND_PID=$!

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✓ FeedbackMind AI is running!${NC}"
echo -e "  - Frontend UI:  http://localhost:5173"
echo -e "  - Backend API:  http://localhost:5001"
echo -e "  - Health Check: http://localhost:5001/api/health"
echo -e "  (Press Ctrl+C to stop all services)"
echo -e "${GREEN}==============================================================================${NC}"

# Wait for background processes
wait "$BACKEND_PID" "$FRONTEND_PID"

